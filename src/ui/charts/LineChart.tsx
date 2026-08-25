import { Box } from "@mui/material";
import { ResponsiveLine } from "@nivo/line";
import { chartContainerSx, useChartTheme } from "./chartTheme";

/** Line chart — one line per series produced by the cartesian builder. */
export default function LineChart({ chart, data }: { chart: Chart; data: any[] }) {
  const { chartTheme, chartColors } = useChartTheme();

  const curve = chart.linearInterpolation ?? "natural";
  const key = `line-${chart.id}-${curve}-${chart.aggregation || "sum"}-${
    chart.groupBy || ""
  }-${chart.xAxis || ""}-${chart.yAxis || ""}`;

  // A legend only earns its space when there is more than one named series.
  const showLegend =
    Array.isArray(data) && data.length > 1 && Boolean(data[0]?.id);

  return (
    <Box sx={chartContainerSx}>
      <ResponsiveLine
        key={key}
        data={data}
        margin={{ top: 20, right: 110, bottom: 50, left: 60 }}
        xScale={{ type: "linear", min: "auto", max: "auto" }}
        yScale={{ type: "linear", min: "auto", max: "auto" }}
        curve={curve}
        colors={chartColors}
        theme={chartTheme}
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
        pointSize={8}
        pointBorderWidth={2}
        pointBorderColor={{ from: "serieColor" }}
        enableSlices={false}
        useMesh={true}
        enableTouchCrosshair={true}
        legends={
          showLegend
            ? [
                {
                  anchor: "bottom-right",
                  direction: "column",
                  translateX: 100,
                  itemWidth: 80,
                  itemHeight: 20,
                  symbolShape: "circle",
                },
              ]
            : []
        }
      />
    </Box>
  );
}
