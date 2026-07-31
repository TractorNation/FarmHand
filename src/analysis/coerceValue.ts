import { parseGridToNumber } from "../utils/grid";
import { parseTime } from "../utils/valueFormat";
import { ChartValue } from "./aggregate";

/**
 * Turning a stored field value into something a chart can plot.
 *
 * Every field type stores differently — a timer is `"2:30.0"`, a grid is
 * `"3x3:[0,4]"`, a range slider is `[min, max]` — so this is where those shapes
 * become numbers. Shared by every series builder so a timer means the same thing on
 * a bar chart and a box plot.
 */

/**
 * Parses a range-slider value, which may be a real array, a JSON string, or a
 * comma-separated pair depending on how it was stored.
 */
export function parseRange(value: unknown): [number, number] | null {
  if (Array.isArray(value)) {
    if (
      value.length === 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      return [value[0], value[1]];
    }
    return null;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length === 2) {
        return [Number(parsed[0]), Number(parsed[1])];
      }
    } catch {
      const parts = value.split(",").map((s) => s.trim());
      if (parts.length === 2) {
        const min = Number(parts[0]);
        const max = Number(parts[1]);
        if (!isNaN(min) && !isNaN(max)) return [min, max];
      }
    }
  }

  return null;
}

/**
 * Converts a raw decoded value into the value a chart groups on.
 *
 * Returns `1` when there is no Y field at all, which is what makes an
 * axis-less chart a count.
 */
export function toChartValue(
  raw: unknown,
  fieldType: ComponentType | null,
  isRangeSlider: boolean
): ChartValue {
  if (raw === undefined || raw === null) return 1;

  if (isRangeSlider) {
    const range = parseRange(raw);
    // Fall through to 1 (the count default) when a range cannot be read, matching
    // the original behaviour of leaving yValue untouched.
    return range ?? 1;
  }

  switch (fieldType) {
    case "timer":
      return parseTime(String(raw));

    case "grid":
      return parseGridToNumber(String(raw)) ?? 1;

    case "checkbox":
      return raw ? 1 : 0;

    case "text":
    case "dropdown":
    case "multiplechoice":
      // Categorical: keep the label; it gets counted at aggregation time.
      return String(raw);

    default: {
      const num = Number(raw);
      return isNaN(num) ? 1 : num;
    }
  }
}

/**
 * Converts one collected value to a plain number, for charts that plot every
 * observation rather than an aggregate (box plots). Returns null to skip.
 */
export function toNumber(
  value: ChartValue,
  fieldType: ComponentType | null
): number | null {
  let num: number;

  if (fieldType === "timer") {
    num = parseTime(String(value));
  } else if (fieldType === "grid") {
    const cells = parseGridToNumber(String(value));
    if (cells === null) return null;
    num = cells;
  } else if (fieldType === "checkbox") {
    num = value ? 1 : 0;
  } else {
    num = typeof value === "number" ? value : Number(value);
  }

  return !isNaN(num) && isFinite(num) ? num : null;
}
