// Relaxxo design tokens — Light Luxury (Warm Cream + Midnight Purple + #FFBE0B)
// and Full Dark Midnight (Midnight Purple #2E1A47 + Deep Plum + #FFBE0B).

export type ThemeMode = "light" | "dark";

export const PALETTES = {
  light: {
    bg: "#FAF7F2",
    card: "#FFFFFF",
    ink: "#2E1A47",
    brand: "#2E1A47",
    muted: "#6E5B85",
    line: "#EAE2F0",
    soft: "#F2ECF7",
    lime: "#FFBE0B",
    goldSoft: "#F8D299",
    nav: "#EDE6F3",
    danger: "#B4381F",
    success: "#2E1A47",
    onLime: "#2E1A47",
    onBrand: "#FFFFFF",
    placeholder: ["#804A8A", "#4D2F70", "#6B5C78", "#7A5498"],
  },
  dark: {
    bg: "#2E1A47",
    card: "#3C235C",
    ink: "#FFFFFF",
    brand: "#4D2F70",
    muted: "#CBBCE0",
    line: "#4D2F70",
    soft: "#3A0353",
    lime: "#FFBE0B",
    goldSoft: "#F8D299",
    nav: "#211235",
    danger: "#F87171",
    success: "#F8D299",
    onLime: "#2E1A47",
    onBrand: "#FFFFFF",
    placeholder: ["#804A8A", "#4D2F70", "#7A5498", "#3A0353"],
  },
} as const;

export type ThemeColors = {
  bg: string;
  card: string;
  ink: string;
  brand: string;
  muted: string;
  line: string;
  soft: string;
  lime: string;
  goldSoft: string;
  nav: string;
  danger: string;
  success: string;
  onLime: string;
  onBrand: string;
  placeholder: readonly string[];
};

export const C: ThemeColors = { ...PALETTES.light };

export const F = {
  light: "Outfit_300Light",
  regular: "Outfit_400Regular",
  medium: "Outfit_500Medium",
  semibold: "Outfit_600SemiBold",
};

export const R = { pill: 999, card: 28, field: 20 };

export const ICON = { size: 24, stroke: 2.2 };
