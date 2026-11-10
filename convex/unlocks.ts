import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireRole, requireUser, getSettings, applyCredits, rateLimit } from "./lib/helpers";

export function isActive(u: Doc<"unlocks">) {
  return !u.refunded && u.expiresAt > Date.now();
}

// Client spends credits to reveal a therapist's number and open a chat.
export const unlock = mutation({
  args: { therapistId: v.id("therapists") },
  handler: async (ctx, { therapistId }) => {
    const client = await requireRole(ctx, "client");
    await rateLimit(ctx, `unlock:${client._id}`, 20, 3600_000);
    const t = await ctx.db.get(therapistId);
    if (!t || t.verification !== "approved") throw new ConvexError("Therapist not available");
    if (t.onlineUntil <= Date.now()) throw new ConvexError("This therapist just went offline");
    const owner = await ctx.db.get(t.userId);
    if (!owner || owner.accountStatus !== "active") throw new ConvexError("Therapist not available");

    // Already connected? Don't charge again.
    const existing = await ctx.db
      .query("unlocks")
      .withIndex("by_client_therapist", (q) => q.eq("clientId", client._id).eq("therapistId", therapistId))
      .order("desc")
      .first();
    if (existing && isActive(existing)) return existing._id;

    const settings = await getSettings(ctx);
    const now = Date.now();
    const unlockId = await ctx.db.insert("unlocks", {
      clientId: client._id,
      therapistId,
      therapistUserId: t.userId,
      cost: settings.unlockCost,
      expiresAt: now + settings.unlockDays * 24 * 3600_000,
      refunded: false,
      lastMessageAt: now,
    });
    await applyCredits(ctx, client._id, -settings.unlockCost, "unlock", { refId: unlockId });
    await ctx.scheduler.runAfter(0, internal.notifications.send, {
      userId: t.userId,
      title: "New client connected",
      body: `${client.name ?? "A client"} unlocked your contact.`,
      url: `/chat/${unlockId}`,
    });
    return unlockId;
  },
});

// No-op kept only so any previously scheduled jobs in local dev complete cleanly.
export const refundIfNoReply = internalMutation({
  args: { unlockId: v.id("unlocks") },
  handler: async () => {},
});

// Therapist confirms they've spoken to the client (e.g. by phone). Counts as a reply.
export const markContacted = mutation({
  args: { unlockId: v.id("unlocks") },
  handler: async (ctx, { unlockId }) => {
    const user = await requireRole(ctx, "therapist");
    const u = await ctx.db.get(unlockId);
    if (!u || u.therapistUserId !== user._id) throw new ConvexError("Not found");
    if (!u.firstReplyAt && !u.refunded) await ctx.db.patch(unlockId, { firstReplyAt: Date.now() });
  },
});

// The phone number is only ever returned through here, to the client who paid, while access is active.
export const contact = query({
  args: { unlockId: v.id("unlocks") },
  handler: async (ctx, { unlockId }) => {
    const client = await requireRole(ctx, "client");
    const u = await ctx.db.get(unlockId);
    if (!u || u.clientId !== client._id || !isActive(u)) return null;
    const therapistUser = await ctx.db.get(u.therapistUserId);
    return {
      phone: therapistUser?.phone ?? null,
      expiresAt: u.expiresAt,
      replied: !!u.firstReplyAt,
    };
  },
});

async function threadSummary(ctx: QueryCtx, u: Doc<"unlocks">, viewerId: Id<"users">) {
  const otherId = u.clientId === viewerId ? u.therapistUserId : u.clientId;
  const other = await ctx.db.get(otherId);
  let otherName = other?.name ?? "User";
  let otherArea = "";
  if (u.therapistUserId === otherId) {
    const t = await ctx.db.get(u.therapistId);
    otherName = t?.displayName ?? otherName;
    otherArea = t?.area ?? "";
  }
  const last = await ctx.db
    .query("messages")
    .withIndex("by_unlock", (q) => q.eq("unlockId", u._id))
    .order("desc")
    .first();
  const existingReview = await ctx.db
    .query("reviews")
    .withIndex("by_unlock", (q) => q.eq("unlockId", u._id))
    .first();
  return {
    _id: u._id,
    otherName,
    otherArea,
    therapistId: u.therapistId,
    lastMessage: last?.body ?? null,
    lastAt: u.lastMessageAt,
    unlockedAt: u._creationTime,
    active: isActive(u),
    refunded: u.refunded,
    replied: !!u.firstReplyAt,
    awaitingReply: !u.firstReplyAt && isActive(u),
    hasReviewed: !!existingReview,
    expiresAt: u.expiresAt,
  };
}

export const myThreads = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    let rows: Doc<"unlocks">[] = [];
    if (user.role === "client") {
      rows = await ctx.db
        .query("unlocks")
        .withIndex("by_client", (q) => q.eq("clientId", user._id))
        .order("desc")
        .take(50);
    } else if (user.role === "therapist") {
      rows = await ctx.db
        .query("unlocks")
        .withIndex("by_therapistUser", (q) => q.eq("therapistUserId", user._id))
        .order("desc")
        .take(50);
    }
    const out = await Promise.all(rows.map((u) => threadSummary(ctx, u, user._id)));
    return out.sort((a, b) => b.lastAt - a.lastAt);
  },
});

export const thread = query({
  args: { unlockId: v.id("unlocks") },
  handler: async (ctx, { unlockId }) => {
    const user = await requireUser(ctx);
    const u = await ctx.db.get(unlockId);
    if (!u || (u.clientId !== user._id && u.therapistUserId !== user._id)) return null;
    return {
      ...(await threadSummary(ctx, u, user._id)),
      iAmTherapist: u.therapistUserId === user._id,
    };
  },
});
