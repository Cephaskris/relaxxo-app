import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { T, Row, Field, Btn, Card, Chip, Loading, ErrorNote } from "@/components/ui";
import { Section, TableRow } from "@/components/admin";
import { errorMessage, ago, normalizePhone } from "@/lib/util";

// Pricing and rules are stored on the server; JSON fields are validated there before saving.
export default function AdminSettings() {
  const s = useQuery(api.admin.getAllSettings);
  const log = useQuery(api.admin.activity);
  const update = useMutation(api.admin.updateSettings);
  const setSubAdmin = useMutation(api.admin.setSubAdmin);
  const [packs, setPacks] = useState<{ id: string; credits: string; priceNaira: string }[]>([]);
  const [options, setOptions] = useState<{ id: string; label: string; hours: string; credits: string }[]>([]);
  const [nums, setNums] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState("");
  const [blocked, setBlocked] = useState("");
  const [subPhone, setSubPhone] = useState("");
  const [subPerms, setSubPerms] = useState<string[]>(["verify", "moderate"]);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!s) return;
    setPacks(
      s.packs.map((p) => ({
        id: p.id,
        credits: String(p.credits),
        priceNaira: String(p.priceNaira),
      })),
    );
    setOptions(
      s.onlineOptions.map((o) => ({
        id: o.id,
        label: o.label,
        hours: String(o.hours),
        credits: String(o.credits),
      })),
    );
    setNums({
      unlockCost: String(s.unlockCost),
      unlockDays: String(s.unlockDays),
      welcomeBonusCredits: String(s.welcomeBonusCredits),
      reportSuspendThreshold: String(s.reportSuspendThreshold),
      defaultSearchKm: String(s.defaultSearchKm),
    });
    setCategories(s.categories.join(", "));
    setBlocked(s.blockedWords.join("\n"));
  }, [s]);

  if (!s) return <Loading />;

  async function save(value: Record<string, unknown>) {
    setError(null);
    setMsg(null);
    try {
      await update({ value });
      setMsg("Saved");
    } catch (e) {
      setError(e instanceof SyntaxError ? "Check the JSON format" : errorMessage(e));
    }
  }

  const LABELS: Record<string, string> = {
    unlockCost: "Connection Credits (CC) to unlock a therapist",
    unlockDays: "Days an unlock lasts",
    welcomeBonusCredits: "Welcome bonus CC for approved providers",
    reportSuspendThreshold: "Reports from different people before auto-suspend",
    defaultSearchKm: "Default search radius (km)",
  };

  return (
    <>
      <T v="display">Pricing & settings</T>
      {msg ? <T v="label">{msg}</T> : null}
      <ErrorNote text={error} />

      <Section title="Cities">
        <Row style={{ flexWrap: "wrap" }}>
          {s.cities.map((c) => (
            <Chip
              key={c.name}
              label={`${c.name}: ${c.open ? "open" : "closed"}`}
              active={c.open}
              onPress={() => save({ cities: s.cities.map((x) => (x.name === c.name ? { ...x, open: !x.open } : x)) })}
            />
          ))}
        </Row>
        <T v="small">Closed cities show "coming soon" to clients. Therapists and hotels can still sign up.</T>
      </Section>

      <Section title="Rules">
        <Card style={{ gap: 12 }}>
          {Object.keys(LABELS).map((k) => (
            <Field key={k} label={LABELS[k]} keyboardType="number-pad" value={nums[k] ?? ""} onChangeText={(v) => setNums({ ...nums, [k]: v })} />
          ))}
          <Btn
            label="Save rules"
            tone="dark"
            onPress={() => save(Object.fromEntries(Object.entries(nums).map(([k, v]) => [k, parseInt(v, 10)])))}
          />
        </Card>
      </Section>

      <Section title="Connection Credit (CC) packs (₦)">
        <Card style={{ gap: 14 }}>
          {packs.map((p, idx) => (
            <Row key={idx} style={{ alignItems: "flex-end", flexWrap: "wrap" }} gap={12}>
              <View style={{ flex: 1, minWidth: 120 }}>
                <Field
                  label="CC"
                  keyboardType="number-pad"
                  value={p.credits}
                  onChangeText={(v) => setPacks(packs.map((x, i) => (i === idx ? { ...x, credits: v, id: `p${v || idx + 1}` } : x)))}
                />
              </View>
              <View style={{ flex: 1, minWidth: 160 }}>
                <Field
                  label="Price (₦)"
                  keyboardType="number-pad"
                  value={p.priceNaira}
                  onChangeText={(v) => setPacks(packs.map((x, i) => (i === idx ? { ...x, priceNaira: v } : x)))}
                />
              </View>
              {packs.length > 1 ? (
                <Chip label="Remove" onPress={() => setPacks(packs.filter((_, i) => i !== idx))} />
              ) : null}
            </Row>
          ))}
          <Row style={{ flexWrap: "wrap" }} gap={12}>
            <Chip
              label="+ Add pack"
              onPress={() => setPacks([...packs, { id: `p_${Date.now()}`, credits: "10", priceNaira: "5000" }])}
            />
          </Row>
          <Btn
            label="Save packs"
            tone="dark"
            onPress={() => {
              const parsed = packs.map((p, i) => ({
                id: p.id.trim() || `p${i + 1}`,
                credits: parseInt(p.credits, 10),
                priceNaira: parseInt(p.priceNaira, 10),
              }));
              if (parsed.some((p) => !Number.isFinite(p.credits) || p.credits <= 0 || !Number.isFinite(p.priceNaira) || p.priceNaira <= 0)) {
                setError("Enter valid positive numbers for CC and price");
                return;
              }
              save({ packs: parsed });
            }}
          />
        </Card>
      </Section>

      <Section title="Online durations">
        <Card style={{ gap: 14 }}>
          {options.map((o, idx) => (
            <Row key={idx} style={{ alignItems: "flex-end", flexWrap: "wrap" }} gap={12}>
              <View style={{ flex: 1, minWidth: 140 }}>
                <Field
                  label="Label"
                  value={o.label}
                  onChangeText={(v) => setOptions(options.map((x, i) => (i === idx ? { ...x, label: v } : x)))}
                />
              </View>
              <View style={{ flex: 1, minWidth: 110 }}>
                <Field
                  label="Hours"
                  keyboardType="number-pad"
                  value={o.hours}
                  onChangeText={(v) => setOptions(options.map((x, i) => (i === idx ? { ...x, hours: v, id: `${v || idx + 1}h` } : x)))}
                />
              </View>
              <View style={{ flex: 1, minWidth: 110 }}>
                <Field
                  label="Cost (CC)"
                  keyboardType="number-pad"
                  value={o.credits}
                  onChangeText={(v) => setOptions(options.map((x, i) => (i === idx ? { ...x, credits: v } : x)))}
                />
              </View>
              {options.length > 1 ? (
                <Chip label="Remove" onPress={() => setOptions(options.filter((_, i) => i !== idx))} />
              ) : null}
            </Row>
          ))}
          <Row style={{ flexWrap: "wrap" }} gap={12}>
            <Chip
              label="+ Add duration"
              onPress={() => setOptions([...options, { id: `d_${Date.now()}`, label: "12 hours", hours: "12", credits: "5" }])}
            />
          </Row>
          <Btn
            label="Save durations"
            tone="dark"
            onPress={() => {
              const parsed = options.map((o, i) => ({
                id: o.id.trim() || `d${i + 1}`,
                label: o.label.trim() || `${o.hours} hours`,
                hours: parseFloat(o.hours),
                credits: parseInt(o.credits, 10),
              }));
              if (parsed.some((o) => !Number.isFinite(o.hours) || o.hours <= 0 || !Number.isFinite(o.credits) || o.credits <= 0)) {
                setError("Enter valid positive numbers for hours and credits");
                return;
              }
              save({ onlineOptions: parsed });
            }}
          />
        </Card>
      </Section>

      <Section title="Service categories">
        <Card style={{ gap: 12 }}>
          <Field label="Comma-separated" value={categories} onChangeText={setCategories} multiline />
          <Btn label="Save categories" tone="dark" onPress={() => save({ categories: categories.split(",").map((x) => x.trim()).filter(Boolean) })} />
        </Card>
      </Section>

      <Section title="Blocked words">
        <Card style={{ gap: 12 }}>
          <T v="small">One per line. Any profile, service or room text containing these is refused when saved. Include slang and Pidgin terms.</T>
          <Field label="Blocked words" value={blocked} onChangeText={setBlocked} multiline style={{ minHeight: 200 }} />
          <Btn label="Save blocked words" tone="dark" onPress={() => save({ blockedWords: blocked.split("\n").map((x) => x.trim()).filter(Boolean) })} />
        </Card>
      </Section>

      <Section title="Sub-admin accounts">
        <Card style={{ gap: 12 }}>
          <T v="small">Grant limited admin access to a team member (they must have signed in with their phone number at least once).</T>
          <Field label="Phone number" placeholder="0803 123 4567" value={subPhone} onChangeText={setSubPhone} />
          <Row style={{ flexWrap: "wrap" }}>
            {["verify", "moderate", "users", "refunds", "notifications", "pricing"].map((p) => (
              <Chip
                key={p}
                label={p}
                active={subPerms.includes(p)}
                onPress={() => setSubPerms((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]))}
              />
            ))}
          </Row>
          <Row>
            <Btn
              label="Grant / update sub-admin"
              tone="dark"
              onPress={() => {
                const p = normalizePhone(subPhone);
                if (!p) return setError("Enter a valid Nigerian phone number");
                setSubAdmin({ phone: p, permissions: subPerms })
                  .then(() => { setMsg("Sub-admin updated"); setSubPhone(""); })
                  .catch((e) => setError(errorMessage(e)));
              }}
            />
            <Btn
              label="Revoke sub-admin"
              tone="light"
              onPress={() => {
                const p = normalizePhone(subPhone);
                if (!p) return setError("Enter a valid Nigerian phone number");
                setSubAdmin({ phone: p, revoke: true })
                  .then(() => { setMsg("Sub-admin revoked"); setSubPhone(""); })
                  .catch((e) => setError(errorMessage(e)));
              }}
            />
          </Row>
        </Card>
      </Section>

      <Section title="Admin activity">
        <Card style={{ padding: 0 }}>
          <TableRow header cells={["When", "Admin", "Action", "Target", "Detail"]} />
          {(log ?? []).map((l) => (
            <TableRow key={l._id} cells={[`${ago(l._creationTime)} ago`, l.actorName, l.action, l.target, l.detail ?? ""]} />
          ))}
        </Card>
      </Section>
      <View style={{ height: 40 }} />
    </>
  );
}
