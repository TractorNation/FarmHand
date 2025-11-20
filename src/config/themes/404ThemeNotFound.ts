import { createTheme } from "@mui/material/styles";
import { nasalization, fredoka } from "../../utils/Fonts";

export const ThemeNotFound = {
  light: createTheme({
    palette: {
      mode: "light",
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
        main: "#2e7d32",
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
        fontFamily: "Nasalization",
      },
      h2: {
        fontFamily: "Nasalization",
      },
      h3: {
        fontFamily: "Nasalization",
      },
      h4: {
        fontFamily: "Nasalization",
      },
      h5: {
        fontFamily: "Nasalization",
        fontWeight: 500,
      },
      h6: {
        fontFamily: "Nasalization",
        fontWeight: 500,
      },
      button: {
        fontFamily: "Nasalization",
        fontWeight: 800,
      },
      subtitle1: {
        fontFamily: "Fredoka",
        fontWeight: 500,
      },
      subtitle2: {
        fontFamily: "Fredoka",
        fontWeight: 400,
      },
      body1: {
        fontFamily: "Fredoka",
        fontWeight: 300,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: `
            @font-face {
              font-family: ${nasalization.fontFamily};
              src: ${nasalization.src};
            }
            
            @font-face {
            font-family: ${fredoka.fontFamily};
            src: ${fredoka.src};
            }
          `,
      },
    },
  }),

  dark: createTheme({
    palette: {
      mode: "dark",
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
        main: "#2e7d32",
        contrastText: "#ffffff",
      },
      warning: {
        main: "#f57c00",
        dark: "#e65100",
        light: "#ff9800",
        contrastText: "#ffffff",
      },
      background: {
        default: "#121212",
        paper: "#1e1e1e",
      },
      text: {
        primary: "#ffffff",
        secondary: "rgba(255, 255, 255, 0.7)",
        disabled: "rgba(255, 255, 255, 0.5)",
      },
      divider: "rgba(0,0,0,0.12)",
    },
    typography: {
      h1: {
        fontFamily: "Nasalization",
      },
      h2: {
        fontFamily: "Nasalization",
      },
      h3: {
        fontFamily: "Nasalization",
      },
      h4: {
        fontFamily: "Nasalization",
      },
      h5: {
        fontFamily: "Nasalization",
        fontWeight: 500,
      },
      h6: {
        fontFamily: "Nasalization",
        fontWeight: 500,
      },
      button: {
        fontFamily: "Nasalization",
        fontWeight: 800,
      },
      subtitle1: {
        fontFamily: "Fredoka",
        fontWeight: 500,
      },
      subtitle2: {
        fontFamily: "Fredoka",
        fontWeight: 400,
      },
      body1: {
        fontFamily: "Fredoka",
        fontWeight: 300,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: `
            @font-face {
              font-family: ${nasalization.fontFamily};
              src: ${nasalization.src};
            }
            
            @font-face {
            font-family: ${fredoka.fontFamily};
            src: ${fredoka.src};
            }
          `,
      },
    },
  }),
};
