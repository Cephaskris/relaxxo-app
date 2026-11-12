import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useConvexAuth, useQuery } from "convex/react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapPin, ChevronDown, Search, LocateFixed } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { T, Chip, Row, Btn, CircleBtn, ErrorNote } from "@/components/ui";
import { AreaWheel } from "@/components/AreaWheel";
import { PlaceSearch } from "@/components/PlaceSearch";
import { useLoc } from "@/components/LocationProvider";
import { CITIES } from "@/lib/areas";
import { C, F, ICON } from "@/lib/theme";
import { errorMessage } from "@/lib/util";

export default function ClientHome() {
  const loc = useLoc();
  const { isAuthenticated } = useConvexAuth();
  const [mode, setMode] = useState<"therapists" | "stays">("therapists");
  const [searchOpen, setSearchOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const areas = CITIES[loc.city] ?? CITIES.Lagos;

  const therapists = useQuery(api.therapists.listNearby, {
    city: loc.city,
    lat: loc.lat,
    lng: loc.lng,
    area: loc.source === "area" ? loc.label : undefined,
    allAreas: loc.source === "all",
  });
  const hotels = useQuery(api.hotels.listNearby, {
    city: loc.city,
    lat: loc.lat,
    lng: loc.lng,
    area: loc.source === "area" ? loc.label : undefined,
    allAreas: loc.source === "all",
  });

  let cta = "Loading…";
  const data = mode === "therapists" ? therapists : hotels;
  if (data && !data.open) cta = `Coming soon to ${loc.city}`;
  else if (mode === "therapists" && therapists?.open) cta = `${therapists.therapists.length} therapists online · ${loc.label}`;
  else if (mode === "stays" && hotels?.open) cta = `${hotels.hotels.length} stays with rooms · ${loc.label}`;

  async function nearMe() {
    setError(null);
    if (loc.source === "gps") {
      loc.setArea(loc.areaIndex);
      return;
    }
    try {
      await loc.useGPS();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <View style={{ flex: 1, width: "100%", maxWidth: 560, alignSelf: "center" }}>
        <Row style={{ justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 12 }}>
          <Pressable
            onPress={() => loc.setCity(loc.city === "Lagos" ? "Abuja" : "Lagos")}
            accessibilityLabel="Change city"
            style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 52, paddingHorizontal: 16, borderRadius: 26, backgroundColor: C.card }}
          >
            <MapPin size={20} strokeWidth={ICON.stroke} color={C.ink} />
            <T style={{ fontSize: 16 }}>{loc.city}</T>
            <ChevronDown size={18} strokeWidth={ICON.stroke} color={C.ink} />
          </Pressable>
          <Row gap={8}>
            {!isAuthenticated ? (
              <Pressable
                onPress={() => router.push("/auth/sign-in")}
                accessibilityRole="button"
                style={{ height: 52, paddingHorizontal: 18, borderRadius: 26, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}
              >
                <T style={{ color: "#FFFFFF", fontSize: 14 }}>Log in</T>
              </Pressable>
            ) : null}
            <CircleBtn
              label="Search an address"
              onPress={() => (isAuthenticated ? setSearchOpen(true) : router.push("/auth/sign-in"))}
              icon={<Search size={ICON.size} strokeWidth={ICON.stroke} color={C.ink} />}
            />
          </Row>
        </Row>

        <T v="display" style={{ paddingHorizontal: 24, marginTop: 22 }}>Find your calm,{"\n"}close to you</T>

        <Row style={{ paddingHorizontal: 24, marginTop: 18, flexWrap: "wrap" }}>
          <Chip
            label="Therapists"
            active={mode === "therapists"}
            onPress={() => setMode("therapists")}
          />
          <Chip
            label="Stays"
            active={mode === "stays"}
            onPress={() => setMode("stays")}
          />
          <Pressable
            onPress={() => (loc.source === "all" ? loc.setArea(loc.areaIndex) : loc.setAllAreas())}
            accessibilityRole="button"
            style={{
              height: 44,
              paddingHorizontal: 16,
              borderRadius: 22,
              backgroundColor: loc.source === "all" ? C.lime : C.card,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <T style={{ fontFamily: loc.source === "all" ? F.medium : F.regular, fontSize: 14 }}>
              All areas in {loc.city}
            </T>
          </Pressable>
          <Pressable
            onPress={nearMe}
            accessibilityRole="button"
            style={{ height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: loc.source === "gps" ? C.lime : C.card, flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <LocateFixed size={18} strokeWidth={ICON.stroke} color={C.ink} />
            <T style={{ fontSize: 14 }}>Near me</T>
          </Pressable>
        </Row>
        {error ? <View style={{ paddingHorizontal: 24, marginTop: 8 }}><ErrorNote text={error} /></View> : null}

        <View style={{ flex: 1, justifyContent: "center", minHeight: 300 }}>
          {loc.source === "area" ? (
            <AreaWheel names={areas.map((a) => a.name)} selected={loc.areaIndex} onChange={loc.setArea} />
          ) : (
            <View style={{ paddingHorizontal: 24, gap: 10 }}>
              <T v="label">{loc.source === "all" ? `All ${areas.length} areas selected` : "Searching around"}</T>
              <T v="title">{loc.label}</T>
              <Btn label="Pick a specific area instead" tone="light" onPress={() => loc.setArea(loc.areaIndex)} />
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: 24, paddingBottom: 120 }}>
          <Btn
            label={cta}
            arrow
            disabled={!data?.open}
            onPress={() => (mode === "therapists" ? router.push("/therapists") : router.push("/home/stays"))}
          />
        </View>
      </View>
      <PlaceSearch
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPick={(p) => {
          loc.setCustom(p.name || p.address, p.lat, p.lng);
          setSearchOpen(false);
        }}
      />
    </SafeAreaView>
  );
}
