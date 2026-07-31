import { vi } from "vitest";

/**
 * Controls what `useMediaQuery` sees.
 *
 * jsdom has no layout, so every MUI breakpoint query resolves through `matchMedia`
 * and nothing else. Components that render two different trees by breakpoint —
 * ScoutStepper, QrFab, BatchQrDialog, CompleteScoutDialog — are only half-tested
 * unless both paths are driven deliberately.
 */

/** Widths that resolve inside MUI's default breakpoints. */
const WIDTHS = { xs: 400, sm: 700, md: 1000, lg: 1400 } as const;

export type Breakpoint = keyof typeof WIDTHS;

/**
 * Makes `matchMedia` answer as though the viewport were `size` wide.
 *
 * Parses the `min-width`/`max-width` bounds out of the query MUI generates rather
 * than string-matching it, so it keeps working if MUI changes its breakpoint values.
 */
export function setViewport(size: Breakpoint | number): void {
  const width = typeof size === "number" ? size : WIDTHS[size];

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => {
      const min = query.match(/min-width:\s*([\d.]+)px/);
      const max = query.match(/max-width:\s*([\d.]+)px/);

      let matches = true;
      if (min) matches &&= width >= parseFloat(min[1]);
      if (max) matches &&= width <= parseFloat(max[1]);
      // A query with neither bound (prefers-color-scheme, print) is not a width
      // question; report no match rather than guessing.
      if (!min && !max) matches = false;

      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    },
  });
}
