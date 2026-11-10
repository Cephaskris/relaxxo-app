import React, { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { T, Row, Card, Loading, ErrorNote } from "@/components/ui";
import { Section, SmallBtn, Thumbs, ask } from "@/components/admin";
import { errorMessage, naira, prettyPhone, ago } from "@/lib/util";

export default function AdminModeration() {
  const q = useQuery(api.admin.moderationQueue);
  const reviewService = useMutation(api.admin.reviewService);
  const reviewRoom = useMutation(api.admin.reviewRoom);
  const resolveReport = useMutation(api.admin.resolveReport);
  const setStatus = useMutation(api.admin.setAccountStatus);
  const [error, setError] = useState<string | null>(null);
  if (!q) return <Loading />;
  const run = (p: Promise<unknown>) => p.catch((e) => setError(errorMessage(e)));

  return (
    <>
      <T v="display">Moderation</T>
      <ErrorNote text={error} />

      <Section title={`Reports (${q.reports.length})`}>
        {q.reports.length === 0 ? <T v="label">No open reports.</T> : null}
        {q.reports.map((r) => (
          <Card key={r._id} style={{ gap: 8 }}>
            <T v="h2">{r.targetName || "User"} · {r.targetType}</T>
            <T v="label">
              {r.targetPhone ? prettyPhone(r.targetPhone) : ""} · account {r.targetStatus} · reported by {r.reporterPhone ? prettyPhone(r.reporterPhone) : "user"} · {ago(r.at)} ago
            </T>
            <T>{r.reason}</T>
            <Row style={{ flexWrap: "wrap" }}>
              <SmallBtn label="Dismiss" onPress={() => run(resolveReport({ reportId: r._id, outcome: "dismissed" }))} />
              <SmallBtn tone="dark" label="Mark resolved" onPress={() => run(resolveReport({ reportId: r._id, outcome: "resolved" }))} />
              {r.targetStatus === "active" ? (
                <SmallBtn
                  tone="danger"
                  label="Suspend account"
                  onPress={() => {
                    const reason = ask("Reason for suspending:");
                    if (reason) run(setStatus({ userId: r.targetUserId, status: "suspended", reason }));
                  }}
                />
              ) : (
                <SmallBtn tone="lime" label="Reactivate" onPress={() => run(setStatus({ userId: r.targetUserId, status: "active", reason: "Cleared after review" }))} />
              )}
              <SmallBtn
                tone="danger"
                label="Ban"
                onPress={() => {
                  const reason = ask("Reason for banning:");
                  if (reason) run(setStatus({ userId: r.targetUserId, status: "banned", reason }));
                }}
              />
            </Row>
          </Card>
        ))}
      </Section>

      <Section title={`Therapist services (${q.services.length})`}>
        {q.services.length === 0 ? <T v="label">Nothing to review.</T> : null}
        {q.services.map((s) => (
          <Card key={s._id} style={{ gap: 6 }}>
            <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <View style={{ flex: 1, minWidth: 220 }}>
                <T v="h2">{s.name}</T>
                <T v="label">{s.therapistName} · {s.category} · {s.durationMin} min · {naira(s.priceNaira)}</T>
                {s.description ? <T style={{ marginTop: 4 }}>{s.description}</T> : null}
              </View>
              <Row>
                <SmallBtn tone="lime" label="Approve" onPress={() => run(reviewService({ serviceId: s._id, approve: true }))} />
                <SmallBtn
                  tone="danger"
                  label="Reject"
                  onPress={() => {
                    const reason = ask("Reason shown to the therapist:");
                    if (reason) run(reviewService({ serviceId: s._id, approve: false, reason }));
                  }}
                />
              </Row>
            </Row>
          </Card>
        ))}
      </Section>

      <Section title={`Rooms (${q.rooms.length})`}>
        {q.rooms.length === 0 ? <T v="label">Nothing to review.</T> : null}
        {q.rooms.map((r) => (
          <Card key={r._id} style={{ gap: 8 }}>
            <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <View>
                <T v="h2">{r.name}</T>
                <T v="label">{r.hotelName} · {naira(r.pricePerNight)} / night</T>
              </View>
              <Row>
                <SmallBtn tone="lime" label="Approve" onPress={() => run(reviewRoom({ roomId: r._id, approve: true }))} />
                <SmallBtn
                  tone="danger"
                  label="Reject"
                  onPress={() => {
                    const reason = ask("Reason shown to the hotel:");
                    if (reason) run(reviewRoom({ roomId: r._id, approve: false, reason }));
                  }}
                />
              </Row>
            </Row>
            <Thumbs urls={r.photos} />
          </Card>
        ))}
      </Section>

      <Section title={`Suspended accounts (${q.suspendedUsers.length})`}>
        {q.suspendedUsers.length === 0 ? <T v="label">No suspended accounts.</T> : null}
        {q.suspendedUsers.map((u) => (
          <Card key={u._id} style={{ gap: 8 }}>
            <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <View>
                <T v="h2">{u.name || "User"} · {u.role}</T>
                <T v="label">{u.phone ? prettyPhone(u.phone) : ""}</T>
              </View>
              <Row>
                <SmallBtn tone="lime" label="Reactivate" onPress={() => run(setStatus({ userId: u._id, status: "active", reason: "Cleared after review" }))} />
                <SmallBtn
                  tone="danger"
                  label="Ban"
                  onPress={() => {
                    const reason = ask("Reason for banning:");
                    if (reason) run(setStatus({ userId: u._id, status: "banned", reason }));
                  }}
                />
              </Row>
            </Row>
          </Card>
        ))}
      </Section>

      <Section title={`Low ratings (${q.lowReviews.length})`}>
        {q.lowReviews.length === 0 ? <T v="label">No 1–2 star reviews.</T> : null}
        {q.lowReviews.map((r) => (
          <Card key={r._id} style={{ gap: 6 }}>
            <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <View style={{ flex: 1 }}>
                <T v="h2">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} · {r.therapistName}</T>
                <T v="label">By client {r.clientPhone ? prettyPhone(r.clientPhone) : ""} · {ago(r.at)} ago</T>
                {r.text ? <T style={{ marginTop: 4 }}>{r.text}</T> : null}
              </View>
              {r.therapistUserId ? (
                <SmallBtn
                  tone="danger"
                  label="Suspend therapist"
                  onPress={() => {
                    const reason = ask("Reason for suspending:");
                    if (reason && r.therapistUserId) run(setStatus({ userId: r.therapistUserId, status: "suspended", reason }));
                  }}
                />
              ) : null}
            </Row>
          </Card>
        ))}
      </Section>
    </>
  );
}
