import { Box, Typography } from "@mui/material";
import { alpha, lighten, darken } from "@mui/material/styles";
import { ResponsiveHeatMap } from "@nivo/heatmap";
import { chartContainerSx, useChartTheme } from "./chartTheme";
import { parseFieldRef } from "../../analysis/fieldRefs";

/**
 * Heat map over a grid field.
 *
 * Carries its own empty state because "no data" and "you picked a field that cannot
 * be heat-mapped" are different problems with different fixes, and only this chart
 * type can tell them apart.
 */
export default function HeatMapChart({
  chart,
  data,
  schema,
}: {
  chart: Chart;
  data: any[];
  schema?: Schema;
}) {
  const { chartTheme, theme } = useChartTheme();

  if (!Array.isArray(data) || data.length === 0) {
    const ref = parseFieldRef(chart.yAxis);
    const hasGridField = Boolean(
      schema &&
        ref?.section &&
        schema.sections
          .find((s) => s.title === ref.section)
          ?.fields.find((f) => f.name === ref.field && f.type === "grid")
    );

    return (
      <Box sx={chartContainerSx}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <Typography color="text.secondary">
            {!hasGridField
              ? "No compatible fields found in schema. Please select a Grid field."
              : "No data available"}
          </Typography>
        </Box>
      </Box>
    );
  }

  // Colour scale runs 0..max; 0 is meaningful here (an unmarked cell), so it gets a
  // muted tint rather than being treated as absent.
  const values: number[] = [];
  for (const item of data) {
    if (Array.isArray(item.data)) {
      for (const d of item.data) {
        if (typeof d.y === "number" && !isNaN(d.y)) values.push(d.y);
      }
    }
  }
  const maxValue = values.length > 0 ? Math.max(...values) : 1;

  const scheme = chart.colorScheme || "theme-primary";
  let colorsConfig: any;

  if (scheme === "theme-primary") {
    const mode = theme.palette.mode;
    const primary = theme.palette.primary.main;

    colorsConfig = (cell: any) => {
      const value = cell.value || 0;
      const normalized = maxValue > 0 && value > 0 ? value / maxValue : 0;

      if (normalized === 0) return alpha(theme.palette.text.secondary, 0.1);
      if (normalized <= 0.15) return lighten(primary, mode === "light" ? 0.75 : 0.55);
      if (normalized <= 0.3) return lighten(primary, mode === "light" ? 0.6 : 0.4);
      if (normalized <= 0.45) return lighten(primary, mode === "light" ? 0.45 : 0.25);
      if (normalized <= 0.6) return lighten(primary, mode === "light" ? 0.3 : 0.15);
      if (normalized <= 0.75) return lighten(primary, mode === "light" ? 0.15 : 0.05);
      if (normalized <= 0.9) return primary;
      return darken(primary, mode === "light" ? 0.15 : 0.1);
    };
  } else {
    // Every built-in option is sequential, because a heat map here shows counts.
    colorsConfig = { type: "sequential", scheme };
  }

  const key = `heatmap-${chart.id}-${chart.colorScheme || "theme-primary"}-${
    chart.xAxis || ""
  }-${chart.yAxis || ""}`;

  return (
    <Box sx={chartContainerSx}>
      <ResponsiveHeatMap
        key={key}
        data={data}
        margin={{ top: 40, right: 90, bottom: 50, left: 90 }}
        axisTop={{
          tickSize: 0,
          tickPadding: 0,
          tickValues: [],
          legend: chart.yAxis || "Field",
          legendPosition: "middle",
          legendOffset: -30,
        }}
        axisLeft={{
          legend: chart.xAxis || "Group",
          legendOffset: -70,
        }}
        colors={colorsConfig}
        emptyColor={alpha(theme.palette.text.secondary, 0.15)}
        borderWidth={1}
        borderColor={theme.palette.divider}
        theme={chartTheme}
        legends={[
          {
            anchor: "bottom",
            translateX: 0,
            translateY: 40,
            length: 400,
            thickness: 8,
            direction: "row",
            tickPosition: "after",
            tickSize: 3,
            tickSpacing: 4,
            tickOverlap: false,
            tickFormat: ">-.2s",
            title: "Value →",
            titleAlign: "start",
            titleOffset: 4,
          },
        ]}
      />
    </Box>
  );
}
