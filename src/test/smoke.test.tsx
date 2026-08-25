import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * Guards the test infrastructure itself.
 *
 * The `ui` project's include glob is the only reason `.tsx` tests run — the config
 * previously matched `.ts` only, so a component test was skipped silently rather than
 * reported as missing. If this file stops running, everything below it is a false
 * green.
 */

describe("ui test environment", () => {
  it("collects .tsx test files", () => {
    expect(true).toBe(true);
  });

  it("provides a DOM", () => {
    expect(typeof document).toBe("object");
    expect(typeof window).toBe("object");
  });

  it("renders a React component and matches on jest-dom matchers", () => {
    render(<p>hello from jsdom</p>);
    expect(screen.getByText("hello from jsdom")).toBeInTheDocument();
  });

  it("stubs the browser APIs MUI needs", () => {
    expect(window.matchMedia("(min-width: 600px)").matches).toBe(false);
    expect(global.ResizeObserver).toBeDefined();
  });
});
