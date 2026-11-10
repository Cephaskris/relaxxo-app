import { query } from "./_generated/server";
import { requireUser } from "./lib/helpers";

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const history = await ctx.db
      .query("ledger")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
    return {
      credits: user.credits ?? 0,
      history: history.map((h) => ({
        _id: h._id,
        delta: h.delta,
        reason: h.reason,
        note: h.note ?? null,
        at: h._creationTime,
        balanceAfter: h.balanceAfter,
      })),
    };
  },
});
