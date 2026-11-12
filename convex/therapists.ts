import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import {
  requireRole,
  getUser,
  getSettings,
  applyCredits,
  cleanText,
  assertAllowedText,
  assertOwnImage,
  distanceKm,
  fuzzyKm,
  validLatLng,
} from "./lib/helpers";

async function myTherapist(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("therapists")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}

async function photoUrls(ctx: QueryCtx, ids: Id<"_storage">[]) {
  const urls = await Promise.all(ids.map((id) => ctx.storage.getUrl(id)));
  return urls.filter((u): u is string => !!u);
}

// ---------- Therapist's own profile ----------

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, "therapist");
    const t = await myTherapist(ctx, user._id);
    if (!t) return null;
    const services = await ctx.db
      .query("services")
      .withIndex("by_therapist", (q) => q.eq("therapistId", t._id))
      .collect();
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_therapist", (q) => q.eq("therapistId", t._id))
      .order("desc")
      .take(20);
    return {
      _id: t._id,
      displayName: t.displayName,
      bio: t.bio,
      gender: t.gender,
      serves: t.serves,
      workType: t.workType,
      city: t.city,
      area: t.area,
      lat: t.lat,
      lng: t.lng,
      radiusKm: t.radiusKm,
      photoIds: t.photoIds,
      photos: await photoUrls(ctx, t.photoIds),
      hasIdDoc: !!t.idDocId,
      hasSelfie: !!t.selfieId,
      hasCert: !!t.certId,
      idDocId: t.idDocId ?? null,
      selfieId: t.selfieId ?? null,
      certId: t.certId ?? null,
      verification: t.verification,
      rejectReason: t.rejectReason,
      onlineUntil: t.onlineUntil,
      rating: t.ratingCount ? Math.round((t.ratingSum / t.ratingCount) * 10) / 10 : null,
      ratingCount: t.ratingCount,
      services,
      reviews: reviews.map((r) => ({ _id: r._id, rating: r.rating, text: r.text, at: r._creationTime })),
    };
  },
});

export const saveProfile = mutation({
  args: {
    displayName: v.string(),
    bio: v.string(),
    gender: v.union(v.literal("female"), v.literal("male")),
    serves: v.union(v.literal("women"), v.literal("men"), v.literal("both")),
    workType: v.union(v.literal("home"), v.literal("studio"), v.literal("both")),
    area: v.string(),
    lat: v.number(),
    lng: v.number(),
    radiusKm: v.number(),
    photoIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, a) => {
    const user = await requireRole(ctx, "therapist");
    const settings = await getSettings(ctx);
    const displayName = cleanText(a.displayName, "Display name", 2, 40);
    const bio = cleanText(a.bio, "Bio", 10, 200);
    const area = cleanText(a.area, "Area", 2, 60);
    assertAllowedText(`${displayName} ${bio} ${area}`, settings.blockedWords);
    validLatLng(a.lat, a.lng);
    if (![5, 10, 20].includes(a.radiusKm)) throw new ConvexError("Choose 5, 10 or 20 km");
    if (a.photoIds.length < 3 || a.photoIds.length > 6) throw new ConvexError("Add 3 to 6 photos");
    for (const id of a.photoIds) await assertOwnImage(ctx, id, user._id);
    if (!user.city) throw new ConvexError("Set your city first");

    const fields = {
      displayName,
      bio,
      gender: a.gender,
      serves: a.serves,
      workType: a.workType,
      city: user.city,
      area,
      lat: a.lat,
      lng: a.lng,
      radiusKm: a.radiusKm,
      photoIds: a.photoIds,
    };
    const existing = await myTherapist(ctx, user._id);
    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }
    return await ctx.db.insert("therapists", {
      ...fields,
      userId: user._id,
      verification: "draft",
      onlineUntil: 0,
      ratingSum: 0,
      ratingCount: 0,
      bonusGranted: false,
    });
  },
});

export const submitVerification = mutation({
  args: {
    idDocId: v.id("_storage"),
    selfieId: v.id("_storage"),
    certId: v.id("_storage"),
  },
  handler: async (ctx, a) => {
    const user = await requireRole(ctx, "therapist");
    const t = await myTherapist(ctx, user._id);
    if (!t) throw new ConvexError("Complete your profile first");
    if (t.verification === "approved") throw new ConvexError("Already verified");
    for (const id of [a.idDocId, a.selfieId, a.certId]) await assertOwnImage(ctx, id, user._id);
    const services = await ctx.db
      .query("services")
      .withIndex("by_therapist", (q) => q.eq("therapistId", t._id))
      .collect();
    if (services.length === 0) throw new ConvexError("Add at least one service");
    await ctx.db.patch(t._id, {
      idDocId: a.idDocId,
      selfieId: a.selfieId,
      certId: a.certId,
      verification: "pending",
      rejectReason: undefined,
    });
  },
});

