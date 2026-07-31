import { useMemo } from "react";
import { resolveChartFields } from "../analysis/fieldRefs";
import { groupChartData, isGrouped } from "../analysis/groupData";
import { buildHeatmapSeries } from "../analysis/series/heatmap";
import { buildCartesianSeries } from "../analysis/series/cartesian";
import { buildBoxplotSeries } from "../analysis/series/boxplot";
import { buildBarSeries, buildPieSeries } from "../analysis/series/categorical";

/**
 * Shapes decoded match data into the series a chart component renders.
 *
 * This is a dispatcher only — the field resolution, value coercion, grouping and
 * per-chart-type algorithms live in `src/analysis/`, so each chart algorithm can be
 * read and changed independently.
 *
 * The branch order below is load-bearing: heat maps and box plots claim their types
 * before the generic paths, and grouped line/scatter is distinct from ungrouped.
 */
export default function useProcessedData(
  chart: Chart,
  data: any[],
  schema?: Schema
) {
  return useMemo(() => {
    if (!schema || !data.length) return [];

    const fields = resolveChartFields(chart, schema);

    // Without an X field there is nothing to plot against.
    if (!fields.x) return [];

    const grouped = groupChartData(chart, data, fields);

    if (chart.type === "heatmap") {
      return buildHeatmapSeries(chart, data, schema, fields);
    }

    if (chart.type === "boxplot") {
      return buildBoxplotSeries(chart, grouped, fields);
    }

    if (chart.type === "line" || chart.type === "scatter") {
      // Grouped and ungrouped both produce series; the builder reads whichever
      // grouping was populated.
      if (isGrouped(chart, fields) || grouped.flat) {
        return buildCartesianSeries(chart, grouped, fields);
      }
      return [];
    }

    if (chart.type === "pie") {
      return buildPieSeries(data, schema, fields);
    }

    if (!grouped.flat) return [];
    return buildBarSeries(chart, data, schema, grouped, fields);
  }, [chart, data, schema]);
}
