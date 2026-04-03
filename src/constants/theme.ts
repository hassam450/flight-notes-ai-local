/**
 * Flight Notes AI Theme Configuration
 * Purple-themed color palette for the aviation study app
 */

import { Platform } from "react-native";

// Primary purple colors from design
export const PrimaryColors = {
  primary: "#5b13ec",
  primaryDark: "#430db0",
  primaryLight: "#7c45f0",
};

// Light mode colors
const tintColorLight = "#5b13ec";

// Dark mode colors
const tintColorDark = "#7c45f0";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#f6f6f8",
    tint: tintColorLight,
    primary: "#5b13ec",
    primaryDark: "#430db0",
    primaryLight: "#7c45f0",
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    card: "#ffffff",
    cardSecondary: "#f6f6f8",
    border: "#e5e7eb",
    inputBackground: "#ffffff",
    inputBorder: "#e5e7eb",
    mutedText: "#6b7280",
    error: "#ef4444",
    success: "#22c55e",
  },
  dark: {
    text: "#ECEDEE",
    background: "#161022",
    tint: tintColorDark,
    primary: "#5b13ec",
    primaryDark: "#430db0",
    primaryLight: "#7c45f0",
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    card: "#1e162e",
    cardSecondary: "#251e35",
    border: "#374151",
    inputBackground: "#1e162e",
    inputBorder: "#374151",
    mutedText: "#9ca3af",
    error: "#ef4444",
    success: "#22c55e",
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
