import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { themeRegistry } from "../config/themes";

/**
 * Renders with the real app theme.
 *
 * MUI's default theme is not enough for anything that reads FarmHand's palette
 * extensions — `palette.surface.outline`, `customShadows`, `farmhandThemeId` — which
 * `InputCard`, `PageHeader` and the chart theme all do. Those components throw on
 * `undefined` rather than falling back, so a bare `render` fails with a confusing
 * property access error rather than a missing-provider message.
 *
 * TractorTheme is the app's default (`defaultSettings.COLOR_THEME`).
 */
export function renderWithTheme(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={themeRegistry.TractorTheme.light}>
        {children}
      </ThemeProvider>
    ),
    ...options,
  });
}
