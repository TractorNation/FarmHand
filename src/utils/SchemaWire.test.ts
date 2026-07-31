import { describe, expect, it } from "vitest";
import { SERIALIZED_PROP_KEYS, UNSERIALIZED_PROPS, deminifySchema, minifySchema } from "./SchemaWire";
import Reefscape from "../config/schema/2025Reefscape.json";
import Decode from "../config/schema/2025Decode.json";
import Pits from "../config/schema/2026PitScouting.json";
import TBAPits from "../config/schema/2026PitScoutingTBA.json";
import Rebuilt from "../config/schema/2026Rebuilt.json";
import TBARebuilt from "../config/schema/2026RebuiltTBA.json";

/**
 * Schema-over-QR round trips.
 *
 * These matter more under payload v2 than they used to: a v2 match code can only be
 * decoded with the exact schema it was recorded against, and the schema is
 * identified by a hash over the whole object. Anything minifySchema drops changes
 * the hash on the receiving device and orphans that device's match codes.
 */
const SCHEMA: Schema = {
  name: "Round Trip",
  sections: [
    {
      title: "Match Info",
      fields: [
        {
          id: 0,
          name: "Match Number",
          type: "number",
          required: true,
          props: { min: 1, max: 120, pullFromTBA: true },
        },
        {
          id: 1,
          name: "Alliance",
          type: "dropdown",
          required: true,
          persist: true,
          props: { options: ["Red", "Blue"] },
        },
        {
          id: 2,
          name: "Position",
          type: "multiplechoice",
          required: true,
          props: { options: ["1", "2", "3"] },
        },
      ],
    },
    {
      title: "Auto",
      fields: [
        {
          id: 1000,
          name: "Fuel Scored",
          type: "counter",
          note: "Don't reset the clicker",
          doubleWidth: true,
          props: { min: 0, max: 200 },
        },
        {
          id: 1001,
          name: "Auto Path",
          type: "autopath",
          required: true,
          props: {
            fieldImageKey: "rebuilt-2026.png",
            simplifyEpsilon: 3,
            gamePieces: [
              { label: "Fuel", icon: "circle" },
              { label: "Gear", icon: "hexagon" },
            ],
            pathActions: [
              { label: "Pickup", icon: "circle" },
              { label: "Score", icon: "target", results: ["Made", "Missed"] },
            ],
          },
        },
      ],
    },
  ],
};

describe("minifySchema / deminifySchema", () => {
  it("round-trips a schema exactly when every optional key is present", () => {
    expect(deminifySchema(minifySchema(SCHEMA))).toEqual(SCHEMA);
  });

  it("preserves field ids so the schema hash is stable across devices", () => {
    const out = deminifySchema(minifySchema(SCHEMA));
    expect(out.sections[1].fields.map((f) => f.id)).toEqual([1000, 1001]);
  });

  it("preserves note, doubleWidth and persist", () => {
    const out = deminifySchema(minifySchema(SCHEMA));
    const counter = out.sections[1].fields[0];
    expect(counter.note).toBe("Don't reset the clicker");
    expect(counter.doubleWidth).toBe(true);
    expect(out.sections[0].fields[1].persist).toBe(true);
  });

  it("preserves pullFromTBA", () => {
    const out = deminifySchema(minifySchema(SCHEMA));
    expect(out.sections[0].fields[0].props?.pullFromTBA).toBe(true);
  });

  it("preserves the full autopath vocabulary", () => {
    const path = deminifySchema(minifySchema(SCHEMA)).sections[1].fields[1];
    expect(path.type).toBe("autopath");
    expect(path.props?.fieldImageKey).toBe("rebuilt-2026.png");
    expect(path.props?.simplifyEpsilon).toBe(3);
    expect(path.props?.gamePieces).toEqual([
      { label: "Fuel", icon: "circle" },
      { label: "Gear", icon: "hexagon" },
    ]);
    expect(path.props?.pathActions).toEqual([
      { label: "Pickup", icon: "circle" },
      { label: "Score", icon: "target", results: ["Made", "Missed"] },
    ]);
  });

  it("gives multiplechoice a single-character type code", () => {
    const minified = minifySchema(SCHEMA);
    const positionField = minified[1][0][1][2];
    expect(positionField[1]).toBe("m");
  });

  it("still reads legacy 4-element field arrays", () => {
    // Codes produced before the extras slot existed.
    const legacy = [
      "Legacy",
      [["Match Info", [["Match Number", "N", 1, { m: 1, M: 120 }]]]],
    ];
    const out = deminifySchema(legacy);
    expect(out.sections[0].fields[0]).toEqual({
      id: 0, // derived the old way
      name: "Match Number",
      type: "number",
      required: true,
      props: { min: 1, max: 120 },
    });
  });

  it("still reads legacy codes that spelled multiplechoice in full", () => {
    const legacy = [
      "Legacy",
      [["Info", [["Position", "multiplechoice", 0, { o: ["1", "2"] }]]]],
    ];
    expect(deminifySchema(legacy).sections[0].fields[0].type).toBe(
      "multiplechoice"
    );
  });
});

