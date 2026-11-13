import React from "react";
import { Image, Linking, Pressable, View } from "react-native";
import { T, Row } from "@/components/ui";
import { C, F } from "@/lib/theme";

export function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "lime" | "dark" }) {
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: 200,
        backgroundColor: tone === "lime" ? C.lime : tone === "dark" ? C.brand : C.card,
        borderRadius: 24,
        padding: 20,
        gap: 6,
      }}
    >
      <T v="label" style={{ color: tone === "dark" ? "#E7FBFA" : tone === "lime" ? C.onLime : C.muted }}>{label}</T>
      <T style={{ fontFamily: F.regular, fontSize: 32, letterSpacing: -1, color: tone === "dark" ? C.onBrand : tone === "lime" ? C.onLime : C.ink }}>{value}</T>
    </View>
  );
}

export function Grid({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>{children}</View>;
}

export function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ marginTop: 28, gap: 12 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <T v="h2">{title}</T>
        {right}
      </Row>
      {children}
    </View>
  );
}

export function Thumbs({ urls, size = 96 }: { urls: (string | null)[]; size?: number }) {
  return (
    <Row style={{ flexWrap: "wrap" }}>
      {urls.filter((u): u is string => !!u).map((u, i) => (
        <Pressable key={i} onPress={() => Linking.openURL(u)} accessibilityLabel="Open full size">
          <Image source={{ uri: u }} style={{ width: size, height: size, borderRadius: 14, backgroundColor: C.soft }} />
        </Pressable>
      ))}
    </Row>
  );
}

export function SmallBtn({ label, onPress, tone = "light" }: { label: string; onPress: () => void; tone?: "light" | "dark" | "lime" | "danger" }) {
  const bg = tone === "dark" ? C.brand : tone === "lime" ? C.lime : tone === "danger" ? C.dangerSoft : C.soft;
  const fg = tone === "dark" ? C.onBrand : tone === "lime" ? C.onLime : tone === "danger" ? C.danger : C.ink;
  return (
    <Pressable onPress={onPress} style={{ height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: bg, justifyContent: "center" }}>
      <T style={{ fontSize: 14, fontFamily: F.medium, color: fg }}>{label}</T>
    </Pressable>
  );
}

export function TableRow({ cells, header }: { cells: React.ReactNode[]; header?: boolean }) {
  return (
    <View style={{ flexDirection: "row", paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: C.line, gap: 12 }}>
      {cells.map((c, i) => (
        <View key={i} style={{ flex: 1, minWidth: 90 }}>
          {typeof c === "string" || typeof c === "number" ? (
            <T v={header ? "label" : "body"} style={{ fontSize: 14 }} numberOfLines={2}>{String(c)}</T>
          ) : (
            c
          )}
        </View>
      ))}
    </View>
  );
}

// Simple browser prompt for reasons (admin is web-only).
export function ask(question: string): string | null {
  if (typeof window === "undefined" || !window.prompt) return null;
  const r = window.prompt(question);
  return r && r.trim().length ? r.trim() : null;
}
