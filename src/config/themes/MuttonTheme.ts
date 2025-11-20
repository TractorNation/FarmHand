import { createTheme } from "@mui/material/styles";
import { iceland, russoOne } from "../../utils/Fonts";

export const MuttonTheme = {
  light: createTheme({
    palette: {
      mode: "light",
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
        fontFamily: "Russo-One",
      },
      h2: {
        fontFamily: "Russo-One",
      },
      h3: {
        fontFamily: "Russo-One",
      },
      h4: {
        fontFamily: "Russo-One",
      },
      h5: {
        fontFamily: "Russo-One",
        fontWeight: 500,
      },
      h6: {
        fontFamily: "Russo-One",
        fontWeight: 500,
      },
      button: {
        fontFamily: "Russo-One",
        fontWeight: 800,
      },
      subtitle1: {
        fontFamily: "iceland",
        fontWeight: 500,
      },
      subtitle2: {
        fontFamily: "iceland",
        fontWeight: 400,
      },
      body1: {
        fontFamily: "iceland",
        fontWeight: 300,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: `
            @font-face {
              font-family: ${russoOne.fontFamily};
              src: ${russoOne.src};
            }
            
            @font-face {
            font-family: ${iceland.fontFamily};
            src: ${iceland.src};
            }
          `,
      },
    },
  }),

  dark: createTheme({
    palette: {
      mode: "dark",
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
        default: "#1e1e1e",
        paper: "#333333",
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
        fontFamily: "Russo-One",
      },
      h2: {
        fontFamily: "Russo-One",
      },
      h3: {
        fontFamily: "Russo-One",
      },
      h4: {
        fontFamily: "Russo-One",
      },
      h5: {
        fontFamily: "Russo-One",
        fontWeight: 500,
      },
      h6: {
        fontFamily: "Russo-One",
        fontWeight: 500,
      },
      button: {
        fontFamily: "Russo-One",
        fontWeight: 800,
      },
      subtitle1: {
        fontFamily: "iceland",
        fontWeight: 500,
      },
      subtitle2: {
        fontFamily: "iceland",
        fontWeight: 400,
      },
      body1: {
        fontFamily: "iceland",
        fontWeight: 300,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: `
            @font-face {
              font-family: ${russoOne.fontFamily};
              src: ${russoOne.src};
            }
            
            @font-face {
            font-family: ${iceland.fontFamily};
            src: ${iceland.src};
            }
          `,
      },
    },
  }),
};
