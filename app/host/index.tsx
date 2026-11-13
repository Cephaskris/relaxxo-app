import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { Wallet, Sun, Moon } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { Screen, T, Row, Btn, Card, ErrorNote, Loading, CircleBtn } from "@/components/ui";
import { RoomsManager } from "@/components/RoomsManager";
import { Sheet } from "@/components/Sheet";
import { Packs } from "@/components/Packs";
import { ProviderStatePicker } from "@/components/ProviderStatePicker";
import { useTheme } from "@/components/ThemeProvider";
import { C, F, ICON } from "@/lib/theme";
import { errorMessage, timeLeft } from "@/lib/util";

export default function HotelDashboard() {
  const { mode, colors, toggle } = useTheme();
  const me = useQuery(api.users.me);
  const h = useQuery(api.hotels.mine);
  const settings = useQuery(api.settings.publicSettings);
  const goOnline = useMutation(api.hotels.goOnline);
  const goOffline = useMutation(api.hotels.goOffline);
  const [pick, setPick] = useState(2);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!h || !settings || !me) return <Loading />;
  const online = h.onlineUntil > now;
  const option = settings.onlineOptions[Math.min(pick, settings.onlineOptions.length - 1)];
  const liveRooms = h.rooms.filter((r) => r.status === "approved" && r.availableCount > 0).length;

  async function act() {
    setError(null);
    setBusy(true);
    try {
      if (online) await goOffline({});
      else await goOnline({ optionId: option.id });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Row style={{ justifyContent: "space-between" }}>
        <ProviderStatePicker kind="hotel" city={h.city} area={h.area} />
        <Row gap={8}>
          <CircleBtn
            size={44}
            label={mode === "dark" ? "Switch to Light Luxury" : "Switch to Full Dark Midnight"}
            onPress={toggle}
            icon={
              mode === "dark" ? (
                <Sun size={18} strokeWidth={ICON.stroke} color={colors.lime} />
              ) : (
                <Moon size={18} strokeWidth={ICON.stroke} color={colors.ink} />
              )
            }
          />
          <Pressable
            onPress={() => router.push("/host/wallet")}
            style={{ height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Wallet size={18} strokeWidth={ICON.stroke} color={colors.ink} />
            <T style={{ fontFamily: F.medium }}>{me.credits} CC</T>
          </Pressable>
        </Row>
      </Row>
      <T v="title" style={{ marginTop: 18 }}>{h.name}</T>

      <Card style={{ marginTop: 18, minHeight: 180, justifyContent: "space-between", backgroundColor: online ? colors.lime : colors.brand, padding: 22, gap: 10 }}>
        <T v="label" style={{ color: online ? colors.onLime : "#B6DCD9" }}>Visibility</T>
        <T style={{ fontFamily: F.regular, fontSize: 52, lineHeight: 58, letterSpacing: -1.6, color: online ? colors.onLime : "#FFFFFF" }}>{online ? "Online" : "Offline"}</T>
        <T style={{ color: online ? colors.onLime : "#B6DCD9" }}>
          {online ? `${timeLeft(h.onlineUntil, now)} left · ${liveRooms} room types showing` : "Guests can't see your rooms right now"}
        </T>
      </Card>
      <Row style={{ marginTop: 16 }} gap={10}>
        <Card style={{ flex: 1, padding: 16 }}>
          <T v="value">{h.contactViewsToday}</T>
          <T v="small">Contact views today</T>
        </Card>
        <Card style={{ flex: 1, padding: 16 }}>
          <T v="value">{liveRooms}</T>
          <T v="small">Available room types</T>
        </Card>
      </Row>
      {liveRooms === 0 ? <T v="small" style={{ marginTop: 8 }}>You need at least one approved room with availability to appear in search.</T> : null}

      {!online ? (
        <>
          <T v="label" style={{ marginTop: 22, marginBottom: 10 }}>Go online for</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {settings.onlineOptions.map((o, i) => {
              const sel = i === pick;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => setPick(i)}
                  style={{ width: "48%", flexGrow: 1, height: 80, borderRadius: 24, backgroundColor: sel ? C.lime : C.card, borderWidth: 2, borderColor: sel ? C.ink : C.card, justifyContent: "center", paddingHorizontal: 18 }}
                >
                  <T style={{ fontFamily: F.medium, fontSize: 18 }}>{o.label}</T>
                  <T v="small" style={{ color: C.ink }}>{o.credits} CC</T>
                </Pressable>
              );
            })}
          </View>
          <T v="small" style={{ marginTop: 8 }}>Going offline early doesn't refund unused time.</T>
        </>
      ) : null}

      <View style={{ marginTop: 18, gap: 10 }}>
        <ErrorNote text={error} />
        <Btn
          label={online ? "Go offline" : `Go online for ${option.label} · ${option.credits} CC`}
          tone={online ? "light" : "lime"}
          arrow
          loading={busy}
          onPress={act}
        />
        {online ? <Btn label={`Extend by ${option.label} (${option.credits} CC)`} tone="dark" onPress={() => goOnline({ optionId: option.id }).catch((e) => setError(errorMessage(e)))} /> : null}
        {!online ? <Btn label="Get free CC coins" tone="light" onPress={() => setTopUpOpen(true)} /> : null}
      </View>

      <T v="h2" style={{ marginTop: 28, marginBottom: 12 }}>Today's availability</T>
      <RoomsManager rooms={h.rooms} compact />

      <Sheet visible={topUpOpen} onClose={() => setTopUpOpen(false)} title="Top up Connection Credits (CC)">
        <T v="label">You need {option.credits} CC for {option.label}. You have {me.credits} CC.</T>
        <Packs returnTo="/host" onSuccess={() => setTopUpOpen(false)} />
      </Sheet>
    </Screen>
  );
}
