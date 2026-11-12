import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireRole, getSettings, applyCredits, cleanText, DEFAULT_SETTINGS } from "./lib/helpers";

async function log(ctx: MutationCtx, actorId: Id<"users">, action: string, target: string, detail?: string) {
  await ctx.db.insert("adminLog", { actorId, action, target, detail });
}

const DAY = 24 * 3600_000;

// ---------- Overview ----------

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    const now = Date.now();
    const users = await ctx.db.query("users").collect();
    const byRole = { client: 0, therapist: 0, hotel: 0, admin: 0, none: 0 };
    let creditsHeld = 0;
    let activeUsers = 0;
    for (const u of users) {
      byRole[(u.role ?? "none") as keyof typeof byRole]++;
      creditsHeld += u.credits ?? 0;
      if ((u.accountStatus ?? "active") === "active" && u.role) activeUsers++;
    }
    const ledger = await ctx.db.query("ledger").collect();
    const creditsSpent = ledger
      .filter((l) => l.delta < 0 && (l.reason === "unlock" || l.reason === "online"))
      .reduce((n, l) => n - l.delta, 0);
    const success = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "success"))
      .collect();
    const sum = (since: number) =>
      success.filter((p) => (p.verifiedAt ?? p._creationTime) >= since).reduce((n, p) => n + p.amountKobo / 100, 0);
    const failed = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .collect();

    const settings = await getSettings(ctx);
    const cities = [];
    let onlineTherapists = 0;
    let onlineHotels = 0;
    for (const c of settings.cities) {
      const approved = await ctx.db
        .query("therapists")
        .withIndex("by_city_verification", (q) => q.eq("city", c.name).eq("verification", "approved"))
        .collect();
      const approvedHotels = await ctx.db
        .query("hotels")
        .withIndex("by_city_verification", (q) => q.eq("city", c.name).eq("verification", "approved"))
        .collect();
      const tOnline = approved.filter((t) => t.onlineUntil > now).length;
      const hOnline = approvedHotels.filter((h) => h.onlineUntil > now).length;
      onlineTherapists += tOnline;
      onlineHotels += hOnline;
      cities.push({
        name: c.name,
        open: c.open,
        approvedTherapists: approved.length,
        onlineNow: tOnline,
        approvedHotels: approvedHotels.length,
        onlineHotelsNow: hOnline,
      });
    }
    const pendingT = await ctx.db
      .query("therapists")
      .withIndex("by_verification", (q) => q.eq("verification", "pending"))
      .collect();
    const pendingH = await ctx.db
      .query("hotels")
      .withIndex("by_verification", (q) => q.eq("verification", "pending"))
      .collect();
    const pendingServices = await ctx.db
      .query("services")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    const pendingRooms = await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    const openReports = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    return {
      revenue: { today: sum(now - DAY), week: sum(now - 7 * DAY), month: sum(now - 30 * DAY), all: sum(0) },
      creditsSold: success.reduce((n, p) => n + p.credits, 0),
      creditsSpent,
      creditsHeld,
      activeUsers,
      onlineTherapists,
      onlineHotels,
      failedPayments: failed.filter((p) => p._creationTime >= now - 7 * DAY).length,
      users: byRole,
      cities,
      queues: {
        verification: pendingT.length + pendingH.length,
        services: pendingServices.length,
        rooms: pendingRooms.length,
        reports: openReports.length,
      },
    };
  },
});

// ---------- Verification ----------

export const verificationQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    const url = (id?: Id<"_storage">) => (id ? ctx.storage.getUrl(id) : Promise.resolve(null));
    const therapists = await ctx.db
      .query("therapists")
      .withIndex("by_verification", (q) => q.eq("verification", "pending"))
      .collect();
    const hotels = await ctx.db
      .query("hotels")
      .withIndex("by_verification", (q) => q.eq("verification", "pending"))
      .collect();
    return {
      therapists: await Promise.all(
        therapists.map(async (t) => {
          const u = await ctx.db.get(t.userId);
          const services = await ctx.db
            .query("services")
            .withIndex("by_therapist", (q) => q.eq("therapistId", t._id))
            .collect();
          return {
            _id: t._id,
            displayName: t.displayName,
            phone: u?.phone ?? "",
            city: t.city,
            area: t.area,
            bio: t.bio,
            gender: t.gender,
            workType: t.workType,
            photos: (await Promise.all(t.photoIds.map((id) => ctx.storage.getUrl(id)))).filter(Boolean),
            idDoc: await url(t.idDocId),
            selfie: await url(t.selfieId),
            cert: await url(t.certId),
            services: services.map((s) => `${s.name} · ${s.durationMin} min · ₦${s.priceNaira}`),
            submittedAt: t._creationTime,
          };
        }),
      ),
      hotels: await Promise.all(
        hotels.map(async (h) => {
          const u = await ctx.db.get(h.ownerId);
          return {
            _id: h._id,
            name: h.name,
            phone: h.phone,
            ownerPhone: u?.phone ?? "",
            city: h.city,
            area: h.area,
            address: h.address,
            lat: h.lat,
            lng: h.lng,
            cover: await url(h.coverId),
            exterior: (await Promise.all(h.exteriorIds.map((id) => ctx.storage.getUrl(id)))).filter(Boolean),
            doc: await url(h.docId),
          };
        }),
      ),
    };
  },
});

