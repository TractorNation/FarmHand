import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface CustomShadows {
    card: string;
    focus: string;
    popover: string;
    glow: string;
  }

  interface Theme {
    farmhandThemeId?: string;
    customShadows: CustomShadows;
  }

  interface ThemeOptions {
    farmhandThemeId?: string;
    customShadows?: Partial<CustomShadows>;
  }

  interface Palette {
    surface: {
      base: string;
      elevated: string;
      variant: string;
      subtle: string;
      outline: string;
    };
  }

  interface PaletteOptions {
    surface?: Partial<Palette["surface"]>;
  }

  interface PaletteColor {
    container?: string;
    onContainer?: string;
  }

  interface SimplePaletteColorOptions {
    container?: string;
    onContainer?: string;
  }
}

