import React from "react";
import { Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { Redirect, Slot, router, usePathname } from "expo-router";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { LayoutDashboard, ShieldCheck, Users, CreditCard, Flag, RotateCcw, Bell, Settings, Globe, LogOut } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { T, Loading, Screen } from "@/components/ui";
import { C, F, ICON } from "@/lib/theme";

const NAV = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/verification", label: "Verification", Icon: ShieldCheck },
  { href: "/admin/users", label: "Users & wallets", Icon: Users },
  { href: "/admin/transactions", label: "Transactions", Icon: CreditCard },
  { href: "/admin/moderation", label: "Moderation", Icon: Flag },
  { href: "/admin/refunds", label: "Refunds", Icon: RotateCcw },
  { href: "/admin/notifications", label: "Notifications", Icon: Bell },
  { href: "/admin/settings", label: "Pricing & settings", Icon: Settings },
  { href: "/home", label: "Explore app", Icon: Globe },
  { href: "/landing", label: "Landing page", Icon: Globe },
];

// Admin dashboard: web only, admin role only (every admin function also checks the role on the server).
export default function AdminLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const { signOut } = useAuthActions();
  const path = usePathname();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  if (Platform.OS !== "web")
    return (
      <Screen>
        <T v="title">Admin is web-only</T>
        <T v="label">Open your Relaxxo web address and go to /admin on a computer.</T>
      </Screen>
    );
  if (isLoading || (isAuthenticated && me === undefined)) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/auth/sign-in" />;
  if (me?.role !== "admin") return <Redirect href="/" />;

  const sidebar = (
    <View style={{ width: isWide ? 260 : "100%", padding: 20, gap: 6 }}>
      <T style={{ fontFamily: F.medium, fontSize: 24, marginBottom: 16 }}>Relaxxo admin</T>
      {NAV.map((n) => {
        const active = path === n.href;
        return (
          <Pressable
            key={n.href}
            onPress={() => router.push(n.href as never)}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 52, paddingHorizontal: 14, borderRadius: 26, backgroundColor: active ? C.lime : "transparent" }}
          >
            <n.Icon size={22} strokeWidth={ICON.stroke} color={C.ink} />
            <T>{n.label}</T>
          </Pressable>
        );
      })}
      <Pressable
        onPress={async () => {
          await signOut();
          router.replace("/");
        }}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 52, paddingHorizontal: 14, marginTop: 20 }}
      >
        <LogOut size={22} strokeWidth={ICON.stroke} color={C.ink} />
        <T>Sign out</T>
      </Pressable>
    </View>
  );

  if (!isWide) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 80 }}>
        {sidebar}
        <View style={{ padding: 24 }}>
          <Slot />
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: "row", height: "100vh" as never, overflow: "hidden", backgroundColor: C.bg }}>
      <ScrollView style={{ flexGrow: 0, flexShrink: 0, width: 260, height: "100%" as never }} contentContainerStyle={{ paddingBottom: 40 }}>
        {sidebar}
      </ScrollView>
      <ScrollView style={{ flex: 1, minWidth: 0, minHeight: 0, height: "100%" as never }} contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        <View style={{ maxWidth: 1200, width: "100%" }}>
          <Slot />
        </View>
      </ScrollView>
    </View>
  );
}
