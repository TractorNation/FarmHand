import { describe, expect, it } from "vitest";
import {
  formatFieldRef,
  parseFieldRef,
  resolveChartFields,
  teamNumberIndex,
} from "./fieldRefs";
import { aggregate, median } from "./aggregate";
import { parseRange, toChartValue, toNumber } from "./coerceValue";
import { countByValueAndTeam, groupChartData, isGrouped } from "./groupData";
import { buildHeatmapSeries } from "./series/heatmap";
import { buildCartesianSeries } from "./series/cartesian";
import { buildBoxplotSeries } from "./series/boxplot";
import { buildBarSeries, buildPieSeries } from "./series/categorical";
import { orderedFields } from "../utils/schemaFields";

/**
 * Characterisation tests for the chart data pipeline.
 *
 * This logic previously lived in one 790-line `useMemo` with no coverage at all, so
 * these lock in the observable behaviour of each series shape.
 */

const SCHEMA: Schema = {
  name: "Analysis Fixture",
  sections: [
    {
      title: "Match Info",
      fields: [
        { id: 0, name: "Match Number", type: "number", props: { min: 1, max: 99 } },
        { id: 1, name: "Team Number", type: "number", props: { min: 1, max: 9999 } },
      ],
    },
    {
      title: "Scoring",
      fields: [
        { id: 100, name: "Points", type: "counter", props: { min: 0, max: 200 } },
        { id: 101, name: "Climb", type: "dropdown", props: { options: ["Yes", "No"] } },
        { id: 102, name: "Reef", type: "grid", props: { rows: 2, cols: 2 } },
        { id: 103, name: "Cycle", type: "timer" },
        {
          id: 104,
          name: "Range",
          type: "slider",
          props: { min: 0, max: 10, selectsRange: true, step: 1 },
        },
      ],
    },
  ],
};

/** Builds the `{ decoded: { data } }` shape the pipeline consumes. */
function row(values: Record<number, any>) {
  const data = orderedFields(SCHEMA).map((f) =>
    Object.prototype.hasOwnProperty.call(values, f.id) ? values[f.id] : null
  );
  return { decoded: { data } };
}

const chart = (over: Partial<Chart>): Chart =>
  ({
    name: "Test",
    type: "bar",
    xAxis: "Match Info - Team Number",
    yAxis: "Scoring - Points",
    ...over,
  }) as Chart;

// ---------------------------------------------------------------------------

describe("field references", () => {
  it("round-trips a section/field reference", () => {
    const ref = parseFieldRef(formatFieldRef("Scoring", "Points"));
    expect(ref).toEqual({ section: "Scoring", field: "Points" });
  });

  it("treats a bare name as matching any section", () => {
    expect(parseFieldRef("Points")).toEqual({ section: "", field: "Points" });
  });

  it("returns null for a missing reference", () => {
    expect(parseFieldRef(undefined)).toBeNull();
  });

  it("resolves to the same flat index the wire format uses", () => {
    const fields = resolveChartFields(chart({}), SCHEMA);
    const flat = orderedFields(SCHEMA);
    expect(flat[fields.x!.index].name).toBe("Team Number");
    expect(flat[fields.y!.index].name).toBe("Points");
  });

  it("finds Team Number for grouping", () => {
    expect(teamNumberIndex(SCHEMA)).toBe(1);
  });

  it("auto-groups a line chart by team", () => {
    const fields = resolveChartFields(
      chart({ type: "line", xAxis: "Match Info - Match Number" }),
      SCHEMA
    );
    expect(fields.groupByIndex).toBe(teamNumberIndex(SCHEMA));
  });

  it("detects a range slider", () => {
    const fields = resolveChartFields(chart({ yAxis: "Scoring - Range" }), SCHEMA);
    expect(fields.isRangeSlider).toBe(true);
  });
});

