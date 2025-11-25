import { ThemeNotFound } from "./404ThemeNotFound";
import { MuttonTheme } from "./MuttonTheme";
import { ThunderTheme } from "./ThunderTheme";
import { TractorTheme } from "./TractorTheme";
import { RuneScapeTheme } from "./RuneScapeTheme";

export const themeRegistry = {
  TractorTheme,
  ThemeNotFound,
  ThunderTheme,
  MuttonTheme,
  RuneScapeTheme,
} as const;

export type ThemeRegistryKey = keyof typeof themeRegistry;

