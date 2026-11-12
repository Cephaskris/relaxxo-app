import React, { useState } from "react";
import { Image, Linking, Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { Flag, Navigation, Copy, MapPin } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Screen, T, Row, BackBtn, CircleBtn, Btn, Pill, Card, Placeholder, Loading } from "@/components/ui";
import { ReportSheet } from "@/components/ReportSheet";
import { ImageLightbox } from "@/components/ImageLightbox";
import { C, F, ICON } from "@/lib/theme";
import { naira, prettyPhone } from "@/lib/util";

// Hotel contact is free for clients (hotels pay credits to be visible).
export default function HotelProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const hotelId = id as Id<"hotels">;
  const { isAuthenticated } = useConvexAuth();
  const h = useQuery(api.hotels.getPublic, { hotelId });
  const recordContactView = useMutation(api.hotels.recordContactView);
  const [contactOpen, setContactOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  if (h === undefined) return <Loading />;
  if (h === null)
    return (
      <Screen>
        <BackBtn />
        <T v="title" style={{ marginTop: 24 }}>This hotel isn't available</T>
      </Screen>
    );
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`;

  function onShowContact() {
    if (!isAuthenticated) return router.push("/auth/sign-in");
    setContactOpen(true);
    recordContactView({ hotelId }).catch(() => {});
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen padBottom={220}>
        <Row style={{ justifyContent: "space-between" }}>
          <BackBtn />
          <T v="label" style={{ fontSize: 15 }}>Stay · {h.area}</T>
          <CircleBtn label="Report" onPress={() => (isAuthenticated ? setReportOpen(true) : router.push("/auth/sign-in"))} icon={<Flag size={22} strokeWidth={ICON.stroke} color={C.ink} />} />
        </Row>
        <Pressable
          onPress={() => {
            if (h.cover) {
              setViewerImages([h.cover]);
              setViewerIndex(0);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="View hotel cover photo"
          style={{ height: 220, borderRadius: 28, overflow: "hidden", marginTop: 18 }}
        >
          {h.cover ? <Image source={{ uri: h.cover }} style={{ width: "100%", height: "100%" }} /> : <Placeholder style={{ flex: 1 }} />}
        </Pressable>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start", marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <T v="title">{h.name}</T>
            <T v="label">{contactOpen ? h.address : h.area}</T>
          </View>
          <CircleBtn label="View on map" onPress={() => Linking.openURL(directions)} icon={<MapPin size={22} strokeWidth={ICON.stroke} color={C.ink} />} />
        </Row>
        <Row style={{ flexWrap: "wrap", marginTop: 12 }}>
          {h.amenities.map((a) => <Pill key={a} label={a} />)}
        </Row>

        <T v="label" style={{ marginTop: 22, marginBottom: 8 }}>Available rooms</T>
        <View style={{ gap: 12 }}>
          {h.rooms.map((r, i) => (
            <Card key={r._id} style={{ padding: 4 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {r.photos.length ? (
                  r.photos.map((p, j) => (
                    <Pressable
                      key={j}
                      onPress={() => {
                        setViewerImages(r.photos);
                        setViewerIndex(j);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`View room photo ${j + 1}`}
                    >
                      <Image source={{ uri: p }} style={{ width: 240, height: 150, borderRadius: 24 }} />
                    </Pressable>
                  ))
                ) : (
                  <Placeholder seed={i} style={{ width: 240, height: 150, borderRadius: 24 }} />
                )}
              </ScrollView>
              <Row style={{ padding: 14, justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <T v="h2">{r.name}</T>
                  <T v="small">{r.availableCount > 0 ? `${r.availableCount} available tonight` : "Full right now"}</T>
                </View>
                <T style={{ fontFamily: F.medium, fontSize: 18 }}>{naira(r.pricePerNight)}<T v="small"> /night</T></T>
              </Row>
            </Card>
          ))}
        </View>
      </Screen>

      <View style={{ position: "absolute", left: 12, right: 12, bottom: 16, alignItems: "center" }}>
        {contactOpen ? (
          <Card style={{ width: "100%", maxWidth: 540, gap: 12, padding: 16 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <T v="small">{h.address}</T>
                <T v="value">{prettyPhone(h.phone)}</T>
              </View>
              <Row gap={8}>
                <CircleBtn
                  label={copied ? "Copied" : "Copy number"}
                  tone={copied ? "lime" : "light"}
                  onPress={async () => {
                    await Clipboard.setStringAsync(h.phone);
                    setCopied(true);
                  }}
                  icon={<Copy size={20} strokeWidth={ICON.stroke} color={C.ink} />}
                />
                <CircleBtn label="Directions" tone="dark" onPress={() => Linking.openURL(directions)} icon={<Navigation size={22} strokeWidth={ICON.stroke} color="#FFFFFF" />} />
              </Row>
            </Row>
            <Btn label="Call to reserve" arrow onPress={() => Linking.openURL(`tel:${h.phone}`)} />
          </Card>
        ) : (
          <View style={{ width: "100%", maxWidth: 540, height: 80, borderRadius: 40, backgroundColor: C.nav, padding: 8, justifyContent: "center" }}>
            <Btn label="Show hotel contact · Free" arrow onPress={onShowContact} style={{ height: 64 }} />
          </View>
        )}
      </View>
      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} targetType="hotel" targetId={h._id} />
      <ImageLightbox images={viewerImages} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
    </View>
  );
}
