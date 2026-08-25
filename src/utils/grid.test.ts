import { describe, expect, it } from "vitest";
import { indexToCoordinate, parseGridData, parseGridToNumber } from "./grid";

/**
 * A grid stores as `"<rows>x<cols>:[<checked indices>]"`. Four subsystems read that
 * one string — the input component, the match codec, the review display and the
 * analysis code — so a disagreement about the shape shows up as wrong chart numbers
 * rather than as an error.
 *
 * The null-vs-zero distinction is the load-bearing part: `toNumber` skips a null so a
 * corrupt value stays out of an average, while `[]` is a genuine answer of zero cells.
 */

describe("parseGridToNumber", () => {
  it("counts checked cells", () => {
    expect(parseGridToNumber("3x3:[0,4,8]")).toBe(3);
    expect(parseGridToNumber("2x2:[1]")).toBe(1);
  });

  it("reads an empty grid as a real zero", () => {
    // The scout saw the grid and checked nothing. That is data, not a missing value.
    expect(parseGridToNumber("3x3:[]")).toBe(0);
  });

  it("tolerates whitespace between indices", () => {
    expect(parseGridToNumber("3x3:[0, 4, 8]")).toBe(3);
  });

  it("accepts the legacy colon-less shape", () => {
    expect(parseGridToNumber("3x3[0,4]")).toBe(2);
  });

  it("returns null for a value that is not a grid string", () => {
    // Distinct from 0: a bracket-less string is not an answer of zero cells, and
    // counting it as one would drag down every average it lands in.
    expect(parseGridToNumber("garbage")).toBeNull();
    expect(parseGridToNumber("undefined")).toBeNull();
    expect(parseGridToNumber("")).toBeNull();
    expect(parseGridToNumber(undefined)).toBeNull();
    expect(parseGridToNumber(null)).toBeNull();
  });

  it("ignores non-numeric entries rather than counting them", () => {
    expect(parseGridToNumber("3x3:[0,abc,8]")).toBe(2);
  });
});

describe("parseGridData", () => {
  it("reads dimensions and checked indices", () => {
    expect(parseGridData("3x4:[0,4,8]")).toEqual({
      rows: 3,
      cols: 4,
      checkedIndices: [0, 4, 8],
    });
  });

  it("reads an empty grid as dimensions with no checks", () => {
    expect(parseGridData("3x3:[]")).toEqual({
      rows: 3,
      cols: 3,
      checkedIndices: [],
    });
  });

  it("handles multi-digit dimensions", () => {
    const parsed = parseGridData("10x12:[119]");
    expect(parsed).toEqual({ rows: 10, cols: 12, checkedIndices: [119] });
  });

  it("requires the colon form for dimensions", () => {
    // DynamicComponent's grid default builds "${rows}x${cols}:[]" specifically
    // because this parser keys on the colon; a colon-less value has no dimensions.
    expect(parseGridData("3x3[0,4]")).toBeNull();
  });

  it("returns null for anything that is not a grid string", () => {
    expect(parseGridData("garbage")).toBeNull();
    expect(parseGridData("")).toBeNull();
    expect(parseGridData(undefined)).toBeNull();
    expect(parseGridData(null)).toBeNull();
  });

  it("round-trips a value the input component would produce", () => {
    const rows = 3;
    const cols = 5;
    const checked = [0, 7, 14];
    const encoded = `${rows}x${cols}:[${checked.join(",")}]`;

    expect(parseGridData(encoded)).toEqual({
      rows,
      cols,
      checkedIndices: checked,
    });
    expect(parseGridToNumber(encoded)).toBe(checked.length);
  });
});

describe("indexToCoordinate", () => {
  it("maps a flat index to row,col on the given width", () => {
    expect(indexToCoordinate(5, 3)).toBe("1,2");
    expect(indexToCoordinate(0, 3)).toBe("0,0");
    expect(indexToCoordinate(2, 3)).toBe("0,2");
    expect(indexToCoordinate(3, 3)).toBe("1,0");
  });

  it("agrees with the row-major order parseGridData produces", () => {
    // The heatmap builder pairs these two, so they have to share an origin corner
    // and a major axis or the heat lands transposed.
    const cols = 4;
    const { checkedIndices } = parseGridData("3x4:[0,5,11]")!;
    expect(checkedIndices.map((i) => indexToCoordinate(i, cols))).toEqual([
      "0,0",
      "1,1",
      "2,3",
    ]);
  });
});
