import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useConvexAuth, useQuery } from "convex/react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapPin, Search, LocateFixed } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { T, Chip, Row, Btn, CircleBtn, ErrorNote } from "@/components/ui";
import { AreaWheel } from "@/components/AreaWheel";
import { PlaceSearch } from "@/components/PlaceSearch";
import { useLoc } from "@/components/LocationProvider";
import { CITIES, CITY_NAMES } from "@/lib/areas";
import { C, F, ICON } from "@/lib/theme";
import { errorMessage } from "@/lib/util";

export default function ClientHome() {
  const loc = useLoc();
  const { isAuthenticated } = useConvexAuth();
  const [mode, setMode] = useState<"therapists" | "stays">("therapists");
  const [searchOpen, setSearchOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateAreas = CITIES[loc.city] ?? CITIES.Lagos;

  const isWholeState = loc.source === "all" || (loc.source === "area" && loc.selectedAreas.length === 0);

  const therapists = useQuery(api.therapists.listNearby, {
    city: loc.city,
    lat: loc.lat,
    lng: loc.lng,
    areas: loc.selectedAreas.length > 0 ? loc.selectedAreas : undefined,
    allAreas: isWholeState,
  });
  const hotels = useQuery(api.hotels.listNearby, {
    city: loc.city,
    lat: loc.lat,
    lng: loc.lng,
    areas: loc.selectedAreas.length > 0 ? loc.selectedAreas : undefined,
    allAreas: isWholeState,
  });

  let cta = "Loading…";
  const data = mode === "therapists" ? therapists : hotels;
  const scopeLabel =
    loc.source === "gps"
      ? "Near you"
      : loc.selectedAreas.length === 0
        ? `All of ${loc.city}`
        : loc.selectedAreas.length === 1
          ? `${loc.selectedAreas[0]}, ${loc.city}`
          : `${loc.selectedAreas.length} cities in ${loc.city}`;

  if (data && !data.open) cta = `Coming soon to ${loc.city}`;
  else if (mode === "therapists" && therapists?.open)
    cta = `${therapists.therapists.length} therapists online · ${scopeLabel}`;
  else if (mode === "stays" && hotels?.open)
    cta = `${hotels.hotels.length} stays with rooms · ${scopeLabel}`;

  function openResults() {
    if (mode === "therapists") router.push("/therapists");
    else router.push("/home/stays");
  }

  async function nearMe() {
    setError(null);
    if (loc.source === "gps") {
      loc.setAllAreas();
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              height: 52,
              paddingHorizontal: 16,
              borderRadius: 26,
              backgroundColor: C.card,
            }}
          >
            <MapPin size={20} strokeWidth={ICON.stroke} color={C.ink} />
            <T style={{ fontFamily: F.medium, fontSize: 15 }}>{loc.city} State</T>
          </View>
          <Row gap={8}>
            {!isAuthenticated ? (
              <Pressable
                onPress={() => router.push("/auth/sign-in")}
                accessibilityRole="button"
                style={{
                  height: 52,
                  paddingHorizontal: 18,
                  borderRadius: 26,
                  backgroundColor: C.ink,
                  alignItems: "center",
                  justifyContent: "center",
                }}
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

        <T v="display" style={{ paddingHorizontal: 24, marginTop: 18 }}>
          Find your calm,{"\n"}close to you
        </T>

        <Row style={{ paddingHorizontal: 24, marginTop: 14, flexWrap: "wrap" }}>
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
            onPress={nearMe}
            accessibilityRole="button"
            style={{
              height: 44,
              paddingHorizontal: 16,
              borderRadius: 22,
              backgroundColor: loc.source === "gps" ? C.lime : C.card,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <LocateFixed size={18} strokeWidth={ICON.stroke} color={C.ink} />
            <T style={{ fontSize: 14 }}>Near me</T>
          </Pressable>
        </Row>
        {error ? (
          <View style={{ paddingHorizontal: 24, marginTop: 8 }}>
            <ErrorNote text={error} />
          </View>
        ) : null}

        {/* 36 Nigerian States + Abuja Scroll Wheel */}
        <View style={{ flex: 1, justifyContent: "center", minHeight: 260 }}>
          {loc.source === "gps" || loc.source === "search" ? (
            <View style={{ paddingHorizontal: 24, gap: 10 }}>
              <T v="label">Searching around</T>
              <T v="title">{loc.label}</T>
              <Btn label="Browse by Nigerian State instead" tone="light" onPress={() => loc.setAllAreas()} />
            </View>
          ) : (
            <AreaWheel
              names={CITY_NAMES}
              selected={loc.stateIndex}
              onChange={(idx) => loc.setStateByIndex(idx)}
              onSelectActive={openResults}
              height={290}
            />
          )}
        </View>

        {/* Streamline by cities inside the selected State */}
        <View style={{ gap: 6, marginBottom: 12 }}>
          <Row style={{ justifyContent: "space-between", paddingHorizontal: 24 }}>
            <T v="small" style={{ color: C.muted }}>
              Cities in {loc.city} (tap to streamline, or view whole state)
            </T>
            {loc.selectedAreas.length > 0 ? (
              <Pressable onPress={() => loc.setAllAreas()}>
                <T v="small" style={{ fontFamily: F.medium, color: C.ink }}>
                  Reset to all of {loc.city}
                </T>
              </Pressable>
            ) : null}
          </Row>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 24 }}
          >
            <Chip
              label={`Whole of ${loc.city}`}
              active={loc.selectedAreas.length === 0 && loc.source !== "gps"}
              onPress={() => loc.setAllAreas()}
            />
            {stateAreas.map((a) => (
              <Chip
                key={a.name}
                label={a.name}
                active={loc.selectedAreas.includes(a.name)}
                onPress={() => loc.toggleCityArea(a.name)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: 24, paddingBottom: 116 }}>
          <Btn label={cta} arrow disabled={!data?.open} onPress={openResults} />
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
