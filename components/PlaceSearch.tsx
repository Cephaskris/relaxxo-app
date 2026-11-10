import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, View, ActivityIndicator } from "react-native";
import { useAction } from "convex/react";
import { MapPin, X } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { T, Field, CircleBtn, ErrorNote, Row } from "@/components/ui";
import { C, ICON } from "@/lib/theme";
import { errorMessage, randomToken } from "@/lib/util";

export type Picked = { lat: number; lng: number; address: string; name: string };

// Address search through the server-side Google Places proxy.
export function PlaceSearch({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (p: Picked) => void }) {
  const autocomplete = useAction(api.places.autocomplete);
  const details = useAction(api.places.details);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ placeId: string; label: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useRef(randomToken());

  useEffect(() => {
    if (!visible) {
      setQ("");
      setResults([]);
      session.current = randomToken();
    }
  }, [visible]);

  useEffect(() => {
    if (q.trim().length < 3) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      setBusy(true);
      setError(null);
      try {
        setResults(await autocomplete({ input: q, sessionToken: session.current }));
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [q, autocomplete]);

  async function choose(placeId: string) {
    setBusy(true);
    try {
      const p = await details({ placeId, sessionToken: session.current });
      onPick(p);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(20,20,20,0.35)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, gap: 14, minHeight: "70%" }}>
          <Row style={{ justifyContent: "space-between" }}>
            <T v="title">Search address</T>
            <CircleBtn label="Close" onPress={onClose} icon={<X size={ICON.size} strokeWidth={ICON.stroke} color={C.ink} />} />
          </Row>
          <Field label="Street, estate or landmark" value={q} onChangeText={setQ} autoFocus placeholder="e.g. Admiralty Way, Lekki" />
          <ErrorNote text={error} />
          {busy ? <ActivityIndicator color={C.ink} /> : null}
          {results.map((r) => (
            <Pressable
              key={r.placeId}
              onPress={() => choose(r.placeId)}
              style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: C.card, borderRadius: 20, padding: 16 }}
            >
              <MapPin size={20} strokeWidth={ICON.stroke} color={C.ink} />
              <T style={{ flex: 1 }}>{r.label}</T>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}
