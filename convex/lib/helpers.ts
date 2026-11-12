import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

// ---------- Settings (admin-editable, with safe defaults) ----------

export type OnlineOption = { id: string; label: string; hours: number; credits: number };
export type CreditPack = { id: string; credits: number; priceNaira: number };
export type CitySetting = { name: string; open: boolean };

export type Settings = {
  packs: CreditPack[];
  unlockCost: number;
  unlockDays: number;
  onlineOptions: OnlineOption[];
  welcomeBonusCredits: number;
  cities: CitySetting[];
  categories: string[];
  blockedWords: string[];
  reportSuspendThreshold: number;
  defaultSearchKm: number;
};

export const ALL_STATES = [
  "Lagos",
  "Abuja",
  "Oyo",
  "Rivers",
  "Sokoto",
  "Kano",
  "Delta",
  "Edo",
  "Enugu",
  "Anambra",
  "Ogun",
  "Kaduna",
  "Akwa Ibom",
  "Imo",
  "Kwara",
  "Plateau",
  "Cross River",
  "Abia",
  "Ondo",
  "Osun",
  "Ekiti",
  "Benue",
  "Kogi",
  "Nasarawa",
  "Niger",
  "Bauchi",
  "Gombe",
  "Adamawa",
  "Taraba",
  "Borno",
  "Yobe",
  "Jigawa",
  "Katsina",
  "Kebbi",
  "Zamfara",
  "Bayelsa",
  "Ebonyi",
];

export const DEFAULT_SETTINGS: Settings = {
  packs: [
    { id: "p5", credits: 5, priceNaira: 2500 },
    { id: "p12", credits: 12, priceNaira: 5000 },
    { id: "p30", credits: 30, priceNaira: 10000 },
  ],
  unlockCost: 1,
  unlockDays: 7,
  onlineOptions: [
    { id: "1h", label: "1 hour", hours: 1, credits: 1 },
    { id: "2h", label: "2 hours", hours: 2, credits: 2 },
    { id: "2d", label: "2 days", hours: 48, credits: 8 },
    { id: "3d", label: "3 days", hours: 72, credits: 10 },
  ],
  welcomeBonusCredits: 2,
  cities: ALL_STATES.map((name) => ({ name, open: true })),
  categories: [
    "Relaxation",
    "Deep tissue",
    "Sports",
    "Hot stone",
    "Aromatherapy",
    "Reflexology",
    "Prenatal",
    "Couples",
    "Other",
  ],
  blockedWords: [],
  reportSuspendThreshold: 3,
  defaultSearchKm: 15,
};

export async function getSettings(ctx: QueryCtx): Promise<Settings> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "main"))
    .first();
  const val = (row?.value ?? {}) as Partial<Settings>;
  const existingCities = new Map((val.cities ?? []).map((c) => [c.name, c.open]));
  const cities = ALL_STATES.map((name) => ({
    name,
    open: existingCities.has(name) ? existingCities.get(name)! : true,
  }));
  return { ...DEFAULT_SETTINGS, ...val, cities } as Settings;
}

// ---------- Auth guards ----------

export async function getUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const id = await getAuthUserId(ctx);
  if (!id) return null;
  return await ctx.db.get(id);
}

export async function requireUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await getUser(ctx);
  if (!user) throw new ConvexError("Please sign in");
  if (user.accountStatus === "suspended" || user.accountStatus === "banned") {
    throw new ConvexError("Your account is suspended. Contact support.");
  }
  return user;
}

export async function requireRole(
  ctx: QueryCtx,
  role: "client" | "therapist" | "hotel" | "admin",
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== role) throw new ConvexError("Not allowed");
  return user;
}

// ---------- Credits (always balance + ledger together, inside one transaction) ----------

export async function applyCredits(
  ctx: MutationCtx,
  userId: Id<"users">,
  delta: number,
  reason: Doc<"ledger">["reason"],
  opts: { refId?: string; note?: string; actorId?: Id<"users"> } = {},
): Promise<number> {
  if (!Number.isInteger(delta) || delta === 0) throw new ConvexError("Invalid credit amount");
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError("User not found");
  const balance = (user.credits ?? 0) + delta;
  if (balance < 0) throw new ConvexError("Not enough Connection Credits (CC)");
  await ctx.db.patch(userId, { credits: balance });
  await ctx.db.insert("ledger", {
    userId,
    delta,
    reason,
    refId: opts.refId,
    note: opts.note,
    actorId: opts.actorId,
    balanceAfter: balance,
  });
  return balance;
}

// ---------- Rate limiting (fixed window) ----------

export async function rateLimit(ctx: MutationCtx, key: string, max: number, windowMs: number) {
  const now = Date.now();
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (!row || now - row.windowStart > windowMs) {
    if (row) await ctx.db.patch(row._id, { windowStart: now, count: 1 });
    else await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
    return;
  }
  if (row.count >= max) throw new ConvexError("Too many attempts. Please wait and try again.");
  await ctx.db.patch(row._id, { count: row.count + 1 });
}

// ---------- Text validation ----------

export function cleanText(value: string, field: string, min: number, max: number): string {
  const s = value.replace(/\s+/g, " ").trim();
  if (s.length < min) throw new ConvexError(`${field} is too short`);
  if (s.length > max) throw new ConvexError(`${field} must be ${max} characters or less`);
  return s;
}

export function assertAllowedText(text: string, blocked: string[]) {
  const lower = text.toLowerCase();
  for (const word of blocked) {
    const w = word.trim().toLowerCase();
    if (w && lower.includes(w)) {
      throw new ConvexError("This text contains words that aren't allowed on Relaxxo");
    }
  }
}

// ---------- Uploaded files ----------

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Confirms the file exists, is an image under 8 MB, and was uploaded by this user.
export async function assertOwnImage(ctx: QueryCtx, storageId: Id<"_storage">, ownerId: Id<"users">) {
  const upload = await ctx.db
    .query("uploads")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .first();
  if (!upload || upload.ownerId !== ownerId) throw new ConvexError("Invalid file");
  const meta = await ctx.db.system.get(storageId);
  if (!meta) throw new ConvexError("File not found");
  if (!meta.contentType?.startsWith("image/") && meta.contentType !== "application/pdf") {
    throw new ConvexError("Only images or PDF files are allowed");
  }
  if (meta.size > MAX_IMAGE_BYTES) throw new ConvexError("File is larger than 8 MB");
}

// ---------- Geo ----------

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Therapist distance is shown rounded so their exact position can't be worked out.
export function fuzzyKm(km: number) {
  return Math.max(1, Math.round(km));
}

export function validLatLng(lat: number, lng: number) {
  // Nigeria bounding box
  if (lat < 4 || lat > 14 || lng < 2.5 || lng > 15) {
    throw new ConvexError("Location must be in Nigeria");
  }
}
