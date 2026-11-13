// Relaxxo design tokens — Light Clean Spa (Sky Mist #E7FBFA + Deep Teal #0B3D3E + Turquoise Splash #2EC4B6)
// and Dark Teal mode (#0B3D3E + #2EC4B6).

export type ThemeMode = "light" | "dark";

export const PALETTES = {
  light: {
    bg: "#E7FBFA",
    card: "#FFFFFF",
    ink: "#0B3D3E",
    brand: "#0B3D3E",
    muted: "#385F60",
    line: "#BDE3E0",
    soft: "#D8F5F3",
    lime: "#2EC4B6",
    accent: "#0F7A71",
    goldSoft: "#0B3D3E",
    nav: "#D3F1EF",
    danger: "#B4381F",
    dangerSoft: "#FBE9E4",
    success: "#0B3D3E",
    onLime: "#0B3D3E",
    onBrand: "#FFFFFF",
    placeholder: ["#0B3D3E", "#2EC4B6", "#1A5E60", "#385F60"],
  },
  dark: {
    bg: "#072B2C",
    card: "#104749",
    ink: "#E7FBFA",
    brand: "#1E7375",
    muted: "#A8DFDC",
    line: "#226F71",
    soft: "#185D5F",
    lime: "#2EC4B6",
    accent: "#2EC4B6",
    goldSoft: "#E7FBFA",
    nav: "#052122",
    danger: "#F87171",
    dangerSoft: "#3F1D1D",
    success: "#2EC4B6",
    onLime: "#0B3D3E",
    onBrand: "#FFFFFF",
    placeholder: ["#1E7375", "#2EC4B6", "#0B3D3E", "#185D5F"],
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
  accent: string;
  goldSoft: string;
  nav: string;
  danger: string;
  dangerSoft: string;
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