export const reviewTherapist = mutation({
  args: { therapistId: v.id("therapists"), approve: v.boolean(), reason: v.optional(v.string()) },
  handler: async (ctx, { therapistId, approve, reason }) => {
    const admin = await requireRole(ctx, "admin");
    const t = await ctx.db.get(therapistId);
    if (!t) throw new ConvexError("Not found");
    if (approve) {
      await ctx.db.patch(therapistId, { verification: "approved", rejectReason: undefined });
      // Approving a therapist also approves the services submitted with the application.
      const services = await ctx.db
        .query("services")
        .withIndex("by_therapist", (q) => q.eq("therapistId", therapistId))
        .collect();
      for (const s of services) if (s.status === "pending") await ctx.db.patch(s._id, { status: "approved" });
      if (!t.bonusGranted) {
        const settings = await getSettings(ctx);
        if (settings.welcomeBonusCredits > 0) {
          await applyCredits(ctx, t.userId, settings.welcomeBonusCredits, "bonus", { note: "Welcome bonus" });
        }
        await ctx.db.patch(therapistId, { bonusGranted: true });
      }
    } else {
      const why = cleanText(reason ?? "", "Reason", 5, 300);
      await ctx.db.patch(therapistId, { verification: "rejected", rejectReason: why });
    }
    await log(ctx, admin._id, approve ? "approve_therapist" : "reject_therapist", therapistId, reason);
    await ctx.scheduler.runAfter(0, internal.notifications.send, {
      userId: t.userId,
      title: approve ? "You're verified" : "Verification update",
      body: approve ? "Your profile is approved. Go online to start getting clients." : `Not approved: ${reason}`,
    });
  },
});

export const reviewHotel = mutation({
  args: { hotelId: v.id("hotels"), approve: v.boolean(), reason: v.optional(v.string()) },
  handler: async (ctx, { hotelId, approve, reason }) => {
    const admin = await requireRole(ctx, "admin");
    const h = await ctx.db.get(hotelId);
    if (!h) throw new ConvexError("Not found");
    if (approve) {
      await ctx.db.patch(hotelId, { verification: "approved", rejectReason: undefined });
      const rooms = await ctx.db
        .query("rooms")
        .withIndex("by_hotel", (q) => q.eq("hotelId", hotelId))
        .collect();
      for (const r of rooms) if (r.status === "pending") await ctx.db.patch(r._id, { status: "approved" });
      if (!h.bonusGranted) {
        const settings = await getSettings(ctx);
        if (settings.welcomeBonusCredits > 0) {
          await applyCredits(ctx, h.ownerId, settings.welcomeBonusCredits, "bonus", { note: "Welcome bonus" });
        }
        await ctx.db.patch(hotelId, { bonusGranted: true });
      }
    } else {
      const why = cleanText(reason ?? "", "Reason", 5, 300);
      await ctx.db.patch(hotelId, { verification: "rejected", rejectReason: why });
    }
    await log(ctx, admin._id, approve ? "approve_hotel" : "reject_hotel", hotelId, reason);
    await ctx.scheduler.runAfter(0, internal.notifications.send, {
      userId: h.ownerId,
      title: approve ? "Your hotel is verified" : "Verification update",
      body: approve ? "Add rooms and go online so guests can find you." : `Not approved: ${reason}`,
    });
  },
});

// ---------- Users ----------

