import { describe, expect, it } from "vitest";
import { decodeMatchBody, encodeMatchBody, orderedFields } from "../../utils/MatchCodec";
import { encodeBatchBody, decodeBatchBody } from "../../utils/BatchCodec";
import { buildJsonRecord, planMatchExport } from "../../utils/ExportPlan";

/**
 * "Never recorded" must stay distinguishable from a real value.
 *
 * Decoding used to substitute a per-type default for any null/empty value, so a
 * number the scout never touched exported as `0` and blank text as the literal
 * "No text provided" — indistinguishable from real entries, and inconsistent with
 * autopath, which has always distinguished NOT_RECORDED.
 */

const SCHEMA: Schema = {
  name: "Unset Fixture",
  sections: [
    {
      title: "Match Info",
      fields: [
        { id: 0, name: "Match Number", type: "number", props: { min: 1, max: 120 } },
        { id: 1, name: "Alliance", type: "dropdown", props: { options: ["Red", "Blue"] } },
      ],
    },
    {
      title: "Scoring",
      fields: [
        { id: 100, name: "Fuel Scored", type: "counter", props: { min: 0, max: 200 } },
        { id: 101, name: "Comments", type: "text" },
        { id: 102, name: "Broke Down", type: "checkbox" },
      ],
    },
  ],
};

/** Mirrors QrUtils.reconstructMatchDataFromArray without pulling in Tauri imports. */
function reconstruct(schema: Schema, values: any[]): Record<string, any> {
  const out: Record<string, any> = {};
  schema.sections
    .flatMap((s) => s.fields)
    .forEach((field, index) => {
      const raw = values[index];
      out[field.id] = raw === "" || raw === undefined ? null : raw;
    });
  return out;
}

function roundTrip(values: Map<number, any>) {
  const { values: decoded } = decodeMatchBody(
    SCHEMA,
    encodeMatchBody(SCHEMA, values)
  );
  const positional = orderedFields(SCHEMA).map((f) => decoded.get(f.id) ?? null);
  return reconstruct(SCHEMA, positional);
}

describe("unset values survive as null", () => {
  it("keeps an untouched number null rather than zero", () => {
    const record = roundTrip(new Map([[0, 7]]));
    expect(record[100]).toBeNull();
  });

  it("keeps untouched text null rather than a placeholder string", () => {
    const record = roundTrip(new Map([[0, 7]]));
    expect(record[101]).toBeNull();
  });

  it("distinguishes a genuine zero from an untouched field", () => {
    const withZero = roundTrip(new Map([[100, 0]]));
    const untouched = roundTrip(new Map());
    expect(withZero[100]).toBe(0);
    expect(untouched[100]).toBeNull();
    expect(withZero[100]).not.toBe(untouched[100]);
  });

  it("preserves an explicitly empty comment as null, not 'No text provided'", () => {
    const record = roundTrip(new Map([[101, ""]]));
    expect(record[101]).toBeNull();
  });

  it("still round-trips real values untouched", () => {
    const record = roundTrip(
      new Map<number, any>([
        [0, 42],
        [1, "Blue"],
        [100, 15],
        [101, "Solid cycles 🛡️"],
        [102, true],
      ])
    );
    expect(record[0]).toBe(42);
    expect(record[1]).toBe("Blue");
    expect(record[100]).toBe(15);
    expect(record[101]).toBe("Solid cycles 🛡️");
    expect(record[102]).toBe(true);
  });
});

describe("exports represent unset as null / empty", () => {
  it("emits null in JSON for untouched fields", () => {
    const record = buildJsonRecord(SCHEMA, roundTrip(new Map([[0, 3]])));
    expect(record["Fuel Scored"]).toBeNull();
    expect(record["Comments"]).toBeNull();
    expect(record["Match Number"]).toBe(3);
  });

  it("emits an empty CSV cell for untouched fields, and 0 for a real zero", () => {
    const plan = planMatchExport(SCHEMA);
    const fuelIndex = plan.headers.indexOf("Fuel Scored");

    expect(plan.extract(roundTrip(new Map()))[fuelIndex]).toBeNull();
    expect(plan.extract(roundTrip(new Map([[100, 0]])))[fuelIndex]).toBe(0);
  });
});

describe("batching reuses encoded bytes losslessly", () => {
  it("round-trips a record with unset fields byte-identically", () => {
    // What rawMatchPayload hands to the batch builder: the saved body verbatim.
    const original = encodeMatchBody(
      SCHEMA,
      new Map<number, any>([
        [0, 12],
        [100, 0],
      ])
    );

    const { entries } = decodeBatchBody(
      encodeBatchBody([{ deviceId: 4, payload: original }])
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].deviceId).toBe(4);
    expect(Array.from(entries[0].payload)).toEqual(Array.from(original));
  });

  it("carries unset fields through a batch without inventing defaults", () => {
    const original = encodeMatchBody(SCHEMA, new Map<number, any>([[0, 9]]));
    const { entries } = decodeBatchBody(
      encodeBatchBody([{ deviceId: 1, payload: original }])
    );

    const { values } = decodeMatchBody(SCHEMA, entries[0].payload);
    const positional = orderedFields(SCHEMA).map((f) => values.get(f.id) ?? null);
    const record = reconstruct(SCHEMA, positional);

    expect(record[100]).toBeNull();
    expect(record[101]).toBeNull();
  });
});
