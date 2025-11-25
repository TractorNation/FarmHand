import {
  alpha,
  createTheme,
  darken,
  getContrastRatio,
  lighten,
  Theme,
  ThemeOptions,
} from "@mui/material/styles";
import type {
  PaletteMode,
  PaletteOptions,
  TypographyStyle,
} from "@mui/material/styles";

const WHITE = "#FFFFFF";
const BLACK = "#05060A";
const FALLBACK_FONT = `"Inter", "Roboto", "Helvetica Neue", sans-serif`;

type HeadingVariant = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type RGB = { r: number; g: number; b: number };

export interface FontAsset {
  fontFamily: string;
  fontStyle?: string;
  fontDisplay?: string;
  src: string;
}

type BrandColorInput =
  | string
  | {
      main: string;
      light?: string;
      dark?: string;
      contrastText?: string;
    };

export interface FarmHandThemeConfig {
  id: string;
  displayName: string;
  flavorText?: string;
  brand: {
    primary: BrandColorInput;
    secondary: BrandColorInput;
    info?: BrandColorInput;
    success?: BrandColorInput;
    warning?: BrandColorInput;
    error?: BrandColorInput;
  };
  neutrals?: {
    surface?: string;
    surfaceDark?: string;
    border?: string;
    borderDark?: string;
  };
  fonts?: FontAsset[];
  typography?: {
    display?: string;
    headline?: string;
    body?: string;
    ui?: string;
    headings?: {
      display?: HeadingVariant[];
      headline?: HeadingVariant[];
    };
  };
}

export interface FarmHandThemeDefinition {
  id: string;
  meta: {
    displayName: string;
    flavorText?: string;
  };
  light: Theme;
  dark: Theme;
}

const clampChannel = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));

const normalizeHex = (color: string): string => {
  if (!color) return WHITE;
  if (!color.startsWith("#")) {
    return color;
  }

  if (color.length === 4) {
    return (
      "#" +
      color
        .slice(1)
        .split("")
        .map((char) => char + char)
        .join("")
    ).toUpperCase();
  }

  if (color.length === 7) {
    return color.toUpperCase();
  }

  return WHITE;
};

const hexToRgb = (hex: string): RGB => {
  const normalized = normalizeHex(hex).replace("#", "");
  const numericValue = parseInt(normalized, 16);

  if (Number.isNaN(numericValue)) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: (numericValue >> 16) & 255,
    g: (numericValue >> 8) & 255,
    b: numericValue & 255,
  };
};

