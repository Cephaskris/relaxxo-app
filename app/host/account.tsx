import React from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { AccountScreen } from "@/components/AccountScreen";
import { Btn } from "@/components/ui";

export default function HotelAccount() {
  return (
    <AccountScreen
      extra={
        <View style={{ marginTop: 16 }}>
          <Btn label="Edit hotel details" tone="light" onPress={() => router.push("/onboarding/hotel")} />
        </View>
      }
    />
  );
}
