import React from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Screen, T, Row, Btn, Pill, Loading } from "@/components/ui";
import { C, F } from "@/lib/theme";
import { ago } from "@/lib/util";

export function ThreadList({ title = "Chats" }: { title?: string }) {
  const { isAuthenticated } = useConvexAuth();
  const threads = useQuery(api.unlocks.myThreads, isAuthenticated ? {} : "skip");
  if (!isAuthenticated)
    return (
      <Screen>
        <T v="display">{title}</T>
        <T v="label" style={{ marginTop: 8, marginBottom: 20 }}>Sign in to see your conversations.</T>
        <Btn label="Sign in" arrow onPress={() => router.push("/auth/sign-in")} />
      </Screen>
    );
  if (threads === undefined) return <Loading />;
  return (
    <Screen>
      <T v="display">{title}</T>
      <View style={{ gap: 10, marginTop: 20 }}>
        {threads.length === 0 ? <T v="label">No conversations yet.</T> : null}
        {threads.map((t) => (
          <Pressable
            key={t._id}
            onPress={() => router.push(`/chat/${t._id}`)}
            style={{ backgroundColor: C.card, borderRadius: 24, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: t.awaitingReply ? C.lime : C.soft, alignItems: "center", justifyContent: "center" }}>
              <T style={{ fontFamily: F.medium, fontSize: 18 }}>{t.otherName.slice(0, 1).toUpperCase()}</T>
            </View>
            <View style={{ flex: 1 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <T style={{ fontFamily: F.medium }}>{t.otherName}</T>
                <Row gap={6}>
                  {t.awaitingReply ? <Pill tone="lime" label="New" /> : null}
                  <T v="small">{ago(t.lastAt)}</T>
                </Row>
              </Row>
              <T v="label" numberOfLines={1}>
                {t.refunded ? "Closed · CC refunded" : !t.active ? "Closed" : t.lastMessage ?? (t.awaitingReply ? "Waiting for a reply" : "Say hello")}
              </T>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
