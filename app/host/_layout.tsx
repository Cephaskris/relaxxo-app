import React, { useMemo } from "react";
import { Redirect, Tabs } from "expo-router";
import { useConvexAuth, useQuery } from "convex/react";
import { Home, BedDouble, Wallet } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { makeFloatingNav, initialsOf } from "@/components/FloatingNav";
import { Loading } from "@/components/ui";

export default function HotelTabs() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const initials = initialsOf(me?.name);
  const TabBar = useMemo(
    () =>
      makeFloatingNav([
        { name: "index", label: "Dashboard", Icon: Home },
        { name: "rooms", label: "Rooms", Icon: BedDouble },
        { name: "wallet", label: "Wallet", Icon: Wallet },
        { name: "account", label: "Account", initials },
      ]),
    [initials],
  );
  if (isLoading || (isAuthenticated && me === undefined)) return <Loading />;
  if (!me || me.role !== "hotel") return <Redirect href="/" />;
  if (me.verification !== "approved") return <Redirect href="/onboarding/hotel" />;
  return <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }} />;
}
