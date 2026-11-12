import React, { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { Screen, T, Field, Btn, BackBtn, ErrorNote } from "@/components/ui";
import { normalizePhone, prettyPhone, errorMessage } from "@/lib/util";

// Phone + OTP for every role. The account type is chosen once, after the first login.
export default function SignIn() {
  const { signIn } = useAuthActions();
  const { as } = useLocalSearchParams<{ as?: string }>();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setError(null);
    const p = normalizePhone(phoneInput);
    if (!p) return setError("Enter a valid Nigerian phone number");
    setBusy(true);
    try {
      await signIn("termii", { phone: p });
      setPhone(p);
      setCode("123456");
      setStep("code");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setError(null);
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code");
    setBusy(true);
    try {
      await signIn("termii", { phone, code });
      router.replace(as ? `/auth/role?as=${as}` : "/");
    } catch {
      setError("That code is wrong or has expired");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padBottom={40}>
      <BackBtn />
      <View style={{ marginTop: 28, gap: 10 }}>
        <T v="label">Relaxxo</T>
        <T v="display">{step === "phone" ? "Sign in with\nyour phone" : "Enter your\ncode"}</T>
        <T style={{ color: "#6B6B66" }}>
          {step === "phone"
            ? "We'll text you a 6-digit code. New here? This creates your account."
            : `Testing mode: 123456 is pre-filled for ${prettyPhone(phone)}`}
        </T>
      </View>
      <View style={{ marginTop: 32, gap: 16 }}>
        {step === "phone" ? (
          <Field
            label="Phone number"
            placeholder="0803 123 4567"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phoneInput}
            onChangeText={setPhoneInput}
            maxLength={16}
          />
        ) : (
          <Field
            label="6-digit code"
            placeholder="123456"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
          />
        )}
        <ErrorNote text={error} />
        <Btn label={step === "phone" ? "Send code" : "Continue"} arrow loading={busy} onPress={step === "phone" ? sendCode : verify} />
        {step === "code" ? (
          <Btn label="Use a different number" tone="light" onPress={() => { setStep("phone"); setCode(""); }} />
        ) : null}
      </View>
    </Screen>
  );
}
