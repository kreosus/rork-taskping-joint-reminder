const palette = {
  bg: "#FBF6EE",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  ink: "#15181D",
  sub: "#7A7A80",
  muted: "#B9B7B0",
  line: "#EDE6D8",
  coral: "#FF5E4C",
  coralDark: "#E24636",
  amber: "#FFB020",
  mint: "#4FC28A",
  sky: "#5EA9F0",
  navy: "#0F1730",
  chipBg: "#F4ECDC",
} as const;

export default {
  light: {
    text: palette.ink,
    background: palette.bg,
    tint: palette.coral,
    tabIconDefault: palette.muted,
    tabIconSelected: palette.coral,
  },
  ...palette,
};

export const Colors = palette;
