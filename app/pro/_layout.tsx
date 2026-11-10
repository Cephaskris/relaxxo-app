import React, { useMemo } from "react";
import { Redirect, Tabs } from "expo-router";
import { useConvexAuth, useQuery } from "convex/react";
import { Home, MessageCircle, ListChecks, Wallet } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { makeFloatingNav, initialsOf } from "@/components/FloatingNav";
import { Loading } from "@/components/ui";

export default function TherapistTabs() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const initials = initialsOf(me?.name);
  const TabBar = useMemo(
    () =>
      makeFloatingNav([
        { name: "index", label: "Dashboard", Icon: Home },
        { name: "inbox", label: "Inbox", Icon: MessageCircle },
        { name: "services", label: "Services", Icon: ListChecks },
        { name: "wallet", label: "Wallet", Icon: Wallet },
        { name: "account", label: "Account", initials },
      ]),
    [initials],
  );
  if (isLoading || (isAuthenticated && me === undefined)) return <Loading />;
  if (!me || me.role !== "therapist") return <Redirect href="/" />;
  if (me.verification !== "approved") return <Redirect href="/onboarding/therapist" />;
  return <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }} />;
}
