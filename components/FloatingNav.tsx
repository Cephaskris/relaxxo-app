import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/components/ThemeProvider";
import { F, ICON } from "@/lib/theme";

export type NavItem = { name: string; label: string; Icon?: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>; initials?: string };

// Floating rounded bar of circles (reference 2): active = lime, others = white, last = avatar.
export function makeFloatingNav(items: NavItem[]) {
  return function FloatingNav({ state, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    return (
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", left: 0, right: 0, bottom: Math.max(insets.bottom, 12) + 4, alignItems: "center" }}
      >
        <View
          style={{
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.nav,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 8,
            gap: 10,
            shadowColor: "#000",
            shadowOpacity: 0.14,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        >
          {items.map((item) => {
            const index = state.routes.findIndex((r) => r.name === item.name);
            if (index < 0) return null;
            const focused = state.index === index;
            const onPress = () => {
              const ev = navigation.emit({ type: "tabPress", target: state.routes[index].key, canPreventDefault: true });
              if (!focused && !ev.defaultPrevented) navigation.navigate(state.routes[index].name);
            };
            const isAvatar = !!item.initials;
            return (
              <Pressable
                key={item.name}
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: focused }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: focused ? colors.lime : isAvatar ? colors.brand : colors.card,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: isAvatar ? 3 : 0,
                  borderColor: focused ? colors.onLime : "#FFFFFF",
                }}
              >
                {isAvatar ? (
                  <Text style={{ fontFamily: F.medium, fontSize: 17, color: focused ? colors.onLime : colors.onBrand }}>{item.initials}</Text>
                ) : item.Icon ? (
                  <item.Icon size={26} strokeWidth={ICON.stroke} color={focused ? colors.onLime : colors.ink} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };
}

export function initialsOf(name?: string | null) {
  if (!name) return "Me";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "Me";
}