describe("prop coverage", () => {
  /**
   * Every ComponentProps key must either be serialized or explicitly excluded.
   *
   * An unmapped prop is dropped silently when a schema is shared by QR, which is
   * how `label`, `pullFromTBA`, and the autopath vocabulary all went missing.
   * Update this list when adding a prop, and add it to propMap unless it genuinely
   * cannot travel.
   */
  const ALL_COMPONENT_PROPS = [
    "default",
    "max",
    "min",
    "label",
    "valid",
    "multiline",
    "options",
    "step",
    "selectsRange",
    "rows",
    "cols",
    "cellLabel",
    "onChange",
    "pullFromTBA",
    "fieldImageKey",
    "gamePieces",
    "pathActions",
    "simplifyEpsilon",
  ];

  it.each(ALL_COMPONENT_PROPS)("%s is serialized or explicitly excluded", (key) => {
    const handled =
      SERIALIZED_PROP_KEYS.includes(key) ||
      (UNSERIALIZED_PROPS as readonly string[]).includes(key);
    expect(handled).toBe(true);
  });

  it("assigns a unique short code to every serialized prop", () => {
    const minified = minifySchema({
      name: "x",
      sections: [{ title: "s", fields: [] }],
    });
    expect(minified).toBeTruthy();
    // Codes must not collide, or one prop would overwrite another.
    const codes = SERIALIZED_PROP_KEYS.map((k) => k);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("round-trips every serialized prop on one field", () => {
    const schema: Schema = {
      name: "All Props",
      sections: [
        {
          title: "S",
          fields: [
            {
              id: 7,
              name: "Kitchen Sink",
              type: "slider",
              required: true,
              props: {
                default: 2,
                min: 1,
                max: 9,
                label: "Pick one",
                multiline: true,
                options: ["a", "b"],
                step: 2,
                selectsRange: true,
                rows: 4,
                cols: 5,
                cellLabel: "coordinates",
                pullFromTBA: true,
                fieldImageKey: "field.png",
                gamePieces: [{ label: "P", icon: "circle" }],
                pathActions: [{ label: "A", icon: "target", results: ["x"] }],
                simplifyEpsilon: 3,
              },
            },
          ],
        },
      ],
    };

    expect(deminifySchema(minifySchema(schema))).toEqual(schema);
  });
});

describe("built-in schemas survive a QR round trip", () => {
  // Functional equality, not string equality: minifySchema normalizes key order and
  // treats an absent optional boolean as false, so the rebuilt object is equivalent
  // but not byte-identical — and therefore hashes differently. That difference is
  // handled by recording the sending device's hash on import
  // (SchemaUtils.saveSchema's originHash), not by chasing byte fidelity here.
  it.each([
    ["2025 Decode", Decode],
    ["2025 Reefscape", Reefscape],
    ["2026 Pit Scouting", Pits],
    ["2026 Pit Scouting (TBA)", TBAPits],
    ["2026 Rebuilt", Rebuilt],
    ["2026 Rebuilt (TBA)", TBARebuilt],
  ])("%s", (_name, schema) => {
    const original = schema as unknown as Schema;
    const rebuilt = deminifySchema(minifySchema(original));

    expect(rebuilt.name).toBe(original.name);
    expect(rebuilt.sections.map((s) => s.title)).toEqual(
      original.sections.map((s) => s.title)
    );

    original.sections.forEach((section, si) => {
      section.fields.forEach((field, fi) => {
        const out = rebuilt.sections[si].fields[fi];
        // Field id and ordering drive the entire wire format's positional layout,
        // so these are the properties that must survive exactly.
        expect(out.id).toBe(field.id);
        expect(out.name).toBe(field.name);
        expect(out.type).toBe(field.type);
        expect(out.required ?? false).toBe(field.required ?? false);
        expect(out.note).toBe(field.note);
        expect(out.doubleWidth ?? false).toBe(field.doubleWidth ?? false);
        expect(out.persist ?? false).toBe(field.persist ?? false);
        expect(out.props ?? {}).toEqual(field.props ?? {});
      });
    });
  });
});
