import {
  alpha,
  createTheme,
  type PaletteMode,
  type PaletteOptions,
  type Theme,
} from "@mui/material/styles";
import type { FarmHandThemeDefinition } from "./createFarmHandTheme";
import xpBackgroundUrl from "../../assets/images/xp_background.jpg?url";

const xpWallpaper = `
  linear-gradient(180deg, rgba(255,255,255,0.25), rgba(0,0,0,0.08)),
  url(${xpBackgroundUrl})
`.trim();
const xpDarkWallpaper = `
  linear-gradient(180deg, rgba(7,12,20,0.92), rgba(4,6,12,0.97)),
  url(${xpBackgroundUrl})
`.trim();

const xpBodyFont = '"Tahoma", "MS Sans Serif", "Segoe UI", sans-serif';
const xpTitleFont = '"Trebuchet MS", "Tahoma", sans-serif';
const XP_PRIMARY_MAIN = "#245edb";
const XP_PRIMARY_LIGHT = "#5b8df5";

const createXpPalette = (mode: PaletteMode): PaletteOptions => {
  const basePrimary = {
    main: XP_PRIMARY_MAIN,
    light: XP_PRIMARY_LIGHT,
    dark: "#1242a0",
    contrastText: "#ffffff",
  };
  const secondary = {
    main: "#2c9d2c",
    light: "#57c657",
    dark: "#1d701d",
    contrastText: "#ffffff",
  };

  const background =
    mode === "light"
      ? {
          base: "#dfe9f5",
          elevated: "#fafafa",
          variant: "#f2f6fb",
          outline: "rgba(0,0,0,0.08)",
        }
      : {
          base: "#11141a",
          elevated: "#1b1f27",
          variant: "#242a35",
          outline: "rgba(255,255,255,0.1)",
        };

  return {
    mode,
    primary: basePrimary,
    secondary,
    info: {
      main: "#f0c300",
      contrastText: "#1a1a1a",
    },
    success: secondary,
    warning: {
      main: "#f0a000",
      contrastText: "#1a1a1a",
    },
    error: {
      main: "#c74343",
      contrastText: "#fff",
    },
    text:
      mode === "light"
        ? {
            primary: "#1f1f1f",
            secondary: "#4a4a4a",
          }
        : {
            primary: "#f4f4f4",
            secondary: "#c2c6d0",
          },
    divider: background.outline,
    background: {
      default: background.base,
      paper: background.elevated,
    },
    surface: {
      base: background.base,
      elevated: background.elevated,
      variant: background.variant,
      subtle: mode === "light" ? "#eef2f9" : "#1f2430",
      outline: background.outline,
    },
  };
};

