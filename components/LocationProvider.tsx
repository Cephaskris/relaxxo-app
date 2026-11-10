import React, { createContext, useContext, useMemo, useState } from "react";
import * as Location from "expo-location";
import { CITIES } from "@/lib/areas";

type Loc = {
  city: string;
  areaIndex: number;
  label: string; // what we show: area name or "Near you"
  lat: number;
  lng: number;
  source: "area" | "gps" | "search";
};

type Ctx = Loc & {
  setCity: (city: string) => void;
  setArea: (index: number) => void;
  setCustom: (label: string, lat: number, lng: number) => void;
  useGPS: () => Promise<void>;
};

const LocationContext = createContext<Ctx | null>(null);

function nearestCity(lat: number, lng: number, fallbackCity = "Lagos") {
  // Only auto-switch city if coordinates are within Nigeria's bounding box; otherwise keep current city.
  if (lat < 4 || lat > 14 || lng < 2.5 || lng > 15) return fallbackCity;
  return lat > 7.5 ? "Abuja" : "Lagos";
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const first = CITIES.Lagos[1];
  const [loc, setLoc] = useState<Loc>({
    city: "Lagos",
    areaIndex: 1,
    label: first.name,
    lat: first.lat,
    lng: first.lng,
    source: "area",
  });

  const value = useMemo<Ctx>(
    () => ({
      ...loc,
      setCity: (city) => {
        const idx = 2;
        const a = CITIES[city][idx];
        setLoc({ city, areaIndex: idx, label: a.name, lat: a.lat, lng: a.lng, source: "area" });
      },
      setArea: (index) => {
        const a = CITIES[loc.city][index];
        if (a) setLoc({ ...loc, areaIndex: index, label: a.name, lat: a.lat, lng: a.lng, source: "area" });
      },
      setCustom: (label, lat, lng) =>
        setLoc({ ...loc, city: nearestCity(lat, lng, loc.city), label, lat, lng, source: "search" }),
      useGPS: async () => {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) throw new Error("Allow location access to find therapists near you");
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = pos.coords;
        setLoc({
          ...loc,
          city: nearestCity(latitude, longitude, loc.city),
          label: "Near you",
          lat: latitude,
          lng: longitude,
          source: "gps",
        });
      },
    }),
    [loc],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLoc() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("LocationProvider missing");
  return ctx;
}
