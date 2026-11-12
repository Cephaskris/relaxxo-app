import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser, rateLimit, cleanText } from "./lib/helpers";
import { isActive } from "./unlocks";

const CHAT_TTL_MS = 48 * 3600_000; // 48 hours from when the chat started

export const list = query({
  args: { unlockId: v.id("unlocks") },
  handler: async (ctx, { unlockId }) => {
    const user = await requireUser(ctx);
    const u = await ctx.db.get(unlockId);
    if (!u || (u.clientId !== user._id && u.therapistUserId !== user._id)) return [];
    if (u.chatStartedAt && Date.now() - u.chatStartedAt >= CHAT_TTL_MS) return [];
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_unlock", (q) => q.eq("unlockId", unlockId))
      .order("desc")
      .take(200);
    return msgs.reverse().map((m) => ({
      _id: m._id,
      body: m.body,
      mine: m.senderId === user._id,
      at: m._creationTime,
    }));
  },
});

export const send = mutation({
  args: { unlockId: v.id("unlocks"), body: v.string() },
  handler: async (ctx, { unlockId, body }) => {
    const user = await requireUser(ctx);
    const u = await ctx.db.get(unlockId);
    if (!u || (u.clientId !== user._id && u.therapistUserId !== user._id)) {
      throw new ConvexError("Not found");
    }
    if (!isActive(u)) throw new ConvexError("This chat has closed");
    const now = Date.now();
    if (u.chatStartedAt && now - u.chatStartedAt >= CHAT_TTL_MS) {
      throw new ConvexError("This chat has expired after 48 hours");
    }
    await rateLimit(ctx, `msg:${user._id}`, 30, 60_000);
    const text = cleanText(body, "Message", 1, 1000);
    await ctx.db.insert("messages", { unlockId, senderId: user._id, body: text });
    const patch: { lastMessageAt: number; firstReplyAt?: number; chatStartedAt?: number } = {
      lastMessageAt: now,
    };
    const fromTherapist = user._id === u.therapistUserId;
    if (fromTherapist && !u.firstReplyAt) patch.firstReplyAt = now;
    if (!u.chatStartedAt) {
      patch.chatStartedAt = now;
      await ctx.scheduler.runAfter(CHAT_TTL_MS, internal.messages.purgeThread, { unlockId });
    }
    await ctx.db.patch(unlockId, patch);
    await ctx.scheduler.runAfter(0, internal.notifications.send, {
      userId: fromTherapist ? u.clientId : u.therapistUserId,
      title: user.name ?? "New message",
      body: text.slice(0, 120),
      url: `/chat/${unlockId}`,
    });
  },
});

// Totally delete all messages for a chat thread 48 hours after the chat started.
export const purgeThread = internalMutation({
  args: { unlockId: v.id("unlocks") },
  handler: async (ctx, { unlockId }) => {
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_unlock", (q) => q.eq("unlockId", unlockId))
      .collect();
    for (const m of msgs) {
      await ctx.db.delete(m._id);
    }
  },
});

// Hourly safety sweep to delete any chat messages whose thread started >= 48 hours ago.
export const purgeExpiredChats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - CHAT_TTL_MS;
    const oldMsgs = await ctx.db
      .query("messages")
      .filter((q) => q.lte(q.field("_creationTime"), cutoff))
      .take(500);
    const expiredUnlockIds = new Set(oldMsgs.map((m) => m.unlockId));
    for (const unlockId of expiredUnlockIds) {
      const msgs = await ctx.db
        .query("messages")
        .withIndex("by_unlock", (q) => q.eq("unlockId", unlockId))
        .collect();
      const startedAt = msgs.reduce((min, m) => Math.min(min, m._creationTime), Infinity);
      if (startedAt <= cutoff) {
        for (const m of msgs) {
          await ctx.db.delete(m._id);
        }
      }
    }
  },
});
