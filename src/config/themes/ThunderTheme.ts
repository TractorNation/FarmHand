import { telegraf, anton, voltec } from "../../utils/Fonts";
import { createFarmHandTheme } from "./createFarmHandTheme";

export const ThunderTheme = createFarmHandTheme({
  id: "ThunderTheme",
  displayName: "Thunder",
  flavorText:
    '"Only true alpha wolves would understand"',
  brand: {
    primary: {
      main: "#ff0000",
      dark: "#B20000",
      light: "#FF3333",
      contrastText: "#ffffff",
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
    borderDark: "#515761",
  },
  fonts: [voltec, anton, telegraf],
  typography: {
    display: "Voltec",
    headline: "Anton",
    ui: "Telegraf",
    body: "Telegraf",
    
  },
});
