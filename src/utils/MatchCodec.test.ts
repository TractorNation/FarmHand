import { describe, expect, it } from "vitest";
import {
  decodeMatchBody,
  encodableFields,
  encodeMatchBody,
  measureMatchBits,
  orderedFields,
} from "./MatchCodec";
import { UNSET_OPTION } from "./fieldValidation";
import { AutoPathValue } from "./PathCodec";

/** A schema exercising every encodable field type. */
const SCHEMA: Schema = {
  name: "Codec Fixture",
  sections: [
    {
      title: "Match Info",
      fields: [
        { id: 0, name: "Match Number", type: "number", props: { min: 1, max: 120 } },
        { id: 1, name: "Alliance", type: "dropdown", props: { options: ["Red", "Blue"] } },
        { id: 2, name: "Position", type: "multiplechoice", props: { options: ["1", "2", "3"] } },
        { id: 3, name: "Spacer", type: "filler" },
      ],
    },
    {
      title: "Auto",
      fields: [
        { id: 1000, name: "Left Start", type: "checkbox" },
        { id: 1001, name: "Fuel Scored", type: "counter", props: { min: 0, max: 200 } },
        { id: 1002, name: "Unbounded", type: "number" },
        { id: 1003, name: "Cycle Time", type: "timer" },
        { id: 1004, name: "Reef", type: "grid", props: { rows: 3, cols: 4 } },
        {
          id: 1005,
          name: "Auto Path",
          type: "autopath",
          props: {
            pathActions: [
              { label: "Pickup", icon: "circle" },
              { label: "Score", icon: "target", results: ["Made", "Missed"] },
            ],
            gamePieces: [{ label: "Fuel", icon: "circle" }],
          },
        },
      ],
    },
    {
      title: "Post",
      fields: [
        { id: 2000, name: "Rating", type: "slider", props: { min: 1, max: 10 } },
        { id: 2001, name: "Range", type: "slider", props: { min: 0, max: 50, selectsRange: true } },
        { id: 2002, name: "Comments", type: "text", props: { multiline: true } },
      ],
    },
  ],
};

const PATH: AutoPathValue = {
  noAuto: false,
  points: [
    { x: 12, y: 64 },
    { x: 20, y: 61 },
    { x: 31, y: 55 },
  ],
  events: [
    { afterPoint: 1, action: 0, piece: 0, result: null },
    { afterPoint: 2, action: 1, piece: 0, result: 1 },
  ],
};

function values(overrides: Record<number, any> = {}): Map<number, any> {
  return new Map<number, any>(Object.entries(overrides).map(([k, v]) => [Number(k), v]));
}

function roundTrip(input: Map<number, any>) {
  const payload = encodeMatchBody(SCHEMA, input);
  const decoded = decodeMatchBody(SCHEMA, payload);
  expect(decoded.checksumOk).toBe(true);
  return decoded.values;
}

describe("field ordering", () => {
  it("walks sections then fields", () => {
    expect(orderedFields(SCHEMA).map((f) => f.id)).toEqual([
      0, 1, 2, 3, 1000, 1001, 1002, 1003, 1004, 1005, 2000, 2001, 2002,
    ]);
  });

  it("excludes fillers from the wire", () => {
    expect(encodableFields(SCHEMA).map((f) => f.id)).not.toContain(3);
  });
});

