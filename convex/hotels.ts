import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  requireRole,
  getUser,
  getSettings,
  applyCredits,
  cleanText,
  assertAllowedText,
  assertOwnImage,
  distanceKm,
  validLatLng,
  ALL_STATES,
} from "./lib/helpers";
import { cleanSelectedAreas, providerMatches } from "./lib/geo";

async function myHotel(ctx: QueryCtx, ownerId: Id<"users">) {
  return await ctx.db
    .query("hotels")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .first();
}

const url = (ctx: QueryCtx, id?: Id<"_storage">) => (id ? ctx.storage.getUrl(id) : Promise.resolve(null));

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, "hotel");
    const h = await myHotel(ctx, user._id);
    if (!h) return null;
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_hotel", (q) => q.eq("hotelId", h._id))
      .collect();
    const since = Date.now() - 24 * 3600_000;
    const views = await ctx.db
      .query("profileViews")
      .withIndex("by_target", (q) => q.eq("targetType", "hotel").eq("targetId", h._id))
      .order("desc")
      .take(500);
    const contactViewsToday = views.filter((v) => v._creationTime > since).length;
    const { docId, ...rest } = h; // private document id is never sent back
    return {
      ...rest,
      hasDoc: !!docId,
      contactViewsToday,
      cover: await url(ctx, h.coverId),
      exterior: (await Promise.all(h.exteriorIds.map((id) => ctx.storage.getUrl(id)))).map((u) => u ?? ""),
      rooms: await Promise.all(
        rooms.map(async (r) => {
          const photos = await Promise.all(r.photoIds.map((id) => ctx.storage.getUrl(id)));
          return { ...r, photo: photos[0] ?? null, photos: photos.map((u) => u ?? "") };
        }),
      ),
    };
  },
});

// Change the State (and cities in it) the hotel is currently available in.
export const setCoverage = mutation({
  args: {
    city: v.string(),
    areas: v.array(v.string()),
    allAreas: v.boolean(),
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (ctx, a) => {
    const user = await requireRole(ctx, "hotel");
    if (!ALL_STATES.includes(a.city)) throw new ConvexError("Choose a valid state");
    validLatLng(a.lat, a.lng);
    const areas = a.areas.map((s) => cleanText(s, "City", 2, 40)).slice(0, 40);
    if (!a.allAreas && areas.length === 0) throw new ConvexError("Pick at least one city or All in " + a.city);
    const area = a.allAreas ? `All in ${a.city}` : areas.join(", ");
    await ctx.db.patch(user._id, { city: a.city });
    const h = await myHotel(ctx, user._id);
    if (h) await ctx.db.patch(h._id, { city: a.city, area, lat: a.lat, lng: a.lng });
  },
});

export const saveHotel = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    area: v.string(),
    lat: v.number(),
    lng: v.number(),
    phone: v.string(),
    amenities: v.array(v.string()),
    coverId: v.id("_storage"),
  },
  handler: async (ctx, a) => {
    const user = await requireRole(ctx, "hotel");
    if (!user.city) throw new ConvexError("Set your city first");
    const settings = await getSettings(ctx);
    const name = cleanText(a.name, "Hotel name", 2, 60);
    const address = cleanText(a.address, "Address", 2, 160);
    const area = cleanText(a.area, "Area", 2, 300);
    assertAllowedText(`${name} ${address}`, settings.blockedWords);
    validLatLng(a.lat, a.lng);
    if (!/^\+234[789][01]\d{8}$/.test(a.phone)) throw new ConvexError("Enter a valid front-desk number");
    const amenities = a.amenities.slice(0, 12).map((x) => cleanText(x, "Amenity", 2, 30));
    await assertOwnImage(ctx, a.coverId, user._id);
    const fields = { name, address, area, lat: a.lat, lng: a.lng, phone: a.phone, amenities, coverId: a.coverId, city: user.city };
    const existing = await myHotel(ctx, user._id);
    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }
    return await ctx.db.insert("hotels", {
      ...fields,
      ownerId: user._id,
      exteriorIds: [],
      verification: "draft",
      onlineUntil: 0,
      bonusGranted: false,
    });
  },
});

export const submitVerification = mutation({
  args: { docId: v.id("_storage"), exteriorIds: v.array(v.id("_storage")) },
  handler: async (ctx, a) => {
    const user = await requireRole(ctx, "hotel");
    const h = await myHotel(ctx, user._id);
    if (!h) throw new ConvexError("Add your hotel details first");
    if (h.verification === "approved") throw new ConvexError("Already verified");
    if (a.exteriorIds.length < 2 || a.exteriorIds.length > 6) throw new ConvexError("Add 2 to 6 building photos");
    for (const id of [a.docId, ...a.exteriorIds]) await assertOwnImage(ctx, id, user._id);
    await ctx.db.patch(h._id, {
      docId: a.docId,
      exteriorIds: a.exteriorIds,
      verification: "pending",
      rejectReason: undefined,
    });
  },
});