describe("aggregation", () => {
  it("applies each mode", () => {
    const v = [2, 4, 6];
    expect(aggregate(v, "sum", "counter")).toBe(12);
    expect(aggregate(v, "min", "counter")).toBe(2);
    expect(aggregate(v, "max", "counter")).toBe(6);
    expect(aggregate(v, "count", "counter")).toBe(3);
    expect(aggregate(v, "average", "counter")).toBe(4);
  });

  it("defaults to average", () => {
    expect(aggregate([1, 3], undefined, "counter")).toBe(2);
  });

  it("counts categorical values regardless of mode", () => {
    // There is no meaningful sum of labels.
    expect(aggregate(["Yes", "No", "Yes"], "sum", "dropdown")).toBe(3);
  });

  it("returns 0 rather than NaN for no numeric values", () => {
    expect(aggregate([], "average", "counter")).toBe(0);
  });

  it("computes a median for even and odd counts", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("value coercion", () => {
  it("converts a timer to deciseconds", () => {
    expect(toChartValue("2:30.0", "timer", false)).toBe(1500);
  });

  it("counts marked grid cells", () => {
    expect(toChartValue("2x2:[0,3]", "grid", false)).toBe(2);
  });

  it("maps a checkbox to 0/1", () => {
    expect(toChartValue(true, "checkbox", false)).toBe(1);
    expect(toChartValue(false, "checkbox", false)).toBe(0);
  });

  it("keeps categorical labels as strings", () => {
    expect(toChartValue("Yes", "dropdown", false)).toBe("Yes");
  });

  it("parses ranges from array, JSON and comma forms", () => {
    expect(parseRange([2, 5])).toEqual([2, 5]);
    expect(parseRange("[2,5]")).toEqual([2, 5]);
    expect(parseRange("2, 5")).toEqual([2, 5]);
    expect(parseRange("nonsense")).toBeNull();
  });

  it("treats a missing value as a count of 1", () => {
    expect(toChartValue(null, "counter", false)).toBe(1);
  });

  it("skips values that cannot be numeric", () => {
    expect(toNumber("abc", "counter")).toBeNull();
    expect(toNumber(7, "counter")).toBe(7);
  });
});

describe("grouping", () => {
  const data = [
    row({ 0: 1, 1: 1023, 100: 10 }),
    row({ 0: 2, 1: 1023, 100: 20 }),
    row({ 0: 1, 1: 254, 100: 30 }),
  ];

  it("groups flat by X for a bar chart", () => {
    const c = chart({});
    const fields = resolveChartFields(c, SCHEMA);
    const grouped = groupChartData(c, data, fields);
    expect(isGrouped(c, fields)).toBe(false);
    expect(grouped.byGroup).toBeNull();
    expect(grouped.flat!.get("1023")).toEqual([10, 20]);
    expect(grouped.flat!.get("254")).toEqual([30]);
  });

  it("nests by group then X for a grouped line chart", () => {
    const c = chart({ type: "line", xAxis: "Match Info - Match Number" });
    const fields = resolveChartFields(c, SCHEMA);
    const grouped = groupChartData(c, data, fields);
    expect(isGrouped(c, fields)).toBe(true);
    expect(grouped.byGroup!.get("1023")!.get("1")).toEqual([10]);
    expect(grouped.byGroup!.get("1023")!.get("2")).toEqual([20]);
  });

  it("skips rows with no X value", () => {
    const c = chart({});
    const fields = resolveChartFields(c, SCHEMA);
    const grouped = groupChartData(c, [row({ 100: 5 })], fields);
    expect(grouped.flat!.size).toBe(0);
  });

  it("counts values per team", () => {
    const { counts, teams } = countByValueAndTeam(data, 1, 1);
    expect(counts.get("1023")!.get("1023")).toBe(2);
    expect(teams.has("254")).toBe(true);
  });
});

describe("series builders", () => {
  const data = [
    row({ 0: 1, 1: 1023, 100: 10, 101: "Yes", 102: "2x2:[0,1]" }),
    row({ 0: 2, 1: 1023, 100: 20, 101: "No", 102: "2x2:[0]" }),
    row({ 0: 1, 1: 254, 100: 30, 101: "Yes", 102: "2x2:[3]" }),
  ];

  it("builds bar rows sorted by value", () => {
    const c = chart({ sortMode: "descending" });
    const fields = resolveChartFields(c, SCHEMA);
    const grouped = groupChartData(c, data, fields);
    const result = buildBarSeries(c, data, SCHEMA, grouped, fields);
    expect(result.map((r: any) => r.id)).toEqual(["254", "1023"]);
    expect(result[0].value).toBe(30);
    expect(result[1].value).toBe(15); // average of 10 and 20
  });

  it("builds a grouped bar chart for a categorical Y axis", () => {
    const c = chart({ yAxis: "Scoring - Climb" });
    const fields = resolveChartFields(c, SCHEMA);
    const grouped = groupChartData(c, data, fields);
    const result = buildBarSeries(c, data, SCHEMA, grouped, fields);
    // One row per label, one column per team, zero-filled.
    const yes = result.find((r) => r.category === "Yes")!;
    expect(yes["1023"]).toBe(1);
    expect(yes["254"]).toBe(1);
    const no = result.find((r) => r.category === "No")!;
    expect(no["254"]).toBe(0);
    expect(result.__teamKeys).toEqual(["254", "1023"]);
  });

  it("builds one cartesian series per team, sorted by X", () => {
    const c = chart({ type: "line", xAxis: "Match Info - Match Number" });
    const fields = resolveChartFields(c, SCHEMA);
    const grouped = groupChartData(c, data, fields);
    const result = buildCartesianSeries(c, grouped, fields);
    const team = result.find((s) => s.id === "1023")!;
    expect(team.data).toEqual([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]);
  });

  it("builds a single cartesian series when ungrouped", () => {
    const c = chart({ type: "scatter", groupBy: undefined });
    const fields = resolveChartFields(c, SCHEMA);
    // Force the ungrouped path: X is not Match Number, so no auto team grouping.
    expect(fields.groupByIndex).toBe(-1);
    const grouped = groupChartData(c, data, fields);
    const result = buildCartesianSeries(c, grouped, fields);
    expect(result).toHaveLength(1);
    expect(result[0].data).toHaveLength(2);
  });

  it("builds box plot points with padded bounds", () => {
    const c = chart({ type: "boxplot" });
    const fields = resolveChartFields(c, SCHEMA);
    const grouped = groupChartData(c, data, fields);
    const result = buildBoxplotSeries(c, grouped, fields);
    expect(result.map((p) => p.value).sort((a, b) => a - b)).toEqual([10, 20, 30]);
    expect(result.__minValue).toBeLessThan(10);
    expect(result.__maxValue).toBeGreaterThan(30);
  });

  it("expands a range slider into one point per step", () => {
    const c = chart({ type: "boxplot", yAxis: "Scoring - Range" });
    const fields = resolveChartFields(c, SCHEMA);
    const grouped = groupChartData(c, [row({ 1: 1023, 104: [2, 5] })], fields);
    const result = buildBoxplotSeries(c, grouped, fields);
    expect(result.map((p) => p.value)).toEqual([2, 3, 4, 5]);
  });

  it("emits every grid cell in a heat map, zero-filled", () => {
    const c = chart({ type: "heatmap", yAxis: "Scoring - Reef" });
    const fields = resolveChartFields(c, SCHEMA);
    const result = buildHeatmapSeries(c, data, SCHEMA, fields);
    const team = result.find((s) => s.id === "1023")!;
    // 2x2 grid -> four cells present even though only some were marked.
    expect(team.data.map((d) => d.x)).toEqual(["0,0", "0,1", "1,0", "1,1"]);
    expect(team.data.find((d) => d.x === "0,0")!.y).toBe(2);
    expect(team.data.find((d) => d.x === "1,1")!.y).toBe(0);
  });

  it("returns nothing for a heat map over a non-grid field", () => {
    const c = chart({ type: "heatmap", yAxis: "Scoring - Points" });
    const fields = resolveChartFields(c, SCHEMA);
    expect(buildHeatmapSeries(c, data, SCHEMA, fields)).toEqual([]);
  });

  it("builds pie slices labelled by count and team", () => {
    const c = chart({ type: "pie", yAxis: "Scoring - Climb" });
    const fields = resolveChartFields(c, SCHEMA);
    const result = buildPieSeries(data, SCHEMA, fields);
    expect(result.map((r) => r.label).sort()).toEqual([
      "1 - Team 1023",
      "1 - Team 1023",
      "1 - Team 254",
    ]);
  });
});
