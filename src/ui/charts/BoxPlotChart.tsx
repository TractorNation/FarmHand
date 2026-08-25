import { Box } from "@mui/material";
import { ResponsiveBoxPlot } from "@nivo/boxplot";
import { chartContainerSx, useChartTheme } from "./chartTheme";

/** Box plot — plots every observation, grouped, so the spread is visible. */
export default function BoxPlotChart({
  chart,
  data,
}: {
  chart: Chart;
  data: any[];
}) {
  const { chartTheme, chartColors, borderRadius } = useChartTheme();

  const key = `boxplot-${chart.id}-${chart.sortMode || "none"}-${
    chart.xAxis || ""
  }-${chart.yAxis || ""}`;

  return (
    <Box sx={chartContainerSx}>
      <ResponsiveBoxPlot
        key={key}
        data={data}
        margin={{ top: 40, right: 140, bottom: 80, left: 60 }}
        minValue="auto"
        maxValue="auto"
        colors={chartColors}
        // @nivo/boxplot types this prop as `PartialTheme & { translation }`, which no
        // other Nivo chart requires and which is not a theming concept. The cast
        // works around that upstream type, not around our own theme object.
        theme={chartTheme as never}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: chart.xAxis,
          legendPosition: "middle",
          legendOffset: 60,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: chart.yAxis || "Value",
          legendPosition: "middle",
          legendOffset: -50,
        }}
        borderRadius={borderRadius}
        padding={0.12}
      />
    </Box>
  );
}
