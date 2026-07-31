import { Box } from "@mui/material";
import { ResponsiveScatterPlot } from "@nivo/scatterplot";
import { chartContainerSx, useChartTheme } from "./chartTheme";

/** Scatter plot — shares the cartesian series shape with the line chart. */
export default function ScatterChart({
  chart,
  data,
}: {
  chart: Chart;
  data: any[];
}) {
  const { chartTheme, chartColors } = useChartTheme();

  const key = `scatter-${chart.id}-${chart.aggregation || "sum"}-${
    chart.groupBy || ""
  }-${chart.xAxis || ""}-${chart.yAxis || ""}`;

  return (
    <Box sx={chartContainerSx}>
      <ResponsiveScatterPlot
        key={key}
        data={data}
        margin={{ top: 20, right: 110, bottom: 50, left: 60 }}
        xScale={{ type: "linear" }}
        yScale={{ type: "linear" }}
        colors={chartColors}
        theme={chartTheme}
        useMesh={true}
        axisBottom={{
          legend: chart.xAxis,
          legendPosition: "middle",
          legendOffset: 40,
        }}
        axisLeft={{
          legend: chart.yAxis || "Value",
          legendPosition: "middle",
          legendOffset: -50,
        }}
        legends={[
          {
            anchor: "bottom-right",
            direction: "column",
            translateX: 120,
            translateY: 0,
            itemWidth: 100,
            itemHeight: 16,
            itemsSpacing: 3,
            symbolShape: "circle",
          },
        ]}
      />
    </Box>
  );
}
