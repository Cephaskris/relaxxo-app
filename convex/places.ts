import { v, ConvexError } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { rateLimit } from "./lib/helpers";

/*
 * Google Places proxy. The API key stays on the server, so it can't be copied out of the app
 * and abused. Only signed-in users can search, and each user is rate limited to keep costs down.
 */

export const hit = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await rateLimit(ctx, `places:${userId}`, 60, 3600_000);
  },
});

export const autocomplete = action({
  args: { input: v.string(), sessionToken: v.string() },
  handler: async (ctx, { input, sessionToken }): Promise<{ placeId: string; label: string }[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in");
    const text = input.trim().slice(0, 100);
    if (text.length < 3) return [];
    await ctx.runMutation(internal.places.hit, { userId });
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) throw new ConvexError("Maps not configured");
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify({ input: text, includedRegionCodes: ["ng"], sessionToken }),
    });
    if (!res.ok) throw new ConvexError("Search failed");
    const json = (await res.json()) as {
      suggestions?: { placePrediction?: { placeId: string; text: { text: string } } }[];
    };
    return (json.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is { placeId: string; text: { text: string } } => !!p)
      .slice(0, 5)
      .map((p) => ({ placeId: p.placeId, label: p.text.text }));
  },
});

export const details = action({
  args: { placeId: v.string(), sessionToken: v.string() },
  handler: async (ctx, { placeId, sessionToken }): Promise<{ lat: number; lng: number; address: string; name: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in");
    if (!/^[\w-]{10,300}$/.test(placeId)) throw new ConvexError("Invalid place");
    await ctx.runMutation(internal.places.hit, { userId });
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) throw new ConvexError("Maps not configured");
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?sessionToken=${encodeURIComponent(sessionToken)}`,
      { headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "location,formattedAddress,displayName" } },
    );
    if (!res.ok) throw new ConvexError("Lookup failed");
    const p = (await res.json()) as {
      location?: { latitude: number; longitude: number };
      formattedAddress?: string;
      displayName?: { text: string };
    };
    if (!p.location) throw new ConvexError("No location for this place");
    return {
      lat: p.location.latitude,
      lng: p.location.longitude,
      address: p.formattedAddress ?? "",
      name: p.displayName?.text ?? "",
    };
  },
});
