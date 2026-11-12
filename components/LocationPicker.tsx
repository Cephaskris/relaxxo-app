import React, { useState } from "react";
import { Pressable, View } from "react-native";
import * as Location from "expo-location";
import { T, Row, Chip, Btn, ErrorNote, Card } from "@/components/ui";
import { PlaceSearch } from "@/components/PlaceSearch";
import { CITIES } from "@/lib/areas";
import { C, F } from "@/lib/theme";
import { errorMessage } from "@/lib/util";

export type PickedLocation = { area: string; lat: number; lng: number; address?: string };

// Where a therapist works / where a hotel is: choose the whole state or one/multiple cities in that state, plus optional GPS/address pin.
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
  const isAllAreas = value?.area === allAreasLabel || value?.area === `Whole of ${city}`;

  const selectedCities = isAllAreas
    ? areas.map((a) => a.name)
    : (value?.area ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

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

  function toggleCity(areaObj: { name: string; lat: number; lng: number }) {
    if (isAllAreas) {
      // Switching from whole state to a single specific city
      onChange({
        area: areaObj.name,
        lat: exactRequired && value ? value.lat : areaObj.lat,
        lng: exactRequired && value ? value.lng : areaObj.lng,
        address: value?.address,
      });
      return;
    }

    const exists = selectedCities.includes(areaObj.name);
    const next = exists
      ? selectedCities.filter((n) => n !== areaObj.name)
      : [...selectedCities, areaObj.name];

    if (next.length === 0) {
      onChange({
        area: areaObj.name,
        lat: exactRequired && value ? value.lat : areaObj.lat,
        lng: exactRequired && value ? value.lng : areaObj.lng,
        address: value?.address,
      });
      return;
    }

    if (next.length === areas.length && areas.length > 1) {
      onChange({
        area: allAreasLabel,
        lat: value?.lat ?? areaObj.lat,
        lng: value?.lng ?? areaObj.lng,
        address: value?.address,
      });
      return;
    }

    const firstMatch = areas.find((a) => a.name === next[0]) ?? areaObj;
    onChange({
      area: next.join(", "),
      lat: exactRequired && value ? value.lat : firstMatch.lat,
      lng: exactRequired && value ? value.lng : firstMatch.lng,
      address: value?.address,
    });
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
      <Row style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }} gap={8}>
        <View style={{ flex: 1 }}>
          <T v="label">Cities in {city} State</T>
          <T v="small" style={{ color: C.muted }}>
            Choose the whole of {city} or tap multiple cities you cover
          </T>
        </View>
        <Pressable
          onPress={selectAllAreas}
          accessibilityRole="button"
          style={{
            height: 38,
            paddingHorizontal: 14,
            borderRadius: 19,
            backgroundColor: isAllAreas ? C.lime : C.ink,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <T style={{ fontFamily: F.medium, fontSize: 13, color: isAllAreas ? C.ink : "#FFFFFF" }}>
            {isAllAreas ? `✓ Whole of ${city} selected` : `Available in whole of ${city}`}
          </T>
        </Pressable>
      </Row>
      <Row style={{ flexWrap: "wrap" }}>
        {areas.map((a) => (
          <Chip
            key={a.name}
            label={a.name}
            active={isAllAreas || selectedCities.includes(a.name)}
            onPress={() => toggleCity(a)}
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
            {isAllAreas
              ? `Available across the whole of ${city}`
              : `Available in: ${value.area}`}
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
