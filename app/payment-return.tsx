import React, { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAction, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Screen, T, Btn, Loading } from "@/components/ui";

// Paystack sends the browser here after checkout. On the web we verify and show the result.
// For the mobile app (?app=1) we bounce back into the app with the reference.
export default function PaymentReturn() {
  const { reference, app } = useLocalSearchParams<{ reference?: string; app?: string }>();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const verify = useAction(api.payments.verify);
  const [status, setStatus] = useState<"checking" | "success" | "other">("checking");

  useEffect(() => {
    if (!reference) return setStatus("other");
    if (Platform.OS === "web" && app === "1") {
      window.location.replace(`relaxxo://payment-return?reference=${encodeURIComponent(reference)}`);
      return;
    }
    if (isLoading || !isAuthenticated) return;
    verify({ reference })
      .then((s) => {
        if (s === "success") {
          setStatus("success");
          if (Platform.OS === "web") {
            try {
              const returnTo = window.sessionStorage.getItem("relaxxo_return_to");
              if (returnTo) {
                window.sessionStorage.removeItem("relaxxo_return_to");
                router.replace(returnTo as never);
              }
            } catch {}
          }
        } else {
          setStatus("other");
        }
      })
      .catch(() => setStatus("other"));
  }, [reference, app, isAuthenticated, isLoading, verify]);

  if (status === "checking") return <Loading />;
  return (
    <Screen>
      <View style={{ marginTop: 60, gap: 12 }}>
        <T v="display">{status === "success" ? "Connection Credits added" : "Payment not confirmed"}</T>
        <T v="label">
          {status === "success"
            ? "Your wallet has been topped up with Connection Credits (CC)."
            : "If you were charged, your Connection Credits (CC) will appear within a few minutes. Contact support if they don't."}
        </T>
        <Btn label="Back to Relaxxo" arrow onPress={() => router.replace("/")} />
      </View>
    </Screen>
  );
}
