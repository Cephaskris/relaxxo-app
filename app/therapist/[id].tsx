import React, { useEffect, useRef, useState } from "react";
import { Image, Linking, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { Flag, Star, Copy, Bookmark } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Screen, T, Row, BackBtn, CircleBtn, Btn, Pill, Placeholder, Loading, ErrorNote, Card } from "@/components/ui";
import { Sheet } from "@/components/Sheet";
import { Packs } from "@/components/Packs";
import { ReportSheet } from "@/components/ReportSheet";
import { useLoc } from "@/components/LocationProvider";
import { C, F, ICON } from "@/lib/theme";
import { naira, prettyPhone, errorMessage } from "@/lib/util";

export default function TherapistProfile() {
  const { id, autoUnlock } = useLocalSearchParams<{ id: string; autoUnlock?: string }>();
  const therapistId = id as Id<"therapists">;
  const loc = useLoc();
  const { isAuthenticated } = useConvexAuth();
  const t = useQuery(api.therapists.getPublic, { therapistId, lat: loc.lat, lng: loc.lng });
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const settings = useQuery(api.settings.publicSettings);
  const contact = useQuery(api.unlocks.contact, t?.activeUnlockId ? { unlockId: t.activeUnlockId } : "skip");
  const unlock = useMutation(api.unlocks.unlock);
  const toggleSave = useMutation(api.users.toggleSaveTherapist);
  const recordView = useMutation(api.therapists.recordView);
  const viewedRef = useRef(false);
  const autoUnlockedRef = useRef(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (viewedRef.current || !therapistId) return;
    viewedRef.current = true;
    recordView({ therapistId }).catch(() => {});
  }, [therapistId, recordView]);

  const cost = settings?.unlockCost ?? 1;
  const credits = me?.credits ?? 0;
  const saved = me?.savedTherapistIds?.includes(therapistId) ?? false;

  useEffect(() => {
    if (autoUnlock === "1" && !autoUnlockedRef.current && t && !t.activeUnlockId && me?.role === "client" && credits >= cost) {
      autoUnlockedRef.current = true;
      unlock({ therapistId }).catch((e) => setError(errorMessage(e)));
    }
  }, [autoUnlock, t, me, credits, cost, therapistId, unlock]);

  if (t === undefined) return <Loading />;
  if (t === null)
    return (
      <Screen>
        <BackBtn />
        <T v="title" style={{ marginTop: 24 }}>This profile isn't available</T>
      </Screen>
    );

  function onConnect() {
    setError(null);
    if (!isAuthenticated) return router.push("/auth/sign-in");
    if (me?.role !== "client") return setError("Only client accounts can connect with therapists.");
    if (credits < cost) return setTopUpOpen(true);
    setConfirmOpen(true);
  }

  async function doUnlock() {
    setBusy(true);
    setError(null);
    try {
      await unlock({ therapistId });
      setConfirmOpen(false);
    } catch (e) {
      setError(errorMessage(e));
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen padBottom={220}>
        <Row style={{ justifyContent: "space-between" }}>
          <BackBtn />
          <T v="label" style={{ fontSize: 15 }}>Therapist</T>
          <CircleBtn label="Report" onPress={() => (isAuthenticated ? setReportOpen(true) : router.push("/auth/sign-in"))} icon={<Flag size={22} strokeWidth={ICON.stroke} color={C.ink} />} />
        </Row>

        <Row style={{ marginTop: 22 }} gap={14}>
          <View style={{ width: 84, height: 84, borderRadius: 42, overflow: "hidden", borderWidth: 3, borderColor: C.lime }}>
            {t.photos[0] ? <Image source={{ uri: t.photos[0] }} style={{ width: "100%", height: "100%" }} /> : <Placeholder style={{ flex: 1 }} label="" />}
          </View>
          <View style={{ flex: 1 }}>
            <T v="title">{t.displayName}</T>
            <T v="label">{t.distanceKm ? `~${t.distanceKm} km · ` : ""}{t.area}</T>
          </View>
        </Row>

        <Row style={{ marginTop: 14, flexWrap: "wrap" }}>
          {t.rating ? <Pill label={`${t.rating} · ${t.ratingCount} reviews`} icon={<Star size={14} fill="#F5C443" color="#F5C443" />} /> : <Pill label="New" />}
          <Pill tone="lime" label="Verified" />
          <Pill label={t.workType === "both" ? "Home visit + studio" : t.workType === "home" ? "Home visit" : "Studio"} />
          <Pill label={t.serves === "both" ? "Serves everyone" : t.serves === "women" ? "Women only" : "Men only"} />
          {!t.online ? <Pill tone="dark" label="Offline now" /> : null}
        </Row>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} style={{ marginTop: 16, marginRight: -24 }}>
          {t.photos.map((p, i) => (
            <Image key={i} source={{ uri: p }} style={{ width: 160, height: 130, borderRadius: 20 }} />
          ))}
        </ScrollView>

        <T style={{ marginTop: 16 }}>{t.bio}</T>

        <T v="label" style={{ marginTop: 22, marginBottom: 4 }}>Services and prices</T>
        {t.services.map((s, i) => (
          <Row key={s._id} style={{ justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: i === t.services.length - 1 ? 0 : 1, borderColor: "#DADAD5" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <T style={{ fontFamily: F.medium }}>{s.name}</T>
              <T v="small">{s.category} · {s.durationMin} min{s.description ? ` · ${s.description}` : ""}</T>
            </View>
            <T style={{ fontFamily: F.medium }}>{naira(s.priceNaira)}</T>
          </Row>
        ))}

        {t.reviews.length ? (
          <>
            <T v="label" style={{ marginTop: 22, marginBottom: 8 }}>Recent reviews</T>
            {t.reviews.map((r) => (
              <Card key={r._id} style={{ marginBottom: 8, padding: 16 }}>
                <T style={{ fontFamily: F.medium }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</T>
                {r.text ? <T v="label" style={{ marginTop: 4 }}>{r.text}</T> : null}
              </Card>
            ))}
          </>
        ) : null}
        <View style={{ marginTop: 12 }}><ErrorNote text={error} /></View>
      </Screen>

      {/* Bottom action area */}
      <View style={{ position: "absolute", left: 12, right: 12, bottom: 16, alignItems: "center" }}>
        <View style={{ width: "100%", maxWidth: 540 }}>
          {contact ? (
            <Card style={{ gap: 12, padding: 18 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <View>
                  <T v="small">Unlocked · {Math.max(1, Math.ceil((contact.expiresAt - Date.now()) / 86400000))} days left</T>
                  <T v="value">{contact.phone ? prettyPhone(contact.phone) : "—"}</T>
                </View>
                <CircleBtn
                  label={copied ? "Copied" : "Copy number"}
                  onPress={async () => {
                    if (contact.phone) await Clipboard.setStringAsync(contact.phone);
                    setCopied(true);
                  }}
                  tone={copied ? "lime" : "light"}
                  icon={<Copy size={20} strokeWidth={ICON.stroke} color={C.ink} />}
                />
              </Row>
              <Row>
                <Btn label="Call" style={{ flex: 1 }} onPress={() => contact.phone && Linking.openURL(`tel:${contact.phone}`)} />
                <Btn label="Chat" tone="dark" style={{ flex: 1 }} onPress={() => router.push(`/chat/${t.activeUnlockId}`)} />
              </Row>
            </Card>
          ) : (
            <View style={{ height: 80, borderRadius: 40, backgroundColor: C.nav, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Btn
                label={t.online ? `Connect · ${cost} CC` : "Offline right now"}
                arrow
                disabled={!t.online}
                onPress={onConnect}
                style={{ flex: 1, height: 64 }}
              />
              <CircleBtn
                size={64}
                tone={saved ? "lime" : "light"}
                label={saved ? "Saved" : "Save therapist"}
                onPress={() => (isAuthenticated ? toggleSave({ therapistId }).catch((e) => setError(errorMessage(e))) : router.push("/auth/sign-in"))}
                icon={<Bookmark size={22} strokeWidth={ICON.stroke} color={C.ink} fill={saved ? C.ink : "transparent"} />}
              />
              <CircleBtn
                size={64}
                label="Report"
                onPress={() => (isAuthenticated ? setReportOpen(true) : router.push("/auth/sign-in"))}
                icon={<Flag size={22} strokeWidth={ICON.stroke} color={C.ink} />}
              />
            </View>
          )}
        </View>
      </View>

      <Sheet visible={confirmOpen} onClose={() => setConfirmOpen(false)} title={`Connect with ${t.displayName}?`}>
        <T style={{ color: C.muted }}>
          You'll see their phone number and can chat in the app for {settings?.unlockDays ?? 7} days.
        </T>
        <Card style={{ padding: 16 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <T v="label">Your wallet</T>
            <T style={{ fontFamily: F.medium }}>{credits} CC → {credits - cost} CC</T>
          </Row>
        </Card>
        <Btn label={`Use ${cost} CC`} tone="dark" arrow loading={busy} onPress={doUnlock} />
      </Sheet>

      <Sheet visible={topUpOpen} onClose={() => setTopUpOpen(false)} title="Buy Connection Credits (CC)">
        <T v="label">You need {cost} CC to connect. You have {credits} CC.</T>
        <Packs
          returnTo={`/therapist/${therapistId}?autoUnlock=1`}
          onSuccess={() => {
            setTopUpOpen(false);
            doUnlock();
          }}
        />
      </Sheet>

      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} targetType="therapist" targetId={t._id} />
    </View>
  );
}

