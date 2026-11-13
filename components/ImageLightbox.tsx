import React, { useEffect, useState } from "react";
import { Image, Modal, Platform, Pressable, Text, View } from "react-native";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { F, ICON } from "@/lib/theme";

function getRelaxxoDomain() {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1") return host;
  }
  return "relaxxo.app";
}

/**
 * Full-screen image viewer with a centered Relaxxo domain watermark.
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
  if (!visible) return null;

  const current = images[index] ?? images[0];
  const hasMultiple = images.length > 1;
  const domain = getRelaxxoDomain();

  const content = (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.94)",
        ...(Platform.OS === "web"
          ? ({ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 } as object)
          : null),
      }}
    >
      {/* Top bar: counter + close */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: Platform.OS === "ios" ? 54 : 20,
          paddingBottom: 12,
          zIndex: 60,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontFamily: F.medium, fontSize: 15 }}>
          {hasMultiple ? `${index + 1} / ${images.length}` : ""}
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close full image"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(255,255,255,0.18)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={22} strokeWidth={ICON.stroke} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Main image area */}
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

      {/* Centered domain watermark — rendered on top of the image */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
        }}
      >
        <View
          style={{
            transform: [{ rotate: "-18deg" }],
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.45)",
            maxWidth: "88%",
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: "rgba(255, 255, 255, 0.95)",
              fontFamily: F.semibold,
              fontSize: 18,
              letterSpacing: 0.5,
              textAlign: "center",
            }}
          >
            {domain}
          </Text>
        </View>
      </View>

      {/* Bottom prev/next arrows */}
      {hasMultiple ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? 36 : 24,
            zIndex: 60,
          }}
        >
          <Pressable
            onPress={() => setIndex((i) => (i - 1 + images.length) % images.length)}
            accessibilityRole="button"
            accessibilityLabel="Previous image"
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: "rgba(255,255,255,0.18)",
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
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronRight size={24} strokeWidth={ICON.stroke} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  if (Platform.OS === "web") {
    return content;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}
