import React from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { useConvexAuth, useQuery } from "convex/react";
import { Star } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { AccountScreen } from "@/components/AccountScreen";
import { Btn, Card, Pill, Row, T } from "@/components/ui";
import { F } from "@/lib/theme";
import { ago } from "@/lib/util";

export default function TherapistAccount() {
  const { isAuthenticated } = useConvexAuth();
  const mine = useQuery(api.therapists.mine, isAuthenticated ? {} : "skip");

  return (
    <AccountScreen
      extra={
        <View style={{ marginTop: 18, gap: 14 }}>
          <Btn label="Edit profile, photos and location" tone="light" onPress={() => router.push("/onboarding/therapist")} />
          <Btn label="Edit services and prices" tone="light" onPress={() => router.push("/pro/services")} />

          {mine ? (
            <View style={{ marginTop: 10, gap: 10 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <T v="h2">Ratings & reviews</T>
                <Pill
                  tone="lime"
                  label={mine.rating ? `${mine.rating} · ${mine.ratingCount} reviews` : "No reviews yet"}
                  icon={<Star size={14} fill="#F5C443" color="#F5C443" />}
                />
              </Row>
              {mine.reviews.length === 0 ? (
                <T v="label">Client ratings will appear here after your sessions.</T>
              ) : (
                mine.reviews.map((r) => (
                  <Card key={r._id} style={{ padding: 14, gap: 4 }}>
                    <Row style={{ justifyContent: "space-between" }}>
                      <T style={{ fontFamily: F.medium }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</T>
                      <T v="small">{ago(r.at)} ago</T>
                    </Row>
                    {r.text ? <T v="label">{r.text}</T> : null}
                  </Card>
                ))
              )}
            </View>
          ) : null}
        </View>
      }
    />
  );
}
