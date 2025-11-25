import { ThemeNotFound } from "./404ThemeNotFound";
import { MuttonTheme } from "./MuttonTheme";
import { ThunderTheme } from "./ThunderTheme";
import { TractorTheme } from "./TractorTheme";
import { RuneScapeTheme } from "./RuneScapeTheme";
import { WindowsXPTheme } from "./WindowsXPTheme";

export const themeRegistry = {
  TractorTheme,
  ThemeNotFound,
  ThunderTheme,
  MuttonTheme,
  RuneScapeTheme,
  WindowsXPTheme,
} as const;

export type ThemeRegistryKey = keyof typeof themeRegistry;