const applyXpComponents = (theme: Theme): Theme => {
  const mode = theme.palette.mode;
  const windowBorder = mode === "light" ? "#94a5c6" : "#0d0f14";
  const windowHighlight =
    mode === "light" ? "#fdfdff" : alpha("#ffffff", 0.08);
  const buttonGradient = `linear-gradient(180deg, ${alpha(
    theme.palette.primary.light,
    0.95
  )}, ${theme.palette.primary.dark})`;
  const startBarGradient =
    mode === "light"
      ? `linear-gradient(90deg, #0f5ece, #4095ff)`
      : `linear-gradient(90deg, #0b2d5f, #081a36)`;
  const selectionColor = alpha(theme.palette.primary.main, 0.15);
  const drawerBackground =
    mode === "light"
      ? `linear-gradient(180deg, #f3f6fb 0%, #dfe6f4 100%)`
      : `linear-gradient(180deg, #1c2436 0%, #101726 100%)`;
  const windowBodyBackground =
    mode === "light"
      ? `linear-gradient(180deg, #fefeff 0%, #e6efff 100%)`
      : `linear-gradient(180deg, #1f283d 0%, #151c2c 100%)`;
  const cardBackground =
    mode === "light"
      ? `linear-gradient(180deg, #fbfdff, #e0e9f8)`
      : `linear-gradient(180deg, #222c42, #161c2c)`;
  const snackbarGradient =
    mode === "light"
      ? `linear-gradient(180deg, #2a6ad9 0%, #0f3fa6 90%)`
      : `linear-gradient(180deg, #13335f 0%, #0a1934 100%)`;

  theme.components = {
    ...theme.components,
    MuiCssBaseline: {
      styleOverrides: `
        *, *::before, *::after {
          image-rendering: optimizeSpeed;
        }

        body {
          margin: 0;
          min-height: 100vh;
          background-color: ${theme.palette.surface.base};
          background-image: ${
            mode === "light" ? xpWallpaper : xpDarkWallpaper
          };
          background-attachment: fixed;
          background-size: cover;
          font-family: ${theme.typography.body1?.fontFamily ?? xpBodyFont};
          font-size: 13px;
          -webkit-font-smoothing: none;
          text-rendering: optimizeSpeed;
          color: ${theme.palette.text.primary};
        }

        button,
        input,
        textarea,
        select {
          font-family: ${xpBodyFont};
          font-size: 13px;
        }
      `,
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: startBarGradient,
          boxShadow: `inset 0 1px 0 ${alpha("#ffffff", 0.5)}, 0 4px 10px ${alpha(
            "#000",
            0.25
          )}`,
          borderBottom: `1px solid ${alpha("#000", 0.25)}`,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 60,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 3,
          border: `1px solid ${windowBorder}`,
          boxShadow: `inset 0 0 0 1px ${windowHighlight}`,
          backgroundImage: windowBodyBackground,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          border: `1px solid ${windowBorder}`,
          boxShadow: `0 6px 12px ${alpha("#000", mode === "light" ? 0.15 : 0.35)}`,
          backgroundImage: cardBackground,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          border: `1px solid ${alpha("#000", 0.45)}`,
          textTransform: "none",
          fontWeight: 700,
          fontFamily: xpBodyFont,
          fontSize: "0.82rem",
          paddingInline: theme.spacing(2.25),
          paddingBlock: theme.spacing(0.75),
          boxShadow: `inset 1px 1px 0 ${alpha("#ffffff", 0.65)}, inset -1px -1px 0 ${alpha(
            "#000",
            0.25
          )}`,
          textShadow: `0 1px 0 ${alpha("#000", 0.35)}`,
        },
        containedPrimary: {
          backgroundImage: buttonGradient,
          "&:hover": {
            filter: "brightness(1.05)",
            boxShadow: `inset 1px 1px 0 ${alpha("#ffffff", 0.75)}, inset -1px -1px 0 ${alpha(
              "#000",
              0.3
            )}`,
          },
        },
        outlined: {
          borderColor: alpha("#000", 0.35),
          backgroundImage: "linear-gradient(180deg, #ffffff, #e3ebfa)",
          color: "#000",
          "&:hover": {
            backgroundImage: "linear-gradient(180deg, #f7fbff, #dce7fb)",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          border: `1px solid ${alpha("#000", 0.35)}`,
          backgroundImage: "linear-gradient(180deg, #fefefe, #e1e7f5)",
          "&:hover": {
            backgroundImage: "linear-gradient(180deg, #ffffff, #d7e2f8)",
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          border: `1px solid transparent`,
          fontFamily: xpBodyFont,
          fontSize: "0.85rem",
          paddingBlock: theme.spacing(0.75),
          "&.Mui-selected": {
            backgroundColor: selectionColor,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.6)}`,
          },
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
            borderColor: alpha(theme.palette.primary.main, 0.4),
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: drawerBackground,
          borderRight: `1px solid ${windowBorder}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 600,
          fontFamily: xpBodyFont,
          fontSize: "0.78rem",
          backgroundImage: `linear-gradient(180deg, #fff, #e6efff)`,
          border: `1px solid ${alpha("#000", 0.15)}`,
          color: "#000",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: mode === "light" ? "#fff" : "#151c2a",
          boxShadow:
            mode === "light"
              ? `inset 0 1px 0 ${alpha("#fff", 0.9)}, inset 0 -1px 0 ${alpha(
                  "#a7b5ce",
                  0.6
                )}`
              : `inset 0 1px 0 ${alpha("#ffffff", 0.08)}, inset 0 -1px 0 ${alpha(
                  "#000000",
                  0.6
                )}`,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha("#000", mode === "light" ? 0.2 : 0.5),
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
            boxShadow: `0 0 4px ${alpha(theme.palette.primary.main, 0.65)}`,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 3,
          border: `2px solid ${mode === "light" ? "#0f3fa6" : "#1c4ea8"}`,
          boxShadow: `0 18px 35px ${alpha("#000", mode === "light" ? 0.35 : 0.65)}`,
          backgroundImage: mode === "light"
            ? `linear-gradient(180deg, #fefeff 0%, #e6efff 100%)`
            : `linear-gradient(180deg, #202a3f 0%, #141a28 100%)`,
          paddingTop: 0,
          overflow: "hidden",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          margin: 0,
          padding: "10px 16px",
          backgroundImage:
            mode === "light"
              ? `linear-gradient(180deg, #2a6ad9 0%, #0f3fa6 90%)`
              : `linear-gradient(180deg, #13325f 0%, #081a36 90%)`,
          color: "#ffffff",
          fontFamily: xpTitleFont,
          fontWeight: 700,
          fontSize: "1rem",
          textShadow: `0 1px 0 ${alpha("#000", 0.4)}`,
          display: "flex",
          alignItems: "center",
          borderBottom: `1px solid ${alpha("#000", 0.45)}`,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          backgroundColor: mode === "light" ? "#f3f6ff" : "#1a2133",
          borderBottom: `1px solid ${alpha("#000", mode === "light" ? 0.18 : 0.45)}`,
          fontFamily: xpBodyFont,
          fontSize: "0.9rem",
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          backgroundColor: mode === "light" ? "#edf2ff" : "#161d2a",
          padding: "12px 16px",
          gap: 8,
          borderTop: `1px solid ${alpha("#000", mode === "light" ? 0.15 : 0.5)}`,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
        indicator: {
          height: 3,
          backgroundColor: theme.palette.primary.main,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          minHeight: 48,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 4,
          border: `1px solid ${alpha("#000", 0.25)}`,
          backgroundColor: mode === "light" ? "#ffffe1" : "#1d1b18",
          color: mode === "light" ? "#000" : "#fff",
          boxShadow: `0 4px 10px ${alpha("#000", 0.35)}`,
          fontFamily: xpBodyFont,
          fontSize: "0.78rem",
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          backgroundImage: snackbarGradient,
          color: mode === "light" ? "#ffffff" : "#e7f0ff",
          borderRadius: 4,
          border: `1px solid ${
            mode === "light" ? "rgba(7, 32, 96, 0.65)" : "rgba(8, 22, 50, 0.85)"
          }`,
          boxShadow: `0 6px 18px ${alpha("#000", 0.4)}`,
          fontFamily: xpBodyFont,
          fontSize: "0.9rem",
          textShadow:
            mode === "light"
              ? `0 1px 0 ${alpha("#000", 0.45)}`
              : `0 1px 0 ${alpha("#000", 0.8)}`,
          paddingInline: 16,
          alignItems: "center",
        },
        action: {
          color: mode === "light" ? "#ffffff" : "#eaf2ff",
          "& .MuiButton-root": {
            color: mode === "light" ? "#ffffff" : "#eaf2ff",
            fontWeight: 700,
          },
        },
        message: {
          color: mode === "light" ? "#ffffff" : "#eaf2ff",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          border: `1px solid ${alpha("#000", mode === "light" ? 0.15 : 0.4)}`,
          fontFamily: xpBodyFont,
          fontSize: "0.9rem",
          color: mode === "light" ? "#0b1f55" : "#f0f4ff",
          backgroundColor: mode === "light" ? "#f3f6ff" : "#1f2739",
        },
        icon: {
          color: mode === "light" ? "#0f3fa6" : "#89b1ff",
        },
        action: {
          color: mode === "light" ? "#0f3fa6" : "#89b1ff",
        },
      },
    },
  };

  return theme;
};

