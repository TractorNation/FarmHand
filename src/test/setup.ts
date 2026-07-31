import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * Environment shims for the `ui` test project.
 *
 * jsdom implements the DOM but not layout, media queries or animation, and MUI reaches
 * for all three on first render. Each stub below exists because a real component in
 * this app throws without it.
 */

afterEach(() => {
  cleanup();
});

// MUI's useMediaQuery calls this on every render; every responsive component in the
// app (ScoutStepper, QrFab, BatchQrDialog) depends on it. Defaults to "no match", so
// tests see the desktop layout unless they override it.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// Nivo charts and MUI's transition components observe their container.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// TimerInput drives its display from a rAF loop; PathInput uses one while drawing.
if (!global.requestAnimationFrame) {
  global.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 16) as unknown as number;
  global.cancelAnimationFrame = (id: number) => clearTimeout(id);
}

// Scout scrolls to the first invalid field when a step is blocked.
window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();
