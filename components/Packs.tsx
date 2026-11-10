import React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { T, Row, ErrorNote } from "@/components/ui";
import { C, F } from "@/lib/theme";
import { naira } from "@/lib/util";
import { usePurchase } from "@/lib/usePurchase";

export function Packs({ returnTo, onSuccess }: { returnTo?: string; onSuccess?: () => void } = {}) {
  const settings = useQuery(api.settings.publicSettings);
  const { buy, busyPack, message, error } = usePurchase({ returnTo, onSuccess });
  if (!settings) return <ActivityIndicator color={C.ink} />;
  const best = settings.packs.reduce((a, b) => (b.priceNaira / b.credits < a.priceNaira / a.credits ? b : a));
  return (
    <View style={{ gap: 10 }}>
      {settings.packs.map((p) => {
        const isBest = p.id === best.id && settings.packs.length > 1;
        return (
          <Pressable
            key={p.id}
            onPress={() => buy(p.id)}
            disabled={!!busyPack}
            accessibilityRole="button"
            accessibilityLabel={`Buy ${p.credits} Connection Credits for ${naira(p.priceNaira)}`}
            style={{ backgroundColor: isBest ? C.lime : C.card, borderRadius: 24, padding: 18 }}
          >
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ gap: 4 }}>
                <T v="value">{p.credits} CC</T>
                <T v="small" style={{ color: isBest ? C.ink : C.muted }}>{naira(p.priceNaira / p.credits)} per CC{isBest ? " · best value" : ""}</T>
              </View>
              <View style={{ height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: C.ink, justifyContent: "center" }}>
                {busyPack === p.id ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <T style={{ color: "#FFFFFF", fontFamily: F.medium }}>{naira(p.priceNaira)}</T>
                )}
              </View>
            </Row>
          </Pressable>
        );
      })}
      {message ? <T v="label">{message}</T> : null}
      <ErrorNote text={error} />
      <T v="small">Secure payment by Paystack. Connection Credits (CC) don't expire and can't be cashed out.</T>
    </View>
  );
}
