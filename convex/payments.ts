import { v, ConvexError } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getSettings, applyCredits, rateLimit } from "./lib/helpers";

/*
 * Credit purchases with Paystack.
 * Security rules:
 *  - The price always comes from server settings, never from the app.
 *  - Credits are added ONLY after the server verifies the transaction with Paystack directly
 *    (from the signed webhook or the verify action). The payment redirect alone never adds credits.
 *  - Crediting is idempotent: a reference can only be credited once.
 */

function newReference() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return "RLX-" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const createPending = internalMutation({
  args: { userId: v.id("users"), packId: v.string() },
  handler: async (ctx, { userId, packId }): Promise<{ reference: string; amountKobo: number; phone: string }> => {
    const user = await ctx.db.get(userId);
    if (!user || user.accountStatus !== "active") throw new ConvexError("Account not active");
    if (!user.role || user.role === "admin") throw new ConvexError("Not allowed");
    await rateLimit(ctx, `pay:${userId}`, 10, 3600_000);
    const settings = await getSettings(ctx);
    const pack = settings.packs.find((p) => p.id === packId);
    if (!pack) throw new ConvexError("Unknown credit pack");
    const reference = newReference();
    await ctx.db.insert("payments", {
      userId,
      reference,
      packId,
      credits: pack.credits,
      amountKobo: pack.priceNaira * 100,
      status: "pending",
    });
    return { reference, amountKobo: pack.priceNaira * 100, phone: user.phone ?? "" };
  },
});

export const initialize = action({
  args: { packId: v.string(), platform: v.union(v.literal("web"), v.literal("native")) },
  handler: async (ctx, { packId, platform }): Promise<{ url: string; reference: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in");
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const site = process.env.SITE_URL;
    const isDevSim = !secret && process.env.OTP_DEV_MODE === "true";
    if ((!secret && !isDevSim) || !site) throw new ConvexError("Payments are not configured");
    const { reference, amountKobo, phone } = await ctx.runMutation(internal.payments.createPending, {
      userId,
      packId,
    });
    const callback = `${site}/payment-return${platform === "native" ? "?app=1" : ""}`;
    if (isDevSim) {
      const sep = callback.includes("?") ? "&" : "?";
      return { url: `${callback}${sep}reference=${encodeURIComponent(reference)}`, reference };
    }
    // Paystack needs an email; we use a non-routable one derived from the phone number.
    const email = `${phone.replace(/\D/g, "") || userId}@users.relaxxo.app`;
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: String(amountKobo),
        currency: "NGN",
        reference,
        callback_url: callback,
        metadata: { userId, packId },
      }),
    });
    const json = (await res.json()) as { status: boolean; data?: { authorization_url: string } };
    if (!res.ok || !json.status || !json.data) {
      await ctx.runMutation(internal.payments.markFailed, { reference, reason: "init_failed" });
      throw new ConvexError("Could not start payment. Try again.");
    }
    return { url: json.data.authorization_url, reference };
  },
});

// Asks Paystack for the real status of a reference, then credits if it really succeeded.
export const verifyWithPaystack = internalAction({
  args: { reference: v.string() },
  handler: async (ctx, { reference }): Promise<string> => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!/^RLX-[0-9a-f]{24}$/.test(reference)) return "invalid";
    if (!secret && process.env.OTP_DEV_MODE === "true") {
      const pending = await ctx.runQuery(internal.payments.getPendingInfo, { reference });
      if (!pending) return "unknown";
      return await ctx.runMutation(internal.payments.complete, {
        reference,
        amountKobo: pending.amountKobo,
        currency: "NGN",
        gatewayResponse: "DEV_SIMULATED_SUCCESS",
      });
    }
    if (!secret) throw new Error("PAYSTACK_SECRET_KEY missing");
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) return "unverified";
    const json = (await res.json()) as {
      status: boolean;
      data?: { status: string; amount: number; currency: string; reference: string; gateway_response?: string };
    };
    const d = json.data;
    if (!json.status || !d) return "unverified";
    if (d.status === "success") {
      return await ctx.runMutation(internal.payments.complete, {
        reference: d.reference,
        amountKobo: d.amount,
        currency: d.currency,
        gatewayResponse: d.gateway_response ?? "",
      });
    }
    if (d.status === "failed" || d.status === "abandoned") {
      await ctx.runMutation(internal.payments.markFailed, { reference, reason: d.status });
    }
    return d.status;
  },
});

// Called by the app after returning from Paystack. Safe: it only triggers server-side verification.
export const verify = action({
  args: { reference: v.string() },
  handler: async (ctx, { reference }): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in");
    const owner = await ctx.runQuery(internal.payments.ownerOf, { reference });
    if (owner !== userId) throw new ConvexError("Not found");
    return await ctx.runAction(internal.payments.verifyWithPaystack, { reference });
  },
});

export const ownerOf = internalQuery({
  args: { reference: v.string() },
  handler: async (ctx, { reference }): Promise<string | null> => {
    const p = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", reference))
      .first();
    return p?.userId ?? null;
  },
});

export const getPendingInfo = internalQuery({
  args: { reference: v.string() },
  handler: async (ctx, { reference }): Promise<{ amountKobo: number } | null> => {
    const p = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", reference))
      .first();
    return p ? { amountKobo: p.amountKobo } : null;
  },
});

export const complete = internalMutation({
  args: { reference: v.string(), amountKobo: v.number(), currency: v.string(), gatewayResponse: v.string() },
  handler: async (ctx, a): Promise<string> => {
    const p = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", a.reference))
      .first();
    if (!p) return "unknown";
    if (p.status === "success") return "success"; // already credited (idempotent)
    if (a.currency !== "NGN" || a.amountKobo !== p.amountKobo) {
      await ctx.db.patch(p._id, { status: "failed", gatewayResponse: "amount_mismatch" });
      console.error("Paystack amount mismatch", a.reference);
      return "failed";
    }
    await ctx.db.patch(p._id, { status: "success", verifiedAt: Date.now(), gatewayResponse: a.gatewayResponse });
    await applyCredits(ctx, p.userId, p.credits, "purchase", { refId: p.reference });
    await ctx.scheduler.runAfter(0, internal.notifications.send, {
      userId: p.userId,
      title: "Connection Credits added",
      body: `${p.credits} CC are now in your wallet.`,
      url: "/wallet",
    });
    return "success";
  },
});

export const markFailed = internalMutation({
  args: { reference: v.string(), reason: v.string() },
  handler: async (ctx, { reference, reason }) => {
    const p = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", reference))
      .first();
    if (!p || p.status !== "pending") return;
    await ctx.db.patch(p._id, {
      status: reason === "abandoned" ? "abandoned" : "failed",
      gatewayResponse: reason,
    });
  },
});

// Hourly cleanup: payments left pending for over an hour are re-checked once, then marked abandoned.
export const sweepPending = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const refs: string[] = await ctx.runQuery(internal.payments.stalePending, {});
    for (const reference of refs) {
      const status = await ctx.runAction(internal.payments.verifyWithPaystack, { reference });
      if (status !== "success") await ctx.runMutation(internal.payments.markFailed, { reference, reason: "abandoned" });
    }
  },
});

export const stalePending = internalQuery({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const cutoff = Date.now() - 3600_000;
    const rows = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(100);
    return rows.filter((p) => p._creationTime < cutoff).map((p) => p.reference);
  },
});

