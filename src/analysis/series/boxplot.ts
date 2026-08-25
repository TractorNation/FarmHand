import { median } from "../aggregate";
import { toNumber, parseRange } from "../coerceValue";
import { ChartFields } from "../fieldRefs";
import { GroupedData } from "../groupData";

/**
 * Box plot data — every observation, not an aggregate, since the distribution is
 * the point.
 *
 * Output: `[{ group: "1023", value: 12 }, …]`, with the overall min/max attached as
 * `__minValue`/`__maxValue` so the renderer can pad the axis without recomputing.
 */

export interface BoxplotPoint {
  group: string;
  value: number;
}

export interface BoxplotSeries extends Array<BoxplotPoint> {
  __minValue?: number;
  __maxValue?: number;
}

export function buildBoxplotSeries(
  chart: Chart,
  grouped: GroupedData,
  fields: ChartFields
): BoxplotSeries {
  if (!grouped.flat) return [];

  const yType = fields.y?.type ?? null;
  const step = fields.y?.props?.step || 1;

  const result: BoxplotSeries = [];
  const allValues: number[] = [];

  grouped.flat.forEach((values, key) => {
    for (const value of values) {
      if (fields.isRangeSlider) {
        const range = parseRange(value);
        if (!range) continue;

        // A range answer means "everything between these", so expand it into one
        // point per step — otherwise a range would weigh the same as a single value.
        const [lo, hi] = [Math.min(...range), Math.max(...range)];
        for (let current = lo; current <= hi; current += step) {
          result.push({ group: String(key), value: current });
          allValues.push(current);
        }
        continue;
      }

      const num = toNumber(value, yType);
      if (num === null) continue;
      result.push({ group: String(key), value: num });
      allValues.push(num);
    }
  });

  if (chart.sortMode && result.length > 0) {
    const byGroup = new Map<string, number[]>();
    for (const point of result) {
      const bucket = byGroup.get(point.group);
      if (bucket) bucket.push(point.value);
      else byGroup.set(point.group, [point.value]);
    }

    const medians = new Map<string, number>();
    byGroup.forEach((values, group) => medians.set(group, median(values)));

    const direction = chart.sortMode === "descending" ? -1 : 1;
    if (chart.sortMode === "ascending" || chart.sortMode === "descending") {
      result.sort(
        (a, b) =>
          direction *
          ((medians.get(a.group) || 0) - (medians.get(b.group) || 0))
      );
    }
  }

  if (allValues.length > 0) {
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const padding = (maxValue - minValue) * 0.05 || 1;
    result.__minValue = minValue - padding;
    result.__maxValue = maxValue + padding;
  }

  return result;
}
