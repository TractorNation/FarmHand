import { anton, antonio, baskervville } from "../../utils/Fonts";
import { createFarmHandTheme } from "./createFarmHandTheme";

export const TractorTheme = createFarmHandTheme({
  id: "TractorTheme",
  displayName: "Tractor Technicians (default)",
  flavorText:
    '"🚜"',
  brand: {
    primary: {
      main: "#339900",
      dark: "#2d8500",
      light: "#4db82e",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#ffd400",
      dark: "#f9a825",
      light: "#fff59d",
      contrastText: "rgba(0,0,0,0.87)",
    },
    info: {
      main: "#0066b3",
      light: "#42a5f5",
      dark: "#004c8c",
      contrastText: "#ffffff",
    },
    success: {
      main: "#00C853",
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
  fonts: [anton, antonio, baskervville],
  typography: {
    display: "Anton",
    headline: "Antonio",
    ui: "Antonio",
    body: "Baskervville",
    headings: {
      display: ["h1", "h2", "h3", "h4"],
      headline: ["h5", "h6"],
    },
  },
});
