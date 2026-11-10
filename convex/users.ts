import { v, ConvexError } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { getUser, requireUser, cleanText, getSettings } from "./lib/helpers";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return null;
    let verification: string | null = null;
    let rejectReason: string | undefined;
    if (user.role === "therapist") {
      const t = await ctx.db
        .query("therapists")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      verification = t?.verification ?? "none";
      rejectReason = t?.rejectReason;
    } else if (user.role === "hotel") {
      const h = await ctx.db
        .query("hotels")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .first();
      verification = h?.verification ?? "none";
      rejectReason = h?.rejectReason;
    }
    return {
      _id: user._id,
      name: user.name ?? "",
      phone: user.phone ?? "",
      role: user.role ?? null,
      gender: user.gender ?? null,
      city: user.city ?? null,
      credits: user.credits ?? 0,
      accountStatus: user.accountStatus ?? "active",
      savedTherapistIds: user.savedTherapistIds ?? [],
      adminPermissions: user.adminPermissions ?? null,
      verification,
      rejectReason,
    };
  },
});

// Sets the role once, right after the first OTP login. Admin can never be chosen here.
export const completeSignup = mutation({
  args: {
    role: v.union(v.literal("client"), v.literal("therapist"), v.literal("hotel")),
    name: v.string(),
    city: v.string(),
    gender: v.optional(v.union(v.literal("female"), v.literal("male"))),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role) throw new ConvexError("Account type is already set");
    const settings = await getSettings(ctx);
    if (!settings.cities.some((c) => c.name === args.city)) throw new ConvexError("Unknown city");
    await ctx.db.patch(user._id, {
      role: args.role,
      name: cleanText(args.name, "Name", 2, 60),
      city: args.city,
      gender: args.gender,
      credits: user.credits ?? 0,
      accountStatus: "active",
    });
  },
});

export const updateMe = mutation({
  args: {
    name: v.optional(v.string()),
    city: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("female"), v.literal("male"))),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const patch: { name?: string; city?: string; gender?: "female" | "male" } = {};
    if (args.name !== undefined) patch.name = cleanText(args.name, "Name", 2, 60);
    if (args.city !== undefined) {
      const settings = await getSettings(ctx);
      if (!settings.cities.some((c) => c.name === args.city)) throw new ConvexError("Unknown city");
      patch.city = args.city;
    }
    if (args.gender !== undefined) patch.gender = args.gender;
    await ctx.db.patch(user._id, patch);
  },
});

export const toggleSaveTherapist = mutation({
  args: { therapistId: v.id("therapists") },
  handler: async (ctx, { therapistId }) => {
    const user = await requireUser(ctx);
    const current = user.savedTherapistIds ?? [];
    const exists = current.includes(therapistId);
    const next = exists ? current.filter((id) => id !== therapistId) : [...current.slice(-49), therapistId];
    await ctx.db.patch(user._id, { savedTherapistIds: next });
    return !exists;
  },
});

export const mySavedTherapists = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];
    const ids = user.savedTherapistIds ?? [];
    const now = Date.now();
    const out = [];
    for (const id of ids) {
      const t = await ctx.db.get(id);
      if (!t || t.verification !== "approved") continue;
      out.push({
        _id: t._id,
        displayName: t.displayName,
        area: t.area,
        city: t.city,
        online: t.onlineUntil > now,
        rating: t.ratingCount ? Math.round((t.ratingSum / t.ratingCount) * 10) / 10 : null,
        photo: t.photoIds[0] ? await ctx.storage.getUrl(t.photoIds[0]) : null,
      });
    }
    return out;
  },
});

export const setPushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx);
    if (!/^ExponentPushToken\[[\w-]+\]$/.test(token)) throw new ConvexError("Invalid token");
    await ctx.db.patch(user._id, { pushToken: token });
  },
});

export const pushTokenFor = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<string | null> => (await ctx.db.get(userId))?.pushToken ?? null,
});
