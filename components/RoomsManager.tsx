import React, { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { useMutation } from "convex/react";
import { Plus, Minus, Pencil, Trash2 } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { T, Row, Btn, Field, Pill, ErrorNote, CircleBtn, Placeholder } from "@/components/ui";
import { Sheet } from "@/components/Sheet";
import { PhotoGrid, type Photo } from "@/components/Uploaders";
import { C, F, ICON } from "@/lib/theme";
import { naira, errorMessage } from "@/lib/util";

export type RoomRow = {
  _id: Id<"rooms">;
  name: string;
  photoIds: Id<"_storage">[];
  pricePerNight: number;
  availableCount: number;
  status: "pending" | "approved" | "rejected";
  rejectReason?: string;
  photo: string | null;
  photos: string[];
};

export function RoomsManager({ rooms, compact = false }: { rooms: RoomRow[]; compact?: boolean }) {
  const add = useMutation(api.rooms.add);
  const update = useMutation(api.rooms.update);
  const setAvailable = useMutation(api.rooms.setAvailable);
  const remove = useMutation(api.rooms.remove);
  const [editing, setEditing] = useState<RoomRow | "new" | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [count, setCount] = useState("1");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(r: RoomRow | "new") {
    setError(null);
    setEditing(r);
    if (r === "new") {
      setName("");
      setPrice("");
      setCount("1");
      setPhotos([]);
    } else {
      setName(r.name);
      setPrice(String(r.pricePerNight));
      setCount(String(r.availableCount));
      setPhotos(r.photoIds.map((id, i) => ({ id, uri: r.photos[i] ?? "" })));
    }
  }

  async function save() {
    setError(null);
    setBusy(true);
    const args = {
      name,
      photoIds: photos.map((p) => p.id),
      pricePerNight: parseInt(price.replace(/\D/g, ""), 10) || 0,
      availableCount: parseInt(count, 10) || 0,
    };
    try {
      if (editing === "new") await add(args);
      else if (editing) await update({ roomId: editing._id, ...args });
      setEditing(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const bump = (r: RoomRow, d: number) =>
    setAvailable({ roomId: r._id, availableCount: Math.max(0, r.availableCount + d) }).catch((e) => setError(errorMessage(e)));

  return (
    <View style={{ gap: 10 }}>
      {rooms.length === 0 ? <T v="label">No rooms yet. Add your first room type.</T> : null}
      {rooms.map((r, i) => (
        <View key={r._id} style={{ backgroundColor: C.card, borderRadius: 24, padding: 12, gap: 10 }}>
          <Row gap={12}>
            <View style={{ width: 72, height: 72, borderRadius: 18, overflow: "hidden" }}>
              {r.photo ? <Image source={{ uri: r.photo }} style={{ width: "100%", height: "100%" }} /> : <Placeholder seed={i} style={{ flex: 1 }} label="" />}
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: F.medium }}>{r.name}</T>
              <T v="small">{naira(r.pricePerNight)} / night</T>
              <View style={{ marginTop: 4, alignSelf: "flex-start" }}>
                <Pill
                  tone={r.status === "approved" ? "lime" : r.status === "pending" ? "light" : "dark"}
                  label={r.status === "approved" ? "Live" : r.status === "pending" ? "In review" : "Rejected"}
                />
              </View>
            </View>
            {!compact ? (
              <>
                <CircleBtn size={44} label="Edit room" onPress={() => open(r)} icon={<Pencil size={18} strokeWidth={ICON.stroke} color={C.ink} />} />
                <CircleBtn
                  size={44}
                  label="Delete room"
                  onPress={() => remove({ roomId: r._id }).catch((e) => setError(errorMessage(e)))}
                  icon={<Trash2 size={18} strokeWidth={ICON.stroke} color={C.danger} />}
                />
              </>
            ) : null}
          </Row>
          <Row style={{ justifyContent: "space-between", backgroundColor: C.soft, borderRadius: 20, padding: 6 }}>
            <CircleBtn size={44} label="One less available" onPress={() => bump(r, -1)} icon={<Minus size={20} strokeWidth={ICON.stroke} color={C.ink} />} />
            <Pressable
              onPress={() => setAvailable({ roomId: r._id, availableCount: r.availableCount > 0 ? 0 : 1 }).catch((e) => setError(errorMessage(e)))}
              accessibilityRole="button"
              accessibilityLabel="Toggle available or full"
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: r.availableCount > 0 ? C.lime : C.card }}
            >
              <T style={{ fontFamily: F.medium }}>{r.availableCount === 0 ? "Full · tap for Available" : `Available (${r.availableCount}) · tap for Full`}</T>
            </Pressable>
            <CircleBtn size={44} tone="lime" label="One more available" onPress={() => bump(r, 1)} icon={<Plus size={20} strokeWidth={ICON.stroke} color={C.ink} />} />
          </Row>
        </View>
      ))}
      {!compact ? (
        <Pressable
          onPress={() => open("new")}
          style={{ height: 56, borderRadius: 28, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#BDBDB7", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <Plus size={20} strokeWidth={ICON.stroke} color={C.ink} />
          <T>Add a room type</T>
        </Pressable>
      ) : null}
      {!editing ? <ErrorNote text={error} /> : null}

      <Sheet visible={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New room" : "Edit room"}>
        <PhotoGrid photos={photos} onChange={setPhotos} min={1} max={5} />
        <Field label="Room name" placeholder="e.g. Deluxe King" value={name} onChangeText={setName} maxLength={40} />
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Price per night (₦)" keyboardType="number-pad" value={price} onChangeText={setPrice} maxLength={9} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Available now" keyboardType="number-pad" value={count} onChangeText={setCount} maxLength={3} />
          </View>
        </Row>
        <T v="small">New rooms and photo changes are checked before guests see them.</T>
        <ErrorNote text={error} />
        <Btn label="Save room" tone="dark" loading={busy} onPress={save} />
      </Sheet>
    </View>
  );
}
