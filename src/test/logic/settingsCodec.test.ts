import { describe, expect, it } from "vitest";
import { coerceSetting } from "../../utils/settingsCodec";
import { defaultSettings } from "../../context/SettingsContext";

/**
 * Settings persist as strings and are coerced back by the *type of their default* —
 * there is no schema. The boolean rule in particular is quiet: only the exact string
 * `"true"` is true, so a value that did not come from this app reads as false without
 * complaint.
 */

describe("boolean settings", () => {
  it("reads the string this app writes", () => {
    // setSetting stores String(value), so "true"/"false" are the real round-trip.
    expect(coerceSetting("true", false)).toBe(true);
    expect(coerceSetting("false", true)).toBe(false);
  });

  it("reads every other string as false", () => {
    // Asserted explicitly because it is surprising: a hand-edited store or a value
    // from an older build silently becomes false rather than erroring.
    for (const stored of ["TRUE", "True", "1", "yes", "on", ""]) {
      expect(coerceSetting(stored, false)).toBe(false);
      expect(coerceSetting(stored, true)).toBe(false);
    }
  });
});

describe("number settings", () => {
  it("parses an integer", () => {
    expect(coerceSetting("6", 1)).toBe(6);
    expect(coerceSetting("0", 1)).toBe(0);
  });

  it("falls back to the default rather than yielding NaN", () => {
    // NaN in DEVICE_ID or EXPECTED_DEVICES_COUNT would propagate into the dashboard's
    // completeness maths and into every generated code's filename.
    expect(coerceSetting("not a number", 1)).toBe(1);
    expect(coerceSetting("", 6)).toBe(6);
  });

  it("truncates a decimal, as parseInt does", () => {
    expect(coerceSetting("3.9", 1)).toBe(3);
  });

  it("reads a leading-number string as that number", () => {
    // parseInt semantics, pinned so a future switch to Number() is a deliberate call.
    expect(coerceSetting("12abc", 1)).toBe(12);
  });
});

describe("string settings", () => {
  it("passes the stored value through untouched", () => {
    expect(coerceSetting("2026 Rebuilt", "2025 Reefscape")).toBe("2026 Rebuilt");
  });

  it("preserves an empty string as a real value", () => {
    // An empty TBA key is a legitimate setting, not an absent one.
    expect(coerceSetting("", "fallback")).toBe("");
  });
});

describe("absent values", () => {
  it("yields the default", () => {
    expect(coerceSetting(null, 6)).toBe(6);
    expect(coerceSetting(undefined, "system")).toBe("system");
    expect(coerceSetting(null, true)).toBe(true);
  });

  it("distinguishes absent from empty for booleans", () => {
    // Absent → default (may be true); empty string → false. Easy to conflate.
    expect(coerceSetting(null, true)).toBe(true);
    expect(coerceSetting("", true)).toBe(false);
  });
});

describe("every real setting round-trips", () => {
  it("returns each default unchanged through String() and back", () => {
    // The property the whole scheme rests on: whatever setSetting writes must read
    // back as the same value, for every key that actually exists.
    for (const [key, value] of Object.entries(defaultSettings)) {
      expect(coerceSetting(String(value), value), key).toEqual(value);
    }
  });
});
