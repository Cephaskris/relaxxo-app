import React, { createContext, useContext, useMemo, useState } from "react";
import * as Location from "expo-location";
import { CITIES, CITY_NAMES } from "@/lib/areas";

type Loc = {
  city: string; // Nigerian State (e.g. "Lagos", "Abuja", "Sokoto", "Oyo")
  areaIndex: number;
  selectedAreas: string[]; // Empty = whole state; non-empty = streamlined cities in that state
  label: string;
  lat: number;
  lng: number;
  source: "area" | "all" | "gps" | "search";
};

type Ctx = Loc & {
  stateIndex: number;
  setCity: (city: string) => void;
  setStateByIndex: (index: number) => void;
  setArea: (index: number) => void;
  toggleCityArea: (areaName: string) => void;
  setAllAreas: () => void;
  setCustom: (label: string, lat: number, lng: number) => void;
  useGPS: () => Promise<void>;
};

const LocationContext = createContext<Ctx | null>(null);

function nearestState(lat: number, lng: number, fallbackCity = "Lagos"): string {
  if (lat < 4 || lat > 14 || lng < 2.5 || lng > 15) return fallbackCity;
  let bestState = fallbackCity;
  let bestDist = Infinity;
  for (const state of CITY_NAMES) {
    const first = CITIES[state]?.[0];
    if (!first) continue;
    const d = Math.hypot(lat - first.lat, lng - first.lng);
    if (d < bestDist) {
      bestDist = d;
      bestState = state;
    }
  }
  return bestState;
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const first = CITIES.Lagos[0];
  const [loc, setLoc] = useState<Loc>({
    city: "Lagos",
    areaIndex: 0,
    selectedAreas: [],
    label: "Lagos",
    lat: first.lat,
    lng: first.lng,
    source: "all",
  });

  const value = useMemo<Ctx>(() => {
    const stateIndex = Math.max(0, CITY_NAMES.indexOf(loc.city));

    const selectState = (city: string) => {
      const areas = CITIES[city] ?? CITIES.Lagos;
      const a = areas[0];
      setLoc({
        city,
        areaIndex: 0,
        selectedAreas: [],
        label: city,
        lat: a.lat,
        lng: a.lng,
        source: "all",
      });
    };

    return {
      ...loc,
      stateIndex,
      setCity: selectState,
      setStateByIndex: (index: number) => {
        const city = CITY_NAMES[index];
        if (city) selectState(city);
      },
      setArea: (index: number) => {
        const areas = CITIES[loc.city] ?? CITIES.Lagos;
        const a = areas[index];
        if (a) {
          setLoc({
            ...loc,
            areaIndex: index,
            selectedAreas: [a.name],
            label: a.name,
            lat: a.lat,
            lng: a.lng,
            source: "area",
          });
        }
      },
      toggleCityArea: (areaName: string) => {
        const areas = CITIES[loc.city] ?? CITIES.Lagos;
        const exists = loc.selectedAreas.includes(areaName);
        const next = exists
          ? loc.selectedAreas.filter((n) => n !== areaName)
          : [...loc.selectedAreas, areaName];
        if (next.length === 0) {
          const a = areas[0];
          setLoc({
            ...loc,
            areaIndex: 0,
            selectedAreas: [],
            label: loc.city,
            lat: a.lat,
            lng: a.lng,
            source: "all",
          });
        } else {
          const matched = areas.find((x) => x.name === next[0]) ?? areas[0];
          const idx = Math.max(0, areas.findIndex((x) => x.name === next[0]));
          setLoc({
            ...loc,
            areaIndex: idx,
            selectedAreas: next,
            label: next.length === 1 ? next[0] : `${next.length} cities in ${loc.city}`,
            lat: matched.lat,
            lng: matched.lng,
            source: "area",
          });
        }
      },
      setAllAreas: () => {
        const areas = CITIES[loc.city] ?? CITIES.Lagos;
        const a = areas[0];
        setLoc({
          ...loc,
          areaIndex: 0,
          selectedAreas: [],
          label: loc.city,
          lat: a.lat,
          lng: a.lng,
          source: "all",
        });
      },
      setCustom: (label, lat, lng) =>
        setLoc({
          ...loc,
          city: nearestState(lat, lng, loc.city),
          selectedAreas: [],
          label,
          lat,
          lng,
          source: "search",
        }),
      useGPS: async () => {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) throw new Error("Allow location access to find therapists near you");
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = pos.coords;
        setLoc({
          ...loc,
          city: nearestState(latitude, longitude, loc.city),
          selectedAreas: [],
          label: "Near you",
          lat: latitude,
          lng: longitude,
          source: "gps",
        });
      },
    };
  }, [loc]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLoc() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("LocationProvider missing");
  return ctx;
}
