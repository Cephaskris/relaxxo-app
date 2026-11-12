import React, { useState } from "react";
import { Pressable, View } from "react-native";
import * as Location from "expo-location";
import { T, Row, Chip, Btn, ErrorNote, Card } from "@/components/ui";
import { PlaceSearch } from "@/components/PlaceSearch";
import { CITIES } from "@/lib/areas";
import { C, F } from "@/lib/theme";
import { errorMessage } from "@/lib/util";

export type PickedLocation = { area: string; lat: number; lng: number; address?: string };

// Where a therapist works / where a hotel is: choose an area (or all areas in the city), then set the pin by GPS or address search.
export function LocationPicker({
  city,
  value,
  onChange,
  exactRequired = false,
}: {
  city: string;
  value: PickedLocation | null;
  onChange: (v: PickedLocation) => void;
  exactRequired?: boolean;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const areas = CITIES[city] ?? [];
  const allAreasLabel = `All of ${city}`;
  const isAllAreas = value?.area === allAreasLabel;

  function selectAllAreas() {
    const center = areas[0] ?? { lat: 6.5244, lng: 3.3792 };
    if (isAllAreas && areas[0]) {
      onChange({
        area: areas[0].name,
        lat: value?.lat ?? areas[0].lat,
        lng: value?.lng ?? areas[0].lng,
        address: value?.address,
      });
    } else {
      onChange({
        area: allAreasLabel,
        lat: value?.lat ?? center.lat,
        lng: value?.lng ?? center.lng,
        address: value?.address,
      });
    }
  }

  async function gps() {
    setError(null);
    setBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) throw new Error("Allow location access to use your current location");
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      onChange({ area: value?.area ?? areas[0]?.name ?? city, lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
        <T v="label">Area</T>
        <Pressable
          onPress={selectAllAreas}
          accessibilityRole="button"
          style={{
            height: 36,
            paddingHorizontal: 14,
            borderRadius: 18,
            backgroundColor: isAllAreas ? C.lime : C.ink,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <T style={{ fontFamily: F.medium, fontSize: 13, color: isAllAreas ? C.ink : "#FFFFFF" }}>
            {isAllAreas ? `✓ All areas in ${city} selected` : `Select all areas in ${city}`}
          </T>
        </Pressable>
      </Row>
      <Row style={{ flexWrap: "wrap" }}>
        {areas.map((a) => (
          <Chip
            key={a.name}
            label={a.name}
            active={isAllAreas || value?.area === a.name}
            onPress={() => onChange(exactRequired && value ? { ...value, area: a.name } : { area: a.name, lat: a.lat, lng: a.lng })}
          />
        ))}
      </Row>
      <T v="label" style={{ marginTop: 6 }}>Exact location {exactRequired ? "(required)" : "(recommended)"}</T>
      <Row>
        <Btn label="Use my current location" tone="dark" loading={busy} onPress={gps} style={{ flex: 1 }} />
        <Btn label="Search" tone="light" onPress={() => setSearchOpen(true)} />
      </Row>
      {value ? (
        <Card style={{ padding: 14 }}>
          <T v="small">
            {isAllAreas ? `Covering all areas in ${city}` : `Pin set in ${value.area}`}
            {value.address ? ` · ${value.address}` : ""}
          </T>
        </Card>
      ) : null}
      <ErrorNote text={error} />
      <PlaceSearch
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPick={(p) => {
          onChange({ area: value?.area ?? areas[0]?.name ?? city, lat: p.lat, lng: p.lng, address: p.address });
          setSearchOpen(false);
        }}
      />
    </View>
  );
}
