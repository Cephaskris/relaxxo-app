import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Screen, T, Row, Btn, Card, Loading } from "@/components/ui";
import { Packs } from "@/components/Packs";
import { C, F } from "@/lib/theme";
import { ago } from "@/lib/util";

const REASON: Record<string, string> = {
  purchase: "Bought Connection Credits",
  unlock: "Connected with a therapist",
  online: "Went online",
  refund: "Refund",
  bonus: "Welcome bonus",
  admin: "Adjustment by Relaxxo",
};

export function WalletScreen() {
  const { isAuthenticated } = useConvexAuth();
  const w = useQuery(api.wallet.overview, isAuthenticated ? {} : "skip");
  if (!isAuthenticated)
    return (
      <Screen>
        <T v="display">Wallet</T>
        <T v="label" style={{ marginTop: 8, marginBottom: 20 }}>Sign in to buy and use Connection Credits (CC).</T>
        <Btn label="Sign in" arrow onPress={() => router.push("/auth/sign-in")} />
      </Screen>
    );
  if (w === undefined) return <Loading />;
  return (
    <Screen>
      <T v="label">Wallet · Connection Credits (CC)</T>
      <Row style={{ marginTop: 10 }} gap={12}>
        <Card style={{ flex: 1, backgroundColor: C.lime, gap: 6, paddingVertical: 22 }}>
          <T v="label" style={{ color: C.ink }}>Balance</T>
          <T style={{ fontFamily: F.regular, fontSize: 48, lineHeight: 54, letterSpacing: -1.5, marginVertical: 2 }}>{w.credits}</T>
          <T v="small" style={{ color: C.ink }}>CC</T>
        </Card>
        <Card dark style={{ flex: 1, gap: 6, paddingVertical: 22 }}>
          <T v="label" style={{ color: "#BDBDB7" }}>Used this month</T>
          <T style={{ fontFamily: F.regular, fontSize: 48, lineHeight: 54, letterSpacing: -1.5, color: "#FFFFFF", marginVertical: 2 }}>
            {w.history.filter((h) => h.delta < 0 && h.at > Date.now() - 30 * 86400000).reduce((n, h) => n - h.delta, 0)}
          </T>
          <T v="small" style={{ color: "#BDBDB7" }}>CC</T>
        </Card>
      </Row>

      <T v="h2" style={{ marginTop: 24, marginBottom: 10 }}>Buy Connection Credits (CC)</T>
      <Packs />

      <T v="h2" style={{ marginTop: 28, marginBottom: 10 }}>History</T>
      <View style={{ gap: 8 }}>
        {w.history.length === 0 ? <T v="label">No activity yet.</T> : null}
        {w.history.map((h) => (
          <Row key={h._id} style={{ backgroundColor: C.card, borderRadius: 20, padding: 14, justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <T>{REASON[h.reason] ?? h.reason}</T>
              <T v="small">{h.note ? `${h.note} · ` : ""}{ago(h.at)} ago</T>
            </View>
            <T style={{ fontFamily: F.medium, color: h.delta > 0 ? C.success : C.ink }}>
              {h.delta > 0 ? "+" : ""}{h.delta} CC
            </T>
          </Row>
        ))}
      </View>
    </Screen>
  );
}