const buildXpTheme = (mode: PaletteMode) => {
  const palette = createXpPalette(mode);
  const typography = {
    fontFamily: xpBodyFont,
    fontSize: 13,
    h1: {
      fontFamily: xpTitleFont,
      fontWeight: 700,
      letterSpacing: 0,
      fontSize: "1.9rem",
    },
    h2: {
      fontFamily: xpTitleFont,
      fontWeight: 700,
      letterSpacing: 0,
      fontSize: "1.4rem",
    },
    h3: {
      fontFamily: xpTitleFont,
      fontWeight: 600,
      letterSpacing: 0,
      fontSize: "1.15rem",
    },
    h4: {
      fontFamily: xpTitleFont,
      fontWeight: 600,
      fontSize: "1.05rem",
    },
    h5: {
      fontFamily: xpTitleFont,
      fontWeight: 600,
      fontSize: "0.95rem",
    },
    h6: {
      fontFamily: xpBodyFont,
      fontWeight: 600,
      fontSize: "0.92rem",
    },
    body1: {
      fontFamily: xpBodyFont,
      fontSize: "0.9rem",
      lineHeight: 1.4,
    },
    body2: {
      fontFamily: xpBodyFont,
      fontSize: "0.85rem",
      lineHeight: 1.35,
    },
    subtitle1: {
      fontFamily: xpTitleFont,
      fontWeight: 600,
      fontSize: "1rem",
    },
    subtitle2: {
      fontFamily: xpBodyFont,
      fontWeight: 600,
      fontSize: "0.85rem",
    },
    button: {
      fontFamily: xpBodyFont,
      fontWeight: 700,
      fontSize: "0.82rem",
      textTransform: "none" as const,
    },
    caption: {
      fontFamily: xpBodyFont,
      fontSize: "0.75rem",
    },
    overline: {
      fontFamily: xpBodyFont,
      fontSize: "0.7rem",
      textTransform: "none" as const,
    },
  };

  let theme = createTheme({
    palette,
    shape: {
      borderRadius: 0,
    },
    spacing: 8,
    typography,
  });

  theme.farmhandThemeId = "WindowsXPTheme";
  theme.customShadows = {
    card: mode === "light" ? `0 6px 12px ${alpha("#000", 0.15)}` : `0 6px 12px ${alpha("#000", 0.4)}`,
    focus: `0 0 0 2px ${alpha(XP_PRIMARY_MAIN, 0.4)}`,
    popover: mode === "light" ? `0 12px 24px ${alpha("#000", 0.2)}` : `0 12px 24px ${alpha("#000", 0.5)}`,
    glow: `0 0 18px ${alpha(XP_PRIMARY_LIGHT, 0.4)}`,
  };

  return applyXpComponents(theme);
};

export const WindowsXPTheme: FarmHandThemeDefinition = {
  id: "WindowsXPTheme",
  meta: {
    displayName: "Frutiger",
    flavorText: '"Your changes have been saved, probably...',
  },
  light: buildXpTheme("light"),
  dark: buildXpTheme("dark"),
};

