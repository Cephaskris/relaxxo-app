import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useMutation } from "convex/react";
import { MapPin, ChevronDown, Check, ChevronLeft } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { T, Btn, Field, ErrorNote, Row } from "@/components/ui";
import { Sheet } from "@/components/Sheet";
import { CITIES, CITY_NAMES } from "@/lib/areas";
import { C, F, ICON } from "@/lib/theme";
import { errorMessage } from "@/lib/util";

function parseAreas(area: string) {
  if (/^(All in |All of |Whole of )/.test(area) || area === "All areas") return { all: true, list: [] as string[] };
  return { all: false, list: area.split(",").map((s) => s.trim()).filter(Boolean) };
}

/**
 * Top-left State dropdown for therapists and hotels.
 * Step 1: pick the State you're currently in (36 States + Abuja).
 * Step 2: pick "All in {State}" or the specific cities in that State you cover.
 */
export function ProviderStatePicker({ kind, city, area }: { kind: "therapist" | "hotel"; city: string; area: string }) {
  const setTherapist = useMutation(api.therapists.setCoverage);
  const setHotel = useMutation(api.hotels.setCoverage);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"state" | "cities">("state");
  const [filter, setFilter] = useState("");
  const [state, setState] = useState(city);
  const [all, setAll] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openSheet() {
    const p = parseAreas(area);
    setState(city);
    setAll(p.all);
    setPicked(p.list);
    setFilter("");
    setError(null);
    setStep("state");
    setOpen(true);
  }

  function chooseState(s: string) {
    if (s !== state) {
      setAll(true);
      setPicked([]);
    }
    setState(s);
    setStep("cities");
  }

  function toggle(name: string) {
    setAll(false);
    setPicked((cur) => (cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]));
  }

  async function save() {
    const cities = CITIES[state] ?? [];
    const chosen = cities.filter((c) => picked.includes(c.name));
    const pts = all || chosen.length === 0 ? cities : chosen;
    if (pts.length === 0) return setError("No cities found for this state");
    const lat = pts.reduce((s, c) => s + c.lat, 0) / pts.length;
    const lng = pts.reduce((s, c) => s + c.lng, 0) / pts.length;
    setBusy(true);
    setError(null);
    try {
      const args = { city: state, areas: all ? [] : chosen.map((c) => c.name), allAreas: all, lat, lng };
      if (kind === "therapist") await setTherapist(args);
      else await setHotel(args);
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const states = CITY_NAMES.filter((s) => s.toLowerCase().includes(filter.trim().toLowerCase()));
  const cities = CITIES[state] ?? [];
  const p = parseAreas(area);
  const subtitle = p.all ? `All in ${city}` : p.list.length > 1 ? `${p.list.length} cities` : p.list[0] ?? "";

  return (
    <>
      <Pressable
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel="Choose the State you are currently in"
        style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 52, paddingHorizontal: 16, borderRadius: 26, backgroundColor: C.card, maxWidth: 230 }}
      >
        <MapPin size={20} strokeWidth={ICON.stroke} color={C.ink} />
        <View style={{ flexShrink: 1 }}>
          <T style={{ fontFamily: F.medium, fontSize: 16 }} numberOfLines={1}>{city}</T>
          {subtitle ? <T v="small" numberOfLines={1} style={{ fontSize: 11, lineHeight: 13 }}>{subtitle}</T> : null}
        </View>
        <ChevronDown size={18} strokeWidth={ICON.stroke} color={C.ink} />
      </Pressable>

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={step === "state" ? "Which State are you in now?" : `Where in ${state} are you available?`}
      >
        {step === "state" ? (
          <>
            <Field label="Search state" placeholder="Lagos, Abuja, Oyo, Rivers…" value={filter} onChangeText={setFilter} />
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator>
              <View style={{ gap: 6, paddingVertical: 4 }}>
                {states.map((s) => {
                  const active = s === state;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => chooseState(s)}
                      accessibilityRole="button"
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18, backgroundColor: active ? C.lime : C.card }}
                    >
                      <View>
                        <T style={{ fontFamily: F.medium, fontSize: 16 }}>{s}</T>
                        <T v="small" style={{ color: active ? C.ink : C.muted }}>{(CITIES[s] ?? []).length} cities</T>
                      </View>
                      {active ? <Check size={20} strokeWidth={ICON.stroke} color={C.ink} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </>
        ) : (
          <>
            <Pressable onPress={() => setStep("state")} accessibilityRole="button">
              <Row gap={4}>
                <ChevronLeft size={18} strokeWidth={ICON.stroke} color={C.ink} />
                <T v="label">Change State ({state})</T>
              </Row>
            </Pressable>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator>
              <View style={{ gap: 6, paddingVertical: 4 }}>
                <Pressable
                  onPress={() => {
                    setAll(true);
                    setPicked([]);
                  }}
                  accessibilityRole="button"
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18, backgroundColor: all ? C.lime : C.card }}
                >
                  <View>
                    <T style={{ fontFamily: F.medium, fontSize: 16 }}>All in {state}</T>
                    <T v="small" style={{ color: all ? C.ink : C.muted }}>Show me to clients in every city in {state}</T>
                  </View>
                  {all ? <Check size={20} strokeWidth={ICON.stroke} color={C.ink} /> : null}
                </Pressable>
                {cities.map((c) => {
                  const active = !all && picked.includes(c.name);
                  return (
                    <Pressable
                      key={c.name}
                      onPress={() => toggle(c.name)}
                      accessibilityRole="button"
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, backgroundColor: active ? C.lime : C.card }}
                    >
                      <T style={{ fontSize: 15 }}>{c.name}</T>
                      {active ? <Check size={18} strokeWidth={ICON.stroke} color={C.ink} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <ErrorNote text={error} />
            <Btn
              label={all ? `Save · All in ${state}` : `Save · ${picked.length} ${picked.length === 1 ? "city" : "cities"} in ${state}`}
              arrow
              loading={busy}
              disabled={!all && picked.length === 0}
              onPress={save}
            />
          </>
        )}
      </Sheet>
    </>
  );
}