describe("encodeMatchBody / decodeMatchBody", () => {
  it("round-trips a fully populated match", () => {
    const input = values({
      0: 47,
      1: "Blue",
      2: "3",
      1000: true,
      1001: 137,
      1002: 4096,
      1003: "2:30.0",
      1004: "3x4:[0,5,11]",
      1005: PATH,
      2000: 7,
      2001: [10, 40],
      2002: "Solid cycles, dropped one at the end.",
    });

    const out = roundTrip(input);

    expect(out.get(0)).toBe(47);
    expect(out.get(1)).toBe("Blue");
    expect(out.get(2)).toBe("3");
    expect(out.get(1000)).toBe(true);
    expect(out.get(1001)).toBe(137);
    expect(out.get(1002)).toBe(4096);
    expect(out.get(1003)).toBe("2:30.0");
    expect(out.get(1004)).toBe("3x4:[0,5,11]");
    expect(out.get(1005)).toEqual(PATH);
    expect(out.get(2000)).toBe(7);
    expect(out.get(2001)).toEqual([10, 40]);
    expect(out.get(2002)).toBe("Solid cycles, dropped one at the end.");
  });

  it("round-trips a completely empty match", () => {
    const out = roundTrip(values());

    expect(out.get(0)).toBeNull();
    expect(out.get(1)).toBe(UNSET_OPTION);
    expect(out.get(2)).toBe(UNSET_OPTION);
    expect(out.get(1000)).toBe(false);
    expect(out.get(1001)).toBeNull();
    expect(out.get(1003)).toBeNull();
    expect(out.get(1004)).toBe("3x4:[]");
    expect(out.get(1005)).toEqual({ noAuto: false, points: [], events: [] });
    expect(out.get(2002)).toBe("");
  });

  it("preserves the unset sentinel rather than defaulting to option 0", () => {
    const out = roundTrip(values({ 1: UNSET_OPTION }));
    expect(out.get(1)).toBe(UNSET_OPTION);
  });

  it("round-trips boundary numbers", () => {
    for (const n of [1, 120]) {
      expect(roundTrip(values({ 0: n })).get(0)).toBe(n);
    }
    for (const n of [0, 200]) {
      expect(roundTrip(values({ 1001: n })).get(1001)).toBe(n);
    }
  });

  it("clamps a bounded value that exceeds its declared range", () => {
    expect(roundTrip(values({ 0: 999 })).get(0)).toBe(120);
    expect(roundTrip(values({ 0: -5 })).get(0)).toBe(1);
  });

  it("round-trips negative and large unbounded numbers via zigzag varint", () => {
    for (const n of [-1, -12345, 0, 7, 1_000_000]) {
      expect(roundTrip(values({ 1002: n })).get(1002)).toBe(n);
    }
  });

  it("round-trips both timer formats", () => {
    expect(roundTrip(values({ 1003: "0.0" })).get(1003)).toBe("0.0");
    expect(roundTrip(values({ 1003: "12.3" })).get(1003)).toBe("12.3");
    expect(roundTrip(values({ 1003: "2:30.0" })).get(1003)).toBe("2:30.0");
    expect(roundTrip(values({ 1003: "1:05.7" })).get(1003)).toBe("1:05.7");
  });

  it("round-trips a full and an empty grid", () => {
    const full = `3x4:[${Array.from({ length: 12 }, (_, i) => i).join(",")}]`;
    expect(roundTrip(values({ 1004: full })).get(1004)).toBe(full);
    expect(roundTrip(values({ 1004: "3x4:[]" })).get(1004)).toBe("3x4:[]");
  });

  it("normalizes the legacy colon-less grid shape", () => {
    // DynamicComponent used to default grids to "3x3[]" with no colon.
    expect(roundTrip(values({ 1004: "3x4[2,3]" })).get(1004)).toBe("3x4:[2,3]");
  });

  it("round-trips multi-byte text", () => {
    const text = "Robot “tipped” over — twice · 100% 🤖";
    expect(roundTrip(values({ 2002: text })).get(2002)).toBe(text);
  });

  it("truncates oversized text on a character boundary", () => {
    const long = "🤖".repeat(200); // 4 bytes each, far past the 255-byte cap
    const out = roundTrip(values({ 2002: long })).get(2002) as string;
    expect(new TextEncoder().encode(out).length).toBeLessThanOrEqual(255);
    // No replacement characters, i.e. no split code point.
    expect(out).not.toContain("�");
    expect(out).toBe("🤖".repeat(63));
  });

  it("round-trips the explicit no-auto path state", () => {
    const out = roundTrip(values({ 1005: { noAuto: true, points: [], events: [] } }));
    expect(out.get(1005)).toEqual({ noAuto: true, points: [], events: [] });
  });

  it("detects a corrupted payload via the trailing CRC", () => {
    const payload = encodeMatchBody(SCHEMA, values({ 0: 47, 2002: "hello" }));
    payload[2] ^= 0b0000_0100;

    const decoded = decodeMatchBody(SCHEMA, payload);
    expect(decoded.checksumOk).toBe(false);
    // No partially decoded values escape — a failed checksum means trust nothing.
    expect(decoded.values.size).toBe(0);
  });

  it("reports a checksum failure rather than overrunning the reader", () => {
    // Corrupting a text-length byte would make the reader run off the end if the
    // CRC were checked after decoding instead of before.
    const payload = encodeMatchBody(SCHEMA, values({ 2002: "hello" }));
    payload[payload.length - 2] ^= 0xff;
    expect(() => decodeMatchBody(SCHEMA, payload)).not.toThrow();
    expect(decodeMatchBody(SCHEMA, payload).checksumOk).toBe(false);
  });

  it("explains a schema mismatch when an intact payload does not fit the layout", () => {
    const payload = encodeMatchBody(SCHEMA, values({ 0: 47, 2002: "hi" }));
    // The extra field must demand more than the <8 bits of byte padding the payload
    // ends with, hence a 64-cell grid rather than a 1-bit field.
    const wider: Schema = {
      ...SCHEMA,
      sections: [
        ...SCHEMA.sections,
        {
          title: "Extra",
          fields: [
            { id: 3000, name: "Big Grid", type: "grid", props: { rows: 8, cols: 8 } },
          ],
        },
      ],
    };
    expect(() => decodeMatchBody(wider, payload)).toThrow(/does not match schema/);
  });

  it("rejects a truncated payload", () => {
    expect(() => decodeMatchBody(SCHEMA, new Uint8Array([1]))).toThrow(/too short/);
  });
});

describe("payload size", () => {
  it("packs a realistic match into far less than the JSON equivalent", () => {
    const input = values({
      0: 47,
      1: "Blue",
      2: "3",
      1000: true,
      1001: 137,
      1002: 12,
      1003: "12.3",
      1004: "3x4:[0,5,11]",
      1005: PATH,
      2000: 7,
      2001: [10, 40],
      2002: "Good cycles",
    });

    const payload = encodeMatchBody(SCHEMA, input);
    // The v1 equivalent is JSON.stringify of the positional value array.
    const jsonBytes = new TextEncoder().encode(
      JSON.stringify(orderedFields(SCHEMA).map((f) => input.get(f.id) ?? null))
    ).length;

    expect(payload.length).toBeLessThan(jsonBytes / 2);
    expect(payload.length).toBeLessThan(60);
  });

  it("measureMatchBits agrees with the encoded body", () => {
    const input = values({ 0: 47, 1: "Red", 1001: 12, 2002: "abc" });
    const bits = measureMatchBits(SCHEMA, input);
    // encodeMatchBody adds a flags byte and a CRC byte around the field bits.
    expect(encodeMatchBody(SCHEMA, input).length).toBe(Math.ceil(bits / 8) + 2);
  });
});
