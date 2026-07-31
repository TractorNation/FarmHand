import { describe, expect, it } from "vitest";
import {
  isAutoPathAnswered,
  isFieldInvalid,
  UNSET_OPTION,
} from "./fieldValidation";

/**
 * `isFieldInvalid` is the gate on whether a scout can leave a step or submit a match.
 * Every type has its own idea of "empty", and the two directions fail differently: too
 * strict blocks a scout mid-match with no way forward, too loose lets a required field
 * reach the QR code unanswered and the data is simply gone.
 *
 * The table below is the whole contract, one case per branch.
 */

describe("optional fields", () => {
  it("are never invalid, whatever the value", () => {
    const types = [
      "checkbox",
      "dropdown",
      "multiplechoice",
      "text",
      "number",
      "counter",
      "slider",
      "grid",
      "autopath",
      "timer",
    ];
    for (const type of types) {
      expect(isFieldInvalid(false, type, undefined)).toBe(false);
      expect(isFieldInvalid(false, type, null)).toBe(false);
      expect(isFieldInvalid(false, type, "")).toBe(false);
    }
  });
});

describe("required fields with no value at all", () => {
  it("are invalid for every type", () => {
    const types = ["checkbox", "dropdown", "text", "number", "grid", "autopath"];
    for (const type of types) {
      expect(isFieldInvalid(true, type, undefined)).toBe(true);
      expect(isFieldInvalid(true, type, null)).toBe(true);
    }
  });
});

describe("checkbox", () => {
  it("requires a tick — false is unanswered, not an answer", () => {
    expect(isFieldInvalid(true, "checkbox", false)).toBe(true);
    expect(isFieldInvalid(true, "checkbox", true)).toBe(false);
  });
});

describe("dropdown and multiple choice", () => {
  it("rejects the unset sentinel", () => {
    // The sentinel is a real stored value, so it would otherwise read as answered.
    expect(isFieldInvalid(true, "dropdown", UNSET_OPTION)).toBe(true);
    expect(isFieldInvalid(true, "multiplechoice", UNSET_OPTION)).toBe(true);
  });

  it("rejects an empty selection", () => {
    expect(isFieldInvalid(true, "dropdown", "")).toBe(true);
  });

  it("accepts a real choice", () => {
    expect(isFieldInvalid(true, "dropdown", "Left")).toBe(false);
    expect(isFieldInvalid(true, "multiplechoice", "Left")).toBe(false);
  });
});

describe("text", () => {
  it("treats whitespace-only as unanswered", () => {
    expect(isFieldInvalid(true, "text", "   ")).toBe(true);
    expect(isFieldInvalid(true, "text", "\n\t")).toBe(true);
  });

  it("accepts any non-blank content", () => {
    expect(isFieldInvalid(true, "text", "broke down")).toBe(false);
    expect(isFieldInvalid(true, "text", "0")).toBe(false);
  });
});

describe("numeric types", () => {
  it("treats an empty input as unanswered but zero as a real answer", () => {
    // The distinction the whole null-vs-zero design rests on: a scout who recorded
    // zero scored is not the same as a scout who never touched the field.
    for (const type of ["number", "counter", "slider"]) {
      expect(isFieldInvalid(true, type, "")).toBe(true);
      expect(isFieldInvalid(true, type, 0)).toBe(false);
    }
  });

  it("accepts a range slider's array value", () => {
    expect(isFieldInvalid(true, "slider", [0, 25])).toBe(false);
  });
});

describe("grid", () => {
  it("requires at least one checked cell", () => {
    expect(isFieldInvalid(true, "grid", "3x3:[]")).toBe(true);
    expect(isFieldInvalid(true, "grid", "3x3:[4]")).toBe(false);
  });

  it("accepts the legacy colon-less shape", () => {
    expect(isFieldInvalid(true, "grid", "3x3[4]")).toBe(false);
  });

  it("treats a non-grid value as unanswered rather than throwing", () => {
    // The value may not even be a string if a schema type was changed under it.
    expect(isFieldInvalid(true, "grid", "garbage")).toBe(true);
    expect(isFieldInvalid(true, "grid", 42)).toBe(true);
    expect(isFieldInvalid(true, "grid", "3x3:[   ]")).toBe(true);
  });
});

describe("autopath", () => {
  it("accepts a drawn path", () => {
    expect(
      isFieldInvalid(true, "autopath", { noAuto: false, points: [1], events: [] })
    ).toBe(false);
  });

  it("accepts an explicit no-autonomous assertion", () => {
    // "The robot did nothing" is an answer; it must not read as an empty field.
    expect(
      isFieldInvalid(true, "autopath", { noAuto: true, points: [], events: [] })
    ).toBe(false);
  });

  it("rejects an untouched field", () => {
    expect(
      isFieldInvalid(true, "autopath", { noAuto: false, points: [], events: [] })
    ).toBe(true);
  });
});

describe("isAutoPathAnswered", () => {
  it("is true only for a drawn path or an explicit no-auto", () => {
    expect(isAutoPathAnswered({ noAuto: true, points: [] })).toBe(true);
    expect(isAutoPathAnswered({ noAuto: false, points: [{ x: 1, y: 1 }] })).toBe(
      true
    );
    expect(isAutoPathAnswered({ noAuto: false, points: [] })).toBe(false);
  });

  it("is false for anything that is not a path object", () => {
    expect(isAutoPathAnswered(undefined)).toBe(false);
    expect(isAutoPathAnswered(null)).toBe(false);
    expect(isAutoPathAnswered("no auto")).toBe(false);
    expect(isAutoPathAnswered({})).toBe(false);
    expect(isAutoPathAnswered({ noAuto: false, points: "nope" })).toBe(false);
  });
});

describe("unknown types", () => {
  it("fall back to an emptiness check rather than passing everything", () => {
    // A schema can name a type this build does not know about.
    expect(isFieldInvalid(true, "somethingNew", "")).toBe(true);
    expect(isFieldInvalid(true, "somethingNew", "value")).toBe(false);
  });
});
