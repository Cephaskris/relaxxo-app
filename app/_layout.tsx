import React, { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ConvexReactClient, useConvexAuth, useMutation } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import {
  useFonts,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
} from "@expo-google-fonts/outfit";
import { api } from "@/convex/_generated/api";
import { LocationProvider } from "@/components/LocationProvider";
import { Loading } from "@/components/ui";
import { C } from "@/lib/theme";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error("EXPO_PUBLIC_CONVEX_URL is not set");
const convex = new ConvexReactClient(convexUrl, { unsavedChangesWarning: false });

// Auth tokens live in the device's encrypted keychain/keystore on mobile.
const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function PushRegistration() {
  const { isAuthenticated } = useConvexAuth();
  const setPushToken = useMutation(api.users.setPushToken);
  useEffect(() => {
    if (!isAuthenticated || Platform.OS === "web" || !Device.isDevice) return;
    (async () => {
      try {
        const perm = await Notifications.requestPermissionsAsync();
        if (!perm.granted) return;
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.HIGH,
          });
        }
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
        await setPushToken({ token: token.data });
      } catch {
        // Push is optional; the app works without it.
      }
    })();
  }, [isAuthenticated, setPushToken]);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold });
  if (!fontsLoaded) return <Loading />;
  return (
    <SafeAreaProvider>
      <ConvexAuthProvider client={convex} storage={Platform.OS === "web" ? undefined : secureStorage}>
        <LocationProvider>
          <PushRegistration />
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
        </LocationProvider>
      </ConvexAuthProvider>
    </SafeAreaProvider>
  );
}
