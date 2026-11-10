import React, { useState } from "react";
import { Linking, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { T, Row, Card, Loading, ErrorNote } from "@/components/ui";
import { Section, Thumbs, SmallBtn, ask } from "@/components/admin";
import { errorMessage, prettyPhone } from "@/lib/util";

export default function AdminVerification() {
  const q = useQuery(api.admin.verificationQueue);
  const reviewTherapist = useMutation(api.admin.reviewTherapist);
  const reviewHotel = useMutation(api.admin.reviewHotel);
  const [error, setError] = useState<string | null>(null);
  if (!q) return <Loading />;

  const run = (p: Promise<unknown>) => p.catch((e) => setError(errorMessage(e)));

  return (
    <>
      <T v="display">Verification</T>
      <T v="label">Check the ID matches the selfie and the name, photos are professional, and services are legitimate massage services.</T>
      <ErrorNote text={error} />

      <Section title={`Therapists (${q.therapists.length})`}>
        {q.therapists.length === 0 ? <T v="label">Nothing waiting.</T> : null}
        {q.therapists.map((t) => (
          <Card key={t._id} style={{ gap: 10 }}>
            <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <View>
                <T v="h2">{t.displayName}</T>
                <T v="label">{t.phone ? prettyPhone(t.phone) : ""} · {t.city}, {t.area} · {t.gender} · {t.workType}</T>
              </View>
              <Row>
                <SmallBtn tone="lime" label="Approve" onPress={() => run(reviewTherapist({ therapistId: t._id, approve: true }))} />
                <SmallBtn
                  tone="danger"
                  label="Reject"
                  onPress={() => {
                    const reason = ask("Reason shown to the therapist:");
                    if (reason) run(reviewTherapist({ therapistId: t._id, approve: false, reason }));
                  }}
                />
              </Row>
            </Row>
            <T>{t.bio}</T>
            <T v="label">Profile photos</T>
            <Thumbs urls={t.photos} />
            <T v="label">Private documents (ID · selfie · certificate)</T>
            <Thumbs urls={[t.idDoc, t.selfie, t.cert]} size={140} />
            <T v="label">Services</T>
            {t.services.map((s, i) => <T key={i} v="small">• {s}</T>)}
          </Card>
        ))}
      </Section>

      <Section title={`Hotels (${q.hotels.length})`}>
        {q.hotels.length === 0 ? <T v="label">Nothing waiting.</T> : null}
        {q.hotels.map((h) => (
          <Card key={h._id} style={{ gap: 10 }}>
            <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <View>
                <T v="h2">{h.name}</T>
                <T v="label">Front desk {prettyPhone(h.phone)} · owner {h.ownerPhone ? prettyPhone(h.ownerPhone) : ""}</T>
                <T v="label">{h.address} · {h.city}, {h.area}</T>
              </View>
              <Row>
                <SmallBtn label="Check map" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`)} />
                <SmallBtn tone="lime" label="Approve" onPress={() => run(reviewHotel({ hotelId: h._id, approve: true }))} />
                <SmallBtn
                  tone="danger"
                  label="Reject"
                  onPress={() => {
                    const reason = ask("Reason shown to the hotel:");
                    if (reason) run(reviewHotel({ hotelId: h._id, approve: false, reason }));
                  }}
                />
              </Row>
            </Row>
            <T v="label">Cover and building photos</T>
            <Thumbs urls={[h.cover, ...h.exterior]} />
            <T v="label">Business document</T>
            <Thumbs urls={[h.doc]} size={140} />
          </Card>
        ))}
      </Section>
    </>
  );
}
