import { Box } from "@mui/material";
import { ResponsivePie } from "@nivo/pie";
import { chartContainerSx, useChartTheme } from "./chartTheme";

/** Pie chart — one slice per team/value pair. */
export default function PieChart({ chart, data }: { chart: Chart; data: any[] }) {
  const { chartTheme, chartColors, borderRadius, theme } = useChartTheme();

  const key = `pie-${chart.id}-${chart.aggregation || "sum"}-${chart.yAxis || ""}`;

  return (
    <Box sx={chartContainerSx}>
      <ResponsivePie
        key={key}
        data={data}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={borderRadius}
        colors={chartColors}
        theme={chartTheme}
        arcLinkLabelsTextColor={theme.palette.text.primary}
        arcLabelsTextColor={theme.palette.background.paper}
      />
    </Box>
  );
}
