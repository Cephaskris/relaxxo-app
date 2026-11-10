import { query } from "./_generated/server";
import { getSettings } from "./lib/helpers";

// Public subset of settings the app needs (no blocked-words list).
export const publicSettings = query({
  args: {},
  handler: async (ctx) => {
    const s = await getSettings(ctx);
    return {
      packs: s.packs,
      unlockCost: s.unlockCost,
      unlockDays: s.unlockDays,
      onlineOptions: s.onlineOptions,
      cities: s.cities,
      categories: s.categories,
      defaultSearchKm: s.defaultSearchKm,
    };
  },
});
