import React, { useMemo } from "react";
import { Tabs } from "expo-router";
import { useConvexAuth, useQuery } from "convex/react";
import { Home, BedDouble, MessageCircle, Wallet } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { makeFloatingNav, initialsOf } from "@/components/FloatingNav";

export default function ClientTabs() {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const initials = isAuthenticated ? initialsOf(me?.name) : "Me";
  const TabBar = useMemo(
    () =>
      makeFloatingNav([
        { name: "index", label: "Home", Icon: Home },
        { name: "stays", label: "Stays", Icon: BedDouble },
        { name: "chats", label: "Chats", Icon: MessageCircle },
        { name: "wallet", label: "Wallet", Icon: Wallet },
        { name: "account", label: "Account", initials },
      ]),
    [initials],
  );
  return <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }} />;
}
