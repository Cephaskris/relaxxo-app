import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { useConvexAuth, useQuery } from "convex/react";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import {
  ArrowUpRight,
  BadgeCheck,
  BedDouble,
  ChevronDown,
  Clock,
  LocateFixed,
  MapPin,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { Btn, Card, Chip, Row, T } from "@/components/ui";
import { useLoc } from "@/components/LocationProvider";
import { CITIES, CITY_NAMES } from "@/lib/areas";
import { C, F, ICON, R } from "@/lib/theme";
import { naira } from "@/lib/util";

const HERO_PORTRAIT = require("../assets/welcome-hero.jpg");
const HERO_LANDSCAPE = require("../assets/welcome-landscape.jpg");

const SERVICES = [
  { name: "Swedish Massage", duration: "60–90 min", from: 20000, tag: "Relaxation & circulation" },
  { name: "Deep Tissue", duration: "60–90 min", from: 25000, tag: "Muscle tension & knots" },
  { name: "Sports Recovery", duration: "60 min", from: 25000, tag: "Mobility & post-workout" },
  { name: "Aromatherapy", duration: "60–90 min", from: 22000, tag: "Essential oils & calm" },
  { name: "Thai & Stretch", duration: "90 min", from: 30000, tag: "Assisted yoga & pressure" },
  { name: "Prenatal Care", duration: "60 min", from: 25000, tag: "Gentle maternity relief" },
];

const FAQS = [
  {
    q: "How are therapists and hotels verified on Relaxxo?",
    a: "Every therapist submits a government-issued ID, a live selfie, and portfolio photos reviewed manually by our team before going live. Hotels submit property details and real room photographs before approval.",
  },
  {
    q: "How do Connection Credits (CC) and unlocks work?",
    a: "Browsing therapists and stays is completely free. To message or call a therapist directly, you use Connection Credits (CC) to unlock a direct connection. CC never expire and stay in your wallet.",
  },
  {
    q: "Can I book a home visit or visit a studio / hotel?",
    a: "Yes. Filter therapists by 'Home visit' or 'Studio', or browse 'Stays' to find vetted hotels in Lagos and Abuja with available short-stay or overnight rooms right now.",
  },
];

export function LandingPage() {
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const loc = useLoc();
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const settings = useQuery(api.settings.publicSettings);

  const [selectedCity, setSelectedCity] = useState<string>("Lagos");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const areas = CITIES[selectedCity] ?? CITIES.Lagos;
  const packs = settings?.packs ?? [
    { id: "p5", credits: 5, priceNaira: 2500 },
    { id: "p12", credits: 12, priceNaira: 5000 },
    { id: "p30", credits: 30, priceNaira: 10000 },
  ];

  function jumpToArea(city: string, index: number) {
    loc.setCity(city);
    setTimeout(() => loc.setArea(index), 0);
    router.push("/home");
  }

  function jumpToAllAreas(city: string) {
    loc.setCity(city);
    setTimeout(() => loc.setAllAreas(), 0);
    router.push("/home");
  }

  function primaryDestination() {
    if (!isAuthenticated || !me) return "/auth/sign-in";
    if (me.role === "admin") return "/admin";
    if (me.role === "therapist") return "/pro";
    if (me.role === "hotel") return "/host";
    return "/home";
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator
    >
      {/* ---------- 1. HERO SECTION (9:16 Full-Bleed on Mobile / Split Editorial on Desktop) ---------- */}
      {!isWide ? (
        <View style={{ minHeight: 740, height: "100vh" as never, maxHeight: 920, backgroundColor: C.ink, position: "relative" }}>
          <Image
            source={HERO_PORTRAIT}
            resizeMode="cover"
            accessibilityLabel="Relaxing massage therapy session in Lagos"
            style={[StyleSheet.absoluteFillObject, { width: "100%", height: "100%" }]}
          />
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <Svg width="100%" height="100%" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="mobileHeroScrim" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#0C0D0A" stopOpacity="0.78" />
                  <Stop offset="38%" stopColor="#0C0D0A" stopOpacity="0.42" />
                  <Stop offset="62%" stopColor="#0C0D0A" stopOpacity="0.32" />
                  <Stop offset="100%" stopColor="#0C0D0A" stopOpacity="0.90" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#mobileHeroScrim)" />
            </Svg>
          </View>

          <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
            <View style={{ flex: 1, width: "100%", maxWidth: 540, alignSelf: "center", padding: 24, justifyContent: "space-between" }}>
              {/* Top Bar */}
              <Row style={{ justifyContent: "space-between" }}>
                <T style={{ fontFamily: F.semibold, fontSize: 22, color: "#FFFFFF", letterSpacing: -0.5 }}>Relaxxo</T>
                <Pressable
                  onPress={() => router.push(primaryDestination() as never)}
                  style={{
                    height: 40,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    backgroundColor: "rgba(255,255,255,0.18)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <T style={{ fontFamily: F.medium, fontSize: 13, color: "#FFFFFF" }}>
                    {isAuthenticated ? "Dashboard" : "Log in"}
                  </T>
                </Pressable>
              </Row>

              {/* Headline */}
              <View style={{ gap: 12, marginTop: -20 }}>
                <T
                  v="display"
                  style={{
                    color: "#FFFFFF",
                    fontSize: 40,
                    lineHeight: 44,
                    textShadowColor: "rgba(0, 0, 0, 0.55)",
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 8,
                  }}
                >
                  Verified massage{"\n"}therapists & stays{"\n"}near you.
                </T>
                <T
                  v="body"
                  style={{
                    fontSize: 16,
                    lineHeight: 23,
                    color: "rgba(255, 255, 255, 0.92)",
                    textShadowColor: "rgba(0, 0, 0, 0.5)",
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 4,
                  }}
                >
                  Browse ID-verified professionals and boutique stays with available rooms in Lagos & Abuja. Connect directly in under 2 minutes.
                </T>
              </View>

              {/* Bottom CTA Cluster */}
              <View style={{ gap: 12 }}>
                <Btn label="Find a therapist or stay" tone="lime" arrow onPress={() => router.push("/home")} />
                <Btn
                  label={isAuthenticated ? "Open my account" : "Log in"}
                  tone="light"
                  onPress={() => router.push(primaryDestination() as never)}
                />
                <Row style={{ justifyContent: "center", marginTop: 8 }} gap={20}>
                  <Pressable onPress={() => router.push("/auth/sign-in?as=therapist")} accessibilityRole="link">
                    <T style={{ fontFamily: F.medium, fontSize: 14, color: "#FFFFFF", textDecorationLine: "underline" }}>
                      Join as a Therapist
                    </T>
                  </Pressable>
                  <T v="small" style={{ color: "rgba(255, 255, 255, 0.7)" }}>·</T>
                  <Pressable onPress={() => router.push("/auth/sign-in?as=hotel")} accessibilityRole="link">
                    <T style={{ fontFamily: F.medium, fontSize: 14, color: "#FFFFFF", textDecorationLine: "underline" }}>
                      List your Hotel
                    </T>
                  </Pressable>
                </Row>
              </View>
            </View>
          </SafeAreaView>
        </View>
      ) : (
        /* Desktop Navigation + Split Editorial Hero */
        <View style={{ width: "100%", maxWidth: 1200, alignSelf: "center", paddingHorizontal: 32, paddingTop: 24 }}>
          {/* Top Navigation Bar */}
          <Row
            style={{
              justifyContent: "space-between",
              backgroundColor: C.card,
              paddingHorizontal: 24,
              paddingVertical: 14,
              borderRadius: R.pill,
            }}
          >
            <Row gap={14}>
              <T style={{ fontFamily: F.semibold, fontSize: 24, letterSpacing: -0.6 }}>Relaxxo</T>
              <View style={{ backgroundColor: C.lime, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
                <T style={{ fontFamily: F.medium, fontSize: 12 }}>Lagos · Abuja</T>
              </View>
            </Row>

            <Row gap={28}>
              <Pressable onPress={() => router.push("/home")}>
                <T style={{ fontFamily: F.medium, fontSize: 15 }}>Explore Therapists</T>
              </Pressable>
              <Pressable onPress={() => router.push("/home/stays")}>
                <T style={{ fontFamily: F.medium, fontSize: 15 }}>Available Stays</T>
              </Pressable>
              <Pressable onPress={() => router.push("/auth/sign-in?as=therapist")}>
                <T style={{ fontFamily: F.medium, fontSize: 15 }}>For Therapists</T>
              </Pressable>
              <Pressable onPress={() => router.push("/auth/sign-in?as=hotel")}>
                <T style={{ fontFamily: F.medium, fontSize: 15 }}>For Hotels</T>
              </Pressable>
            </Row>

            <Row gap={10}>
              <Pressable
                onPress={() => router.push(primaryDestination() as never)}
                style={{
                  height: 46,
                  paddingHorizontal: 20,
                  borderRadius: 23,
                  backgroundColor: C.bg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <T style={{ fontFamily: F.medium, fontSize: 14 }}>{isAuthenticated ? "Dashboard" : "Log in"}</T>
              </Pressable>
              <Pressable
                onPress={() => router.push("/home")}
                style={{
                  height: 46,
                  paddingHorizontal: 22,
                  borderRadius: 23,
                  backgroundColor: C.ink,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <T style={{ fontFamily: F.medium, fontSize: 14, color: "#FFFFFF" }}>Browse now</T>
              </Pressable>
            </Row>
          </Row>

          {/* Hero Split Content */}
          <Row style={{ marginTop: 32, gap: 36, alignItems: "stretch" }}>
            {/* Left Column: Copy + CTAs + Trust Metrics */}
            <View style={{ flex: 1.15, justifyContent: "space-between", paddingVertical: 16, gap: 28 }}>
              <View style={{ gap: 18 }}>
                <Row gap={10}>
                  <View style={{ backgroundColor: C.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <BadgeCheck size={16} strokeWidth={ICON.stroke} color={C.ink} />
                    <T style={{ fontFamily: F.medium, fontSize: 13 }}>100% ID & Selfie Verified</T>
                  </View>
                  <View style={{ backgroundColor: C.lime, paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill }}>
                    <T style={{ fontFamily: F.medium, fontSize: 13 }}>Live in Lagos & Abuja</T>
                  </View>
                </Row>

                <T style={{ fontFamily: F.regular, fontSize: 64, lineHeight: 68, letterSpacing: -2.2 }}>
                  Verified massage{"\n"}therapists & stays{"\n"}near you.
                </T>

                <T v="label" style={{ fontSize: 18, lineHeight: 26, maxWidth: 520, color: C.muted }}>
                  Skip middleman agencies and endless waiting. Browse online massage therapists for home or studio sessions, or discover boutique stays with free rooms right now.
                </T>
              </View>

              <View style={{ gap: 14, maxWidth: 460 }}>
                <Btn label="Find a therapist or stay" tone="lime" arrow onPress={() => router.push("/home")} />
                <Row gap={12}>
                  <View style={{ flex: 1 }}>
                    <Btn label="Join as a Therapist" tone="dark" onPress={() => router.push("/auth/sign-in?as=therapist")} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Btn label="List your Hotel" tone="light" onPress={() => router.push("/auth/sign-in?as=hotel")} />
                  </View>
                </Row>
              </View>

              {/* Stats Row */}
              <Row gap={16} style={{ flexWrap: "wrap" }}>
                {[
                  { value: "< 2 min", label: "Direct chat & WhatsApp unlock" },
                  { value: "100%", label: "ID & live selfie vetted" },
                  { value: "0% cut", label: "Direct rates with providers" },
                ].map((s) => (
                  <Card key={s.label} style={{ flex: 1, minWidth: 150, padding: 18, gap: 4 }}>
                    <T style={{ fontFamily: F.semibold, fontSize: 24, letterSpacing: -0.5 }}>{s.value}</T>
                    <T v="small">{s.label}</T>
                  </Card>
                ))}
              </Row>
            </View>

            {/* Right Column: 9:16 Portrait Visual Frame */}
            <View style={{ width: 400, aspectRatio: 9 / 16, borderRadius: 32, overflow: "hidden", backgroundColor: C.ink, padding: 6, position: "relative" }}>
              <View style={{ flex: 1, borderRadius: 26, overflow: "hidden" }}>
                <Image
                  source={HERO_PORTRAIT}
                  resizeMode="cover"
                  accessibilityLabel="Luxury massage session in Lagos"
                  style={{ width: "100%", height: "100%" }}
                />
                <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                  <Svg width="100%" height="100%" preserveAspectRatio="none">
                    <Defs>
                      <LinearGradient id="cardScrim" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#0C0D0A" stopOpacity="0.35" />
                        <Stop offset="50%" stopColor="#0C0D0A" stopOpacity="0.0" />
                        <Stop offset="100%" stopColor="#0C0D0A" stopOpacity="0.75" />
                      </LinearGradient>
                    </Defs>
                    <Rect x="0" y="0" width="100%" height="100%" fill="url(#cardScrim)" />
                  </Svg>
                </View>

                <Row
                  style={{
                    position: "absolute",
                    top: 16,
                    left: 16,
                    backgroundColor: "rgba(20,20,20,0.78)",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                  }}
                  gap={8}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.lime }} />
                  <T style={{ color: "#FFFFFF", fontFamily: F.medium, fontSize: 13 }}>Online now · Ikoyi & Maitama</T>
                </Row>

                <View
                  style={{
                    position: "absolute",
                    bottom: 16,
                    left: 16,
                    right: 16,
                    backgroundColor: "rgba(255,255,255,0.95)",
                    borderRadius: 22,
                    padding: 16,
                    gap: 6,
                  }}
                >
                  <Row style={{ justifyContent: "space-between" }}>
                    <Row gap={6}>
                      <T style={{ fontFamily: F.semibold, fontSize: 16 }}>Swedish & Deep Tissue</T>
                      <BadgeCheck size={16} strokeWidth={ICON.stroke} color={C.ink} />
                    </Row>
                    <View style={{ backgroundColor: C.lime, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                      <T style={{ fontFamily: F.medium, fontSize: 12 }}>From ₦20,000</T>
                    </View>
                  </Row>
                  <T v="small">Home visit or private studio · Replies in under 5 mins</T>
                </View>
              </View>
            </View>
          </Row>
        </View>
      )}

      {/* ---------- MAIN CONTAINER FOR BELOW-THE-FOLD SECTIONS ---------- */}
      <View style={{ width: "100%", maxWidth: 1200, alignSelf: "center", paddingHorizontal: isWide ? 32 : 20, marginTop: isWide ? 64 : 40, gap: isWide ? 64 : 44 }}>
        {/* ---------- 2. NEIGHBORHOOD EXPLORER ---------- */}
        <View style={{ gap: 18 }}>
          <View style={{ gap: 4 }}>
            <T v="label" style={{ textTransform: "uppercase", letterSpacing: 1 }}>36 States + Abuja</T>
            <T v="title">Explore by state & city</T>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
          >
            {CITY_NAMES.map((stateName) => (
              <Chip
                key={stateName}
                label={stateName}
                active={selectedCity === stateName}
                onPress={() => setSelectedCity(stateName)}
              />
            ))}
          </ScrollView>

          <Row style={{ flexWrap: "wrap" }} gap={10}>
            <Pressable
              onPress={() => jumpToAllAreas(selectedCity)}
              style={{
                backgroundColor: C.lime,
                paddingHorizontal: 18,
                paddingVertical: 14,
                borderRadius: R.pill,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <MapPin size={16} strokeWidth={ICON.stroke} color={C.ink} />
              <T style={{ fontFamily: F.medium, fontSize: 15 }}>Whole of {selectedCity}</T>
              <ArrowUpRight size={15} strokeWidth={ICON.stroke} color={C.ink} />
            </Pressable>
            {areas.map((a, idx) => (
              <Pressable
                key={a.name}
                onPress={() => jumpToArea(selectedCity, idx)}
                style={{
                  backgroundColor: C.card,
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  borderRadius: R.pill,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <MapPin size={16} strokeWidth={ICON.stroke} color={C.ink} />
                <T style={{ fontFamily: F.medium, fontSize: 15 }}>{a.name}</T>
                <ArrowUpRight size={15} strokeWidth={ICON.stroke} color={C.muted} />
              </Pressable>
            ))}
          </Row>
        </View>

        {/* ---------- 3. HOW RELAXXO WORKS (3 STEPS) ---------- */}
        <View style={{ gap: 20 }}>
          <View style={{ gap: 4 }}>
            <T v="label" style={{ textTransform: "uppercase", letterSpacing: 1 }}>Simple & direct</T>
            <T v="title">How Relaxxo works</T>
          </View>

          <View style={{ flexDirection: isWide ? "row" : "column", gap: 16 }}>
            {[
              {
                step: "01",
                icon: LocateFixed,
                title: "Spin the wheel or tap Near Me",
                body: "Select your neighborhood in Lagos or Abuja—or use GPS—to see therapists who are online right now and hotels with free rooms.",
              },
              {
                step: "02",
                icon: MessageCircle,
                title: "Unlock direct chat & phone",
                body: "Review real photos, service menus, and ratings. Spend Connection Credits (CC) to unlock a direct chat and phone connection.",
              },
              {
                step: "03",
                icon: Sparkles,
                title: "Book home, studio, or stay",
                body: "Coordinate directly with your therapist for a home visit or studio session, or pick a verified hotel stay with available rooms nearby.",
              },
            ].map((item) => (
              <Card key={item.step} style={{ flex: 1, gap: 14, padding: 24 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.lime, alignItems: "center", justifyContent: "center" }}>
                    <item.icon size={22} strokeWidth={ICON.stroke} color={C.ink} />
                  </View>
                  <T style={{ fontFamily: F.medium, fontSize: 14, color: C.muted }}>STEP {item.step}</T>
                </Row>
                <T v="h2" style={{ marginTop: 4 }}>{item.title}</T>
                <T v="label" style={{ fontSize: 15, lineHeight: 22 }}>{item.body}</T>
              </Card>
            ))}
          </View>
        </View>

        {/* ---------- 4. POPULAR TREATMENTS & SERVICES ---------- */}
        <View style={{ gap: 20 }}>
          <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }} gap={12}>
            <View style={{ gap: 4 }}>
              <T v="label" style={{ textTransform: "uppercase", letterSpacing: 1 }}>Wellness menu</T>
              <T v="title">Popular massage treatments</T>
            </View>
            <Pressable
              onPress={() => router.push("/therapists")}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.card, paddingHorizontal: 18, paddingVertical: 12, borderRadius: R.pill }}
            >
              <T style={{ fontFamily: F.medium, fontSize: 14 }}>See all online therapists</T>
              <ArrowUpRight size={16} strokeWidth={ICON.stroke} color={C.ink} />
            </Pressable>
          </Row>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
            {SERVICES.map((svc) => (
              <Pressable
                key={svc.name}
                onPress={() => router.push("/therapists")}
                style={{
                  width: isWide ? "32%" : "100%",
                  flexGrow: 1,
                  backgroundColor: C.card,
                  borderRadius: R.card,
                  padding: 22,
                  gap: 10,
                }}
              >
                <Row style={{ justifyContent: "space-between" }}>
                  <View style={{ backgroundColor: C.bg, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 }}>
                    <T style={{ fontSize: 12, fontFamily: F.medium }}>{svc.duration}</T>
                  </View>
                  <T style={{ fontFamily: F.semibold, fontSize: 15 }}>from {naira(svc.from)}</T>
                </Row>
                <T v="h2" style={{ marginTop: 4 }}>{svc.name}</T>
                <T v="small" style={{ fontSize: 14 }}>{svc.tag}</T>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ---------- 5. SAFETY, TRUST & BOUTIQUE STAYS SHOWCASE ---------- */}
        <Card dark style={{ padding: isWide ? 36 : 24, gap: 28 }}>
          <View style={{ flexDirection: isWide ? "row" : "column", gap: 28, alignItems: "center" }}>
            <View style={{ flex: 1.2, gap: 16 }}>
              <View style={{ alignSelf: "flex-start", backgroundColor: C.lime, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
                <T style={{ fontFamily: F.medium, fontSize: 12, color: C.ink }}>Safety & Privacy First</T>
              </View>
              <T v="title" style={{ color: "#FFFFFF" }}>
                Every profile is human-verified before going live.
              </T>
              <T style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, lineHeight: 23 }}>
                We built Relaxxo for peace of mind. No unverified listings, no fake photos, and no hidden booking fees.
              </T>

              <View style={{ gap: 12, marginTop: 4 }}>
                {[
                  { icon: ShieldCheck, text: "Government ID + live selfie match required for all therapists" },
                  { icon: BedDouble, text: "Vetted short-stay & overnight hotels with real room photos" },
                  { icon: Clock, text: "Real-time availability: only online providers appear in search" },
                  { icon: Star, text: "Verified client ratings & one-tap report moderation" },
                ].map((row) => (
                  <Row key={row.text} gap={12}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(215, 242, 74, 0.16)", alignItems: "center", justifyContent: "center" }}>
                      <row.icon size={18} strokeWidth={ICON.stroke} color={C.lime} />
                    </View>
                    <T style={{ color: "#FFFFFF", fontSize: 14, flex: 1 }}>{row.text}</T>
                  </Row>
                ))}
              </View>
            </View>

            <View style={{ flex: 1, width: "100%", height: 280, borderRadius: 24, overflow: "hidden" }}>
              <Image
                source={HERO_LANDSCAPE}
                resizeMode="cover"
                accessibilityLabel="Serene wellness room"
                style={{ width: "100%", height: "100%" }}
              />
            </View>
          </View>
        </Card>

        {/* ---------- 6. TWO-SIDED PROVIDER INVITATION (THERAPISTS & HOTELS) ---------- */}
        <View style={{ gap: 20 }}>
          <View style={{ gap: 4 }}>
            <T v="label" style={{ textTransform: "uppercase", letterSpacing: 1 }}>Partner with Relaxxo</T>
            <T v="title">Work on your own terms</T>
          </View>

          <View style={{ flexDirection: isWide ? "row" : "column", gap: 16 }}>
            <Card style={{ flex: 1, padding: 28, gap: 14, justifyContent: "space-between" }}>
              <View style={{ gap: 10 }}>
                <View style={{ alignSelf: "flex-start", backgroundColor: C.lime, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16 }}>
                  <T style={{ fontFamily: F.medium, fontSize: 12 }}>For Massage Therapists</T>
                </View>
                <T v="h2" style={{ fontSize: 24, lineHeight: 30 }}>Go online when you want clients. Keep 100% of your session rates.</T>
                <T v="label" style={{ fontSize: 15, lineHeight: 22 }}>
                  Set your own service menu, choose home visits or studio sessions, and receive welcome bonus Connection Credits (CC) as soon as your ID verification is approved.
                </T>
              </View>
              <Btn label="Join as a Therapist" tone="dark" arrow onPress={() => router.push("/auth/sign-in?as=therapist")} />
            </Card>

            <Card style={{ flex: 1, padding: 28, gap: 14, justifyContent: "space-between" }}>
              <View style={{ gap: 10 }}>
                <View style={{ alignSelf: "flex-start", backgroundColor: C.bg, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16 }}>
                  <T style={{ fontFamily: F.medium, fontSize: 12 }}>For Hotels & Short-Stays</T>
                </View>
                <T v="h2" style={{ fontSize: 24, lineHeight: 30 }}>Fill available rooms tonight with zero commission cut.</T>
                <T v="label" style={{ fontSize: 15, lineHeight: 22 }}>
                  List your room types, toggle room availability in one tap, and receive direct WhatsApp and phone inquiries from guests searching nearby.
                </T>
              </View>
              <Btn label="List your Hotel" tone="lime" arrow onPress={() => router.push("/auth/sign-in?as=hotel")} />
            </Card>
          </View>
        </View>

        {/* ---------- 7. TRANSPARENT CONNECTION CREDIT PACKS ---------- */}
        <View style={{ gap: 20 }}>
          <View style={{ gap: 4 }}>
            <T v="label" style={{ textTransform: "uppercase", letterSpacing: 1 }}>Simple pricing</T>
            <T v="title">Pay as you go with Connection Credits (CC)</T>
            <T v="label" style={{ fontSize: 15 }}>Connection Credits never expire. Secure instant checkout via Paystack.</T>
          </View>

          <View style={{ flexDirection: isWide ? "row" : "column", gap: 16 }}>
            {packs.map((p, idx) => {
              const best = idx === packs.length - 1;
              return (
                <Card
                  key={p.id}
                  style={{
                    flex: 1,
                    padding: 26,
                    gap: 12,
                    backgroundColor: best ? C.lime : C.card,
                  }}
                >
                  <Row style={{ justifyContent: "space-between" }}>
                    <Row gap={8}>
                      <Wallet size={20} strokeWidth={ICON.stroke} color={C.ink} />
                      <T style={{ fontFamily: F.medium, fontSize: 16 }}>{p.credits} CC</T>
                    </Row>
                    {best ? (
                      <View style={{ backgroundColor: C.ink, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        <T style={{ color: "#FFFFFF", fontSize: 11, fontFamily: F.medium }}>BEST VALUE</T>
                      </View>
                    ) : null}
                  </Row>
                  <T style={{ fontFamily: F.semibold, fontSize: 36, letterSpacing: -1 }}>{naira(p.priceNaira)}</T>
                  <T v="small" style={{ color: C.ink, opacity: 0.75 }}>
                    {naira(Math.round(p.priceNaira / p.credits))} per CC · Never expires
                  </T>
                  <Btn
                    label="Get started"
                    tone={best ? "dark" : "light"}
                    onPress={() => router.push(isAuthenticated ? "/home/wallet" : "/auth/sign-in")}
                    style={{ marginTop: 6 }}
                  />
                </Card>
              );
            })}
          </View>
        </View>

        {/* ---------- 8. FREQUENTLY ASKED QUESTIONS ---------- */}
        <View style={{ gap: 16 }}>
          <View style={{ gap: 4 }}>
            <T v="label" style={{ textTransform: "uppercase", letterSpacing: 1 }}>FAQ</T>
            <T v="title">Common questions</T>
          </View>

          <View style={{ gap: 10 }}>
            {FAQS.map((item, idx) => {
              const open = openFaq === idx;
              return (
                <Pressable
                  key={item.q}
                  onPress={() => setOpenFaq(open ? null : idx)}
                  style={{ backgroundColor: C.card, borderRadius: R.card, padding: 22, gap: 10 }}
                >
                  <Row style={{ justifyContent: "space-between" }}>
                    <T style={{ fontFamily: F.medium, fontSize: 17, flex: 1 }}>{item.q}</T>
                    <ChevronDown
                      size={20}
                      strokeWidth={ICON.stroke}
                      color={C.ink}
                      style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
                    />
                  </Row>
                  {open ? <T v="label" style={{ fontSize: 15, lineHeight: 22 }}>{item.a}</T> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ---------- 9. FOOTER ---------- */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: C.line,
            paddingTop: 32,
            gap: 20,
            flexDirection: isWide ? "row" : "column",
            justifyContent: "space-between",
            alignItems: isWide ? "center" : "flex-start",
          }}
        >
          <View style={{ gap: 4 }}>
            <T style={{ fontFamily: F.semibold, fontSize: 20 }}>Relaxxo</T>
            <T v="small">Verified massage therapists & boutique stays · Lagos & Abuja, Nigeria.</T>
          </View>

          <Row style={{ flexWrap: "wrap" }} gap={20}>
            <Pressable onPress={() => router.push("/home")}>
              <T v="small" style={{ color: C.ink, fontFamily: F.medium }}>Browse Map & Wheel</T>
            </Pressable>
            <Pressable onPress={() => router.push("/therapists")}>
              <T v="small" style={{ color: C.ink, fontFamily: F.medium }}>Online Therapists</T>
            </Pressable>
            <Pressable onPress={() => router.push("/home/stays")}>
              <T v="small" style={{ color: C.ink, fontFamily: F.medium }}>Available Stays</T>
            </Pressable>
            <Pressable onPress={() => router.push("/auth/sign-in?as=therapist")}>
              <T v="small" style={{ color: C.ink, fontFamily: F.medium }}>Therapist Sign-up</T>
            </Pressable>
            <Pressable onPress={() => router.push("/auth/sign-in?as=hotel")}>
              <T v="small" style={{ color: C.ink, fontFamily: F.medium }}>Hotel Sign-up</T>
            </Pressable>
          </Row>
        </View>
      </View>
    </ScrollView>
  );
}

