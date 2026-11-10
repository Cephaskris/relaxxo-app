import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { T, Row, Chip, Field, Btn, Card, ErrorNote } from "@/components/ui";
import { Section } from "@/components/admin";
import { errorMessage } from "@/lib/util";
import { CITY_NAMES } from "@/lib/areas";

export default function AdminNotifications() {
  const broadcast = useMutation(api.admin.broadcast);
  const [channel, setChannel] = useState<"push" | "sms">("push");
  const [role, setRole] = useState<string | undefined>();
  const [city, setCity] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentMsg, setSentMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSend() {
    setError(null);
    setSentMsg(null);
    setBusy(true);
    try {
      const count = await broadcast({ channel, role, city, title, body });
      setSentMsg(`Queued ${channel.toUpperCase()} broadcast to ${count} user${count === 1 ? "" : "s"}.`);
      setTitle("");
      setBody("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <T v="display">Notifications</T>
      <T v="label" style={{ marginTop: 4 }}>
        Send a push notification or SMS broadcast filtered by role and city.
      </T>

      <Section title="Broadcast message">
        <Card style={{ gap: 14 }}>
          <T v="label">Channel</T>
          <Row>
            <Chip label="Push notification" active={channel === "push"} onPress={() => setChannel("push")} />
            <Chip label="SMS (Termii)" active={channel === "sms"} onPress={() => setChannel("sms")} />
          </Row>

          <T v="label">Audience role</T>
          <Row style={{ flexWrap: "wrap" }}>
            {[undefined, "client", "therapist", "hotel"].map((r) => (
              <Chip key={r ?? "all"} label={r ?? "All roles"} active={role === r} onPress={() => setRole(r)} />
            ))}
          </Row>

          <T v="label">City</T>
          <Row style={{ flexWrap: "wrap" }}>
            <Chip label="All cities" active={city === undefined} onPress={() => setCity(undefined)} />
            {CITY_NAMES.map((c) => (
              <Chip key={c} label={c} active={city === c} onPress={() => setCity(city === c ? undefined : c)} />
            ))}
          </Row>

          <Field label="Title" placeholder="e.g. Weekend bonus credits" value={title} onChangeText={setTitle} maxLength={80} />
          <Field
            label="Message"
            placeholder="Write your announcement…"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={300}
            style={{ minHeight: 100 }}
          />
          {sentMsg ? <T v="label">{sentMsg}</T> : null}
          <ErrorNote text={error} />
          <Btn label={`Send ${channel === "sms" ? "SMS" : "Push"} broadcast`} tone="dark" arrow loading={busy} onPress={onSend} />
        </Card>
      </Section>
    </>
  );
}