export const users = query({
  args: { role: v.optional(v.string()), city: v.optional(v.string()), search: v.optional(v.string()) },
  handler: async (ctx, { role, city, search }) => {
    await requireRole(ctx, "admin");
    let rows = await ctx.db.query("users").order("desc").take(1000);
    if (role) rows = rows.filter((u) => u.role === role);
    if (city) rows = rows.filter((u) => u.city === city);
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((u) => (u.phone ?? "").includes(s) || (u.name ?? "").toLowerCase().includes(s));
    }
    return rows.slice(0, 200).map((u) => ({
      _id: u._id,
      name: u.name ?? "",
      phone: u.phone ?? "",
      role: u.role ?? null,
      city: u.city ?? null,
      credits: u.credits ?? 0,
      accountStatus: u.accountStatus ?? "active",
      adminPermissions: u.adminPermissions ?? null,
      joined: u._creationTime,
    }));
  },
});

export const setAccountStatus = mutation({
  args: {
    userId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("banned")),
    reason: v.string(),
  },
  handler: async (ctx, { userId, status, reason }) => {
    const admin = await requireRole(ctx, "admin");
    if (userId === admin._id) throw new ConvexError("You can't change your own status");
    const target = await ctx.db.get(userId);
    if (!target) throw new ConvexError("Not found");
    if (target.role === "admin") throw new ConvexError("Admins are managed from the Convex dashboard");
    const why = cleanText(reason, "Reason", 3, 300);
    await ctx.db.patch(userId, { accountStatus: status });
    if (status !== "active") {
      const t = await ctx.db.query("therapists").withIndex("by_user", (q) => q.eq("userId", userId)).first();
      if (t) await ctx.db.patch(t._id, { onlineUntil: Date.now() });
      const h = await ctx.db.query("hotels").withIndex("by_owner", (q) => q.eq("ownerId", userId)).first();
      if (h) await ctx.db.patch(h._id, { onlineUntil: Date.now() });
    }
    await log(ctx, admin._id, `set_status_${status}`, userId, why);
  },
});

export const adjustWallet = mutation({
  args: { userId: v.id("users"), delta: v.number(), note: v.string() },
  handler: async (ctx, { userId, delta, note }) => {
    const admin = await requireRole(ctx, "admin");
    if (!Number.isInteger(delta) || Math.abs(delta) > 500) throw new ConvexError("Adjust by up to 500 credits");
    const why = cleanText(note, "Note", 5, 300);
    await applyCredits(ctx, userId, delta, "admin", { note: why, actorId: admin._id });
    await log(ctx, admin._id, "adjust_wallet", userId, `${delta}: ${why}`);
  },
});

export const userLedger = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireRole(ctx, "admin");
    return await ctx.db
      .query("ledger")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
  },
});

// ---------- Transactions ----------

export const transactions = query({
  args: {
    status: v.optional(
      v.union(v.literal("pending"), v.literal("success"), v.literal("failed"), v.literal("abandoned")),
    ),
    days: v.optional(v.number()),
  },
  handler: async (ctx, { status, days }) => {
    await requireRole(ctx, "admin");
    const since = days ? Date.now() - days * DAY : 0;
    const raw = status
      ? await ctx.db
          .query("payments")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .take(300)
      : await ctx.db.query("payments").order("desc").take(300);
    const rows = since ? raw.filter((p) => p._creationTime >= since) : raw;
    return await Promise.all(
      rows.map(async (p) => {
        const u = await ctx.db.get(p.userId);
        return {
          _id: p._id,
          reference: p.reference,
          phone: u?.phone ?? "",
          name: u?.name ?? "",
          role: u?.role ?? null,
          credits: p.credits,
          amountNaira: p.amountKobo / 100,
          status: p.status,
          gatewayResponse: p.gatewayResponse ?? "",
          at: p._creationTime,
        };
      }),
    );
  },
});

// ---------- Moderation ----------

