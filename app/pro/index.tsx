import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { Wallet } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { Screen, T, Row, Btn, Card, ErrorNote, Loading } from "@/components/ui";
import { Sheet } from "@/components/Sheet";
import { Packs } from "@/components/Packs";
import { C, F, ICON } from "@/lib/theme";
import { errorMessage, timeLeft } from "@/lib/util";

export default function TherapistDashboard() {
  const me = useQuery(api.users.me);
  const d = useQuery(api.therapists.dashboard);
  const settings = useQuery(api.settings.publicSettings);
  const goOnline = useMutation(api.therapists.goOnline);
  const goOffline = useMutation(api.therapists.goOffline);
  const [pick, setPick] = useState(1);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!d || !settings || !me) return <Loading />;
  const online = d.onlineUntil > Date.now();
  const option = settings.onlineOptions[Math.min(pick, settings.onlineOptions.length - 1)];
  const enough = d.credits >= option.credits;

  async function act() {
    setError(null);
    setBusy(true);
    try {
      if (online) await goOffline({});
      else if (enough) await goOnline({ optionId: option.id });
      else setTopUpOpen(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Row style={{ justifyContent: "space-between" }}>
        <T v="label" style={{ fontSize: 15 }}>{d.area}</T>
        <Pressable
          onPress={() => router.push("/pro/wallet")}
          style={{ height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: C.card, flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Wallet size={18} strokeWidth={ICON.stroke} color={C.ink} />
          <T style={{ fontFamily: F.medium }}>{d.credits} CC</T>
        </Pressable>
      </Row>
      <T v="title" style={{ marginTop: 18 }}>Hi, {me.name.split(" ")[0]}</T>

      <Card dark={!online} style={{ marginTop: 18, minHeight: 196, justifyContent: "space-between", backgroundColor: online ? C.lime : C.ink, padding: 22, gap: 10 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <T v="label" style={{ color: online ? C.ink : "#BDBDB7" }}>Status</T>
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: online ? C.success : "#6B6E74" }} />
        </Row>
        <T style={{ fontFamily: F.regular, fontSize: 52, lineHeight: 58, letterSpacing: -1.6, color: online ? C.ink : "#FFFFFF" }}>{online ? "Online" : "Offline"}</T>
        <T style={{ color: online ? C.ink : "#BDBDB7" }}>
          {online ? `${timeLeft(d.onlineUntil)} left · clients in ${d.area} can find you` : "Clients can't see you right now"}
        </T>
      </Card>

      <Row style={{ marginTop: 16 }} gap={10}>
        {[
          { n: d.viewsToday, l: "Profile views today" },
          { n: d.unlocksToday, l: "Unlocks today" },
          { n: d.chatsCount, l: "Active chats" },
        ].map((s) => (
          <Card key={s.l} style={{ flex: 1, padding: 16 }}>
            <T v="value">{s.n}</T>
            <T v="small">{s.l}</T>
          </Card>
        ))}
      </Row>

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
                  accessibilityRole="radio"
                  accessibilityState={{ checked: sel }}
                  style={{
                    width: "48%",
                    flexGrow: 1,
                    height: 80,
                    borderRadius: 24,
                    backgroundColor: sel ? C.lime : C.card,
                    borderWidth: 2,
                    borderColor: sel ? C.ink : C.card,
                    justifyContent: "center",
                    paddingHorizontal: 18,
                  }}
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

      {d.awaitingReply > 0 ? (
        <Pressable onPress={() => router.push("/pro/inbox")} style={{ marginTop: 14, backgroundColor: C.card, borderRadius: 22, padding: 16 }}>
          <T style={{ fontFamily: F.medium }}>{d.awaitingReply} client{d.awaitingReply > 1 ? "s" : ""} waiting for a reply</T>
          <T v="small">Tap to open your inbox and respond.</T>
        </Pressable>
      ) : null}

      <View style={{ marginTop: 18, gap: 10 }}>
        <ErrorNote text={error} />
        <Btn
          label={online ? "Go offline" : enough ? `Go online · ${option.credits} CC` : "Top up CC to go online"}
          tone={online ? "light" : enough ? "lime" : "light"}
          arrow
          loading={busy}
          onPress={act}
        />
        {online ? <Btn label={`Extend by ${option.label} (${option.credits} CC)`} tone="dark" onPress={() => (enough ? goOnline({ optionId: option.id }).catch((e) => setError(errorMessage(e))) : setTopUpOpen(true))} /> : null}
      </View>

      <Sheet visible={topUpOpen} onClose={() => setTopUpOpen(false)} title="Top up Connection Credits (CC)">
        <T v="label">You need {option.credits} CC for {option.label}. You have {d.credits} CC.</T>
        <Packs returnTo="/pro" onSuccess={() => setTopUpOpen(false)} />
      </Sheet>
    </Screen>
  );
}
