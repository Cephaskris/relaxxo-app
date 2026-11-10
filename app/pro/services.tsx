import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Screen, T, Loading } from "@/components/ui";
import { ServicesManager } from "@/components/ServicesManager";

export default function TherapistServices() {
  const mine = useQuery(api.therapists.mine);
  if (!mine) return <Loading />;
  return (
    <Screen>
      <T v="label">What you offer</T>
      <T v="display" style={{ marginTop: 4, marginBottom: 20 }}>Services</T>
      <ServicesManager services={mine.services} />
    </Screen>
  );
}
