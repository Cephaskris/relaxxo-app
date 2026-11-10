import React, { useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Flag, Star } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { T, Row, BackBtn, CircleBtn, Btn, Loading, ErrorNote, Field } from "@/components/ui";
import { Sheet } from "@/components/Sheet";
import { ReportSheet } from "@/components/ReportSheet";
import { C, F, ICON } from "@/lib/theme";
import { errorMessage, timeLeft } from "@/lib/util";

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const unlockId = id as Id<"unlocks">;
  const thread = useQuery(api.unlocks.thread, { unlockId });
  const messages = useQuery(api.messages.list, { unlockId });
  const send = useMutation(api.messages.send);
  const markContacted = useMutation(api.unlocks.markContacted);
  const review = useMutation(api.feedback.review);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewDone, setReviewDone] = useState(false);
  const listRef = useRef<FlatList>(null);

  if (thread === undefined || messages === undefined) return <Loading />;
  if (thread === null)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, padding: 24 }}>
        <BackBtn />
        <T v="title" style={{ marginTop: 24 }}>Chat not found</T>
      </SafeAreaView>
    );

  const lastFromOther = [...messages].reverse().find((m) => !m.mine);

  async function onSend() {
    const body = text.trim();
    if (!body) return;
    setError(null);
    setText("");
    try {
      await send({ unlockId, body });
    } catch (e) {
      setText(body);
      setError(errorMessage(e));
    }
  }

  async function submitReview() {
    setError(null);
    try {
      await review({ unlockId, rating, text: reviewText });
      setReviewDone(true);
      setRateOpen(false);
    } catch (e) {
      setError(errorMessage(e));
      setRateOpen(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, width: "100%", maxWidth: 640, alignSelf: "center" }}>
          <Row style={{ paddingHorizontal: 16, paddingTop: 8, justifyContent: "space-between" }}>
            <BackBtn />
            <View style={{ alignItems: "center", flex: 1 }}>
              <T style={{ fontFamily: F.medium, fontSize: 18 }}>{thread.otherName}</T>
              <T v="small">{thread.active ? `Open · ${timeLeft(thread.expiresAt)} left` : thread.refunded ? "Closed · refunded" : "Closed"}</T>
            </View>
            <CircleBtn label="Report" onPress={() => setReportOpen(true)} icon={<Flag size={22} strokeWidth={ICON.stroke} color={C.ink} />} />
          </Row>

          {thread.iAmTherapist && thread.awaitingReply ? (
            <View style={{ margin: 16, backgroundColor: C.lime, borderRadius: 24, padding: 16, gap: 10 }}>
              <T style={{ fontFamily: F.medium }}>
                New client connected — reply in chat or confirm if you've spoken by phone.
              </T>
              <Btn label="I've spoken to them by phone" tone="dark" onPress={() => markContacted({ unlockId })} />
            </View>
          ) : null}
          {!thread.iAmTherapist && !thread.awaitingReply && !thread.refunded && !(thread.hasReviewed || reviewDone) ? (
            Date.now() - thread.unlockedAt >= 24 * 3600_000 ? (
              <View style={{ margin: 16, backgroundColor: C.lime, borderRadius: 24, padding: 16, gap: 10 }}>
                <T style={{ fontFamily: F.medium }}>How was your experience with {thread.otherName}?</T>
                <Row>
                  <Btn label="Rate 1–5 ★" tone="dark" style={{ flex: 1 }} onPress={() => setRateOpen(true)} />
                  <Btn label="Report" tone="light" onPress={() => setReportOpen(true)} />
                </Row>
              </View>
            ) : (
              <View style={{ marginHorizontal: 16, marginTop: 12 }}>
                <Btn label="Rate this therapist" tone="light" onPress={() => setRateOpen(true)} />
              </View>
            )
          ) : null}

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m._id}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => (
              <View
                style={{
                  alignSelf: item.mine ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  backgroundColor: item.mine ? C.ink : C.card,
                  borderRadius: 22,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              >
                <T style={{ color: item.mine ? "#FFFFFF" : C.ink }}>{item.body}</T>
              </View>
            )}
          />
          <View style={{ paddingHorizontal: 16 }}><ErrorNote text={error} /></View>
          {thread.active ? (
            <Row style={{ padding: 12, margin: 12, backgroundColor: C.nav, borderRadius: 40 }}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Message"
                placeholderTextColor="#8A8A84"
                maxLength={1000}
                multiline
                style={{ flex: 1, minHeight: 52, maxHeight: 120, backgroundColor: C.card, borderRadius: 26, paddingHorizontal: 18, paddingTop: 15, fontFamily: F.regular, fontSize: 16, color: C.ink }}
              />
              <CircleBtn size={56} tone="lime" label="Send" onPress={onSend} icon={<Send size={22} strokeWidth={ICON.stroke} color={C.ink} />} />
            </Row>
          ) : (
            <T v="label" style={{ textAlign: "center", padding: 16 }}>This chat has closed.</T>
          )}
        </View>
      </KeyboardAvoidingView>

      {thread.iAmTherapist ? (
        lastFromOther ? (
          <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} targetType="message" targetId={lastFromOther._id} />
        ) : null
      ) : (
        <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} targetType="therapist" targetId={thread.therapistId} />
      )}
      <Sheet visible={rateOpen} onClose={() => setRateOpen(false)} title="How was it?">
        <Row>
          {[1, 2, 3, 4, 5].map((n) => (
            <CircleBtn
              key={n}
              label={`${n} stars`}
              tone={n <= rating ? "lime" : "light"}
              onPress={() => setRating(n)}
              icon={<Star size={22} strokeWidth={ICON.stroke} color={C.ink} fill={n <= rating ? C.ink : "transparent"} />}
            />
          ))}
        </Row>
        <Field label="Short review (optional)" value={reviewText} onChangeText={setReviewText} maxLength={300} multiline style={{ minHeight: 90 }} />
        <Btn label="Submit review" tone="dark" onPress={submitReview} />
      </Sheet>
    </SafeAreaView>
  );
}

