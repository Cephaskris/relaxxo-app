import { v, ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireRole, requireUser, rateLimit, cleanText, getSettings } from "./lib/helpers";

// Rating after a connection. One review per unlock, only once the therapist has replied.
export const review = mutation({
  args: { unlockId: v.id("unlocks"), rating: v.number(), text: v.string() },
  handler: async (ctx, { unlockId, rating, text }) => {
    const client = await requireRole(ctx, "client");
    const u = await ctx.db.get(unlockId);
    if (!u || u.clientId !== client._id) throw new ConvexError("Not found");
    if (!u.firstReplyAt) throw new ConvexError("You can review once the therapist has replied");
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ConvexError("Rating must be 1 to 5");
    const done = await ctx.db
      .query("reviews")
      .withIndex("by_unlock", (q) => q.eq("unlockId", unlockId))
      .first();
    if (done) throw new ConvexError("You already reviewed this");
    const clean = cleanText(text, "Review", 0, 300);
    await ctx.db.insert("reviews", { unlockId, clientId: client._id, therapistId: u.therapistId, rating, text: clean });
    const t = await ctx.db.get(u.therapistId);
    if (t) await ctx.db.patch(t._id, { ratingSum: t.ratingSum + rating, ratingCount: t.ratingCount + 1 });
  },
});

// Reports. Enough reports from different people auto-suspends the account pending admin review.
export const report = mutation({
  args: {
    targetType: v.union(v.literal("therapist"), v.literal("hotel"), v.literal("message")),
    targetId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, { targetType, targetId, reason }) => {
    const user = await requireUser(ctx);
    await rateLimit(ctx, `report:${user._id}`, 5, 3600_000);
    const clean = cleanText(reason, "Reason", 5, 500);

    let targetUserId: Id<"users"> | undefined;
    if (targetType === "therapist") {
      const id = ctx.db.normalizeId("therapists", targetId);
      targetUserId = id ? (await ctx.db.get(id))?.userId : undefined;
    } else if (targetType === "hotel") {
      const id = ctx.db.normalizeId("hotels", targetId);
      targetUserId = id ? (await ctx.db.get(id))?.ownerId : undefined;
    } else {
      const id = ctx.db.normalizeId("messages", targetId);
      const m = id ? await ctx.db.get(id) : null;
      // Only people in that chat can report a message.
      const u = m ? await ctx.db.get(m.unlockId) : null;
      if (u && (u.clientId === user._id || u.therapistUserId === user._id)) targetUserId = m!.senderId;
    }
    if (!targetUserId) throw new ConvexError("Not found");
    if (targetUserId === user._id) throw new ConvexError("You can't report yourself");

    await ctx.db.insert("reports", {
      reporterId: user._id,
      targetType,
      targetId,
      targetUserId,
      reason: clean,
      status: "open",
    });

    const settings = await getSettings(ctx);
    const open = (
      await ctx.db
        .query("reports")
        .withIndex("by_target_user", (q) => q.eq("targetUserId", targetUserId))
        .collect()
    ).filter((r) => r.status === "open");
    const reporters = new Set(open.map((r) => r.reporterId));
    if (reporters.size >= settings.reportSuspendThreshold) {
      const target = await ctx.db.get(targetUserId);
      if (target && target.role !== "admin" && target.accountStatus === "active") {
        await ctx.db.patch(targetUserId, { accountStatus: "suspended" });
        const t = await ctx.db
          .query("therapists")
          .withIndex("by_user", (q) => q.eq("userId", targetUserId))
          .first();
        if (t) await ctx.db.patch(t._id, { onlineUntil: Date.now() });
        const h = await ctx.db
          .query("hotels")
          .withIndex("by_owner", (q) => q.eq("ownerId", targetUserId))
          .first();
        if (h) await ctx.db.patch(h._id, { onlineUntil: Date.now() });
      }
    }
  },
});
