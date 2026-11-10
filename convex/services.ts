import { v, ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireRole, getSettings, cleanText, assertAllowedText } from "./lib/helpers";

async function ownTherapist(ctx: MutationCtx, user: Doc<"users">) {
  const t = await ctx.db
    .query("therapists")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();
  if (!t) throw new ConvexError("Complete your profile first");
  return t;
}

const serviceArgs = {
  category: v.string(),
  name: v.string(),
  description: v.string(),
  durationMin: v.number(),
  priceNaira: v.number(),
};

async function validate(ctx: MutationCtx, a: { category: string; name: string; description: string; durationMin: number; priceNaira: number }) {
  const settings = await getSettings(ctx);
  if (!settings.categories.includes(a.category)) throw new ConvexError("Pick a category");
  const name = cleanText(a.name, "Service name", 3, 40);
  const description = cleanText(a.description, "Description", 0, 160);
  assertAllowedText(`${name} ${description}`, settings.blockedWords);
  if (!Number.isInteger(a.durationMin) || a.durationMin < 15 || a.durationMin > 240) {
    throw new ConvexError("Duration must be 15 to 240 minutes");
  }
  if (!Number.isInteger(a.priceNaira) || a.priceNaira < 1000 || a.priceNaira > 1_000_000) {
    throw new ConvexError("Price must be between ₦1,000 and ₦1,000,000");
  }
  return { category: a.category, name, description, durationMin: a.durationMin, priceNaira: a.priceNaira };
}

// Therapists write their own service names and prices. Every new or edited service waits for admin approval.
export const add = mutation({
  args: serviceArgs,
  handler: async (ctx, a) => {
    const user = await requireRole(ctx, "therapist");
    const t = await ownTherapist(ctx, user);
    const count = (
      await ctx.db
        .query("services")
        .withIndex("by_therapist", (q) => q.eq("therapistId", t._id))
        .collect()
    ).length;
    if (count >= 15) throw new ConvexError("You can list up to 15 services");
    const clean = await validate(ctx, a);
    return await ctx.db.insert("services", { ...clean, therapistId: t._id, status: "pending" });
  },
});

export const update = mutation({
  args: { serviceId: v.id("services"), ...serviceArgs },
  handler: async (ctx, { serviceId, ...a }) => {
    const user = await requireRole(ctx, "therapist");
    const t = await ownTherapist(ctx, user);
    const s = await ctx.db.get(serviceId);
    if (!s || s.therapistId !== t._id) throw new ConvexError("Not found");
    const clean = await validate(ctx, a);
    await ctx.db.patch(serviceId, { ...clean, status: "pending", rejectReason: undefined });
  },
});

export const remove = mutation({
  args: { serviceId: v.id("services") },
  handler: async (ctx, { serviceId }) => {
    const user = await requireRole(ctx, "therapist");
    const t = await ownTherapist(ctx, user);
    const s = await ctx.db.get(serviceId);
    if (!s || s.therapistId !== t._id) throw new ConvexError("Not found");
    await ctx.db.delete(serviceId);
  },
});
