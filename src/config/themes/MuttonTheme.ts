import { iceland, russoOne } from "../../utils/Fonts";
import { createFarmHandTheme } from "./createFarmHandTheme";

export const MuttonTheme = createFarmHandTheme({
  id: "MuttonTheme",
  displayName: "Mutton",
  flavorText:
    '"The big cheese"',
  brand: {
    primary: {
      main: "#c4b454",
      dark: "#897D3A",
      light: "#CFC376",
      contrastText: "rgba(0, 0, 0, 0.87)",
    },
    secondary: {
      main: "#000000",
      dark: "#333333",
      light: "#000000",
      contrastText: "#ffffff",
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
    surfaceDark: "#1e1e1e",
    border: "#e0e0e0",
    borderDark: "#2b2b2b",
  },
  fonts: [russoOne, iceland],
  typography: {
    display: "Russo-One",
    headline: "Russo-One",
    ui: "Iceland",
    body: "Iceland",
    headings: {
      display: ["h1", "h2", "h3", "h4", "h5", "h6"],
      headline: [],
    },
  },
});
