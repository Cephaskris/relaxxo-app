import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { Plus, Pencil, Trash2 } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { T, Row, Btn, Chip, Field, Pill, ErrorNote, CircleBtn } from "@/components/ui";
import { Sheet } from "@/components/Sheet";
import { C, F, ICON } from "@/lib/theme";
import { naira, errorMessage } from "@/lib/util";

type Service = Doc<"services">;

// Therapists type their own service names and prices. Each new or edited service is reviewed by admin.
export function ServicesManager({ services }: { services: Service[] }) {
  const settings = useQuery(api.settings.publicSettings);
  const add = useMutation(api.services.add);
  const update = useMutation(api.services.update);
  const remove = useMutation(api.services.remove);
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(s: Service | "new") {
    setError(null);
    setEditing(s);
    if (s === "new") {
      setCategory(settings?.categories[0] ?? "");
      setName("");
      setDescription("");
      setDuration("60");
      setPrice("");
    } else {
      setCategory(s.category);
      setName(s.name);
      setDescription(s.description);
      setDuration(String(s.durationMin));
      setPrice(String(s.priceNaira));
    }
  }

  async function save() {
    setError(null);
    setBusy(true);
    const args = {
      category,
      name,
      description,
      durationMin: parseInt(duration, 10) || 0,
      priceNaira: parseInt(price.replace(/\D/g, ""), 10) || 0,
    };
    try {
      if (editing === "new") await add(args);
      else if (editing) await update({ serviceId: editing._id, ...args });
      setEditing(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 10 }}>
      {services.length === 0 ? <T v="label">No services yet. Add what you offer and your price.</T> : null}
      {services.map((s) => (
        <View key={s._id} style={{ backgroundColor: C.card, borderRadius: 22, padding: 16, gap: 6 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: F.medium }}>{s.name}</T>
              <T v="small">{s.category} · {s.durationMin} min · {naira(s.priceNaira)}</T>
            </View>
            <CircleBtn size={44} label="Edit service" onPress={() => open(s)} icon={<Pencil size={18} strokeWidth={ICON.stroke} color={C.ink} />} />
            <CircleBtn
              size={44}
              label="Delete service"
              onPress={() => remove({ serviceId: s._id as Id<"services"> }).catch((e) => setError(errorMessage(e)))}
              icon={<Trash2 size={18} strokeWidth={ICON.stroke} color={C.danger} />}
            />
          </Row>
          <Row>
            <Pill
              tone={s.status === "approved" ? "lime" : s.status === "pending" ? "light" : "dark"}
              label={s.status === "approved" ? "Live" : s.status === "pending" ? "Waiting for review" : `Rejected${s.rejectReason ? `: ${s.rejectReason}` : ""}`}
            />
          </Row>
        </View>
      ))}
      <Pressable
        onPress={() => open("new")}
        style={{ height: 56, borderRadius: 28, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#BDBDB7", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <Plus size={20} strokeWidth={ICON.stroke} color={C.ink} />
        <T>Add a service</T>
      </Pressable>
      {!editing ? <ErrorNote text={error} /> : null}

      <Sheet visible={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New service" : "Edit service"}>
        <T v="label">Category</T>
        <Row style={{ flexWrap: "wrap" }}>
          {(settings?.categories ?? []).map((c) => (
            <Chip key={c} label={c} active={c === category} onPress={() => setCategory(c)} />
          ))}
        </Row>
        <Field label="Service name" placeholder="e.g. Full-body Swedish" value={name} onChangeText={setName} maxLength={40} />
        <Field label="Short description (optional)" value={description} onChangeText={setDescription} maxLength={160} multiline style={{ minHeight: 80 }} />
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Minutes" keyboardType="number-pad" value={duration} onChangeText={setDuration} maxLength={3} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Price (₦)" keyboardType="number-pad" value={price} onChangeText={setPrice} maxLength={9} />
          </View>
        </Row>
        <T v="small">New and edited services are checked by our team before clients see them. Keep names professional.</T>
        <ErrorNote text={error} />
        <Btn label="Save service" tone="dark" loading={busy} onPress={save} />
      </Sheet>
    </View>
  );
}
