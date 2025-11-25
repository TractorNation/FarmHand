import {
  alpha,
  createTheme,
  type PaletteMode,
  type PaletteOptions,
  type Theme,
} from "@mui/material/styles";
import type { FarmHandThemeDefinition, FontAsset } from "./createFarmHandTheme";
import { baskervville, iceland, anton } from "../../utils/Fonts";
import parchmentTextureSource from "../../assets/textures/parchment.svg?raw";
import stoneTextureSource from "../../assets/textures/stone.svg?raw";
import metalTextureSource from "../../assets/textures/metal.svg?raw";

const runeFonts: FontAsset[] = [iceland, baskervville, anton];

const googleFontImport = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;600;700&family=Cormorant+Garamond:wght@400;500;600&family=MedievalSharp&family=Uncial+Antiqua&display=swap');
`;

const buildFontFaceCss = (fonts: FontAsset[]) =>
  fonts
    .map(
      (font) => `
    @font-face {
      font-family: ${JSON.stringify(font.fontFamily)};
      font-style: ${font.fontStyle ?? "normal"};
      font-display: ${font.fontDisplay ?? "swap"};
      src: ${font.src};
    }
  `
    )
    .join("\n");

const inlineSvg = (svg: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

const parchmentTextureUrl = inlineSvg(parchmentTextureSource);
const stoneTextureUrl = inlineSvg(stoneTextureSource);
const metalTextureUrl = inlineSvg(metalTextureSource);

const runeNoiseTexture = inlineSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
    <rect width="96" height="96" fill="none"/>
    <g fill="#ffffff" opacity="0.08">
      <circle cx="6" cy="10" r="0.9"/>
      <circle cx="22" cy="28" r="0.7"/>
      <circle cx="40" cy="6" r="0.8"/>
      <circle cx="58" cy="22" r="0.65"/>
      <circle cx="74" cy="12" r="0.85"/>
      <circle cx="88" cy="34" r="0.6"/>
      <circle cx="14" cy="54" r="0.8"/>
      <circle cx="34" cy="46" r="0.7"/>
      <circle cx="50" cy="62" r="0.65"/>
      <circle cx="72" cy="50" r="0.9"/>
      <circle cx="90" cy="70" r="0.75"/>
      <circle cx="18" cy="82" r="0.65"/>
      <circle cx="38" cy="90" r="0.8"/>
      <circle cx="60" cy="82" r="0.7"/>
      <circle cx="80" cy="92" r="0.6"/>
    </g>
  </svg>
`);

const runeGlyphTexture = inlineSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
    <rect width="120" height="120" fill="none"/>
    <g stroke="#c9a452" stroke-width="0.8" stroke-linecap="round" opacity="0.18">
      <path d="M6 30 L20 18 L30 30" fill="none"/>
      <path d="M50 14 L60 4 L70 14" fill="none"/>
      <path d="M92 36 L104 24 L112 36" fill="none"/>
      <path d="M24 70 L32 58 L40 70" fill="none"/>
      <path d="M70 82 L80 68 L92 82" fill="none"/>
      <path d="M14 100 L24 88 L34 100" fill="none"/>
    </g>
    <g stroke="#e8d6a5" stroke-width="0.6" opacity="0.14">
      <circle cx="26" cy="16" r="5" fill="none"/>
      <circle cx="78" cy="26" r="4" fill="none"/>
      <circle cx="46" cy="74" r="5" fill="none"/>
      <circle cx="96" cy="88" r="4" fill="none"/>
    </g>
  </svg>
