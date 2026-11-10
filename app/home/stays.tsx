import React from "react";
import { Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { ArrowUpRight } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { Screen, T, Row, Chip, Placeholder, Loading } from "@/components/ui";
import { useLoc } from "@/components/LocationProvider";
import { C, F, ICON } from "@/lib/theme";
import { naira } from "@/lib/util";
import { CITIES } from "@/lib/areas";

export default function Stays() {
  const loc = useLoc();
  const res = useQuery(api.hotels.listNearby, { city: loc.city, lat: loc.lat, lng: loc.lng });
  const areas = CITIES[loc.city];
  if (res === undefined) return <Loading />;
  return (
    <Screen>
      <T v="label">Stays with free rooms · {loc.city}</T>
      <T v="display" style={{ marginTop: 4 }}>{loc.label}</T>
      <Row style={{ flexWrap: "wrap", marginTop: 14 }}>
        {areas.slice(0, 6).map((a, i) => (
          <Chip key={a.name} label={a.name} active={loc.source === "area" && loc.areaIndex === i} onPress={() => loc.setArea(i)} />
        ))}
      </Row>

      <View style={{ gap: 14, marginTop: 20 }}>
        {!res.open ? (
          <T v="h2">Stays are coming soon to {loc.city}.</T>
        ) : res.hotels.length === 0 ? (
          <T v="label">No hotels with free rooms are online here right now.</T>
        ) : (
          res.hotels.map((h, i) => (
            <Pressable
              key={h._id}
              onPress={() => router.push(`/hotel/${h._id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${h.name}`}
              style={{ backgroundColor: C.card, borderRadius: 28, padding: 4 }}
            >
              <View style={{ height: 180, borderRadius: 24, overflow: "hidden" }}>
                {h.cover ? <Image source={{ uri: h.cover }} style={{ width: "100%", height: "100%" }} /> : <Placeholder seed={i} style={{ flex: 1 }} />}
                <View style={{ position: "absolute", right: 12, top: 12, width: 48, height: 48, borderRadius: 24, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}>
                  <ArrowUpRight size={ICON.size} strokeWidth={ICON.stroke} color="#FFFFFF" />
                </View>
              </View>
              <Row style={{ padding: 16, justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <T v="h2">{h.name}</T>
                  <T v="small">{h.distanceKm} km · {h.area} · {h.roomsAvailable} rooms free</T>
                </View>
                <View>
                  <T v="small" style={{ textAlign: "right" }}>from</T>
                  <T style={{ fontFamily: F.medium, fontSize: 18 }}>{naira(h.fromPrice)}</T>
                </View>
              </Row>
            </Pressable>
          ))
        )}
      </View>
    </Screen>
  );
}
