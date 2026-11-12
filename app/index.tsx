import React from "react";
import { Platform } from "react-native";
import { Redirect } from "expo-router";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loading } from "@/components/ui";
import { LandingPage } from "@/components/LandingPage";

// Sends signed-in users to the right home; shows the full Landing Page immediately to visitors.
export default function Index() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  // If user is confirmed logged in, redirect them to their respective home
  if (isAuthenticated && me) {
    if (!me.role) return <Redirect href="/auth/role" />;
    if (me.role === "admin") return <Redirect href={Platform.OS === "web" ? "/admin" : "/home"} />;
    if (me.role === "therapist") {
      return <Redirect href={me.verification === "approved" ? "/pro" : "/onboarding/therapist"} />;
    }
    if (me.role === "hotel") {
      return <Redirect href={me.verification === "approved" ? "/host" : "/onboarding/hotel"} />;
    }
    return <Redirect href="/home" />;
  }

  // If an authenticated session is still resolving user details, show a brief loader
  if (isAuthenticated && (isLoading || me === undefined)) {
    return <Loading />;
  }

  // Otherwise, show the landing page immediately to visitors without blocking
  return <LandingPage />;
}
