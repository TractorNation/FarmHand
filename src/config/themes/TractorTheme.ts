import { createTheme } from "@mui/material/styles";
import { anton, antonio, baskervville } from "../../utils/Fonts";

export const TractorTheme = {
  light: createTheme({
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
        fontFamily: "Anton",
      },
      h2: {
        fontFamily: "Anton",
      },
      h3: {
        fontFamily: "Anton",
      },
      h4: {
        fontFamily: "Anton",
      },
      h5: {
        fontFamily: "Antonio",
        fontWeight: 500,
      },
      h6: {
        fontFamily: "Antonio",
        fontWeight: 500,
      },
      button: {
        fontFamily: "Antonio",
        fontWeight: 800,
      },
      subtitle1: {
        fontFamily: "Antonio",
        fontWeight: 800,
      },
      subtitle2: {
        fontFamily: "Antonio",
        fontWeight: 400,
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
              font-family: ${anton.fontFamily};
              src: ${anton.src};
            }
            
            @font-face {
              font-family: ${baskervville.fontFamily};
              src: ${baskervville.src};
            }
    
            @font-face {
              font-family: ${antonio.fontFamily};
              src: ${antonio.src};
            }
          `,
      },
    },
  }),

  dark: createTheme({
    palette: {
      mode: "dark",
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
        default: "#121212",
        paper: "#1e1e1e",
      },
      text: {
        primary: "#ffffff",
        secondary: "rgba(255,255,255,0.7)",
        disabled: "rgba(255,255,255,0.5)",
      },
      divider: "rgba(255,255,255,0.12)",
    },
    typography: {
      h1: {
        fontFamily: "Anton",
      },
      h2: {
        fontFamily: "Anton",
      },
      h3: {
        fontFamily: "Anton",
      },
      h4: {
        fontFamily: "Anton",
      },
      h5: {
        fontFamily: "Antonio",
        fontWeight: 500,
      },
      h6: {
        fontFamily: "Antonio",
        fontWeight: 500,
      },
      button: {
        fontFamily: "Antonio",
        fontWeight: 800,
      },
      subtitle1: {
        fontFamily: "Antonio",
        fontWeight: 800,
      },
      subtitle2: {
        fontFamily: "Antonio",
        fontWeight: 400,
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
              font-family: ${anton.fontFamily};
              src: ${anton.src};
            }
            
            @font-face {
              font-family: ${baskervville.fontFamily};
              src: ${baskervville.src};
            }
    
            @font-face {
              font-family: ${antonio.fontFamily};
              src: ${antonio.src};
            }
          `,
      },
      MuiPaper: {
        styleOverrides: {
          root: ({ theme, ownerState }) => {
            const elevationOverlays: { [key: number]: string } = {
              0: "rgba(255, 255, 255, 0)",
              1: "rgba(255, 255, 255, 0.03)",
              2: "rgba(255, 255, 255, 0.04)",
              3: "rgba(255, 255, 255, 0.05)",
              4: "rgba(255, 255, 255, 0.06)",
              6: "rgba(255, 255, 255, 0.08)",
              8: "rgba(255, 255, 255, 0.09)",
              12: "rgba(255, 255, 255, 0.11)",
              16: "rgba(255, 255, 255, 0.12)",
              24: "rgba(255, 255, 255, 0.14)",
            };

            const elevation = ownerState.elevation || 0;
            const overlay =
              elevationOverlays[elevation] || "rgba(255, 255, 255, 0)";

            return theme.palette.mode === "dark"
              ? {
                  backgroundImage: `linear-gradient(${overlay}, ${overlay})`,
                }
              : {};
          },
        },
      },
    },
  }),
};