`);

const parchmentBackground = {
  image: [
    "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.45), rgba(255,255,255,0) 55%)",
    "linear-gradient(135deg, rgba(214,165,79,0.18), rgba(129,94,40,0.08))",
    parchmentTextureUrl,
    runeNoiseTexture,
  ].join(", "),
  size: ["140% 140%", "100% 100%", "420px 420px", "200px 200px"].join(", "),
};

const stoneBackground = {
  image: [
    "radial-gradient(circle at 80% 0%, rgba(255,209,115,0.15), rgba(0,0,0,0) 50%)",
    "linear-gradient(120deg, rgba(0,0,0,0.65), rgba(34,26,18,0.85))",
    stoneTextureUrl,
    runeNoiseTexture,
  ].join(", "),
  size: ["160% 160%", "100% 100%", "360px 360px", "220px 220px"].join(", "),
};

const metalTexture = metalTextureUrl;

const createRunePalette = (mode: PaletteMode): PaletteOptions => {
  const surface =
    mode === "light"
      ? {
          base: "#f3e0bb",
          elevated: "#fff9e2",
          variant: "#ead2a7",
          subtle: "#fdf4dc",
          outline: "rgba(117, 87, 37, 0.45)",
        }
      : {
          base: "#0c1118",
          elevated: "#1a1f28",
          variant: "#171c23",
          subtle: "#212835",
          outline: "rgba(255, 214, 135, 0.3)",
        };

  const text =
    mode === "light"
      ? {
          primary: "rgba(30, 18, 8, 0.95)",
          secondary: "rgba(86, 62, 32, 0.82)",
          disabled: "rgba(86, 62, 32, 0.5)",
        }
      : {
          primary: "rgba(249, 238, 212, 0.95)",
          secondary: "rgba(249, 238, 212, 0.75)",
          disabled: "rgba(249, 238, 212, 0.45)",
        };

  const primary = {
    main: "#c69b3f",
    light: "#f2d38c",
    dark: "#7f5512",
    contrastText: "#1d1206",
  };

  const secondary = {
    main: "#477a6a",
    light: "#80b3a3",
    dark: "#1f4a3c",
    contrastText: "#f7fdf9",
  };

  return {
    mode,
    primary,
    secondary,
    info: {
      main: "#4c6fbf",
      light: "#7c94d9",
      dark: "#2b3f73",
      contrastText: "#f5f8ff",
    },
    success: {
      main: "#6b9c3c",
      light: "#97c86a",
      dark: "#3c5c22",
      contrastText: "#f3ffec",
    },
    warning: {
      main: "#d4891a",
      light: "#f8c76a",
      dark: "#8c5703",
      contrastText: "#2a1602",
    },
    error: {
      main: "#c44747",
      light: "#e07d7d",
      dark: "#711f1f",
      contrastText: "#fff6f6",
    },
    text,
    background: {
      default: surface.base,
      paper: surface.elevated,
    },
    divider: surface.outline,
    surface,
    common: {
      black: "#050303",
      white: "#fffdf3",
    },
    action: {
      hover: alpha(primary.main, mode === "light" ? 0.12 : 0.2),
      selected: alpha(primary.main, mode === "light" ? 0.22 : 0.32),
      disabled: text.disabled,
      disabledBackground: alpha(text.primary, mode === "light" ? 0.08 : 0.12),
      focus: alpha(primary.main, 0.5),
      active: alpha(primary.main, 0.5),
      hoverOpacity: mode === "light" ? 0.1 : 0.14,
      disabledOpacity: 0.45,
    },
  };
};

const applyRuneComponents = (theme: Theme, fontFaceCss: string): Theme => {
  const mode = theme.palette.mode;
  const background = mode === "light" ? parchmentBackground : stoneBackground;
  const panelOutline =
    mode === "light"
      ? alpha("#6c4b1b", 0.5)
      : alpha(theme.palette.common.white, 0.2);
  const highlightEdge =
    mode === "light"
      ? alpha("#fbe5ad", 0.9)
      : alpha("#c9a348", 0.75);
  const frameBorder = `1.5px solid ${panelOutline}`;
  const glyphLayer = `${runeGlyphTexture}, ${runeNoiseTexture}`;
  const cardBackground =
    mode === "light"
      ? `linear-gradient(120deg, rgba(255,255,255,0.85), rgba(242,210,150,0.9)), ${parchmentTextureUrl}`
      : `linear-gradient(120deg, rgba(34,30,24,0.95), rgba(12,10,9,0.92)), ${stoneTextureUrl}`;

  theme.components = {
    ...theme.components,
    MuiCssBaseline: {
      styleOverrides: `
        ${fontFaceCss}

        :root {
          color-scheme: ${mode};
          background-color: ${theme.palette.surface.base};
        }

        *, *::before, *::after {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          min-height: 100vh;
          background-color: ${theme.palette.surface.base};
          background-image: ${background.image};
          background-size: ${background.size};
          background-attachment: scroll;
          color: ${theme.palette.text.primary};
          font-family: ${theme.typography.body1?.fontFamily ?? '"Baskervville", serif'};
          line-height: 1.55;
          letter-spacing: 0.02em;
        }

        #root {
          min-height: 100vh;
        }

        ::selection {
          background-color: ${alpha(theme.palette.primary.light, 0.5)};
          color: ${theme.palette.primary.contrastText};
        }
      `,
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: `linear-gradient(120deg, rgba(255, 220, 141, 0.95), rgba(124, 86, 33, 0.92)), ${metalTexture}`,
          backgroundSize: "cover, 320px",
          color: theme.palette.text.primary,
          borderBottom: `3px solid ${highlightEdge}`,
          boxShadow: `0 16px 30px ${alpha("#000000", 0.55)}`,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 72,
          paddingInline: theme.spacing(3),
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: mode === "light" ? parchmentBackground.image : stoneBackground.image,
          backgroundSize: mode === "light" ? parchmentBackground.size : stoneBackground.size,
          borderRight: `2px solid ${panelOutline}`,
          boxShadow: `inset 0 0 40px ${alpha("#000", 0.35)}`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: cardBackground,
          backgroundSize: "cover",
          border: frameBorder,
          boxShadow: `0 20px 45px ${alpha("#000", mode === "light" ? 0.2 : 0.6)}`,
          borderRadius: 12,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: frameBorder,
          borderRadius: 14,
          backgroundImage: `${cardBackground}, ${glyphLayer}`,
          backgroundSize: "cover, 320px",
          boxShadow: `inset 0 0 25px ${alpha("#000", 0.4)}, 0 24px 60px ${alpha("#000", 0.55)}`,
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            border: `1px solid ${alpha("#ffffff", 0.08)}`,
            pointerEvents: "none",
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: theme.spacing(3),
          paddingBlock: theme.spacing(1.25),
          border: `1.5px solid ${highlightEdge}`,
          textTransform: "uppercase",
          fontWeight: 700,
          letterSpacing: "0.12em",
          backgroundImage: `linear-gradient(180deg, rgba(255,246,216,0.35), rgba(198,155,63,0.9)), ${metalTexture}`,
          backgroundSize: "cover, 260px",
          color: "#1c1206",
          boxShadow: `inset 0 1px 0 ${alpha("#ffffff", 0.8)}, 0 8px 20px ${alpha("#000", 0.55)}`,
          transition: theme.transitions.create(
            ["transform", "box-shadow"],
            { duration: theme.transitions.duration.short }
          ),
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: `0 16px 30px ${alpha("#000", 0.55)}`,
          },
          "&:active": {
            transform: "translateY(0)",
            boxShadow: `inset 0 2px 6px ${alpha("#000", 0.6)}`,
          },
        },
        outlined: {
          backgroundColor: alpha(theme.palette.surface.subtle, 0.6),
          color: theme.palette.text.primary,
        },
        text: {
          backgroundImage: "none",
          border: "none",
          color: theme.palette.primary.light,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: `1px solid ${panelOutline}`,
          backgroundColor: alpha(theme.palette.surface.variant, 0.35),
          color: theme.palette.primary.light,
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
            boxShadow: `0 0 12px ${alpha(theme.palette.primary.light, 0.6)}`,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${panelOutline}`,
          backgroundColor: alpha(theme.palette.surface.subtle, 0.65),
          transition: theme.transitions.create(
            ["background-color", "box-shadow", "transform"],
            { duration: theme.transitions.duration.shorter }
          ),
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.18),
            boxShadow: `inset 0 0 14px ${alpha(theme.palette.primary.dark, 0.35)}`,
          },
          "&.Mui-selected": {
            backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.55)}, ${alpha(theme.palette.primary.dark, 0.7)}), ${metalTexture}`,
            backgroundSize: "cover, 240px",
            color: theme.palette.common.black,
            boxShadow: `0 8px 18px ${alpha("#000", 0.5)}`,
            "& .MuiListItemIcon-root": {
              color: theme.palette.common.black,
            },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: theme.palette.primary.light,
          filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.45))",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: panelOutline,
          borderWidth: 1.5,
          borderStyle: "solid",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${highlightEdge}`,
          backgroundImage: `linear-gradient(120deg, rgba(255,255,255,0.35), rgba(179,136,59,0.7)), ${metalTexture}`,
          backgroundSize: "cover, 200px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#1d1206",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: alpha(theme.palette.surface.subtle, 0.85),
          border: `1.5px solid ${panelOutline}`,
          "& .MuiOutlinedInput-notchedOutline": {
            border: "none",
          },
          "&:hover": {
            borderColor: highlightEdge,
            boxShadow: `0 0 12px ${alpha(highlightEdge, 0.45)}`,
          },
          "&.Mui-focused": {
            borderColor: highlightEdge,
            boxShadow: `0 0 18px ${alpha(highlightEdge, 0.55)}`,
          },
        },
        input: {
          paddingBlock: theme.spacing(1.6),
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          border: frameBorder,
          backgroundImage: cardBackground,
          boxShadow: `0 24px 45px ${alpha("#000", 0.55)}`,
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          border: frameBorder,
          backgroundImage: cardBackground,
          boxShadow: `0 32px 60px ${alpha("#000", 0.6)}`,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          border: frameBorder,
          backgroundImage: `${cardBackground}, ${glyphLayer}`,
          boxShadow: `0 40px 80px ${alpha("#000", 0.75)}`,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          border: `1px solid ${highlightEdge}`,
          backgroundImage: `linear-gradient(135deg, rgba(12,11,10,0.95), rgba(36,31,24,0.95)), ${glyphLayer}`,
          color: theme.palette.common.white,
          boxShadow: `0 8px 16px ${alpha("#000", 0.7)}`,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          border: `1px solid ${highlightEdge}`,
          backgroundImage: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), rgba(198,155,63,0.85)), ${metalTexture}`,
          color: "#1c1206",
          boxShadow: `0 20px 50px ${alpha("#000", 0.65)}`,
          "&:hover": {
            boxShadow: `0 30px 60px ${alpha("#000", 0.7)}`,
            transform: "translateY(-2px)",
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 54,
        },
        indicator: {
          height: 4,
          borderRadius: 4,
          backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.primary.dark})`,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "uppercase",
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: alpha(theme.palette.text.secondary, 0.9),
          "&.Mui-selected": {
            color: theme.palette.primary.light,
          },
        },
      },
    },
  };

  return theme;
};

