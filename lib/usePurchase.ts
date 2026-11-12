import { useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/util";

// Starts a Paystack checkout. Credits are added by the server only after Paystack confirms payment.
export function usePurchase(opts?: { returnTo?: string; onSuccess?: () => void }) {
  const initialize = useAction(api.payments.initialize);
  const verify = useAction(api.payments.verify);
  const [busyPack, setBusyPack] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(packId: string) {
    setError(null);
    setMessage(null);
    setBusyPack(packId);
    try {
      const { url, reference, credited } = await initialize({ packId, platform: Platform.OS === "web" ? "web" : "native" });
      if (credited || !url) {
        setMessage("Connection Credits (CC) added to your wallet!");
        opts?.onSuccess?.();
        return;
      }
      if (Platform.OS === "web") {
        try {
          if (opts?.returnTo) window.sessionStorage.setItem("relaxxo_return_to", opts.returnTo);
        } catch {}
        window.location.assign(url); // returns to /payment-return
        return;
      }
      await WebBrowser.openAuthSessionAsync(url, Linking.createURL("payment-return"));
      const status = await verify({ reference });
      if (status === "success") {
        setMessage("Payment confirmed. Credits added.");
        opts?.onSuccess?.();
      } else {
        setMessage("Payment not completed. If you were charged, credits will appear within a few minutes.");
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyPack(null);
    }
  }

  return { buy, busyPack, message, error };
}
