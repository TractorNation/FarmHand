import { useMemo } from "react";
import { alpha, lighten, darken } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveScatterPlot } from "@nivo/scatterplot";
import { ResponsiveBoxPlot } from "@nivo/boxplot";
import { ResponsiveHeatMap } from "@nivo/heatmap";
import useProcessedData from "../hooks/useProcessedData";

interface ChartRendererProps {
  chart: Chart;
  data: any[];
  schema?: Schema;
}

export default function ChartRenderer({
  chart,
  data,
  schema,
}: ChartRendererProps) {
  const theme = useTheme();
  const processedData = useProcessedData(chart, data, schema);

  // Get borderRadius as a number for bar charts (must be defined before chartTheme)
  const borderRadius = useMemo(() => {
    const br = theme.shape?.borderRadius;
    return typeof br === "number"
      ? br
      : typeof br === "string"
      ? parseInt(br, 10) || 4
      : 4;
  }, [theme.shape]);

  // Create comprehensive Nivo theme from Material-UI theme
  // Reference: https://nivo.rocks/guides/theming/
  const chartTheme = useMemo(() => {
    return {
      fontFamily: theme.typography.fontFamily,
      fontSize:
        typeof theme.typography.fontSize === "number"
          ? theme.typography.fontSize
          : 12,

      // Axes & Grid styling
      axis: {
        domain: {
          line: {
            stroke: theme.palette.divider,
            strokeWidth: 1,
          },
        },
        ticks: {
          line: {
            stroke: theme.palette.divider,
            strokeWidth: 1,
          },
          text: {
            fill: theme.palette.text.secondary,
            fontSize:
              typeof theme.typography.fontSize === "number"
                ? theme.typography.fontSize
                : 12,
            fontFamily: theme.typography.fontFamily,
          },
        },
        legend: {
          text: {
            fill: theme.palette.text.primary,
            fontSize:
              (typeof theme.typography.fontSize === "number"
                ? theme.typography.fontSize
                : 12) + 2,
            fontFamily: theme.typography.fontFamily,
            fontWeight: theme.typography.fontWeightMedium ?? 500,
          },
        },
      },

      // Grid lines
      grid: {
        line: {
          stroke: theme.palette.divider,
          strokeWidth: 1,
          strokeDasharray: "3 3",
          opacity: 0.5,
        },
      },

      // Legends styling
      legends: {
        text: {
          fill: theme.palette.text.primary,
          fontSize:
            typeof theme.typography.fontSize === "number"
              ? theme.typography.fontSize
              : 12,
          fontFamily: theme.typography.fontFamily,
        },
        title: {
          text: {
            fill: theme.palette.text.primary,
            fontSize:
              (typeof theme.typography.fontSize === "number"
                ? theme.typography.fontSize
                : 12) + 2,
            fontFamily: theme.typography.fontFamily,
            fontWeight: theme.typography.fontWeightMedium ?? 500,
          },
        },
      },

      // Labels styling (for pie charts, etc.)
      labels: {
        text: {
          fill: theme.palette.text.primary,
          fontSize:
            typeof theme.typography.fontSize === "number"
              ? theme.typography.fontSize
              : 12,
          fontFamily: theme.typography.fontFamily,
        },
      },

      // Tooltip styling
      tooltip: {
        container: {
          background: theme.palette.background.paper,
          color: theme.palette.text.primary,
          fontSize:
            typeof theme.typography.fontSize === "number"
              ? theme.typography.fontSize
              : 12,
          fontFamily: theme.typography.fontFamily,
          padding: "8px 12px",
          borderRadius: borderRadius,
          boxShadow:
            (theme as any).shadows?.[4] || "0px 2px 8px rgba(0,0,0,0.15)",
          border: `1px solid ${theme.palette.divider}`,
        },
      },

      // Annotations (for future use)
      annotations: {
        text: {
          fill: theme.palette.text.primary,
          fontSize:
            typeof theme.typography.fontSize === "number"
              ? theme.typography.fontSize
              : 12,
          fontFamily: theme.typography.fontFamily,
          outlineWidth: 2,
          outlineColor: theme.palette.background.paper,
        },
        link: {
          stroke: theme.palette.divider,
          strokeWidth: 1,
          outlineWidth: 2,
          outlineColor: theme.palette.background.paper,
        },
        outline: {
          stroke: theme.palette.divider,
          strokeWidth: 2,
          outlineWidth: 2,
          outlineColor: theme.palette.background.paper,
        },
        symbol: {
          fill: theme.palette.background.paper,
          outlineWidth: 2,
          outlineColor: theme.palette.background.paper,
        },
      },
    };
  }, [theme, borderRadius]);

  // Generate color palette from theme for charts
  // Creates a color scale based on the theme's primary/secondary colors
  const chartColors = useMemo(() => {
    // Create a color scale that harmonizes with the app theme
    // For multi-series charts, we'll use variations of the primary color
    const primary = theme.palette.primary.main;
    const secondary = theme.palette.secondary?.main || primary;
    const info = theme.palette.info?.main || primary;
    const success = theme.palette.success?.main || primary;
    const warning = theme.palette.warning?.main || primary;
    const error = theme.palette.error?.main || primary;

    // Return an array of colors for multi-series charts
    // Nivo will cycle through these colors
    return [primary, secondary, info, success, warning, error];
  }, [theme.palette]);

  if (processedData.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          overflow: "visible",
        }}
      >
        <Typography color="text.secondary">No data available</Typography>
      </Box>
    );
  }

  const chartContainerSx = {
    width: "100%",
    height: "100%",
    overflow: "visible" as const,
    position: "relative" as const,
  };

  switch (chart.type) {
    case "bar":
      // Check if this is a grouped bar chart (text/dropdown Y-axis with team subgroups)
      const originalProcessedData = processedData;
      const isGroupedBar =
        Array.isArray(originalProcessedData) &&
        originalProcessedData.length > 0 &&
        (originalProcessedData as any).__teamKeys &&
        Array.isArray((originalProcessedData as any).__teamKeys) &&
        (originalProcessedData as any).__teamKeys.length > 0;

      const teamKeys = isGroupedBar
        ? (originalProcessedData as any).__teamKeys
        : [];
      const barData = isGroupedBar
        ? originalProcessedData.filter(
            (item: any) => item.category !== undefined
          )
        : originalProcessedData;

      // Create a key that changes when any relevant bar chart configuration changes
      const barKey = `bar-${chart.id}-${chart.aggregation || "sum"}-${
        chart.sortMode || "none"
      }-${chart.xAxis || ""}-${chart.yAxis || ""}`;

      return (
        <Box sx={chartContainerSx}>
          <ResponsiveBar
            key={barKey}
            data={barData}
            keys={isGroupedBar ? teamKeys : ["value"]}
            indexBy={isGroupedBar ? "category" : "id"}
            groupMode={isGroupedBar ? "grouped" : undefined}
            margin={{
              top: 20,
              right: isGroupedBar ? 140 : 20,
              bottom: 50,
              left: 60,
            }}
            padding={0.3}
            colors={chartColors}
            theme={chartTheme}
            borderRadius={borderRadius}
            axisBottom={{
              tickRotation: -45,
              legend: isGroupedBar ? chart.yAxis || "Category" : chart.xAxis,
              legendPosition: "middle",
              legendOffset: 40,
            }}
            axisLeft={{
              legend: isGroupedBar ? "Count" : chart.yAxis || "Value",
              legendPosition: "middle",
              legendOffset: -50,
            }}
            legends={
              isGroupedBar
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
                      effects: [
                        {
                          on: "hover",
                          style: {
                            itemOpacity: 1,
                          },
                        },
                      ],
                    },
                  ]
                : undefined
            }
          />
        </Box>
      );

    case "line":
      const lerpType = chart.linearInterpolation ?? "natural";
      // Create a key that changes when any relevant line chart configuration changes
      const lineKey = `line-${chart.id}-${lerpType}-${
        chart.aggregation || "sum"
      }-${chart.groupBy || ""}-${chart.xAxis || ""}-${chart.yAxis || ""}`;

      return (
        <Box sx={chartContainerSx}>
          <ResponsiveLine
            key={lineKey}
            data={processedData}
            margin={{ top: 20, right: 110, bottom: 50, left: 60 }}
            xScale={{ type: "linear", min: "auto", max: "auto" }}
            yScale={{ type: "linear", min: "auto", max: "auto" }}
            curve={lerpType}
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
              Array.isArray(processedData) &&
              processedData.length > 1 &&
              processedData[0]?.id
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

    case "pie":
      // Create a key that changes when any relevant pie chart configuration changes
      const pieKey = `pie-${chart.id}-${chart.aggregation || "sum"}-${
        chart.yAxis || ""
      }`;

      return (
        <Box sx={chartContainerSx}>
          <ResponsivePie
            key={pieKey}
            data={processedData}
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

    case "scatter":
      // Create a key that changes when any relevant scatter chart configuration changes
      const scatterKey = `scatter-${chart.id}-${chart.aggregation || "sum"}-${
        chart.groupBy || ""
      }-${chart.xAxis || ""}-${chart.yAxis || ""}`;

      return (
        <Box sx={chartContainerSx}>
          <ResponsiveScatterPlot
            key={scatterKey}
            data={processedData}
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

    case "boxplot":
      // Create a key that changes when any relevant boxplot configuration changes
      const boxplotKey = `boxplot-${chart.id}-${chart.sortMode || "none"}-${
        chart.xAxis || ""
      }-${chart.yAxis || ""}`;

      return (
        <Box sx={chartContainerSx}>
          <ResponsiveBoxPlot
            key={boxplotKey}
            data={processedData}
            margin={{ top: 40, right: 140, bottom: 80, left: 60 }}
            minValue="auto"
            maxValue="auto"
            colors={chartColors}
            theme={chartTheme as any}
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

    case "heatmap":
      // Check if we have valid grid data
      if (!Array.isArray(processedData) || processedData.length === 0) {
        // Check if a grid field was selected
        let hasGridField = false;
        if (schema && chart.yAxis) {
          const yParts = chart.yAxis.split(" - ");
          if (yParts.length === 2) {
            for (
              let sectionIdx = 0;
              sectionIdx < schema.sections.length;
              sectionIdx++
            ) {
              const section = schema.sections[sectionIdx];
              if (section.title === yParts[0]) {
                const field = section.fields.find((f) => f.name === yParts[1]);
                if (field && field.type === "grid") {
                  hasGridField = true;
                  break;
                }
              }
            }
          }
        }

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

      // Calculate max value for color scale (min is always 0 for unchecked cells)
      const allValues: number[] = [];
      processedData.forEach((item: any) => {
        if (item.data && Array.isArray(item.data)) {
          item.data.forEach((d: { x: string; y: number }) => {
            if (typeof d.y === "number" && !isNaN(d.y)) {
              allValues.push(d.y);
            }
          });
        }
      });

      const maxValue = allValues.length > 0 ? Math.max(...allValues) : 1;

      // Determine color scheme configuration
      const selectedScheme = chart.colorScheme || "theme-primary";

      let colorsConfig: any;

      if (selectedScheme === "theme-primary") {
        // Use theme-based custom color function
        const mode = theme.palette.mode;
        const primary = theme.palette.primary.main;

        const getHeatmapColor = (cell: any) => {
          const value = cell.value || 0;
          const normalizedValue =
            maxValue > 0 && value > 0 ? value / maxValue : 0;

          // Create a sequential gradient from light to dark using primary color
          if (normalizedValue === 0) {
            return alpha(theme.palette.text.secondary, 0.1);
          }

          // Interpolate from light to dark based on normalized value
          if (normalizedValue <= 0.15) {
            return lighten(primary, mode === "light" ? 0.75 : 0.55);
          } else if (normalizedValue <= 0.3) {
            return lighten(primary, mode === "light" ? 0.6 : 0.4);
          } else if (normalizedValue <= 0.45) {
            return lighten(primary, mode === "light" ? 0.45 : 0.25);
          } else if (normalizedValue <= 0.6) {
            return lighten(primary, mode === "light" ? 0.3 : 0.15);
          } else if (normalizedValue <= 0.75) {
            return lighten(primary, mode === "light" ? 0.15 : 0.05);
          } else if (normalizedValue <= 0.9) {
            return primary;
          } else {
            return darken(primary, mode === "light" ? 0.15 : 0.1);
          }
        };

        colorsConfig = getHeatmapColor;
      } else {
        // Use predefined Nivo sequential color scheme
        // All schemes are sequential since heatmaps show count data (0 to max)
        colorsConfig = {
          type: "sequential",
          scheme: selectedScheme,
        };
      }

      // Create a key that changes when any relevant heatmap configuration changes
      const heatmapKey = `heatmap-${chart.id}-${
        chart.colorScheme || "theme-primary"
      }-${chart.xAxis || ""}-${chart.yAxis || ""}`;

      return (
        <Box sx={chartContainerSx}>
          <ResponsiveHeatMap
            key={heatmapKey}
            data={processedData}
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

    default:
      return <Typography>Unsupported chart type</Typography>;
  }
}
