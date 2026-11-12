import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { Screen, T, Field, Btn, BackBtn, ErrorNote, Chip } from "@/components/ui";
import { normalizePhone, errorMessage } from "@/lib/util";
import { C } from "@/lib/theme";

// Phone + Password authentication for Sign In and Sign Up.
export default function SignIn() {
  const { signIn } = useAuthActions();
  const { as, mode } = useLocalSearchParams<{ as?: string; mode?: string }>();
  const [flow, setFlow] = useState<"signIn" | "signUp">(
    mode === "signUp" || as ? "signUp" : "signIn",
  );
  const [phoneInput, setPhoneInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const p = normalizePhone(phoneInput);
    if (!p) return setError("Enter a valid Nigerian phone number (e.g. 0803 123 4567)");
    if (!password || password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    setBusy(true);
    try {
      await signIn("password", { phone: p, password, flow });
      router.replace(as ? `/auth/role?as=${as}` : "/");
    } catch (e) {
      const msg = errorMessage(e);
      if (flow === "signIn") {
        if (msg.includes("InvalidAccountId") || msg.includes("Invalid credentials")) {
          setError("No account found with this phone and password. New here? Tap 'Create account' above.");
        } else if (msg.includes("InvalidSecret")) {
          setError("Incorrect password. Please try again.");
        } else {
          setError("Invalid phone number or password.");
        }
      } else {
        if (msg.includes("already exists")) {
          setError("An account with this phone number already exists. Tap 'Sign in' above.");
        } else {
          setError(msg || "Could not create account. Please try again.");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padBottom={40}>
      <BackBtn />
      <View style={{ marginTop: 24, gap: 10 }}>
        <T v="label">Relaxxo</T>
        <T v="display">
          {flow === "signIn" ? "Welcome\nback" : "Create your\naccount"}
        </T>
        <T style={{ color: C.muted }}>
          {flow === "signIn"
            ? "Sign in with your Nigerian phone number and password."
            : "Enter your Nigerian phone number and choose a password (min. 6 characters)."}
        </T>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 24 }}>
        <Chip
          label="Sign in"
          active={flow === "signIn"}
          onPress={() => {
            setFlow("signIn");
            setError(null);
          }}
        />
        <Chip
          label="Create account"
          active={flow === "signUp"}
          onPress={() => {
            setFlow("signUp");
            setError(null);
          }}
        />
      </View>

      <View style={{ marginTop: 24, gap: 16 }}>
        <Field
          label="Phone number"
          placeholder="0803 123 4567"
          keyboardType="phone-pad"
          autoComplete="tel"
          value={phoneInput}
          onChangeText={setPhoneInput}
          maxLength={16}
        />

        <View style={{ gap: 6 }}>
          <Field
            label="Password"
            placeholder={flow === "signUp" ? "At least 6 characters" : "Enter your password"}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete={flow === "signUp" ? "new-password" : "current-password"}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            style={{ alignSelf: "flex-end", paddingVertical: 4 }}
          >
            <T v="small" style={{ color: C.muted }}>
              {showPassword ? "Hide password" : "Show password"}
            </T>
          </Pressable>
        </View>

        <ErrorNote text={error} />

        <Btn
          label={flow === "signIn" ? "Sign in" : "Create account"}
          arrow
          loading={busy}
          onPress={handleSubmit}
        />

        <Pressable
          onPress={() => {
            setFlow(flow === "signIn" ? "signUp" : "signIn");
            setError(null);
          }}
          style={{ alignItems: "center", paddingVertical: 8 }}
        >
          <T v="small" style={{ color: C.muted }}>
            {flow === "signIn"
              ? "Don't have an account? Create one"
              : "Already have an account? Sign in"}
          </T>
        </Pressable>
      </View>
    </Screen>
  );
}
