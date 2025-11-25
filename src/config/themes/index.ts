import { ThemeNotFound } from "./404ThemeNotFound";
import { MuttonTheme } from "./MuttonTheme";
import { ThunderTheme } from "./ThunderTheme";
import { TractorTheme } from "./TractorTheme";

export const themeRegistry = {
  TractorTheme,
  ThemeNotFound,
  ThunderTheme,
  MuttonTheme,
} as const;

export type ThemeRegistryKey = keyof typeof themeRegistry;