export const moderationQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    const services = await ctx.db
      .query("services")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(200);
    const allRooms = await ctx.db.query("rooms").order("desc").take(300);
    const rooms = allRooms.filter((r) => r.status === "pending" || r.needsReview);
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .take(200);
    const allReviews = await ctx.db.query("reviews").order("desc").take(100);
    const lowReviews = allReviews.filter((r) => r.rating <= 2);
    const allUsers = await ctx.db.query("users").take(500);
    const suspendedUsers = allUsers.filter((u) => u.accountStatus === "suspended");

    return {
      services: await Promise.all(
        services.map(async (s) => {
          const t = await ctx.db.get(s.therapistId);
          return { ...s, therapistName: t?.displayName ?? "", therapistVerified: t?.verification === "approved" };
        }),
      ),
      rooms: await Promise.all(
        rooms.map(async (r) => {
          const h = await ctx.db.get(r.hotelId);
          return {
            _id: r._id,
            name: r.name,
            pricePerNight: r.pricePerNight,
            status: r.status,
            hotelName: h?.name ?? "",
            photos: (await Promise.all(r.photoIds.map((id) => ctx.storage.getUrl(id)))).filter(Boolean),
          };
        }),
      ),
      reports: await Promise.all(
        reports.map(async (r) => {
          const target = await ctx.db.get(r.targetUserId);
          const reporter = await ctx.db.get(r.reporterId);
          return {
            _id: r._id,
            targetType: r.targetType,
            targetUserId: r.targetUserId,
            targetName: target?.name ?? "",
            targetPhone: target?.phone ?? "",
            targetStatus: target?.accountStatus ?? "active",
            reporterPhone: reporter?.phone ?? "",
            reason: r.reason,
            at: r._creationTime,
          };
        }),
      ),
      lowReviews: await Promise.all(
        lowReviews.map(async (r) => {
          const t = await ctx.db.get(r.therapistId);
          const c = await ctx.db.get(r.clientId);
          return {
            _id: r._id,
            rating: r.rating,
            text: r.text,
            therapistName: t?.displayName ?? "",
            therapistUserId: t?.userId ?? null,
            clientPhone: c?.phone ?? "",
            at: r._creationTime,
          };
        }),
      ),
      suspendedUsers: suspendedUsers.map((u) => ({
        _id: u._id,
        name: u.name ?? "",
        phone: u.phone ?? "",
        role: u.role ?? "",
      })),
    };
  },
});

export const reviewService = mutation({
  args: { serviceId: v.id("services"), approve: v.boolean(), reason: v.optional(v.string()) },
  handler: async (ctx, { serviceId, approve, reason }) => {
    const admin = await requireRole(ctx, "admin");
    const s = await ctx.db.get(serviceId);
    if (!s) throw new ConvexError("Not found");
    await ctx.db.patch(serviceId, {
      status: approve ? "approved" : "rejected",
      rejectReason: approve ? undefined : cleanText(reason ?? "", "Reason", 3, 200),
    });
    await log(ctx, admin._id, approve ? "approve_service" : "reject_service", serviceId, reason);
  },
});

export const reviewRoom = mutation({
  args: { roomId: v.id("rooms"), approve: v.boolean(), reason: v.optional(v.string()) },
  handler: async (ctx, { roomId, approve, reason }) => {
    const admin = await requireRole(ctx, "admin");
    const r = await ctx.db.get(roomId);
    if (!r) throw new ConvexError("Not found");
    await ctx.db.patch(roomId, {
      status: approve ? "approved" : "rejected",
      needsReview: undefined,
      rejectReason: approve ? undefined : cleanText(reason ?? "", "Reason", 3, 200),
    });
    await log(ctx, admin._id, approve ? "approve_room" : "reject_room", roomId, reason);
  },
});

// ---------- Refunds ----------

export const refunds = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    const unlocks = await ctx.db.query("unlocks").order("desc").take(200);
    return await Promise.all(
      unlocks.map(async (u) => {
        const client = await ctx.db.get(u.clientId);
        const therapist = await ctx.db.get(u.therapistId);
        return {
          _id: u._id,
          clientName: client?.name ?? "Client",
          clientPhone: client?.phone ?? "",
          therapistName: therapist?.displayName ?? "Therapist",
          cost: u.cost,
          refunded: u.refunded,
          replied: !!u.firstReplyAt,
          at: u._creationTime,
        };
      }),
    );
  },
});

export const manualRefund = mutation({
  args: { unlockId: v.id("unlocks"), reason: v.string() },
  handler: async (ctx, { unlockId, reason }) => {
    const admin = await requireRole(ctx, "admin");
    const u = await ctx.db.get(unlockId);
    if (!u) throw new ConvexError("Unlock not found");
    if (u.refunded) throw new ConvexError("Already refunded");
    const why = cleanText(reason, "Reason", 3, 200);
    await ctx.db.patch(unlockId, { refunded: true, expiresAt: Date.now() });
    await applyCredits(ctx, u.clientId, u.cost, "refund", {
      refId: unlockId,
      note: `Manual refund: ${why}`,
      actorId: admin._id,
    });
    await log(ctx, admin._id, "manual_refund", unlockId, why);
    await ctx.scheduler.runAfter(0, internal.notifications.send, {
      userId: u.clientId,
      title: "Connection Credits refunded",
      body: `We returned ${u.cost} CC to your wallet: ${why}`,
      url: "/home/wallet",
    });
  },
});

