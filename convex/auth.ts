import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Phone } from "@convex-dev/auth/providers/Phone";
import type { MutationCtx } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";

// 6-digit numeric one-time code from a cryptographically secure source.
function generateCode(): string {
  if (process.env.OTP_BYPASS === "true" || process.env.OTP_DEV_MODE === "true") {
    return "123456";
  }
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

// Nigerian numbers only, stored as E.164 (+234XXXXXXXXXX).
function isValidNigerianPhone(phone: string) {
  return /^\+234[789][01]\d{8}$/.test(phone);
}

const PhonePassword = Password<DataModel>({
  id: "password",
  profile(params) {
    const phone = String(params.phone ?? params.email ?? "").trim();
    if (!isValidNigerianPhone(phone)) {
      throw new Error("Enter a valid Nigerian phone number");
    }
    return {
      email: phone,
      phone,
    };
  },
  validatePasswordRequirements(password: string) {
    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
  },
});

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
    // Bypass mode (or dev mode): skip SMS gateway and accept 123456
    if (process.env.OTP_BYPASS === "true" || process.env.OTP_DEV_MODE === "true") {
      console.log(`[OTP BYPASS] ${phone}: ${token}`);
      return;
    }
    const apiKey = process.env.TERMII_API_KEY;
    const senderId = process.env.TERMII_SENDER_ID ?? "TEAMHIRELY";
    const channel = process.env.TERMII_CHANNEL ?? "generic";
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
        channel,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Termii send failed", res.status, errText);
      throw new Error("Could not send the code. Try again.");
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [PhonePassword, TermiiOTP],
  callbacks: {
    // New accounts start with no role; the app asks for it once (users.completeSignup).
    async createOrUpdateUser(ctx: MutationCtx, args) {
      if (args.existingUserId) return args.existingUserId;
      const profile = args.profile as { phone?: string; email?: string };
      const phone = profile.phone ?? profile.email;
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
