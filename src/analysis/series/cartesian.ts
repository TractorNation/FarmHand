import { getMatchSortKey } from "../../utils/valueFormat";
import { aggregate } from "../aggregate";
import { ChartFields } from "../fieldRefs";
import { GroupedData } from "../groupData";

/**
 * Line and scatter series — one line per group, or a single line when ungrouped.
 *
 * Output: `[{ id: "1023", data: [{ x: 1, y: 10 }, …] }]`
 */

export interface CartesianSeries {
  id: string;
  data: Array<{ x: string | number; y: number }>;
}

/** Numeric X keys sort numerically; match labels fall back to competition order. */
function compareX(a: string | number, b: string | number): number {
  const aNum = typeof a === "number" ? a : Number(a);
  const bNum = typeof b === "number" ? b : Number(b);
  if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;

  const [aLevel, aMatch] = getMatchSortKey(String(a));
  const [bLevel, bMatch] = getMatchSortKey(String(b));
  return aLevel !== bLevel ? aLevel - bLevel : aMatch - bMatch;
}

/** Keeps an X key numeric where it can be, so axes scale rather than sort as text. */
function toXValue(xKey: string): string | number {
  const num = Number(xKey);
  return !isNaN(num) && isFinite(num) ? num : xKey;
}

function meanY(series: CartesianSeries): number {
  return series.data.reduce((sum, d) => sum + d.y, 0) / series.data.length;
}

export function buildCartesianSeries(
  chart: Chart,
  grouped: GroupedData,
  fields: ChartFields
): CartesianSeries[] {
  const yType = fields.y?.type ?? null;
  const result: CartesianSeries[] = [];

  if (grouped.byGroup) {
    grouped.byGroup.forEach((xValueMap, groupKey) => {
      const lineData: CartesianSeries["data"] = [];

      xValueMap.forEach((yValues, xKey) => {
        lineData.push({
          x: toXValue(xKey),
          y: aggregate(yValues, chart.aggregation, yType),
        });
      });

      lineData.sort((a, b) => compareX(a.x, b.x));
      if (lineData.length > 0) result.push({ id: groupKey, data: lineData });
    });

    // Ordering series by their average puts the strongest teams at one end of the
    // legend, which is the point of sorting a multi-line chart.
    if (chart.sortMode === "ascending") {
      result.sort((a, b) => meanY(a) - meanY(b));
    } else if (chart.sortMode === "descending") {
      result.sort((a, b) => meanY(b) - meanY(a));
    }

    return result;
  }

  if (!grouped.flat) return [];

  const lineData: CartesianSeries["data"] = [];
  grouped.flat.forEach((values, xKey) => {
    lineData.push({
      x: toXValue(xKey),
      y: aggregate(values, chart.aggregation, yType),
    });
  });

  lineData.sort((a, b) => compareX(a.x, b.x));
  if (lineData.length > 0) {
    result.push({ id: chart.name || "data", data: lineData });
  }

  return result;
}
