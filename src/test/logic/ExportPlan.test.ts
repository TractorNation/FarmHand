import { describe, expect, it } from "vitest";
import { csvCell, planMatchExport, toCsv } from "../../utils/ExportPlan";

/**
 * CSV escaping and column alignment.
 *
 * `UnsetValues.test.ts` covers the null-vs-zero semantics that flow through here; this
 * file covers the quoting itself and the headers/row correspondence. A cell that fails
 * to quote shifts every column to its right, which produces a file that still opens
 * cleanly and is silently wrong — the worst failure mode an export has.
 */

const SCHEMA: Schema = {
  name: "Export Fixture",
  sections: [
    {
      title: "Match Info",
      fields: [
        { id: 0, name: "Match Number", type: "number", props: { min: 1, max: 99 } },
        { id: 1, name: "Team Number", type: "number", props: { min: 1, max: 9999 } },
      ],
    },
    {
      title: "Notes",
      fields: [
        { id: 100, name: "Points", type: "counter", props: { min: 0, max: 200 } },
        { id: 101, name: "Comments", type: "text" },
        { id: 102, name: "Spacer", type: "filler" },
      ],
    },
  ],
};

describe("csvCell", () => {
  it("leaves an ordinary value unquoted", () => {
    expect(csvCell("254")).toBe("254");
    expect(csvCell(42)).toBe("42");
    expect(csvCell(0)).toBe("0");
    expect(csvCell(false)).toBe("false");
  });

  it("quotes a value containing a comma", () => {
    // Unquoted, this one cell becomes two columns and shifts the rest of the row.
    expect(csvCell("broke down, then fixed")).toBe('"broke down, then fixed"');
  });

  it("quotes and doubles an embedded double quote", () => {
    expect(csvCell('said "hello"')).toBe('"said ""hello"""');
  });

  it("quotes newlines and carriage returns", () => {
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
    expect(csvCell("line one\r\nline two")).toBe('"line one\r\nline two"');
  });

  it("writes null and undefined as an empty cell, not the text 'null'", () => {
    // The distinction UnsetValues.test.ts guards: unanswered exports blank, a real
    // zero exports 0.
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(0)).toBe("0");
  });

  it("handles a cell that is only a quote", () => {
    expect(csvCell('"')).toBe('""""');
  });

  it("does not neutralise a leading formula character", () => {
    // A deliberate decision, pinned so changing it is a choice rather than a drift.
    // Escaping would visibly alter ordinary data — comments legitimately begin with
    // "-", and numeric columns are negative — so the export stays faithful and
    // docs/WIRE_FORMAT.md warns that a CSV may contain text from other teams'
    // devices. If that trade is ever revisited, this test is the one to change.
    expect(csvCell("=1+1")).toBe("=1+1");
    expect(csvCell("-broke down in auto")).toBe("-broke down in auto");
    expect(csvCell(-5)).toBe("-5");
  });
});

describe("toCsv", () => {
  it("emits a header row followed by one line per record", () => {
    const csv = toCsv(["Team", "Points"], [["254", 10], ["1678", 20]]);
    expect(csv).toBe("Team,Points\n254,10\n1678,20");
  });

  it("keeps column counts aligned when a cell contains a comma", () => {
    const csv = toCsv(
      ["Team", "Comments", "Points"],
      [["254", "tipped, recovered", 10]]
    );
    expect(csv).toBe('Team,Comments,Points\n254,"tipped, recovered",10');

    // The property that matters: the quoted comma does not become a new column.
    const dataLine = csv.split("\n")[1];
    expect(dataLine.match(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g)).toHaveLength(2);
  });

  it("emits headers only when there are no rows", () => {
    expect(toCsv(["Team", "Points"], [])).toBe("Team,Points");
  });
});

describe("planMatchExport", () => {
  it("builds one column per field in section-then-field order", () => {
    // docs/WIRE_FORMAT.md §CSV: "Columns follow sections.flatMap(s => s.fields)
    // order" — the same order the bit packer walks.
    const { headers } = planMatchExport(SCHEMA);
    expect(headers).toEqual([
      "Match Number",
      "Team Number",
      "Points",
      "Comments",
      "Spacer",
    ]);
  });

  it("keeps filler columns in CSV even though they never carry a value", () => {
    // Deliberate asymmetry, and the surprising half of it: the CSV column contract
    // is positional over every field, so fillers hold their slot and always export
    // empty. JSON omits them instead (docs/WIRE_FORMAT.md §JSON). Dropping them here
    // would silently renumber every column to the right of a spacer.
    const { headers, extract } = planMatchExport(SCHEMA);
    expect(headers).toContain("Spacer");
    expect(extract({ 0: 1, 102: "ignored" })[headers.indexOf("Spacer")]).toBe(
      "ignored"
    );
  });

  it("extracts a row aligned one-to-one with the headers", () => {
    // The whole reason headers and extract come from one plan: they cannot drift.
    const { headers, extract } = planMatchExport(SCHEMA);
    const row = extract({ 0: 1, 1: "254", 100: 10, 101: "good match" });

    expect(row).toHaveLength(headers.length);
    expect(row.slice(0, 4)).toEqual([1, "254", 10, "good match"]);
  });

  it("pads a record missing fields rather than shortening the row", () => {
    const { headers, extract } = planMatchExport(SCHEMA);
    const row = extract({ 0: 1 });

    expect(row).toHaveLength(headers.length);
    expect(toCsv(headers, [row]).split("\n")[1]).toBe("1,,,,");
  });

  it("round-trips a comment containing a comma through the full export path", () => {
    const { headers, extract } = planMatchExport(SCHEMA);
    const csv = toCsv(headers, [
      extract({ 0: 1, 1: "254", 100: 0, 101: 'auto failed, "again"' }),
    ]);

    expect(csv).toBe(
      'Match Number,Team Number,Points,Comments,Spacer\n' +
        '1,254,0,"auto failed, ""again""",'
    );
  });
});