export const goOnline = mutation({
  args: { optionId: v.string() },
  handler: async (ctx, { optionId }) => {
    const user = await requireRole(ctx, "hotel");
    const h = await myHotel(ctx, user._id);
    if (!h || h.verification !== "approved") throw new ConvexError("Your hotel isn't verified yet");
    const settings = await getSettings(ctx);
    const option = settings.onlineOptions.find((o) => o.id === optionId);
    if (!option) throw new ConvexError("Unknown option");
    const now = Date.now();
    const paystackReady = !!process.env.PAYSTACK_SECRET_KEY && process.env.OTP_BYPASS !== "true";
    const currentCredits = user.credits ?? 0;
    if (!paystackReady && currentCredits < option.credits) {
      await applyCredits(ctx, user._id, option.credits - currentCredits, "bonus", {
        refId: h._id,
        note: `Free CC grant (${option.label})`,
      });
    }
    await applyCredits(ctx, user._id, -option.credits, "online", { refId: h._id, note: option.label });
    const until = Math.max(now, h.onlineUntil) + option.hours * 3600_000;
    await ctx.db.patch(h._id, { onlineUntil: until });
    const remindAt = until - 15 * 60_000;
    if (remindAt > now) {
      await ctx.scheduler.runAt(remindAt, internal.hotels.remindEnding, { hotelId: h._id, until });
    }
    await ctx.scheduler.runAt(until, internal.hotels.expireOnline, { hotelId: h._id, until });
    return until;
  },
});

export const expireOnline = internalMutation({
  args: { hotelId: v.id("hotels"), until: v.number() },
  handler: async (ctx, { hotelId, until }) => {
    const h = await ctx.db.get(hotelId);
    if (!h || h.onlineUntil !== until) return;
    await ctx.db.patch(hotelId, { onlineUntil: 0 });
  },
});

export const goOffline = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, "hotel");
    const h = await myHotel(ctx, user._id);
    if (h) await ctx.db.patch(h._id, { onlineUntil: 0 });
  },
});

export const remindEnding = internalMutation({
  args: { hotelId: v.id("hotels"), until: v.number() },
  handler: async (ctx, { hotelId, until }) => {
    const h = await ctx.db.get(hotelId);
    if (!h || h.onlineUntil !== until) return;
    await ctx.scheduler.runAfter(0, internal.notifications.send, {
      userId: h.ownerId,
      title: "15 minutes left online",
      body: "Extend now so guests can keep finding your rooms.",
      url: "/host",
    });
  },
});

export const recordContactView = mutation({
  args: { hotelId: v.id("hotels") },
  handler: async (ctx, { hotelId }) => {
    const h = await ctx.db.get(hotelId);
    if (!h) return;
    const viewer = await getUser(ctx);
    if (viewer?._id === h.ownerId) return;
    await ctx.db.insert("profileViews", {
      targetType: "hotel",
      targetId: hotelId,
      viewerId: viewer?._id,
    });
  },
});

// ---------- Client-facing (guests allowed). Hotel contact is free. ----------

export const listNearby = query({
  args: {
    city: v.string(),
    lat: v.number(),
    lng: v.number(),
    area: v.optional(v.string()),
    areas: v.optional(v.array(v.string())),
    allAreas: v.optional(v.boolean()),
    searchKm: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const settings = await getSettings(ctx);
    const viewer = await getUser(ctx);
    const open = settings.cities.find((c) => c.name === a.city)?.open ?? false;
    if (!open && viewer?.role !== "admin") return { open: false as const, hotels: [] };
    const searchKm = Math.min(Math.max(a.searchKm ?? settings.defaultSearchKm, 1), 30);
    void searchKm;
    const now = Date.now();
    const hotels = await ctx.db
      .query("hotels")
      .filter((q) => q.and(q.eq(q.field("verification"), "approved"), q.gt(q.field("onlineUntil"), now)))
      .collect();

    const selectedAreas = cleanSelectedAreas([...(a.areas ?? []), ...(a.area ? [a.area] : [])]);

    const out = [];
    for (const h of hotels) {
      if (h.onlineUntil <= now) continue;
      const km = distanceKm(a.lat, a.lng, h.lat, h.lng);
      const match = providerMatches(h, a.city, selectedAreas);
      if (!match.ok) continue;
      const rooms = (
        await ctx.db
          .query("rooms")
          .withIndex("by_hotel", (q) => q.eq("hotelId", h._id))
          .collect()
      ).filter((r) => r.status !== "rejected" && r.availableCount > 0);
      if (rooms.length === 0) continue;
      out.push({
        _id: h._id,
        name: h.name,
        area: h.area,
        distanceKm: Math.round(km * 10) / 10,
        fromPrice: Math.min(...rooms.map((r) => r.pricePerNight)),
        roomsAvailable: rooms.reduce((n, r) => n + r.availableCount, 0),
        cover: await url(ctx, h.coverId),
      });
    }
    out.sort((x, y) => x.distanceKm - y.distanceKm);
    return { open: true as const, hotels: out };
  },
});

export const getPublic = query({
  args: { hotelId: v.id("hotels") },
  handler: async (ctx, { hotelId }) => {
    const h = await ctx.db.get(hotelId);
    if (!h || h.verification !== "approved") return null;
    const rooms = (
      await ctx.db
        .query("rooms")
        .withIndex("by_hotel", (q) => q.eq("hotelId", h._id))
        .collect()
    ).filter((r) => r.status !== "rejected");
    return {
      _id: h._id,
      name: h.name,
      area: h.area,
      address: h.address,
      phone: h.phone,
      lat: h.lat,
      lng: h.lng,
      amenities: h.amenities,
      online: h.onlineUntil > Date.now(),
      cover: await url(ctx, h.coverId),
      rooms: await Promise.all(
        rooms.map(async (r) => ({
          _id: r._id,
          name: r.name,
          pricePerNight: r.pricePerNight,
          availableCount: r.availableCount,
          photos: (await Promise.all(r.photoIds.map((id) => ctx.storage.getUrl(id)))).filter(
            (u): u is string => !!u,
          ),
        })),
      ),
    };
  },
});
