/** A value collected for a chart: numeric, categorical, or a slider range. */
export type ChartValue = number | string | number[];

/**
 * Collapses a set of values to a single number.
 *
 * Categorical fields (text/dropdown/multiplechoice) always return a count — there is
 * no meaningful sum or average of labels — regardless of the requested mode.
 * Defaults to "average" when no mode is set.
 */
export function aggregate(
  values: ChartValue[],
  mode: Chart["aggregation"],
  fieldType: ComponentType | null
): number {
  if (
    fieldType === "text" ||
    fieldType === "dropdown" ||
    fieldType === "multiplechoice"
  ) {
    return values.length;
  }

  const nums = values
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((v) => !isNaN(v));
  if (nums.length === 0) return 0;

  switch (mode || "average") {
    case "sum":
      return nums.reduce((a, b) => a + b, 0);
    case "count":
      return values.length;
    case "min":
      return Math.min(...nums);
    case "max":
      return Math.max(...nums);
    case "average":
    default:
      return nums.reduce((a, b) => a + b, 0) / nums.length;
  }
}

/** Median of a numeric set. Used to order box plots by group. */
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
