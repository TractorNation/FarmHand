import { createTheme } from "@mui/material/styles";
import { anton, impact, baskervville } from "../../utils/Fonts";

const TractorLightTheme = createTheme({
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
      contrastText: "#ffffff",
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
      fontFamily: '"Anton"',
    },
    h5: {
      fontFamily: "Anton",
      fontWeight: 500,
    },
    h6: {
      fontFamily: "Anton",
      fontWeight: 500,
    },
    button: {
      fontFamily: "Anton",
      fontWeight: 300,
    },
    subtitle1: {
      fontFamily: "Anton",
      fontWeight: 200,
    },
    subtitle2: {
      fontFamily: "Anton",
      fontWeight: 100,
    },
    body1: {
      fontFamily: '"Baskervville"',
      fontWeight: 300,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @font-face {
          font-family: 'Anton';
          src: ${anton.src};
        }

        @font-face {
          font-family: 'Impact';
          src: ${impact.src};
        }
        
        @font-face {
          font-family: 'Baskervville';
          src: ${baskervville.src};
        }
      `,
    },
  },
});

export default TractorLightTheme;
