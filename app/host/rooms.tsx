import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Screen, T, Loading } from "@/components/ui";
import { RoomsManager } from "@/components/RoomsManager";

export default function HotelRooms() {
  const h = useQuery(api.hotels.mine);
  if (!h) return <Loading />;
  return (
    <Screen>
      <T v="label">{h.name}</T>
      <T v="display" style={{ marginTop: 4, marginBottom: 20 }}>Rooms</T>
      <RoomsManager rooms={h.rooms} />
    </Screen>
  );
}
