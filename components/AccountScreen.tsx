import React, { useState } from "react";
import { Linking, View } from "react-native";
import { router } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { Screen, T, Btn, Card, Row, Chip, Field, ErrorNote } from "@/components/ui";
import { C } from "@/lib/theme";
import { prettyPhone, errorMessage } from "@/lib/util";
import { CITY_NAMES } from "@/lib/areas";

const SUPPORT = process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP;

export function AccountScreen({ extra }: { extra?: React.ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const updateMe = useMutation(api.users.updateMe);
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated || !me) {
    return (
      <Screen>
        <T v="display">Welcome to{"\n"}Relaxxo</T>
        <T v="label" style={{ marginTop: 8 }}>Verified massage therapists and stays near you.</T>
        <View style={{ gap: 10, marginTop: 24 }}>
          <Btn label="Sign in or create account" arrow onPress={() => router.push("/auth/sign-in")} />
          <Btn label="Join as a therapist" tone="dark" onPress={() => router.push("/auth/sign-in?as=therapist")} />
          <Btn label="List your hotel" tone="light" onPress={() => router.push("/auth/sign-in?as=hotel")} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <T v="label">Account</T>
      <T v="display" style={{ marginTop: 4 }}>{me.name || "You"}</T>
      <T v="label">{me.phone ? prettyPhone(me.phone) : ""} · {me.role}</T>

      <Card style={{ marginTop: 20, gap: 14 }}>
        <Field label="Name" value={name ?? me.name} onChangeText={setName} maxLength={60} />
        <View style={{ gap: 6 }}>
          <T v="label">City</T>
          <Row>
            {CITY_NAMES.map((c) => (
              <Chip key={c} label={c} active={me.city === c} onPress={() => updateMe({ city: c }).catch((e) => setError(errorMessage(e)))} />
            ))}
          </Row>
        </View>
        {me.role === "client" ? (
          <View style={{ gap: 6 }}>
            <T v="label">Gender (optional)</T>
            <Row>
              {(["female", "male"] as const).map((g) => (
                <Chip
                  key={g}
                  label={g === "female" ? "Female" : "Male"}
                  active={me.gender === g}
                  onPress={() => updateMe({ gender: g }).catch((e) => setError(errorMessage(e)))}
                />
              ))}
            </Row>
          </View>
        ) : null}
        <ErrorNote text={error} />
        {name !== null && name !== me.name ? (
          <Btn
            label="Save"
            tone="dark"
            onPress={() =>
              updateMe({ name })
                .then(() => setName(null))
                .catch((e) => setError(errorMessage(e)))
            }
          />
        ) : null}
      </Card>

      {extra}

      <View style={{ gap: 10, marginTop: 20 }}>
        {SUPPORT ? <Btn label="Chat with support on WhatsApp" tone="light" onPress={() => Linking.openURL(`https://wa.me/${SUPPORT}`)} /> : null}
        <Btn
          label="Sign out"
          tone="dark"
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
        />
      </View>
      <T v="small" style={{ marginTop: 16, color: C.muted }}>
        Relaxxo connects you with independent, verified professionals. Report anything inappropriate from any profile or chat.
      </T>
    </Screen>
  );
}