const createRuneTheme = (mode: PaletteMode) => {
  const palette = createRunePalette(mode);
  const displayFont =
    '"Cinzel Decorative", "Iceland", "Cinzel", "Trajan Pro", serif';
  const headingFont = '"Uncial Antiqua", "Iceland", "Cinzel", serif';
  const bodyFont =
    '"Cormorant Garamond", "Baskervville", "Iowan Old Style", serif';
  const uiFont = '"MedievalSharp", "Antonio", sans-serif';
  const typography = {
    fontFamily: bodyFont,
    h1: {
      fontFamily: displayFont,
      fontSize: "3.4rem",
      letterSpacing: "0.1em",
      fontWeight: 600,
    },
    h2: {
      fontFamily: displayFont,
      fontSize: "2.6rem",
      letterSpacing: "0.08em",
      fontWeight: 600,
    },
    h3: {
      fontFamily: headingFont,
      fontSize: "2rem",
      letterSpacing: "0.08em",
      fontWeight: 600,
    },
    h4: {
      fontFamily: headingFont,
      fontSize: "1.6rem",
      letterSpacing: "0.06em",
      fontWeight: 600,
    },
    h5: {
      fontFamily: headingFont,
      fontSize: "1.3rem",
      letterSpacing: "0.06em",
      fontWeight: 600,
    },
    h6: {
      fontFamily: headingFont,
      fontSize: "1.1rem",
      letterSpacing: "0.05em",
      fontWeight: 600,
    },
    subtitle1: {
      fontFamily: uiFont,
      fontWeight: 600,
      letterSpacing: "0.08em",
    },
    subtitle2: {
      fontFamily: uiFont,
      fontWeight: 500,
      letterSpacing: "0.05em",
    },
    button: {
      fontFamily: uiFont,
      fontWeight: 700,
      letterSpacing: "0.12em",
    },
    body1: {
      fontFamily: bodyFont,
      fontSize: "1rem",
      lineHeight: 1.6,
    },
    body2: {
      fontFamily: bodyFont,
      fontSize: "0.94rem",
      lineHeight: 1.5,
    },
    caption: {
      fontFamily: uiFont,
      fontSize: "0.82rem",
      letterSpacing: "0.12em",
      textTransform: "uppercase" as const,
    },
    overline: {
      fontFamily: uiFont,
      fontSize: "0.78rem",
      letterSpacing: "0.18em",
      textTransform: "uppercase" as const,
    },
  };

  const baseTheme = createTheme({
    palette,
    spacing: 8,
    shape: {
      borderRadius: 2,
    },
    typography,
  });

  baseTheme.customShadows = {
    card:
      mode === "light"
        ? `0 22px 55px ${alpha("#000", 0.25)}`
        : `0 24px 65px ${alpha("#000", 0.75)}`,
    focus: `0 0 0 3px ${alpha("#c69b3f", mode === "light" ? 0.45 : 0.7)}`,
    popover:
      mode === "light"
        ? `0 35px 60px ${alpha("#000", 0.25)}`
        : `0 40px 70px ${alpha("#000", 0.75)}`,
    glow: `0 0 45px ${alpha("#c69b3f", mode === "light" ? 0.35 : 0.55)}`,
  };

  const fontFaceCss = `${googleFontImport}
${buildFontFaceCss(runeFonts)}`;

  baseTheme.farmhandThemeId = "RuneScapeTheme";
  return applyRuneComponents(baseTheme, fontFaceCss);
};

export const RuneScapeTheme: FarmHandThemeDefinition = {
  id: "RuneScapeTheme",
  meta: {
    displayName: "Dungeon Master",
    flavorText: "Blades dull, armor breaks, but the will to grind endures.",
  },
  light: createRuneTheme("light"),
  dark: createRuneTheme("dark"),
};

