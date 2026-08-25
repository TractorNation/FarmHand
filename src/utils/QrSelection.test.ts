import { describe, expect, it } from "vitest";
import {
  getDataFromQrName,
  getSchemaHashFromQrString,
  parseQrHeader,
} from "./QrUtils";

/**
 * Guards the schema-hash matching that drives "Select All" and every
 * export/batch filter.
 *
 * The bug this replaces: selection filtered with `code.data.includes(selectedHash)`.
 * parseQrHeader normalizes the hash to lowercase, but the wire writes it uppercase so
 * the whole string stays inside the QR alphanumeric charset — so the substring test
 * matched nothing at all, and Select All silently selected zero matches.
 */

const HASH = "b0f68211";

/** A real match string as saved by the app: uppercase prefix and hash. */
const MATCH_CODE = `FRMHND:M:${HASH.toUpperCase()}:6:%20M13O+14%5:639/RL`;
/** A schema-transfer code. */
const SCHEMA_CODE = `FRMHND:S:${HASH.toUpperCase()}:0:eJxLysxLBQAD1QIJ`;
/** The retired v1 format: lowercase prefix and type. */
const V1_CODE = `frmhnd:m:${HASH}:2:eJxLysxLBQAD1QIJ`;

describe("schema hash extraction", () => {
  it("normalizes an uppercase wire hash to lowercase", () => {
    expect(getSchemaHashFromQrString(MATCH_CODE)).toBe(HASH);
  });

  it("reads a schema code's hash", () => {
    expect(getSchemaHashFromQrString(SCHEMA_CODE)).toBe(HASH);
  });

  it("returns null for a string that is not a FarmHand code", () => {
    expect(getSchemaHashFromQrString("https://example.com")).toBeNull();
  });
});

describe("the type token is exactly one character", () => {
  // There is one wire format, so nothing carries a version number. A token with
  // anything after the type character is not one of ours and must fail at the parse
  // boundary rather than half-decoding into values attributed to the wrong fields.
  it("rejects a trailing version digit", () => {
    expect(parseQrHeader(`FRMHND:M2:${HASH.toUpperCase()}:1:PAYLOAD`)).toBeNull();
    expect(parseQrHeader(`FRMHND:B2:${HASH.toUpperCase()}:0:PAYLOAD`)).toBeNull();
  });

  it("rejects an empty type token", () => {
    expect(parseQrHeader(`FRMHND::${HASH.toUpperCase()}:1:PAYLOAD`)).toBeNull();
  });

  it("rejects an unknown type character", () => {
    expect(parseQrHeader(`FRMHND:X:${HASH.toUpperCase()}:1:PAYLOAD`)).toBeNull();
  });
});

describe("retired v1 codes are rejected outright", () => {
  // v1 support is gone, and with no version token on the wire the case-sensitive
  // prefix is what separates the two: v1 codes are lowercase throughout.
  it("does not parse a v1 header", () => {
    expect(parseQrHeader(V1_CODE)).toBeNull();
    expect(getSchemaHashFromQrString(V1_CODE)).toBeNull();
  });

  it("rejects a lowercase prefix even with a current-shape token", () => {
    expect(parseQrHeader(`frmhnd:M:${HASH.toUpperCase()}:1:PAYLOAD`)).toBeNull();
  });
});

describe("selection filtering", () => {
  /** The comparison `selectAllCodes` performs. */
  const matches = (data: string, selectedHash: string) =>
    getSchemaHashFromQrString(data) === selectedHash;

  it("selects a code whose wire hash is uppercase", () => {
    // The regression: `MATCH_CODE.includes("b0f68211")` is false.
    expect(MATCH_CODE.includes(HASH)).toBe(false);
    expect(matches(MATCH_CODE, HASH)).toBe(true);
  });

  it("does not select a code whose payload merely contains the hash text", () => {
    // Substring matching would have picked this up: a Base45 payload can happen to
    // contain another schema's 8-character hash.
    const impostor = `FRMHND:M:AAAAAAAA:1:XX${HASH.toUpperCase()}XX`;
    expect(impostor.includes(HASH.toUpperCase())).toBe(true);
    expect(matches(impostor, HASH)).toBe(false);
  });

  it("excludes codes from a genuinely different schema", () => {
    expect(matches(`FRMHND:M:DEADBEEF:1:PAYLOAD`, HASH)).toBe(false);
  });

  it("parses the header of a payload containing colons and spaces", () => {
    // Base45's alphabet includes ':' and ' ', so the header must be parsed by offset.
    const header = parseQrHeader(MATCH_CODE);
    expect(header?.type).toBe("match");
    expect(header?.deviceId).toBe(6);
    expect(header?.payload).toBe("%20M13O+14%5:639/RL");
  });
});

/**
 * The saved filename is a second, independent encoding of a code's identity — the QR
 * page, sorting and the date filters all read team/match/timestamp back out of it
 * rather than decoding the payload. It is parsed by first and last dash specifically
 * so a match label like "Qual-1" survives in the middle segment.
 */
describe("getDataFromQrName", () => {
  it("splits a saved filename into team, match and timestamp", () => {
    expect(getDataFromQrName("254-7-1700000000000.svg")).toEqual({
      TeamNumber: "254",
      MatchNumber: "7",
      Timestamp: "1700000000000",
    });
  });

  it("keeps a dashed match label intact in the middle segment", () => {
    // The reason it splits on first/last dash rather than split("-"): TBA match
    // labels are "Qual-1", "Semis-2", "Final-1".
    expect(getDataFromQrName("254-Qual-13-1700000000000.svg")).toEqual({
      TeamNumber: "254",
      MatchNumber: "Qual-13",
      Timestamp: "1700000000000",
    });
  });

  it("strips the .svg suffix", () => {
    expect(getDataFromQrName("254-7-1700000000000.svg").Timestamp).toBe(
      "1700000000000"
    );
    expect(getDataFromQrName("254-7-1700000000000").Timestamp).toBe(
      "1700000000000"
    );
  });

  it("returns a millisecond timestamp, not seconds", () => {
    // Guards the unit the date filters consume: generateQrFileName writes Date.now()
    // so that two codes saved in the same second do not overwrite each other.
    const { Timestamp } = getDataFromQrName("254-7-1700000000000.svg");
    expect(Timestamp).toHaveLength(13);
    expect(new Date(parseInt(Timestamp, 10)).getUTCFullYear()).toBe(2023);
  });

  it("degrades to a bare team number when there are too few dashes", () => {
    expect(getDataFromQrName("254.svg")).toEqual({
      TeamNumber: "254",
      MatchNumber: "",
      Timestamp: "",
    });
    expect(getDataFromQrName("254-7")).toEqual({
      TeamNumber: "254-7",
      MatchNumber: "",
      Timestamp: "",
    });
  });

  it("attributes a dashed team value to the match segment", () => {
    // Known limitation, pinned rather than claimed as correct: the sanitiser in
    // getFieldValueByName permits '-' in a value, and splitting on the first dash
    // means only the match label can safely contain one. Team numbers are numeric
    // in every built-in schema, so this stays theoretical.
    expect(getDataFromQrName("254-B-Qual-1-1700000000000.svg")).toEqual({
      TeamNumber: "254",
      MatchNumber: "B-Qual-1",
      Timestamp: "1700000000000",
    });
  });
});
