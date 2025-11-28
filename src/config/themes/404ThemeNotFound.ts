import { nasalization, fredoka } from "../../utils/Fonts";
import { createFarmHandTheme } from "./createFarmHandTheme";

export const ThemeNotFound = createFarmHandTheme({
  id: "ThemeNotFound",
  displayName: "404 Theme Not Found",
  flavorText: '"Error 404: Flavor text not found"',
  brand: {
    primary: {
      main: "#731daa",
      dark: "#501476",
      light: "#8F4ABB",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#ffc52e",
      dark: "#f9a825",
      light: "#da9a08",
      contrastText: "rgba(0, 0, 0, 0.87)",
    },
    info: {
      main: "#0066b3",
      light: "#42a5f5",
      dark: "#004c8c",
      contrastText: "#ffffff",
    },
    success: {
      main: "#2e7d32",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#f57c00",
      dark: "#e65100",
      light: "#ff9800",
      contrastText: "#ffffff",
    },
    error: {
      main: "#ed1c24",
      light: "#ff5252",
      dark: "#c41e3a",
      contrastText: "#ffffff",
    },
  },
  neutrals: {
    surface: "#f1f1f1",
    surfaceDark: "#121212",
    border: "#e0e0e0",
    borderDark: "#515761",
  },
  fonts: [nasalization, fredoka],
  typography: {
    display: "Nasalization",
    headline: "Nasalization",
    ui: "Fredoka",
    body: "Fredoka",
    headings: {
      display: ["h1", "h2", "h3", "h4", "h5", "h6"],
      headline: [],
    },
  },
});