// ---------- Broadcast Notifications & Sub-admins ----------

export const broadcast = mutation({
  args: {
    channel: v.union(v.literal("push"), v.literal("sms")),
    role: v.optional(v.string()),
    city: v.optional(v.string()),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { channel, role, city, title, body }) => {
    const admin = await requireRole(ctx, "admin");
    const cleanTitle = cleanText(title, "Title", 2, 80);
    const cleanBody = cleanText(body, "Message", 5, 300);
    let targets = await ctx.db.query("users").take(1000);
    targets = targets.filter((u) => (u.accountStatus ?? "active") === "active");
    if (role) targets = targets.filter((u) => u.role === role);
    if (city) targets = targets.filter((u) => u.city === city);

    let sent = 0;
    for (const u of targets) {
      if (channel === "push" && u.pushToken) {
        await ctx.scheduler.runAfter(0, internal.notifications.send, {
          userId: u._id,
          title: cleanTitle,
          body: cleanBody,
        });
        sent++;
      } else if (channel === "sms" && u.phone) {
        await ctx.scheduler.runAfter(0, internal.notifications.sendSms, {
          phone: u.phone,
          message: `${cleanTitle}: ${cleanBody}`,
        });
        sent++;
      }
    }
    await log(
      ctx,
      admin._id,
      `broadcast_${channel}`,
      `${role ?? "all"}:${city ?? "all"}`,
      `${sent} recipients · ${cleanTitle}`,
    );
    return sent;
  },
});

export const setSubAdmin = mutation({
  args: {
    phone: v.string(),
    permissions: v.optional(v.array(v.string())),
    revoke: v.optional(v.boolean()),
  },
  handler: async (ctx, { phone, permissions, revoke }) => {
    const admin = await requireRole(ctx, "admin");
    if (admin.adminPermissions && admin.adminPermissions.length > 0) {
      throw new ConvexError("Only full admins can manage sub-admins");
    }
    const target = await ctx.db
      .query("users")
      .withIndex("phone", (q) => q.eq("phone", phone))
      .first();
    if (!target) throw new ConvexError("No user found with this phone number (have them sign in once first)");
    if (target._id === admin._id) throw new ConvexError("You cannot modify your own admin role");
    if (revoke) {
      await ctx.db.patch(target._id, { role: "client", adminPermissions: undefined });
      await log(ctx, admin._id, "revoke_subadmin", target._id, phone);
    } else {
      const perms = permissions && permissions.length > 0 ? permissions : ["verify", "moderate"];
      await ctx.db.patch(target._id, {
        role: "admin",
        accountStatus: "active",
        adminPermissions: perms,
        name: target.name || "Sub-admin",
      });
      await log(ctx, admin._id, "grant_subadmin", target._id, `${phone} (${perms.join(", ")})`);
    }
  },
});

export const resolveReport = mutation({
  args: { reportId: v.id("reports"), outcome: v.union(v.literal("resolved"), v.literal("dismissed")) },
  handler: async (ctx, { reportId, outcome }) => {
    const admin = await requireRole(ctx, "admin");
    await ctx.db.patch(reportId, { status: outcome });
    await log(ctx, admin._id, `report_${outcome}`, reportId);
  },
});

// ---------- Settings ----------

export const getAllSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    return await getSettings(ctx);
  },
});

