import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams, Redirect } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { Sparkles, User, BedDouble } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { Screen, T, Field, Btn, Chip, Row, ErrorNote, Loading } from "@/components/ui";
import { C, F, ICON } from "@/lib/theme";
import { errorMessage } from "@/lib/util";
import { CITY_NAMES } from "@/lib/areas";

type Role = "client" | "therapist" | "hotel";
const OPTIONS: { role: Role; title: string; sub: string; Icon: typeof User }[] = [
  { role: "client", title: "I want a massage or a room", sub: "Find verified therapists and stays near you", Icon: User },
  { role: "therapist", title: "I'm a massage therapist", sub: "Get verified, go online, get clients", Icon: Sparkles },
  { role: "hotel", title: "I run a hotel", sub: "List available rooms for nearby guests", Icon: BedDouble },
];

export default function ChooseRole() {
  const me = useQuery(api.users.me);
  const complete = useMutation(api.users.completeSignup);
  const { as } = useLocalSearchParams<{ as?: string }>();
  const [role, setRole] = useState<Role>(as === "therapist" || as === "hotel" ? as : "client");
  const [name, setName] = useState("");
  const [city, setCity] = useState("Lagos");
  const [gender, setGender] = useState<"female" | "male" | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (me === undefined) return <Loading />;
  if (me === null) return <Redirect href="/auth/sign-in" />;
  if (me.role) return <Redirect href="/" />;

  async function submit() {
    setError(null);
    if (name.trim().length < 2) return setError("Enter your name");
    setBusy(true);
    try {
      await complete({ role, name, city, gender: role === "client" ? gender : undefined });
      router.replace("/");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padBottom={40}>
      <T v="label">One last step</T>
      <T v="display" style={{ marginTop: 6 }}>How will you{"\n"}use Relaxxo?</T>
      <View style={{ gap: 10, marginTop: 24 }}>
        {OPTIONS.map((o) => {
          const active = o.role === role;
          return (
            <Pressable
              key={o.role}
              onPress={() => setRole(o.role)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={{
                backgroundColor: active ? C.ink : C.card,
                borderRadius: 24,
                padding: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: active ? C.lime : C.soft, alignItems: "center", justifyContent: "center" }}>
                <o.Icon size={ICON.size} strokeWidth={ICON.stroke} color={C.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: F.medium, fontSize: 17, color: active ? "#FFFFFF" : C.ink }}>{o.title}</T>
                <T v="small" style={{ color: active ? "#C9C9C4" : C.muted }}>{o.sub}</T>
              </View>
            </Pressable>
          );
        })}
      </View>
      <T v="small" style={{ marginTop: 10 }}>You can't change this later. Use a different number for a second account type.</T>
      <View style={{ gap: 16, marginTop: 24 }}>
        <Field label={role === "hotel" ? "Your name (manager)" : "Your name"} value={name} onChangeText={setName} maxLength={60} />
        {role === "client" ? (
          <View style={{ gap: 6 }}>
            <T v="label">Gender (optional)</T>
            <Row>
              <Chip label="Female" active={gender === "female"} onPress={() => setGender(gender === "female" ? undefined : "female")} />
              <Chip label="Male" active={gender === "male"} onPress={() => setGender(gender === "male" ? undefined : "male")} />
            </Row>
          </View>
        ) : null}
        <View style={{ gap: 6 }}>
          <T v="label">City</T>
          <Row>
            {CITY_NAMES.map((c) => (
              <Chip key={c} label={c} active={c === city} onPress={() => setCity(c)} />
            ))}
          </Row>
        </View>
        <ErrorNote text={error} />
        <Btn label="Continue" arrow loading={busy} onPress={submit} />
      </View>
    </Screen>
  );
}
