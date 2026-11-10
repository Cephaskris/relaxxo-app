import React from "react";
import { Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Bookmark, MessageCircle, Star } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { AccountScreen } from "@/components/AccountScreen";
import { Card, CircleBtn, Pill, Placeholder, Row, T } from "@/components/ui";
import { C, F, ICON } from "@/lib/theme";
import { timeLeft } from "@/lib/util";

export default function ClientAccount() {
  const { isAuthenticated } = useConvexAuth();
  const unlocks = useQuery(api.unlocks.myThreads, isAuthenticated ? {} : "skip");
  const saved = useQuery(api.users.mySavedTherapists, isAuthenticated ? {} : "skip");
  const toggleSave = useMutation(api.users.toggleSaveTherapist);

  return (
    <AccountScreen
      extra={
        isAuthenticated ? (
          <View style={{ gap: 22, marginTop: 24 }}>
            <View style={{ gap: 10 }}>
              <T v="h2">My unlocks</T>
              {!unlocks || unlocks.length === 0 ? (
                <T v="label">You haven't unlocked any therapists yet.</T>
              ) : (
                unlocks.map((u) => (
                  <Card key={u._id} style={{ padding: 16 }}>
                    <Row style={{ justifyContent: "space-between" }}>
                      <Pressable style={{ flex: 1 }} onPress={() => router.push(`/therapist/${u.therapistId}`)}>
                        <T style={{ fontFamily: F.medium, fontSize: 17 }}>{u.otherName}</T>
                        <T v="small">
                          {u.otherArea ? `${u.otherArea} · ` : ""}
                          {u.refunded ? "Refunded" : u.active ? `Active · ${timeLeft(u.expiresAt)} left` : "Expired"}
                        </T>
                      </Pressable>
                      <CircleBtn
                        size={44}
                        tone={u.active ? "lime" : "light"}
                        label="Open chat"
                        onPress={() => router.push(`/chat/${u._id}`)}
                        icon={<MessageCircle size={20} strokeWidth={ICON.stroke} color={C.ink} />}
                      />
                    </Row>
                  </Card>
                ))
              )}
            </View>

            <View style={{ gap: 10 }}>
              <T v="h2">Saved therapists</T>
              {!saved || saved.length === 0 ? (
                <T v="label">Tap the bookmark icon on any therapist profile to save them here.</T>
              ) : (
                saved.map((t, i) => (
                  <Card key={t._id} style={{ padding: 12 }}>
                    <Row style={{ justifyContent: "space-between" }} gap={12}>
                      <Pressable
                        onPress={() => router.push(`/therapist/${t._id}`)}
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
                      >
                        <View style={{ width: 56, height: 56, borderRadius: 28, overflow: "hidden" }}>
                          {t.photo ? <Image source={{ uri: t.photo }} style={{ width: "100%", height: "100%" }} /> : <Placeholder seed={i} style={{ flex: 1 }} label="" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <T style={{ fontFamily: F.medium, fontSize: 17 }}>{t.displayName}</T>
                          <Row gap={6} style={{ marginTop: 2 }}>
                            <T v="small">{t.area}</T>
                            {t.rating ? (
                              <Row gap={2}>
                                <Star size={12} fill="#F5C443" color="#F5C443" />
                                <T v="small">{t.rating}</T>
                              </Row>
                            ) : null}
                            {t.online ? <Pill tone="lime" label="Online" /> : null}
                          </Row>
                        </View>
                      </Pressable>
                      <CircleBtn
                        size={44}
                        tone="lime"
                        label="Remove from saved"
                        onPress={() => toggleSave({ therapistId: t._id })}
                        icon={<Bookmark size={18} strokeWidth={ICON.stroke} color={C.ink} fill={C.ink} />}
                      />
                    </Row>
                  </Card>
                ))
              )}
            </View>
          </View>
        ) : null
      }
    />
  );
}
