import { indexToCoordinate, parseGridData } from "../../utils/grid";
import { ChartFields, parseFieldRef } from "../fieldRefs";

/**
 * Heat map series: how often each cell of a grid field was marked, per X group.
 *
 * Emits **every** cell of the grid, not just the marked ones, so the rendered map
 * keeps its shape and an unused cell reads as zero rather than as a hole.
 *
 * Output: `[{ id: "Team 1", data: [{ x: "0,0", y: 5 }, …] }]`
 */

export interface HeatmapSeries {
  id: string;
  data: Array<{ x: string; y: number }>;
}

/** Grid dimensions, preferring the data and falling back to the schema. */
function resolveDimensions(
  chart: Chart,
  data: any[],
  schema: Schema,
  yIndex: number
): { rows: number; cols: number } {
  for (const item of data) {
    if (!item || !item.decoded || !item.decoded.data) continue;
    const gridValue = item.decoded.data[yIndex];
    if (gridValue === undefined || gridValue === null) continue;

    const parsed = parseGridData(String(gridValue));
    if (parsed) return { rows: parsed.rows, cols: parsed.cols };
  }

  // No usable grid value in the data — take the declared size from the schema.
  const ref = parseFieldRef(chart.yAxis);
  if (ref?.section) {
    for (const section of schema.sections) {
      if (section.title !== ref.section) continue;
      const field = section.fields.find((f) => f.name === ref.field);
      if (field?.type === "grid" && field.props) {
        return { rows: field.props.rows || 3, cols: field.props.cols || 3 };
      }
    }
  }

  return { rows: 3, cols: 3 };
}

export function buildHeatmapSeries(
  chart: Chart,
  data: any[],
  schema: Schema,
  fields: ChartFields
): HeatmapSeries[] {
  const xIndex = fields.x?.index ?? -1;
  const yIndex = fields.y?.index ?? -1;

  // A heat map only means anything over a grid field.
  if (fields.y?.type !== "grid" || xIndex === -1 || yIndex === -1) {
    return [];
  }

  const { rows, cols } = resolveDimensions(chart, data, schema, yIndex);

  const cellPositions: string[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cellPositions.push(`${row},${col}`);
    }
  }

  // group key → cell position → times marked
  const counts = new Map<string, Map<string, number>>();

  for (const item of data) {
    if (!item || !item.decoded || !item.decoded.data) continue;

    const xValue = item.decoded.data[xIndex];
    if (xValue === undefined || xValue === null) continue;
    const groupKey = String(xValue);

    const gridValue = item.decoded.data[yIndex];
    if (gridValue === undefined || gridValue === null) continue;

    const parsed = parseGridData(String(gridValue));
    if (!parsed) continue;

    let cellCounts = counts.get(groupKey);
    if (!cellCounts) {
      cellCounts = new Map<string, number>();
      counts.set(groupKey, cellCounts);
    }

    for (const cellIndex of parsed.checkedIndices) {
      const cellPos = indexToCoordinate(cellIndex, parsed.cols);
      cellCounts.set(cellPos, (cellCounts.get(cellPos) || 0) + 1);
    }
  }

  const result: HeatmapSeries[] = [];
  counts.forEach((cellCounts, groupKey) => {
    result.push({
      id: groupKey,
      data: cellPositions.map((cellPos) => ({
        x: cellPos,
        y: cellCounts.get(cellPos) || 0,
      })),
    });
  });

  return result;
}
