import { v, ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser, rateLimit } from "./lib/helpers";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    await rateLimit(ctx, `upload:${user._id}`, 40, 60 * 60 * 1000);
    return await ctx.storage.generateUploadUrl();
  },
});

// Called right after an upload so the file is tied to its uploader.
// "private" = ID documents and selfies: only admins ever get a URL for these.
export const claimUpload = mutation({
  args: { storageId: v.id("_storage"), kind: v.union(v.literal("public"), v.literal("private")) },
  handler: async (ctx, { storageId, kind }) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query("uploads")
      .withIndex("by_storage", (q) => q.eq("storageId", storageId))
      .first();
    if (existing) {
      if (existing.ownerId !== user._id) throw new ConvexError("Invalid file");
      return;
    }
    const meta = await ctx.db.system.get(storageId);
    if (!meta) throw new ConvexError("File not found");
    const okType = meta.contentType?.startsWith("image/") || meta.contentType === "application/pdf";
    if (!okType || meta.size > 8 * 1024 * 1024) {
      await ctx.storage.delete(storageId);
      throw new ConvexError("Upload an image or PDF under 8 MB");
    }
    await ctx.db.insert("uploads", { storageId, ownerId: user._id, kind });
  },
});
