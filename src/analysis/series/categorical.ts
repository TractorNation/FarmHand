import { aggregate } from "../aggregate";
import { ChartFields, teamNumberIndex } from "../fieldRefs";
import { GroupedData, countByValueAndTeam } from "../groupData";

/**
 * Pie and bar series.
 *
 * Both start from "how often did each team record each value" — see
 * `countByValueAndTeam` — and differ only in how they present it: a pie emits one
 * slice per team/value pair, a bar emits one row per value with a column per team.
 */

/**
 * Bar rows, with the team column order carried alongside.
 *
 * A grouped bar chart needs both the rows and the set of team keys spanning them,
 * and the keys cannot be recovered from a single row. `__teamKeys` is absent for
 * ungrouped series, which is how the renderer tells the two shapes apart.
 */
export interface SeriesRows extends Array<Record<string, any>> {
  __teamKeys?: string[];
}

/** Slices: `{ id, label, value }`. */
export function buildPieSeries(
  data: any[],
  schema: Schema,
  fields: ChartFields
): any[] {
  // Pie charts fall back to the X field when no Y is configured — a pie of one
  // field's distribution is the common case.
  const valueIndex = fields.y?.index ?? fields.x?.index ?? -1;
  if (valueIndex === -1) return [];

  const { counts } = countByValueAndTeam(
    data,
    valueIndex,
    teamNumberIndex(schema)
  );

  const result: any[] = [];
  counts.forEach((teamCounts, value) => {
    teamCounts.forEach((count, team) => {
      const label = `${count} - Team ${team}`;
      result.push({ id: label, label, value });
    });
  });

  return result;
}

/** True when a bar chart's Y axis holds labels rather than numbers. */
export function isCategoricalBar(chart: Chart, fields: ChartFields): boolean {
  const yType = fields.y?.type;
  return (
    chart.type === "bar" &&
    (yType === "text" || yType === "dropdown" || yType === "multiplechoice")
  );
}

/**
 * Bar rows.
 *
 * A categorical Y axis produces a grouped bar chart — one row per value, one column
 * per team — with the team keys attached as `__teamKeys` for the renderer. Anything
 * else is aggregated per X value into the flat `{id,label,value,x,y}` shape the bar
 * and scatter renderers share.
 */
export function buildBarSeries(
  chart: Chart,
  data: any[],
  schema: Schema,
  grouped: GroupedData,
  fields: ChartFields
): SeriesRows {
  const result: SeriesRows = [];

  if (isCategoricalBar(chart, fields)) {
    const yIndex = fields.y?.index ?? -1;
    if (yIndex === -1) return result;

    const { counts, teams } = countByValueAndTeam(
      data,
      yIndex,
      teamNumberIndex(schema)
    );

    const sortedTeams = Array.from(teams).sort((a, b) => {
      const aNum = Number(a);
      const bNum = Number(b);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return a.localeCompare(b);
    });

    counts.forEach((teamCounts, value) => {
      const row: any = { category: value, id: value };
      // Every team gets a column, zero-filled, so bars line up across rows.
      for (const team of sortedTeams) {
        row[team] = teamCounts.get(team) || 0;
      }
      result.push(row);
    });

    result.__teamKeys = sortedTeams;
  } else {
    if (!grouped.flat) return result;
    const yType = fields.y?.type ?? null;

    grouped.flat.forEach((values, key) => {
      const value = aggregate(values, chart.aggregation, yType);
      // Both keyings are emitted because the bar and scatter renderers read
      // different ones from the same shape.
      result.push({ id: key, label: key, value, x: key, y: value });
    });
  }

  if (chart.type === "bar") {
    if (chart.sortMode === "ascending") {
      result.sort((a, b) => a.value - b.value);
    } else if (chart.sortMode === "descending") {
      result.sort((a, b) => b.value - a.value);
    }
  }

  return result;
}