export const updateSettings = mutation({
  args: { value: v.any() },
  handler: async (ctx, { value }) => {
    const admin = await requireRole(ctx, "admin");
    const current = await getSettings(ctx);
    const next = { ...current };
    // Only known keys, with type checks.
    const intOk = (n: unknown, min: number, max: number) =>
      typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
    if (value.unlockCost !== undefined) {
      if (!intOk(value.unlockCost, 1, 20)) throw new ConvexError("Unlock cost 1–20");
      next.unlockCost = value.unlockCost;
    }
    if (value.unlockDays !== undefined) {
      if (!intOk(value.unlockDays, 1, 30)) throw new ConvexError("Unlock days 1–30");
      next.unlockDays = value.unlockDays;
    }
    if (value.welcomeBonusCredits !== undefined) {
      if (!intOk(value.welcomeBonusCredits, 0, 20)) throw new ConvexError("Bonus 0–20");
      next.welcomeBonusCredits = value.welcomeBonusCredits;
    }
    if (value.reportSuspendThreshold !== undefined) {
      if (!intOk(value.reportSuspendThreshold, 1, 20)) throw new ConvexError("Threshold 1–20");
      next.reportSuspendThreshold = value.reportSuspendThreshold;
    }
    if (value.defaultSearchKm !== undefined) {
      if (!intOk(value.defaultSearchKm, 1, 30)) throw new ConvexError("Search radius 1–30 km");
      next.defaultSearchKm = value.defaultSearchKm;
    }
    if (value.packs !== undefined) {
      if (!Array.isArray(value.packs) || value.packs.length < 1 || value.packs.length > 6) throw new ConvexError("1–6 packs");
      for (const p of value.packs) {
        if (typeof p.id !== "string" || !intOk(p.credits, 1, 1000) || !intOk(p.priceNaira, 100, 1_000_000)) {
          throw new ConvexError("Invalid pack");
        }
      }
      next.packs = value.packs.map((p: { id: string; credits: number; priceNaira: number }) => ({
        id: p.id,
        credits: p.credits,
        priceNaira: p.priceNaira,
      }));
    }
    if (value.onlineOptions !== undefined) {
      if (!Array.isArray(value.onlineOptions) || value.onlineOptions.length < 1) throw new ConvexError("Add options");
      for (const o of value.onlineOptions) {
        if (typeof o.id !== "string" || typeof o.label !== "string" || !intOk(o.hours, 1, 24 * 30) || !intOk(o.credits, 1, 500)) {
          throw new ConvexError("Invalid online option");
        }
      }
      next.onlineOptions = value.onlineOptions.map((o: { id: string; label: string; hours: number; credits: number }) => ({
        id: o.id,
        label: o.label,
        hours: o.hours,
        credits: o.credits,
      }));
    }
    if (value.cities !== undefined) {
      if (!Array.isArray(value.cities)) throw new ConvexError("Invalid cities");
      next.cities = value.cities.map((c: { name: string; open: boolean }) => ({
        name: cleanText(String(c.name), "City", 2, 40),
        open: !!c.open,
      }));
    }
    if (value.categories !== undefined) {
      if (!Array.isArray(value.categories)) throw new ConvexError("Invalid categories");
      next.categories = value.categories.map((c: string) => cleanText(String(c), "Category", 2, 30));
    }
    if (value.blockedWords !== undefined) {
      if (!Array.isArray(value.blockedWords) || value.blockedWords.length > 2000) throw new ConvexError("Invalid list");
      next.blockedWords = value.blockedWords
        .map((w: string) => String(w).trim().toLowerCase())
        .filter((w: string) => w.length > 1 && w.length < 40);
    }
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "main"))
      .first();
    if (row) await ctx.db.patch(row._id, { value: next });
    else await ctx.db.insert("settings", { key: "main", value: next });
    await log(ctx, admin._id, "update_settings", "settings", Object.keys(value).join(","));
  },
});

export const activity = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    const rows = await ctx.db.query("adminLog").order("desc").take(100);
    return await Promise.all(
      rows.map(async (r) => ({ ...r, actorName: (await ctx.db.get(r.actorId))?.name ?? "" })),
    );
  },
});

// ---------- Run from the Convex dashboard only ----------
// npx convex run admin:makeAdmin '{"phone":"+2348012345678"}'
export const makeAdmin = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("phone", (q) => q.eq("phone", phone))
      .first();
    if (!user) {
      return await ctx.db.insert("users", {
        phone,
        phoneVerificationTime: Date.now(),
        role: "admin",
        accountStatus: "active",
        name: "Admin",
        credits: 0,
      });
    }
    await ctx.db.patch(user._id, { role: "admin", accountStatus: "active", name: user.name ?? "Admin" });
    return user._id;
  },
});

// npx convex run admin:seedSettings
export const seedSettings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "main"))
      .first();
    if (!row) {
      await ctx.db.insert("settings", { key: "main", value: DEFAULT_SETTINGS });
    } else {
      await ctx.db.patch(row._id, {
        value: {
          ...row.value,
          cities: [
            { name: "Lagos", open: true },
            { name: "Abuja", open: true },
          ],
        },
      });
    }
  },
});
