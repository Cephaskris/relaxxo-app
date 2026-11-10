import React, { useState } from "react";
import { ActivityIndicator, Image, Pressable, View } from "react-native";
import { useMutation } from "convex/react";
import { Camera, X, Check, FileUp } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { T, Row, ErrorNote } from "@/components/ui";
import { C, ICON } from "@/lib/theme";
import { pickAndUpload } from "@/lib/upload";
import { errorMessage } from "@/lib/util";

export type Photo = { id: Id<"_storage">; uri: string };

function useUploader(kind: "public" | "private") {
  const gen = useMutation(api.storage.generateUploadUrl);
  const claim = useMutation(api.storage.claimUpload);
  return () => pickAndUpload(() => gen(), (a) => claim(a), kind);
}

export function PhotoGrid({
  photos,
  onChange,
  min,
  max,
}: {
  photos: Photo[];
  onChange: (p: Photo[]) => void;
  min: number;
  max: number;
}) {
  const upload = useUploader("public");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function add() {
    setError(null);
    setBusy(true);
    try {
      const r = await upload();
      if (r) onChange([...photos, { id: r.storageId, uri: r.uri }]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 8 }}>
      <Row style={{ flexWrap: "wrap" }} gap={10}>
        {photos.map((p) => (
          <View key={p.id} style={{ width: 96, height: 96, borderRadius: 20, overflow: "hidden" }}>
            <Image source={{ uri: p.uri }} style={{ width: "100%", height: "100%" }} />
            <Pressable
              accessibilityLabel="Remove photo"
              onPress={() => onChange(photos.filter((x) => x.id !== p.id))}
              style={{ position: "absolute", right: 6, top: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}
            >
              <X size={16} strokeWidth={ICON.stroke} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}
        {photos.length < max ? (
          <Pressable
            onPress={add}
            accessibilityLabel="Add photo"
            style={{ width: 96, height: 96, borderRadius: 20, backgroundColor: C.card, alignItems: "center", justifyContent: "center", gap: 4 }}
          >
            {busy ? <ActivityIndicator color={C.ink} /> : <Camera size={ICON.size} strokeWidth={ICON.stroke} color={C.ink} />}
            <T v="small">Add</T>
          </Pressable>
        ) : null}
      </Row>
      <T v="small">{photos.length}/{max} · at least {min}. Photo policy: clothed, work setting, no filters.</T>
      <ErrorNote text={error} />
    </View>
  );
}

// Private document upload (ID, selfie, certificate, CAC). Only admins can ever view these.
export function DocUpload({
  label,
  done,
  onUploaded,
}: {
  label: string;
  done: boolean;
  onUploaded: (id: Id<"_storage">) => void;
}) {
  const upload = useUploader("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={async () => {
          setError(null);
          setBusy(true);
          try {
            const r = await upload();
            if (r) onUploaded(r.storageId);
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
        style={{ backgroundColor: done ? C.lime : C.card, borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: done ? C.ink : C.soft, alignItems: "center", justifyContent: "center" }}>
          {busy ? (
            <ActivityIndicator color={done ? "#FFFFFF" : C.ink} />
          ) : done ? (
            <Check size={22} strokeWidth={ICON.stroke} color="#FFFFFF" />
          ) : (
            <FileUp size={22} strokeWidth={ICON.stroke} color={C.ink} />
          )}
        </View>
        <T style={{ flex: 1 }}>{label}</T>
        <T v="small" style={{ color: C.ink }}>{done ? "Uploaded" : "Upload"}</T>
      </Pressable>
      <ErrorNote text={error} />
    </View>
  );
}