const rgbToHex = ({ r, g, b }: RGB): string =>
  `#${[clampChannel(r), clampChannel(g), clampChannel(b)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

const mixHex = (color: string, other: string, weight = 0.5): string => {
  const normalizedWeight = Math.max(0, Math.min(1, weight));
  const first = hexToRgb(color);
  const second = hexToRgb(other);

  return rgbToHex({
    r: first.r * (1 - normalizedWeight) + second.r * normalizedWeight,
    g: first.g * (1 - normalizedWeight) + second.g * normalizedWeight,
    b: first.b * (1 - normalizedWeight) + second.b * normalizedWeight,
  });
};

const ensureContrast = (background: string, preferred?: string): string => {
  const fallback =
    getContrastRatio(background, BLACK) >= getContrastRatio(background, WHITE)
      ? BLACK
      : WHITE;

  if (!preferred) return fallback;

  return getContrastRatio(background, preferred) >= 4.5
    ? preferred
    : fallback;
};

const normalizeColorInput = (input: BrandColorInput) =>
  typeof input === "string" ? { main: input } : input;

const createColorScale = (
  colorInput: BrandColorInput,
  mode: PaletteMode,
  surfaceBase: string
) => {
  const base = normalizeColorInput(colorInput);
  const main = normalizeHex(base.main);
  const lightTone =
    base.light ?? lighten(main, mode === "light" ? 0.18 : 0.08);
  const darkTone =
    base.dark ?? darken(main, mode === "light" ? 0.22 : 0.3);
  const containerMix = mode === "light" ? 0.82 : 0.35;
  const container = mixHex(main, surfaceBase, containerMix);

  return {
    main,
    light: normalizeHex(lightTone),
    dark: normalizeHex(darkTone),
    contrastText: ensureContrast(main, base.contrastText),
    container,
    onContainer: ensureContrast(container, base.contrastText),
  };
};

const buildTypography = (
  config?: FarmHandThemeConfig["typography"]
): ThemeOptions["typography"] => {
  const display = config?.display ?? `"Space Grotesk", ${FALLBACK_FONT}`;
  const headline = config?.headline ?? display;
  const body = config?.body ?? FALLBACK_FONT;
  const ui = config?.ui ?? headline;
  const defaultHeadingMap: Record<"display" | "headline", HeadingVariant[]> = {
    display: ["h1", "h2", "h3"],
    headline: ["h4", "h5", "h6"],
  };

  const headingPreferences = {
    display: config?.headings?.display ?? defaultHeadingMap.display,
    headline: config?.headings?.headline ?? defaultHeadingMap.headline,
  };

  const headingBase: Record<HeadingVariant, TypographyStyle> = {
    h1: {
      fontWeight: 600,
      fontSize: "3rem",
      lineHeight: 1.1,
      letterSpacing: "-0.03em",
    },
    h2: {
      fontWeight: 600,
      fontSize: "2.25rem",
      lineHeight: 1.15,
      letterSpacing: "-0.02em",
    },
    h3: {
      fontWeight: 600,
      fontSize: "1.875rem",
      lineHeight: 1.2,
    },
    h4: {
      fontWeight: 600,
      fontSize: "1.5rem",
      lineHeight: 1.25,
    },
    h5: {
      fontWeight: 600,
      fontSize: "1.25rem",
      lineHeight: 1.3,
    },
    h6: {
      fontWeight: 600,
      fontSize: "1.125rem",
      lineHeight: 1.35,
    },
  };

  const headingStyles = Object.keys(headingBase).reduce(
    (acc, variant) => ({
      ...acc,
      [variant]: { ...headingBase[variant as HeadingVariant] },
    }),
    {} as Record<HeadingVariant, TypographyStyle>
  );

  const assignFontFamily = (variants: HeadingVariant[], family: string) => {
    [...new Set(variants)].forEach((variant) => {
      headingStyles[variant] = {
        ...headingStyles[variant],
        fontFamily: family,
      };
    });
  };

  assignFontFamily(headingPreferences.display, display);
  assignFontFamily(headingPreferences.headline, headline);

  (Object.keys(headingStyles) as HeadingVariant[]).forEach((variant) => {
    headingStyles[variant].fontFamily ??= display;
  });

  return {
    fontFamily: body,
    ...headingStyles,
    subtitle1: {
      fontFamily: ui,
      fontWeight: 600,
      fontSize: "1rem",
      lineHeight: 1.4,
    },
    subtitle2: {
      fontFamily: ui,
      fontWeight: 500,
      fontSize: "0.9375rem",
      lineHeight: 1.35,
    },
    button: {
      fontFamily: ui,
      fontWeight: 600,
      letterSpacing: "0.02em",
      textTransform: "none",
    },
    body1: {
      fontFamily: body,
      fontWeight: 400,
      fontSize: "1rem",
      lineHeight: 1.55,
    },
    body2: {
      fontFamily: body,
      fontWeight: 400,
      fontSize: "0.9375rem",
      lineHeight: 1.5,
    },
    caption: {
      fontFamily: ui,
      fontWeight: 500,
      letterSpacing: "0.04em",
    },
    overline: {
      fontFamily: ui,
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
    },
  };
};

const buildFontFaceCss = (fonts?: FontAsset[]) =>
  fonts
    ?.map(
      (font) => `
    @font-face {
      font-family: ${JSON.stringify(font.fontFamily)};
      font-style: ${font.fontStyle ?? "normal"};
      font-display: ${font.fontDisplay ?? "swap"};
      src: ${font.src};
    }
  `
    )
    .join("\n") ?? "";

const applyComponentOverrides = (
  theme: Theme,
  fonts?: FontAsset[]
): Theme => {
  const fontFaceCss = buildFontFaceCss(fonts);

  theme.components = {
    ...theme.components,
    MuiCssBaseline: {
      styleOverrides: `
        ${fontFaceCss}

        :root {
          color-scheme: ${theme.palette.mode};
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          min-height: 100vh;
          background-color: ${theme.palette.surface.base};
          color: ${theme.palette.text.primary};
          font-family: ${theme.typography.body1?.fontFamily ?? FALLBACK_FONT};
          line-height: ${theme.typography.body1?.lineHeight};
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
      `,
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.surface.elevated,
          color: theme.palette.text.primary,
          border: "none",
          borderBottom: `1px solid ${theme.palette.surface.outline}`,
          boxShadow: "none",
          backdropFilter: "blur(12px)",
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          paddingInline: theme.spacing(2),
          minHeight: 64,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: theme.shape.borderRadius,
          textTransform: "none",
          fontWeight: 600,
          letterSpacing: "0.02em",
          paddingInline: theme.spacing(2.5),
          paddingBlock: theme.spacing(1.25),
          transition: theme.transitions.create(
            ["background-color", "box-shadow", "transform"],
            {
              duration: theme.transitions.duration.short,
            }
          ),
        },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: theme.customShadows.card,
            transform: "translateY(-1px)",
          },
        },
        outlined: {
          borderWidth: 1.5,
          borderColor: theme.palette.surface.outline,
          "&:hover": {
            borderColor: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
          },
        },
        text: {
          "&:hover": {
            backgroundColor: alpha(
              theme.palette.primary.main,
              theme.palette.mode === "light" ? 0.08 : 0.16
            ),
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: theme.shape.borderRadius,
          color: theme.palette.text.secondary,
          "&:hover": {
            backgroundColor: alpha(
              theme.palette.primary.main,
              theme.palette.mode === "light" ? 0.08 : 0.2
            ),
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: theme.shape.borderRadius,
          backgroundImage: "none",
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.surface.outline}`,
          backgroundColor: theme.palette.surface.elevated,
          boxShadow: "none",
          transition: theme.transitions.create(
            ["border-color", "box-shadow", "transform"],
            { duration: theme.transitions.duration.shorter }
          ),
          "&:hover": {
            borderColor: alpha(theme.palette.primary.main, 0.45),
            boxShadow: theme.customShadows.card,
            transform: "translateY(-2px)",
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: "none",
          borderRight: `1px solid ${theme.palette.surface.outline}`,
          backgroundColor: theme.palette.surface.base,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: theme.shape.borderRadius,
          paddingBlock: theme.spacing(1),
          paddingInline: theme.spacing(1.5),
          transition: theme.transitions.create(
            ["background-color", "color", "padding"],
            {
              duration: theme.transitions.duration.short,
            }
          ),
          "&.Mui-selected": {
            backgroundColor: theme.palette.primary.container,
            color: theme.palette.primary.onContainer,
            "& .MuiListItemIcon-root": {
              color: theme.palette.primary.onContainer,
            },
            "&:hover": {
              backgroundColor: alpha(
                theme.palette.primary.container ?? theme.palette.primary.main,
                theme.palette.mode === "light" ? 0.9 : 0.8
              ),
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: theme.shape.borderRadius,
          fontWeight: 600,
          letterSpacing: "0.05em",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: theme.palette.surface.outline,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: theme.shape.borderRadius,
          backgroundColor: theme.palette.surface.subtle,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.surface.outline,
            borderWidth: 1.5,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(theme.palette.primary.main, 0.8),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
            boxShadow: theme.customShadows.focus,
          },
        },
        input: {
          paddingBlock: theme.spacing(1.5),
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        fullWidth: true,
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.surface.outline}`,
          boxShadow: theme.customShadows.popover,
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.surface.outline}`,
          boxShadow: theme.customShadows.popover,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.surface.outline}`,
          boxShadow: theme.customShadows.popover,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        indicator: {
          height: 3,
          borderRadius: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          minHeight: 44,
          paddingInline: theme.spacing(2.5),
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: theme.shape.borderRadius,
          backgroundColor: alpha(theme.palette.common.black, 0.85),
          backdropFilter: "blur(6px)",
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          boxShadow: theme.customShadows.glow,
        },
      },
    },
  };

  return theme;
};

export const createFarmHandTheme = (
  config: FarmHandThemeConfig
): FarmHandThemeDefinition => {
  const buildPalette = (mode: PaletteMode): PaletteOptions => {
    const lightSurface = config.neutrals?.surface ?? "#F6F5F0";
    const darkSurface = config.neutrals?.surfaceDark ?? "#0B0D13";
    const surfaceBase = mode === "light" ? lightSurface : darkSurface;
    const borderLight = config.neutrals?.border ?? "#E0E3DA";
    const borderDark = config.neutrals?.borderDark ?? "#242832";
    const borderColor = mode === "light" ? borderLight : borderDark;
    const elevatedCandidate = lighten(surfaceBase, 0.08);
    const elevatedSurface =
      mode === "light"
        ? "#FFFFFF"
        : elevatedCandidate.startsWith("#")
        ? elevatedCandidate
        : mixHex(surfaceBase, WHITE, 0.12);
    const variantSurface =
      mode === "light"
        ? mixHex(surfaceBase, "#FFFFFF", 0.3)
        : mixHex(surfaceBase, "#000000", 0.2);
    const subtleSurface =
      mode === "light"
        ? mixHex(surfaceBase, elevatedSurface, 0.5)
        : mixHex(elevatedSurface, surfaceBase, 0.3);
    const outline = alpha(mode === "light" ? BLACK : WHITE, 0.14);

    const primary = createColorScale(config.brand.primary, mode, surfaceBase);
    const secondary = createColorScale(
      config.brand.secondary,
      mode,
      surfaceBase
    );
    const info = createColorScale(
      config.brand.info ?? "#2D7FF9",
      mode,
      surfaceBase
    );
    const success = createColorScale(
      config.brand.success ?? "#2E8B57",
      mode,
      surfaceBase
    );
    const warning = createColorScale(
      config.brand.warning ?? "#F59E0B",
      mode,
      surfaceBase
    );
    const error = createColorScale(
      config.brand.error ?? "#E63946",
      mode,
      surfaceBase
    );
    const textPrimary =
      mode === "light" ? "rgba(20, 24, 31, 0.92)" : "rgba(255,255,255,0.92)";
    const textSecondary =
      mode === "light" ? "rgba(20, 24, 31, 0.68)" : "rgba(255,255,255,0.7)";
    const textDisabled =
      mode === "light" ? "rgba(20, 24, 31, 0.38)" : "rgba(255,255,255,0.38)";

    return {
      mode,
      common: {
        black: BLACK,
        white: WHITE,
      },
      primary,
      secondary,
      info,
      success,
      warning,
      error,
      text: {
        primary: textPrimary,
        secondary: textSecondary,
        disabled: textDisabled,
      },
      divider: outline,
      background: {
        default: surfaceBase,
        paper: elevatedSurface,
      },
      surface: {
        base: surfaceBase,
        elevated: elevatedSurface,
        variant: variantSurface,
        subtle: subtleSurface,
        outline: borderColor,
      },
      action: {
        hover: alpha(primary.main, mode === "light" ? 0.08 : 0.2),
        selected: alpha(primary.main, mode === "light" ? 0.16 : 0.28),
        disabled: textDisabled,
        disabledBackground: alpha(textPrimary, mode === "light" ? 0.04 : 0.08),
        focus: alpha(primary.main, 0.3),
        active: alpha(primary.main, 0.4),
        hoverOpacity: mode === "light" ? 0.08 : 0.16,
        disabledOpacity: 0.4,
      },
    } as PaletteOptions;
  };

  const buildTheme = (mode: PaletteMode) => {
    const palette = buildPalette(mode);

    let theme = createTheme({
      palette,
      shape: {
        borderRadius: 4,
      },
      spacing: 8,
      typography: buildTypography(config.typography),
    });

    const customShadows = {
      card:
        mode === "light"
          ? `0 12px 30px ${alpha(BLACK, 0.08)}`
          : `0 14px 34px ${alpha(BLACK, 0.6)}`,
      focus: `0 0 0 3px ${alpha(
        theme.palette.primary.main,
        mode === "light" ? 0.32 : 0.5
      )}`,
      popover:
        mode === "light"
          ? `0 20px 45px ${alpha(BLACK, 0.12)}`
          : `0 22px 50px ${alpha(BLACK, 0.7)}`,
      glow: `0 0 35px ${alpha(
        theme.palette.primary.main,
        mode === "light" ? 0.35 : 0.55
      )}`,
    };

    theme.customShadows = customShadows;

    theme = applyComponentOverrides(theme, config.fonts);
    theme.farmhandThemeId = config.id;

    return theme;
  };

  return {
    id: config.id,
    meta: {
      displayName: config.displayName,
      flavorText: config.flavorText,
    },
    light: buildTheme("light"),
    dark: buildTheme("dark"),
  };
};

