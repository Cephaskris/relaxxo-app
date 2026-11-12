import { CITIES } from "../../lib/areas";
import { distanceKm } from "./helpers";

/** Nearest Nigerian State (by its closest city) for a coordinate. */
export function nearestState(lat: number, lng: number): string | null {
  let best: string | null = null;
  let bestKm = Infinity;
  for (const [state, cities] of Object.entries(CITIES)) {
    for (const c of cities) {
      const km = distanceKm(lat, lng, c.lat, c.lng);
      if (km < bestKm) {
        bestKm = km;
        best = state;
      }
    }
  }
  return best;
}

export function isStateWideArea(area: string) {
  return /^(All in |All of |Whole of )/i.test(area) || area.trim().toLowerCase() === "all areas";
}

/** Normalised names that mean "every city" when a client searches. */
export function cleanSelectedAreas(areas: string[]) {
  return areas
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && !isStateWideArea(s));
}

/**
 * Does a provider (therapist / hotel) appear for a client browsing `state`
 * and optionally specific `selected` cities in that state?
 */
export function providerMatches(
  p: { city: string; area: string; lat: number; lng: number; radiusKm?: number },
  state: string,
  selected: string[],
) {
  const physicalState = nearestState(p.lat, p.lng);
  const inState = p.city === state || physicalState === state;
  if (!inState) return { ok: false, sameArea: false };
  if (selected.length === 0) return { ok: true, sameArea: false };

  // Provider covers the whole state they're registered in.
  if (isStateWideArea(p.area) && p.city === state) return { ok: true, sameArea: true };

  const providerAreas = p.area.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (providerAreas.some((a) => selected.includes(a))) return { ok: true, sameArea: true };

  // Physically close to one of the selected cities.
  const reach = Math.max(p.radiusKm ?? 0, 10);
  const stateCities = CITIES[state] ?? [];
  const near = stateCities.some(
    (c) => selected.includes(c.name.toLowerCase()) && distanceKm(p.lat, p.lng, c.lat, c.lng) <= reach,
  );
  return { ok: near, sameArea: near };
}
