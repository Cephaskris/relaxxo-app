// Relaxxo design tokens — Light Clean Spa (Sky Mist #E7FBFA + Deep Teal #0B3D3E + Turquoise Splash #2EC4B6)
// and Dark Teal mode (#0B3D3E + #2EC4B6).

export type ThemeMode = "light" | "dark";

export const PALETTES = {
  light: {
    bg: "#E7FBFA",
    card: "#FFFFFF",
    ink: "#0B3D3E",
    brand: "#0B3D3E",
    muted: "#4E7475",
    line: "#CDEBE9",
    soft: "#D8F5F3",
    lime: "#2EC4B6",
    goldSoft: "#2EC4B6",
    nav: "#D3F1EF",
    danger: "#B4381F",
    success: "#0B3D3E",
    onLime: "#0B3D3E",
    onBrand: "#FFFFFF",
    placeholder: ["#0B3D3E", "#2EC4B6", "#1A5E60", "#4E7475"],
  },
  dark: {
    bg: "#0B3D3E",
    card: "#124E50",
    ink: "#E7FBFA",
    brand: "#176062",
    muted: "#9ED6D3",
    line: "#1B6A6C",
    soft: "#124E50",
    lime: "#2EC4B6",
    goldSoft: "#E7FBFA",
    nav: "#072C2D",
    danger: "#F87171",
    success: "#2EC4B6",
    onLime: "#0B3D3E",
    onBrand: "#FFFFFF",
    placeholder: ["#176062", "#2EC4B6", "#0B3D3E", "#1B6A6C"],
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
