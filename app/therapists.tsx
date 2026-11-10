import React, { useRef, useState } from "react";
import { Image, Linking, PanResponder, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Map as MapIcon, SlidersHorizontal, Star, BadgeCheck } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { T, Row, BackBtn, CircleBtn, Btn, Chip, Pill, Placeholder, Loading } from "@/components/ui";
import { useLoc } from "@/components/LocationProvider";
import { C, F, ICON } from "@/lib/theme";
import { naira, minutesLabel } from "@/lib/util";

type Gender = "female" | "male" | undefined;
type Work = "home" | "studio" | undefined;

export default function TherapistsInArea() {
  const loc = useLoc();
  const settings = useQuery(api.settings.publicSettings);
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState<string | undefined>();
  const [gender, setGender] = useState<Gender>();
  const [workType, setWorkType] = useState<Work>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [i, setI] = useState(0);

  const res = useQuery(api.therapists.listNearby, {
    city: loc.city,
    lat: loc.lat,
    lng: loc.lng,
    category,
    gender,
    workType,
    maxPrice,
  });
  const list = res?.open ? res.therapists : [];
  const t = list[Math.min(i, Math.max(0, list.length - 1))];

  const next = () => setI((x) => (list.length ? (x + 1) % list.length : 0));
  const prev = () => setI((x) => (list.length ? (x - 1 + list.length) % list.length : 0));
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) nextRef.current();
        else if (g.dx > 50) prevRef.current();
      },
    }),
  ).current;
  const nextRef = useRef(next);
  const prevRef = useRef(prev);
  nextRef.current = next;
  prevRef.current = prev;

  if (res === undefined) return <Loading />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top", "bottom"]}>
      <View style={{ flex: 1, width: "100%", maxWidth: 560, alignSelf: "center" }}>
        <Row style={{ justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 12 }}>
          <BackBtn />
          <T v="label" style={{ fontSize: 15 }}>Online now · {loc.city}</T>
          <CircleBtn
            label="Filters"
            tone={showFilters ? "lime" : "light"}
            onPress={() => setShowFilters((s) => !s)}
            icon={<SlidersHorizontal size={ICON.size} strokeWidth={ICON.stroke} color={C.ink} />}
          />
        </Row>

        <T style={{ fontFamily: F.regular, fontSize: 60, lineHeight: 64, letterSpacing: -2, textAlign: "center", marginTop: 14 }} numberOfLines={1} adjustsFontSizeToFit>
          {loc.label}
        </T>
        <T v="label" style={{ textAlign: "center", marginTop: 2 }}>
          {res.open ? `${list.length} verified therapists near you` : "Coming soon"}
        </T>

        {showFilters ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 24, paddingTop: 12 }}>
            <Chip label="Female" active={gender === "female"} onPress={() => setGender(gender === "female" ? undefined : "female")} />
            <Chip label="Male" active={gender === "male"} onPress={() => setGender(gender === "male" ? undefined : "male")} />
            <Chip label="Home visit" active={workType === "home"} onPress={() => setWorkType(workType === "home" ? undefined : "home")} />
            <Chip label="Studio" active={workType === "studio"} onPress={() => setWorkType(workType === "studio" ? undefined : "studio")} />
            {[15000, 25000, 40000].map((p) => (
              <Chip key={p} label={`Under ${naira(p)}`} active={maxPrice === p} onPress={() => setMaxPrice(maxPrice === p ? undefined : p)} />
            ))}
            {(settings?.categories ?? []).map((c) => (
              <Chip key={c} label={c} active={category === c} onPress={() => setCategory(category === c ? undefined : c)} />
            ))}
          </ScrollView>
        ) : null}

        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}>
          {!res.open ? (
            <View style={{ alignItems: "center", gap: 12 }}>
              <T v="h2" style={{ textAlign: "center" }}>We're onboarding verified therapists in {loc.city}.</T>
              <Btn label="Are you a therapist? Join" tone="dark" onPress={() => router.push("/auth/sign-in?as=therapist")} />
            </View>
          ) : !t ? (
            <View style={{ alignItems: "center", gap: 12 }}>
              <T v="h2" style={{ textAlign: "center" }}>No one online here right now</T>
              <T v="label" style={{ textAlign: "center" }}>Try another area, clear filters, or check back soon.</T>
            </View>
          ) : (
            <View {...swipe.panHandlers}>
              <View style={{ position: "absolute", left: 44, right: 36, top: -36, height: 80, borderRadius: 26, backgroundColor: "#CFCFCA", transform: [{ rotate: "3deg" }] }} />
              <View style={{ position: "absolute", left: 24, right: 20, top: -18, height: 80, borderRadius: 26, backgroundColor: "#DEDED9", transform: [{ rotate: "-1.5deg" }] }} />
              <Pressable
                onPress={() => router.push(`/therapist/${t._id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${t.displayName}`}
                style={{ backgroundColor: C.card, borderRadius: 28, padding: 4 }}
              >
                <View style={{ height: 260, borderRadius: 24, overflow: "hidden" }}>
                  {t.photo ? (
                    <Image source={{ uri: t.photo }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  ) : (
                    <Placeholder seed={i} style={{ flex: 1 }} label="Therapist photo" />
                  )}
                  <Row style={{ position: "absolute", left: 12, top: 12 }} gap={6}>
                    {t.rating ? <Pill tone="dark" label={String(t.rating)} icon={<Star size={14} fill="#F5C443" color="#F5C443" />} /> : null}
                    <Pill tone="dark" label="Verified" icon={<BadgeCheck size={14} strokeWidth={ICON.stroke} color={C.lime} />} />
                  </Row>
                  <View style={{ position: "absolute", right: 12, top: 12 }}>
                    <Pill tone="lime" label={`Online · ${minutesLabel(t.minutesLeft)}`} />
                  </View>
                </View>
                <View style={{ padding: 16, gap: 6 }}>
                  <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1 }}>
                      <T v="h2">{t.displayName}</T>
                      <T v="small" style={{ fontSize: 13 }}>
                        ~{t.distanceKm} km · {t.area} · {t.workType === "both" ? "Home visit + studio" : t.workType === "home" ? "Home visit" : "Studio"}
                      </T>
                    </View>
                    <View style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: C.soft, justifyContent: "center" }}>
                      <T style={{ fontFamily: F.medium }}>from {naira(t.fromPrice)}</T>
                    </View>
                  </Row>
                  <T v="label" numberOfLines={2}>{t.serviceNames.join(" · ")}</T>
                </View>
              </Pressable>
            </View>
          )}
        </View>

        {t ? (
          <Row style={{ justifyContent: "space-between", paddingHorizontal: 24, marginBottom: 12 }}>
            <CircleBtn label="Previous therapist" onPress={prev} icon={<ChevronLeft size={ICON.size} strokeWidth={ICON.stroke} color={C.ink} />} />
            <T v="label">Swipe · {Math.min(i, list.length - 1) + 1} of {list.length}</T>
            <CircleBtn label="Next therapist" onPress={next} icon={<ChevronRight size={ICON.size} strokeWidth={ICON.stroke} color={C.ink} />} />
          </Row>
        ) : null}

        <View style={{ marginHorizontal: 16, marginBottom: 12, height: 80, borderRadius: 40, backgroundColor: C.nav, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, gap: 8 }}>
          <Btn label="View & connect" style={{ flex: 1, height: 64 }} disabled={!t} onPress={() => t && router.push(`/therapist/${t._id}`)} />
          <CircleBtn
            size={64}
            label="See area on map"
            onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`)}
            icon={<MapIcon size={26} strokeWidth={ICON.stroke} color={C.ink} />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
