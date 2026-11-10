import { v, ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireRole, getSettings, cleanText, assertAllowedText, assertOwnImage } from "./lib/helpers";

async function ownHotel(ctx: MutationCtx, user: Doc<"users">) {
  const h = await ctx.db
    .query("hotels")
    .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
    .first();
  if (!h) throw new ConvexError("Add your hotel details first");
  return h;
}

async function ownRoom(ctx: MutationCtx, user: Doc<"users">, roomId: Id<"rooms">) {
  const h = await ownHotel(ctx, user);
  const r = await ctx.db.get(roomId);
  if (!r || r.hotelId !== h._id) throw new ConvexError("Not found");
  return r;
}

const roomArgs = {
  name: v.string(),
  photoIds: v.array(v.id("_storage")),
  pricePerNight: v.number(),
  availableCount: v.number(),
};

async function validate(
  ctx: MutationCtx,
  user: Doc<"users">,
  a: { name: string; photoIds: Id<"_storage">[]; pricePerNight: number; availableCount: number },
) {
  const settings = await getSettings(ctx);
  const name = cleanText(a.name, "Room name", 2, 40);
  assertAllowedText(name, settings.blockedWords);
  if (a.photoIds.length < 1 || a.photoIds.length > 5) throw new ConvexError("Add 1 to 5 photos");
  for (const id of a.photoIds) await assertOwnImage(ctx, id, user._id);
  if (!Number.isInteger(a.pricePerNight) || a.pricePerNight < 2000 || a.pricePerNight > 5_000_000) {
    throw new ConvexError("Enter a valid nightly price");
  }
  if (!Number.isInteger(a.availableCount) || a.availableCount < 0 || a.availableCount > 500) {
    throw new ConvexError("Enter how many of this room are free");
  }
  return { name, photoIds: a.photoIds, pricePerNight: a.pricePerNight, availableCount: a.availableCount };
}

// New rooms wait for admin approval. Edits to an approved room stay live; photo changes go back to review.
export const add = mutation({
  args: roomArgs,
  handler: async (ctx, a) => {
    const user = await requireRole(ctx, "hotel");
    const h = await ownHotel(ctx, user);
    const count = (
      await ctx.db
        .query("rooms")
        .withIndex("by_hotel", (q) => q.eq("hotelId", h._id))
        .collect()
    ).length;
    if (count >= 30) throw new ConvexError("You can list up to 30 room types");
    const clean = await validate(ctx, user, a);
    return await ctx.db.insert("rooms", { ...clean, hotelId: h._id, status: "pending" });
  },
});

export const update = mutation({
  args: { roomId: v.id("rooms"), ...roomArgs },
  handler: async (ctx, { roomId, ...a }) => {
    const user = await requireRole(ctx, "hotel");
    const r = await ownRoom(ctx, user, roomId);
    const clean = await validate(ctx, user, a);
    const photosChanged = JSON.stringify(r.photoIds) !== JSON.stringify(clean.photoIds);
    await ctx.db.patch(roomId, {
      ...clean,
      status: photosChanged ? "pending" : r.status,
      needsReview: r.status === "approved" && !photosChanged ? true : undefined,
    });
  },
});

// Quick toggle the hotel uses many times a day.
export const setAvailable = mutation({
  args: { roomId: v.id("rooms"), availableCount: v.number() },
  handler: async (ctx, { roomId, availableCount }) => {
    const user = await requireRole(ctx, "hotel");
    await ownRoom(ctx, user, roomId);
    if (!Number.isInteger(availableCount) || availableCount < 0 || availableCount > 500) {
      throw new ConvexError("Invalid number");
    }
    await ctx.db.patch(roomId, { availableCount });
  },
});

export const remove = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const user = await requireRole(ctx, "hotel");
    await ownRoom(ctx, user, roomId);
    await ctx.db.delete(roomId);
  },
});
