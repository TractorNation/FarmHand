import { createTheme } from "@mui/material/styles";
import Fonts from "../../Utils/Fonts";

const TractorLightTheme = createTheme(
  {
    palette: {
      mode: "light",
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
      error: {
        main: "#ed1c24",
        light: "#ff5252",
        dark: "#c41e3a",
        contrastText: "ffffff",
      },
      info: {
        main: "#0066b3",
        light: "#42a5f5",
        dark: "#004c8c",
        contrastText: "#ffffff",
      },
      success: {
        main: "#00897b",
        dark: "#00695c",
        light: "#26a69a",
        contrastText: "#ffffff",
      },
      warning: {
        main: "#f57c00",
        dark: "#e65100",
        light: "#ff9800",
        contrastText: "#ffffff",
      },
      background: {
        default: "#f1f1f1",
        paper: "#ffffff",
      },
      text: {
        primary: "rgba(0,0,0,0.87)",
        secondary: "rgba(0,0,0,0.6)",
        disabled: "rgba(0,0,0,0.38)",
      },
      divider: "rgba(0,0,0,0.12)",
    },
    typography: {
      h1: {
        fontFamily: '"Impact", "Anton"',
      },
      h2: {
        fontFamily: '"Impact", "Anton"',
      },
      h3: {
        fontFamily: '"Impact", "Anton"',
      },
      h4: {
        fontFamily: "Antonio",
        fontWeight: 600,
      },
      h5: {
        fontFamily: "Antonio",
        fontWeight: 600,
      },
      h6: {
        fontFamily: "Antonio",
        fontWeight: 600,
      },
      button: {
        fontFamily: "Antonio",
        fontWeight: 600,
      },
      subtitle1: {
        fontFamily: "Antonio",
        fontWeight: 600,
      },
      subtitle2: {
        fontFamily: "Antonio",
        fontWeight: 600,
      },
      body1: { fontFamily: '"Baskervville", "Libre Baskervville"', fontWeight: 700 },
    },
    shape: {
      borderRadius: 8,
    },
  },
  Fonts
);

export default TractorLightTheme;
