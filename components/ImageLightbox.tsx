import React, { useEffect, useState } from "react";
import { Image, Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { T, Row } from "@/components/ui";
import { F, ICON } from "@/lib/theme";

/**
 * Full-screen image viewer modal.
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
              <Image
                source={{ uri: current }}
                resizeMode="contain"
                style={{ width: "100%", height: "100%", maxWidth: 900 }}
              />
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
