import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowRight, ArrowLeft } from "lucide-react-native";
import { router } from "expo-router";
import { C, F, R, ICON } from "@/lib/theme";

// ---------- Layout ----------

export function Screen({
  children,
  scroll = true,
  padBottom = 120,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padBottom?: number;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: padBottom }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: "100%", maxWidth: 560, alignSelf: "center" }}>{children}</View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12, width: "100%", maxWidth: 560, alignSelf: "center" }}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

export function Row({ children, style, gap = 8 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>{children}</View>;
}

// ---------- Text ----------

type Variant = "display" | "title" | "h2" | "body" | "label" | "value" | "small";
const variants: Record<Variant, object> = {
  display: { fontFamily: F.regular, fontSize: 38, lineHeight: 42, letterSpacing: -1.1 },
  title: { fontFamily: F.regular, fontSize: 32, lineHeight: 36, letterSpacing: -0.9 },
  h2: { fontFamily: F.medium, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  body: { fontFamily: F.regular, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: C.muted },
  value: { fontFamily: F.medium, fontSize: 24, lineHeight: 28, letterSpacing: -0.4 },
  small: { fontFamily: F.regular, fontSize: 12, lineHeight: 16, color: C.muted },
};

export function T({ v = "body", style, ...p }: TextProps & { v?: Variant }) {
  const flat = StyleSheet.flatten(style);
  const autoLineHeight =
    flat && typeof flat.fontSize === "number" && flat.lineHeight === undefined
      ? { lineHeight: Math.round(flat.fontSize * 1.18) }
      : null;
  return <Text {...p} style={[{ color: C.ink }, variants[v], style, autoLineHeight]} />;
}

// ---------- Buttons ----------

export function Btn({
  label,
  onPress,
  tone = "lime",
  arrow = false,
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  tone?: "lime" | "dark" | "light";
  arrow?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = tone === "lime" ? C.lime : tone === "dark" ? C.ink : C.card;
  const fg = tone === "dark" ? "#FFFFFF" : C.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1, paddingRight: arrow ? 6 : 24 },
        { justifyContent: arrow ? "space-between" : "center" },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ fontFamily: F.medium, fontSize: 16, color: fg }}>{label}</Text>
      )}
      {arrow && !loading ? (
        <View style={[s.arrow, { backgroundColor: tone === "dark" ? C.lime : C.ink }]}>
          <ArrowRight size={22} strokeWidth={ICON.stroke} color={tone === "dark" ? C.ink : "#FFFFFF"} />
        </View>
      ) : null}
    </Pressable>
  );
}

export function CircleBtn({
  icon,
  onPress,
  label,
  tone = "light",
  size = 52,
}: {
  icon: React.ReactNode;
  onPress?: () => void;
  label: string;
  tone?: "light" | "dark" | "lime";
  size?: number;
}) {
  const bg = tone === "light" ? C.card : tone === "dark" ? C.ink : C.lime;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {icon}
    </Pressable>
  );
}

export function BackBtn() {
  return (
    <CircleBtn
      label="Back"
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      icon={<ArrowLeft size={ICON.size} strokeWidth={ICON.stroke} color={C.ink} />}
    />
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={{
        height: 44,
        paddingHorizontal: 18,
        borderRadius: R.pill,
        backgroundColor: active ? C.ink : C.card,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: F.regular, fontSize: 14, color: active ? "#FFFFFF" : C.ink }}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ label, tone = "light", icon }: { label: string; tone?: "light" | "lime" | "dark"; icon?: React.ReactNode }) {
  const bg = tone === "lime" ? C.lime : tone === "dark" ? "rgba(20,20,20,0.75)" : C.card;
  return (
    <View style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: bg, flexDirection: "row", alignItems: "center", gap: 4 }}>
      {icon}
      <Text style={{ fontFamily: F.medium, fontSize: 13, color: tone === "dark" ? "#FFFFFF" : C.ink }}>{label}</Text>
    </View>
  );
}

// ---------- Containers & inputs ----------

export function Card({ children, style, dark }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  return <View style={[{ backgroundColor: dark ? C.ink : C.card, borderRadius: R.card, padding: 20 }, style]}>{children}</View>;
}

export function Field({ label, error, style, ...p }: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={{ gap: 6 }}>
      <T v="label">{label}</T>
      <TextInput
        placeholderTextColor="#9A9A94"
        numberOfLines={p.multiline ? (p.numberOfLines ?? 5) : undefined}
        {...p}
        style={[
          {
            minHeight: 56,
            borderRadius: R.field,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            paddingHorizontal: 18,
            paddingVertical: p.multiline ? 14 : 0,
            fontFamily: F.regular,
            fontSize: 16,
            color: C.ink,
            textAlignVertical: p.multiline ? "top" : "center",
          },
          style,
        ]}
      />
      {error ? <T v="small" style={{ color: C.danger }}>{error}</T> : null}
    </View>
  );
}

export function ErrorNote({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <View style={{ backgroundColor: "#FBE9E4", borderRadius: 16, padding: 14 }}>
      <T style={{ color: C.danger, fontSize: 14 }}>{text}</T>
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
      <ActivityIndicator color={C.ink} />
    </View>
  );
}

export function Placeholder({ seed = 0, style, label = "Photo" }: { seed?: number; style?: StyleProp<ViewStyle>; label?: string }) {
  return (
    <View style={[{ backgroundColor: C.placeholder[seed % C.placeholder.length], alignItems: "center", justifyContent: "center" }, style]}>
      <T v="small" style={{ color: "rgba(255,255,255,0.85)" }}>{label}</T>
    </View>
  );
}

const s = StyleSheet.create({
  btn: { height: 60, borderRadius: R.pill, flexDirection: "row", alignItems: "center", paddingLeft: 24 },
  arrow: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