// ---------- Going online (costs credits) ----------

export const goOnline = mutation({
  args: { optionId: v.string() },
  handler: async (ctx, { optionId }) => {
    const user = await requireRole(ctx, "therapist");
    const t = await myTherapist(ctx, user._id);
    if (!t || t.verification !== "approved") throw new ConvexError("Your profile isn't verified yet");
    const settings = await getSettings(ctx);
    const option = settings.onlineOptions.find((o) => o.id === optionId);
    if (!option) throw new ConvexError("Unknown option");
    const now = Date.now();
    await applyCredits(ctx, user._id, -option.credits, "online", { refId: t._id, note: option.label });
    const until = Math.max(now, t.onlineUntil) + option.hours * 3600_000;
    await ctx.db.patch(t._id, { onlineUntil: until });
    const remindAt = until - 15 * 60_000;
    if (remindAt > now) {
      await ctx.scheduler.runAt(remindAt, internal.therapists.remindEnding, {
        therapistId: t._id,
        until,
      });
    }
    return until;
  },
});

export const goOffline = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, "therapist");
    const t = await myTherapist(ctx, user._id);
    if (!t) return;
    // Unused online time is not refunded (shown clearly in the app).
    await ctx.db.patch(t._id, { onlineUntil: Date.now() });
  },
});

export const remindEnding = internalMutation({
  args: { therapistId: v.id("therapists"), until: v.number() },
  handler: async (ctx, { therapistId, until }) => {
    const t = await ctx.db.get(therapistId);
    if (!t || t.onlineUntil !== until) return; // extended or went offline
    await ctx.scheduler.runAfter(0, internal.notifications.send, {
      userId: t.userId,
      title: "15 minutes left online",
      body: "Extend now to stay visible to clients.",
      url: "/pro",
    });
  },
});

export const recordView = mutation({
  args: { therapistId: v.id("therapists") },
  handler: async (ctx, { therapistId }) => {
    const t = await ctx.db.get(therapistId);
    if (!t) return;
    const viewer = await getUser(ctx);
    if (viewer?._id === t.userId) return;
    await ctx.db.insert("profileViews", {
      targetType: "therapist",
      targetId: therapistId,
      viewerId: viewer?._id,
    });
  },
});

export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, "therapist");
    const t = await myTherapist(ctx, user._id);
    if (!t) return null;
    const since = Date.now() - 24 * 3600_000;
    const unlocks = await ctx.db
      .query("unlocks")
      .withIndex("by_therapistUser", (q) => q.eq("therapistUserId", user._id))
      .order("desc")
      .take(100);
    const views = await ctx.db
      .query("profileViews")
      .withIndex("by_target", (q) => q.eq("targetType", "therapist").eq("targetId", t._id))
      .order("desc")
      .take(500);
    const viewsToday = views.filter((v) => v._creationTime > since).length;
    const today = unlocks.filter((u) => u._creationTime > since);
    const activeChats = unlocks.filter((u) => !u.refunded && u.expiresAt > Date.now()).length;
    const awaiting = unlocks.filter(
      (u) => !u.firstReplyAt && !u.refunded && u.expiresAt > Date.now(),
    ).length;
    return {
      onlineUntil: t.onlineUntil,
      area: t.area,
      viewsToday,
      unlocksToday: today.length,
      chatsCount: activeChats,
      awaitingReply: awaiting,
      rating: t.ratingCount ? t.ratingSum / t.ratingCount : null,
      ratingCount: t.ratingCount,
      credits: user.credits ?? 0,
    };
  },
});

// ---------- Client-facing (guests allowed) ----------

function isOpenCity(settings: Awaited<ReturnType<typeof getSettings>>, city: string) {
  return settings.cities.find((c) => c.name === city)?.open ?? false;
}

