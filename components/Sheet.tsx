import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { X } from "lucide-react-native";
import { T, Row, CircleBtn } from "@/components/ui";
import { C, ICON } from "@/lib/theme";

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(20,20,20,0.4)" }} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 34, borderTopRightRadius: 34, maxHeight: "88%" }}>
          <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View style={{ width: "100%", maxWidth: 520, alignSelf: "center", gap: 16 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <T v="title" style={{ flex: 1 }}>{title}</T>
                <CircleBtn label="Close" onPress={onClose} icon={<X size={ICON.size} strokeWidth={ICON.stroke} color={C.ink} />} />
              </Row>
              {children}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
