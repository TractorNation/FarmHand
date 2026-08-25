/**
 * Grid-field value parsing.
 *
 * A grid stores as `"<rows>x<cols>:[<checked indices>]"`, e.g. `"3x3:[0,4,8]"`.
 * Collected here because the shape is read by the input component, the match codec,
 * the review display and the analysis code — four places that must agree on it.
 */

/** Count of active cells, or null when the value is not a grid string. */
export function parseGridToNumber(
  gridString: string | undefined | null
): number | null {
  if (!gridString || typeof gridString !== "string") {
    return null;
  }

  // No bracket group at all means this is not a grid value. Returning null rather
  // than 0 matters: `toNumber` skips a null so a corrupt value stays out of an
  // average, where a 0 would silently drag it down. An empty `[]` is a real answer
  // of zero cells and still returns 0.
  const match = gridString.match(/\[(.*)\]/);
  if (!match) return null;

  const indices = match[1]
    .split(",")
    .map((n) => parseInt(n.trim(), 10))
    .filter((n) => !isNaN(n));
  return indices.length;
}

/** Dimensions plus checked cell indices, or null when the value is not a grid string. */
export function parseGridData(
  gridString: string | undefined | null
): { rows: number; cols: number; checkedIndices: number[] } | null {
  if (!gridString || typeof gridString !== "string") {
    return null;
  }

  // Extract dimensions: "3x3:[1,2,3]" -> rows=3, cols=3
  const dimMatch = gridString.match(/^(\d+)x(\d+):/);
  if (!dimMatch) return null;

  const rows = parseInt(dimMatch[1], 10);
  const cols = parseInt(dimMatch[2], 10);

  // Extract checked indices: "[1,2,3]" -> [1, 2, 3]
  const indicesMatch = gridString.match(/\[(.*)\]/);
  const checkedIndices: number[] = [];

  if (indicesMatch && indicesMatch[1]) {
    if (indicesMatch[1].trim() !== "") {
      const indices = indicesMatch[1]
        .split(",")
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => !isNaN(n));
      checkedIndices.push(...indices);
    }
  }

  return { rows, cols, checkedIndices };
}

/** Convert cell index to a coordinate string (5 -> "1,2" on a 3-column grid). */
export function indexToCoordinate(index: number, cols: number): string {
  const row = Math.floor(index / cols);
  const col = index % cols;
  return `${row},${col}`;
}
