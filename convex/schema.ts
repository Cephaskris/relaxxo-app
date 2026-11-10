import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const roleV = v.union(
  v.literal("client"),
  v.literal("therapist"),
  v.literal("hotel"),
  v.literal("admin"),
);
export const verificationV = v.union(
  v.literal("draft"),
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
);
export const moderationV = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
);
export const accountStatusV = v.union(
  v.literal("active"),
  v.literal("suspended"),
  v.literal("banned"),
);

export default defineSchema({
  ...authTables,

  // Extends the Convex Auth users table. Keep the "email" and "phone" indexes.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(roleV),
    gender: v.optional(v.union(v.literal("female"), v.literal("male"))),
    accountStatus: v.optional(accountStatusV),
    city: v.optional(v.string()),
    credits: v.optional(v.number()),
    pushToken: v.optional(v.string()),
    savedTherapistIds: v.optional(v.array(v.id("therapists"))),
    adminPermissions: v.optional(v.array(v.string())),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"]),

  therapists: defineTable({
    userId: v.id("users"),
    displayName: v.string(),
    bio: v.string(),
    gender: v.union(v.literal("female"), v.literal("male")),
    serves: v.union(v.literal("women"), v.literal("men"), v.literal("both")),
    workType: v.union(v.literal("home"), v.literal("studio"), v.literal("both")),
    city: v.string(),
    area: v.string(),
    lat: v.number(),
    lng: v.number(),
    radiusKm: v.number(),
    photoIds: v.array(v.id("_storage")),
    idDocId: v.optional(v.id("_storage")),
    selfieId: v.optional(v.id("_storage")),
    certId: v.optional(v.id("_storage")),
    verification: verificationV,
    rejectReason: v.optional(v.string()),
    onlineUntil: v.number(),
    ratingSum: v.number(),
    ratingCount: v.number(),
    bonusGranted: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_verification", ["verification"])
    .index("by_city_verification", ["city", "verification"]),

  services: defineTable({
    therapistId: v.id("therapists"),
    category: v.string(),
    name: v.string(),
    description: v.string(),
    durationMin: v.number(),
    priceNaira: v.number(),
    status: moderationV,
    rejectReason: v.optional(v.string()),
  })
    .index("by_therapist", ["therapistId"])
    .index("by_status", ["status"]),

  hotels: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    address: v.string(),
    city: v.string(),
    area: v.string(),
    lat: v.number(),
    lng: v.number(),
    phone: v.string(),
    amenities: v.array(v.string()),
    coverId: v.optional(v.id("_storage")),
    exteriorIds: v.array(v.id("_storage")),
    docId: v.optional(v.id("_storage")),
    verification: verificationV,
    rejectReason: v.optional(v.string()),
    onlineUntil: v.number(),
    bonusGranted: v.boolean(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_verification", ["verification"])
    .index("by_city_verification", ["city", "verification"]),

  rooms: defineTable({
    hotelId: v.id("hotels"),
    name: v.string(),
    photoIds: v.array(v.id("_storage")),
    pricePerNight: v.number(),
    availableCount: v.number(),
    status: moderationV,
    needsReview: v.optional(v.boolean()),
    rejectReason: v.optional(v.string()),
  })
    .index("by_hotel", ["hotelId"])
    .index("by_status", ["status"]),

  // Every credit movement. users.credits is the cached balance, always changed together with a ledger row.
  ledger: defineTable({
    userId: v.id("users"),
    delta: v.number(),
    reason: v.union(
      v.literal("purchase"),
      v.literal("unlock"),
      v.literal("online"),
      v.literal("refund"),
      v.literal("bonus"),
      v.literal("admin"),
    ),
    refId: v.optional(v.string()),
    note: v.optional(v.string()),
    actorId: v.optional(v.id("users")),
    balanceAfter: v.number(),
  }).index("by_user", ["userId"]),

  payments: defineTable({
    userId: v.id("users"),
    reference: v.string(),
    packId: v.string(),
    credits: v.number(),
    amountKobo: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("abandoned"),
    ),
    gatewayResponse: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
  })
    .index("by_reference", ["reference"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  unlocks: defineTable({
    clientId: v.id("users"),
    therapistId: v.id("therapists"),
    therapistUserId: v.id("users"),
    cost: v.number(),
    expiresAt: v.number(),
    refunded: v.boolean(),
    firstReplyAt: v.optional(v.number()),
    lastMessageAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_therapistUser", ["therapistUserId"])
    .index("by_client_therapist", ["clientId", "therapistId"]),

  messages: defineTable({
    unlockId: v.id("unlocks"),
    senderId: v.id("users"),
    body: v.string(),
  }).index("by_unlock", ["unlockId"]),

  reviews: defineTable({
    unlockId: v.id("unlocks"),
    clientId: v.id("users"),
    therapistId: v.id("therapists"),
    rating: v.number(),
    text: v.string(),
  })
    .index("by_therapist", ["therapistId"])
    .index("by_unlock", ["unlockId"]),

  reports: defineTable({
    reporterId: v.id("users"),
    targetType: v.union(v.literal("therapist"), v.literal("hotel"), v.literal("message")),
    targetId: v.string(),
    targetUserId: v.id("users"),
    reason: v.string(),
    status: v.union(v.literal("open"), v.literal("resolved"), v.literal("dismissed")),
  })
    .index("by_status", ["status"])
    .index("by_target_user", ["targetUserId"]),

  // Files uploaded by a user. Profiles may only reference files their owner uploaded.
  uploads: defineTable({
    storageId: v.id("_storage"),
    ownerId: v.id("users"),
    kind: v.union(v.literal("public"), v.literal("private")),
  }).index("by_storage", ["storageId"]),

  settings: defineTable({ key: v.string(), value: v.any() }).index("by_key", ["key"]),

  rateLimits: defineTable({ key: v.string(), windowStart: v.number(), count: v.number() }).index(
    "by_key",
    ["key"],
  ),

  adminLog: defineTable({
    actorId: v.id("users"),
    action: v.string(),
    target: v.string(),
    detail: v.optional(v.string()),
  }),

  profileViews: defineTable({
    targetType: v.union(v.literal("therapist"), v.literal("hotel")),
    targetId: v.string(),
    viewerId: v.optional(v.id("users")),
  }).index("by_target", ["targetType", "targetId"]),
});
