import { Box } from "@mui/material";
import { ResponsiveBar } from "@nivo/bar";
import { chartContainerSx, useChartTheme } from "./chartTheme";
import type { SeriesRows } from "../../analysis/series/categorical";

/**
 * Bar chart, in either of two shapes:
 *
 * - **Simple** — one bar per X value, keyed `value`/`id`.
 * - **Grouped** — a categorical Y axis produces one bar cluster per label with a bar
 *   per team. The series builder signals this by attaching `__teamKeys`.
 */
export default function BarChart({
  chart,
  data,
}: {
  chart: Chart;
  data: SeriesRows;
}) {
  const { chartTheme, chartColors, borderRadius } = useChartTheme();

  const teamKeys = data.__teamKeys ?? [];
  const isGrouped = teamKeys.length > 0;

  const barData = isGrouped
    ? data.filter((item: any) => item.category !== undefined)
    : data;

  // Nivo caches internal scales, so the key forces a remount whenever a config
  // change would otherwise leave stale axes behind.
  const key = `bar-${chart.id}-${chart.aggregation || "sum"}-${
    chart.sortMode || "none"
  }-${chart.xAxis || ""}-${chart.yAxis || ""}`;

  return (
    <Box sx={chartContainerSx}>
      <ResponsiveBar
        key={key}
        data={barData}
        keys={isGrouped ? teamKeys : ["value"]}
        indexBy={isGrouped ? "category" : "id"}
        groupMode={isGrouped ? "grouped" : undefined}
        margin={{ top: 20, right: isGrouped ? 140 : 20, bottom: 50, left: 60 }}
        padding={0.3}
        colors={chartColors}
        theme={chartTheme}
        borderRadius={borderRadius}
        axisBottom={{
          tickRotation: -45,
          legend: isGrouped ? chart.yAxis || "Category" : chart.xAxis,
          legendPosition: "middle",
          legendOffset: 40,
        }}
        axisLeft={{
          legend: isGrouped ? "Count" : chart.yAxis || "Value",
          legendPosition: "middle",
          legendOffset: -50,
        }}
        legends={
          isGrouped
            ? [
                {
                  dataFrom: "keys",
                  anchor: "bottom-right",
                  direction: "column",
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemWidth: 100,
                  itemHeight: 20,
                  itemDirection: "left-to-right",
                  itemOpacity: 0.85,
                  symbolSize: 12,
                  effects: [{ on: "hover", style: { itemOpacity: 1 } }],
                },
              ]
            : undefined
        }
      />
    </Box>
  );
}
