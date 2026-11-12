import React, { useEffect, useState } from "react";
import { Image, Modal, Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { T, Row } from "@/components/ui";
import { F, ICON } from "@/lib/theme";

function getRelaxxoDomain() {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1") return host;
  }
  return "relaxxo.app";
}

/**
 * Full-screen image viewer modal with a centered Relaxxo domain watermark.
 * Pass `images` and `initialIndex` (or `null` when closed).
 */
export function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: string[];
  initialIndex: number | null;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (initialIndex !== null) {
      setIndex(Math.max(0, Math.min(images.length - 1, initialIndex)));
    }
  }, [initialIndex, images.length]);

  const visible = initialIndex !== null && images.length > 0;
  const current = images[index] ?? images[0];
  const hasMultiple = images.length > 1;
  const domain = getRelaxxoDomain();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.94)" }}>
        <SafeAreaView style={{ flex: 1 }}>
          <Row style={{ justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 }}>
            <T style={{ color: "#FFFFFF", fontFamily: F.medium, fontSize: 15 }}>
              {hasMultiple ? `${index + 1} / ${images.length}` : ""}
            </T>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close full image"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "rgba(255,255,255,0.16)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={22} strokeWidth={ICON.stroke} color="#FFFFFF" />
            </Pressable>
          </Row>

          <Pressable
            onPress={onClose}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }}
          >
            {current ? (
              <View style={{ width: "100%", height: "100%", maxWidth: 900, alignItems: "center", justifyContent: "center" }}>
                <Image
                  source={{ uri: current }}
                  resizeMode="contain"
                  style={{ width: "100%", height: "100%" }}
                />
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    zIndex: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ rotate: "-18deg" }],
                    paddingHorizontal: 22,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: "rgba(0, 0, 0, 0.48)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.35)",
                  }}
                >
                  <T
                    style={{
                      color: "rgba(255, 255, 255, 0.92)",
                      fontFamily: F.semibold,
                      fontSize: 22,
                      letterSpacing: 0.6,
                      textAlign: "center",
                      textShadowColor: "rgba(0, 0, 0, 0.85)",
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 6,
                    }}
                  >
                    {domain}
                  </T>
                </View>
              </View>
            ) : null}
          </Pressable>

          {hasMultiple ? (
            <Row style={{ justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 20 }}>
              <Pressable
                onPress={() => setIndex((i) => (i - 1 + images.length) % images.length)}
                accessibilityRole="button"
                accessibilityLabel="Previous image"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: "rgba(255,255,255,0.16)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevronLeft size={24} strokeWidth={ICON.stroke} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={() => setIndex((i) => (i + 1) % images.length)}
                accessibilityRole="button"
                accessibilityLabel="Next image"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: "rgba(255,255,255,0.16)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevronRight size={24} strokeWidth={ICON.stroke} color="#FFFFFF" />
              </Pressable>
            </Row>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

