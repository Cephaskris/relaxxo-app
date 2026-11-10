import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Sends an Expo push notification. Silently skips users without a token.
export const send = internalAction({
  args: { userId: v.id("users"), title: v.string(), body: v.string(), url: v.optional(v.string()) },
  handler: async (ctx, { userId, title, body, url }): Promise<void> => {
    const token = await ctx.runQuery(internal.users.pushTokenFor, { userId });
    if (!token) return;
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ to: token, title, body, sound: "default", data: { url } }),
      });
    } catch (e) {
      console.error("push failed", e);
    }
  },
});

export const sendSms = internalAction({
  args: { phone: v.string(), message: v.string() },
  handler: async (_ctx, { phone, message }): Promise<void> => {
    const apiKey = process.env.TERMII_API_KEY;
    const senderId = process.env.TERMII_SENDER_ID ?? "Relaxxo";
    if (!apiKey || !phone) return;
    try {
      await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          to: phone.replace("+", ""),
          from: senderId,
          sms: message,
          type: "plain",
          channel: "dnd",
        }),
      });
    } catch (e) {
      console.error("sms failed", e);
    }
  },
});
