import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser, rateLimit, cleanText } from "./lib/helpers";
import { isActive } from "./unlocks";

export const list = query({
  args: { unlockId: v.id("unlocks") },
  handler: async (ctx, { unlockId }) => {
    const user = await requireUser(ctx);
    const u = await ctx.db.get(unlockId);
    if (!u || (u.clientId !== user._id && u.therapistUserId !== user._id)) return [];
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
    await rateLimit(ctx, `msg:${user._id}`, 30, 60_000);
    const text = cleanText(body, "Message", 1, 1000);
    await ctx.db.insert("messages", { unlockId, senderId: user._id, body: text });
    const patch: { lastMessageAt: number; firstReplyAt?: number } = { lastMessageAt: Date.now() };
    const fromTherapist = user._id === u.therapistUserId;
    if (fromTherapist && !u.firstReplyAt) patch.firstReplyAt = Date.now();
    await ctx.db.patch(unlockId, patch);
    await ctx.scheduler.runAfter(0, internal.notifications.send, {
      userId: fromTherapist ? u.clientId : u.therapistUserId,
      title: user.name ?? "New message",
      body: text.slice(0, 120),
      url: `/chat/${unlockId}`,
    });
  },
});
