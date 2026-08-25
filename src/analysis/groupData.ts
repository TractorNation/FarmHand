import { ChartValue } from "./aggregate";
import { ChartFields } from "./fieldRefs";
import { toChartValue } from "./coerceValue";

/**
 * The one pass over match data that every non-heatmap series builder starts from.
 *
 * Produces either a nested grouping (one series per team/group, then by X value) or
 * a flat one keyed by X value. Which you get depends on whether the chart is grouped
 * — the builders each know which they expect.
 */

export interface GroupedData {
  /** group key → X key → values. Set only for grouped line/scatter charts. */
  byGroup: Map<string, Map<string, ChartValue[]>> | null;
  /** X key → values. Set for every other chart. */
  flat: Map<string, ChartValue[]> | null;
}

/** True when this chart splits into one series per group. */
export function isGrouped(chart: Chart, fields: ChartFields): boolean {
  return (
    (chart.type === "line" || chart.type === "scatter") &&
    fields.groupByIndex !== -1
  );
}

export function groupChartData(
  chart: Chart,
  data: any[],
  fields: ChartFields
): GroupedData {
  const grouped = isGrouped(chart, fields);
  const byGroup = grouped ? new Map<string, Map<string, ChartValue[]>>() : null;
  const flat = grouped ? null : new Map<string, ChartValue[]>();

  const xIndex = fields.x?.index ?? -1;
  const yIndex = fields.y?.index ?? -1;

  for (const item of data) {
    if (!item || !item.decoded || !item.decoded.data) continue;

    const xValue = item.decoded.data[xIndex];
    if (xValue === undefined || xValue === null) continue;

    const xKey =
      fields.x?.type === "checkbox" ? String(Boolean(xValue)) : String(xValue);

    const yValue =
      yIndex === -1
        ? 1
        : toChartValue(
            item.decoded.data[yIndex],
            fields.y?.type ?? null,
            fields.isRangeSlider
          );

    if (byGroup) {
      const groupValue = item.decoded.data[fields.groupByIndex];
      if (groupValue === undefined || groupValue === null) continue;
      const groupKey = String(groupValue);

      let groupMap = byGroup.get(groupKey);
      if (!groupMap) {
        groupMap = new Map<string, ChartValue[]>();
        byGroup.set(groupKey, groupMap);
      }
      const bucket = groupMap.get(xKey);
      if (bucket) bucket.push(yValue);
      else groupMap.set(xKey, [yValue]);
    } else if (flat) {
      const bucket = flat.get(xKey);
      if (bucket) bucket.push(yValue);
      else flat.set(xKey, [yValue]);
    }
  }

  return { byGroup, flat };
}

/**
 * Counts occurrences of a field's values, split by team.
 *
 * Shared by pie charts and by bar charts with a categorical Y axis — both answer
 * "how many times did each team record each value", they just render it differently.
 */
export function countByValueAndTeam(
  data: any[],
  valueIndex: number,
  teamIndex: number
): { counts: Map<string, Map<string, number>>; teams: Set<string> } {
  const counts = new Map<string, Map<string, number>>();
  const teams = new Set<string>();

  for (const item of data) {
    if (!item || !item.decoded || !item.decoded.data) continue;

    const fieldValue = item.decoded.data[valueIndex];
    if (fieldValue === undefined || fieldValue === null) continue;
    const key = String(fieldValue);

    let team = "Unknown";
    if (teamIndex !== -1) {
      const teamValue = item.decoded.data[teamIndex];
      if (teamValue !== undefined && teamValue !== null) {
        team = String(teamValue);
        teams.add(team);
      }
    }

    let teamCounts = counts.get(key);
    if (!teamCounts) {
      teamCounts = new Map<string, number>();
      counts.set(key, teamCounts);
    }
    teamCounts.set(team, (teamCounts.get(team) || 0) + 1);
  }

  return { counts, teams };
}
