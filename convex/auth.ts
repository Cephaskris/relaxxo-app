import { convexAuth } from "@convex-dev/auth/server";
import { Phone } from "@convex-dev/auth/providers/Phone";
import type { MutationCtx } from "./_generated/server";

// 6-digit numeric one-time code from a cryptographically secure source.
function generateCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

// Nigerian numbers only, stored as E.164 (+234XXXXXXXXXX).
function isValidNigerianPhone(phone: string) {
  return /^\+234[789][01]\d{8}$/.test(phone);
}

const TermiiOTP = Phone({
  id: "termii",
  maxAge: 60 * 10, // code valid for 10 minutes
  async generateVerificationToken() {
    return generateCode();
  },
  async sendVerificationRequest({ identifier: phone, token }) {
    if (!isValidNigerianPhone(phone)) {
      throw new Error("Enter a valid Nigerian phone number");
    }
    // Development only: print the code in the Convex logs instead of sending an SMS.
    if (process.env.OTP_DEV_MODE === "true") {
      console.log(`[DEV OTP] ${phone}: ${token}`);
      return;
    }
    const apiKey = process.env.TERMII_API_KEY;
    const senderId = process.env.TERMII_SENDER_ID ?? "Relaxxo";
    if (!apiKey) throw new Error("SMS is not configured");
    const res = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        to: phone.replace("+", ""),
        from: senderId,
        sms: `Your Relaxxo code is ${token}. It expires in 10 minutes. Never share it.`,
        type: "plain",
        channel: "dnd", // delivers to DND-enabled Nigerian numbers
      }),
    });
    if (!res.ok) {
      console.error("Termii send failed", res.status, await res.text());
      throw new Error("Could not send the code. Try again.");
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [TermiiOTP],
  callbacks: {
    // New accounts start with no role; the app asks for it once (users.completeSignup).
    async createOrUpdateUser(ctx: MutationCtx, args) {
      if (args.existingUserId) return args.existingUserId;
      const phone = (args.profile as { phone?: string }).phone;
      if (phone) {
        const existing = await ctx.db
          .query("users")
          .withIndex("phone", (q) => q.eq("phone", phone))
          .first();
        if (existing) return existing._id;
      }
      return await ctx.db.insert("users", {
        phone,
        phoneVerificationTime: Date.now(),
        credits: 0,
        accountStatus: "active",
      });
    },
  },
});