export const listNearby = query({
  args: {
    city: v.string(),
    lat: v.number(),
    lng: v.number(),
    area: v.optional(v.string()),
    allAreas: v.optional(v.boolean()),
    searchKm: v.optional(v.number()),
    category: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("female"), v.literal("male"))),
    workType: v.optional(v.union(v.literal("home"), v.literal("studio"))),
    maxPrice: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const settings = await getSettings(ctx);
    const viewer = await getUser(ctx);
    // Cities open once enough therapists are approved; admins can always preview.
    if (!isOpenCity(settings, a.city) && viewer?.role !== "admin") {
      return { open: false as const, therapists: [] };
    }
    const searchKm = Math.min(Math.max(a.searchKm ?? settings.defaultSearchKm, 1), 30);
    const now = Date.now();
    const candidates = await ctx.db
      .query("therapists")
      .withIndex("by_city_verification", (q) => q.eq("city", a.city).eq("verification", "approved"))
      .collect();

    const out = [];
    for (const t of candidates) {
      if (t.onlineUntil <= now) continue;
      if (a.gender && t.gender !== a.gender) continue;
      if (a.workType && t.workType !== a.workType && t.workType !== "both") continue;
      const km = distanceKm(a.lat, a.lng, t.lat, t.lng);
      const isCityWide = t.area.startsWith("All of ") || t.area === "All areas";
      const sameArea = !!a.area && t.area.trim().toLowerCase() === a.area.trim().toLowerCase();
      if (!a.allAreas && !isCityWide && !sameArea) {
        const homeOk = t.workType !== "studio" && km <= t.radiusKm;
        const studioOk = t.workType !== "home" && km <= searchKm;
        if (!homeOk && !studioOk) continue;
      }
      const owner = await ctx.db.get(t.userId);
      if (owner?.accountStatus && owner.accountStatus !== "active") continue;
      const services = (
        await ctx.db
          .query("services")
          .withIndex("by_therapist", (q) => q.eq("therapistId", t._id))
          .collect()
      ).filter((s) => s.status !== "rejected");
      if (a.category && !services.some((s) => s.category === a.category)) continue;
      const fromPrice = services.length > 0 ? Math.min(...services.map((s) => s.priceNaira)) : 0;
      if (a.maxPrice && (services.length === 0 || fromPrice > a.maxPrice)) continue;
      out.push({
        _id: t._id,
        displayName: t.displayName,
        area: t.area,
        distanceKm: sameArea ? Math.min(fuzzyKm(km), 2) : fuzzyKm(km),
        workType: t.workType,
        minutesLeft: Math.round((t.onlineUntil - now) / 60_000),
        rating: t.ratingCount ? Math.round((t.ratingSum / t.ratingCount) * 10) / 10 : null,
        ratingCount: t.ratingCount,
        fromPrice,
        serviceNames: services.length > 0 ? services.slice(0, 3).map((s) => s.name) : ["Massage therapy"],
        photo: t.photoIds[0] ? await ctx.storage.getUrl(t.photoIds[0]) : null,
      });
    }
    out.sort((x, y) => x.distanceKm - y.distanceKm);
    return { open: true as const, therapists: out };
  },
});

export const getPublic = query({
  args: { therapistId: v.id("therapists"), lat: v.optional(v.number()), lng: v.optional(v.number()) },
  handler: async (ctx, { therapistId, lat, lng }) => {
    const t = await ctx.db.get(therapistId);
    if (!t || t.verification !== "approved") return null;
    const viewer = await getUser(ctx);
    const services = (
      await ctx.db
        .query("services")
        .withIndex("by_therapist", (q) => q.eq("therapistId", t._id))
        .collect()
    )
      .filter((s) => s.status !== "rejected")
      .map((s) => ({
        _id: s._id,
        name: s.name,
        category: s.category,
        description: s.description,
        durationMin: s.durationMin,
        priceNaira: s.priceNaira,
      }));
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_therapist", (q) => q.eq("therapistId", t._id))
      .order("desc")
      .take(10);

    let activeUnlockId: Id<"unlocks"> | null = null;
    if (viewer?.role === "client") {
      const u = await ctx.db
        .query("unlocks")
        .withIndex("by_client_therapist", (q) => q.eq("clientId", viewer._id).eq("therapistId", t._id))
        .order("desc")
        .first();
      if (u && !u.refunded && u.expiresAt > Date.now()) activeUnlockId = u._id;
    }
    return {
      _id: t._id,
      displayName: t.displayName,
      bio: t.bio,
      gender: t.gender,
      serves: t.serves,
      workType: t.workType,
      area: t.area,
      distanceKm: lat !== undefined && lng !== undefined ? fuzzyKm(distanceKm(lat, lng, t.lat, t.lng)) : null,
      online: t.onlineUntil > Date.now(),
      rating: t.ratingCount ? Math.round((t.ratingSum / t.ratingCount) * 10) / 10 : null,
      ratingCount: t.ratingCount,
      photos: await photoUrls(ctx, t.photoIds),
      services,
      reviews: reviews.map((r) => ({ _id: r._id, rating: r.rating, text: r.text, at: r._creationTime })),
      activeUnlockId,
    };
  },
});

export type PublicTherapist = Doc<"therapists">;
