import { useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveScatterPlot } from "@nivo/scatterplot";
import { ResponsiveBoxPlot } from "@nivo/boxplot";

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

  // Process data based on chart configuration
  const processedData = useMemo(() => {
    if (!schema || !data.length) return [];

    // Parse field identifiers (format: "Section Name|Field Name")
    let xSectionName = "";
    let xFieldName = "";
    let ySectionName = "";
    let yFieldName = "";

    if (chart.xAxis) {
      const xParts = chart.xAxis.split(" - ");
      if (xParts.length === 2) {
        xSectionName = xParts[0];
        xFieldName = xParts[1];
      } else {
        // Backwards compatibility: if no - separator, assume it's just field name
        xFieldName = chart.xAxis;
      }
    }

    if (chart.yAxis) {
      const yParts = chart.yAxis.split(" - ");
      if (yParts.length === 2) {
        ySectionName = yParts[0];
        yFieldName = yParts[1];
      } else {
        // Backwards compatibility: if no - separator, assume it's just field name
        yFieldName = chart.yAxis;
      }
    }

    // Find field indices by section and field name
    // Build flat array with section tracking for absolute indices
    let xFieldIndex = -1;
    let yFieldIndex = -1;
    let absoluteIndex = 0;

    for (
      let sectionIdx = 0;
      sectionIdx < schema.sections.length;
      sectionIdx++
    ) {
      const section = schema.sections[sectionIdx];

      for (let fieldIdx = 0; fieldIdx < section.fields.length; fieldIdx++) {
        const field = section.fields[fieldIdx];

        // Check X-axis field
        if (xFieldIndex === -1 && field.name === xFieldName) {
          // If section name was specified, only match if it's the right section
          if (!xSectionName || section.title === xSectionName) {
            xFieldIndex = absoluteIndex;
          }
        }

        // Check Y-axis field
        if (yFieldIndex === -1 && yFieldName && field.name === yFieldName) {
          // If section name was specified, only match if it's the right section
          if (!ySectionName || section.title === ySectionName) {
            yFieldIndex = absoluteIndex;
          }
        }

        absoluteIndex++;
      }
    }

    if (xFieldIndex === -1) return [];

    // Group data by X-axis value
    const grouped = new Map<string, number[]>();

    data.forEach((item) => {
      if (!item || !item.decoded || !item.decoded.data) return;

      const xValue = item.decoded.data[xFieldIndex];
      if (xValue === undefined || xValue === null) return;

      const xKey = String(xValue);

      let yValue = 1; // Default for count when no y-axis
      if (yFieldIndex !== -1) {
        const rawYValue = item.decoded.data[yFieldIndex];
        if (rawYValue !== undefined && rawYValue !== null) {
          const numValue = Number(rawYValue);
          if (!isNaN(numValue)) {
            yValue = numValue;
          }
        }
      }

      if (!grouped.has(xKey)) {
        grouped.set(xKey, []);
      }
      grouped.get(xKey)!.push(yValue);
    });

    // Handle boxplot differently - it needs flat array of individual data points
    // Format: [{ group: "123", value: 1 }, { group: "123", value: 2 }, ...]
    if (chart.type === "boxplot") {
      const result: Array<{ group: string; value: number }> = [];
      let allValues: number[] = []; // Collect all values for min/max calculation

      grouped.forEach((values, key) => {
        // Filter out invalid values and keep all raw values
        values.forEach((v) => {
          const num = typeof v === 'number' ? v : Number(v);
          if (!isNaN(num) && isFinite(num) && num !== null && num !== undefined) {
            result.push({
              group: String(key),
              value: num,
            });
            allValues.push(num);
          }
        });
      });

      // Sort by median value if sortMode is specified
      // For flat array format, we need to group by group first, calculate median, then sort
      if (chart.sortMode && result.length > 0) {
        // Group data points by group to calculate medians
        const groupMedians = new Map<string, number[]>();
        result.forEach((item) => {
          if (!groupMedians.has(item.group)) {
            groupMedians.set(item.group, []);
          }
          groupMedians.get(item.group)!.push(item.value);
        });

        const getMedian = (arr: number[]) => {
          const sorted = [...arr].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
        };

        // Calculate median for each group
        const groupMedianMap = new Map<string, number>();
        groupMedians.forEach((values, group) => {
          groupMedianMap.set(group, getMedian(values));
        });

        // Sort the flat array by group median
        if (chart.sortMode === "ascending") {
          result.sort((a, b) => {
            const medianA = groupMedianMap.get(a.group) || 0;
            const medianB = groupMedianMap.get(b.group) || 0;
            return medianA - medianB;
          });
        } else if (chart.sortMode === "descending") {
          result.sort((a, b) => {
            const medianA = groupMedianMap.get(a.group) || 0;
            const medianB = groupMedianMap.get(b.group) || 0;
            return medianB - medianA;
          });
        }
      }

      // Store min/max in result metadata for use in rendering
      if (allValues.length > 0) {
        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);
        // Add padding of 5% to the range
        const range = maxValue - minValue;
        const padding = range * 0.05 || 1;
        (result as any).__minValue = minValue - padding;
        (result as any).__maxValue = maxValue + padding;
      }

      return result;
    }

    // For other chart types, aggregate the values
    const result: any[] = [];
    grouped.forEach((values, key) => {
      let aggregatedValue = 0;

      switch (chart.aggregation) {
        case "sum":
          aggregatedValue = values.reduce((a, b) => a + b, 0);
          break;
        case "average":
          aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case "count":
          aggregatedValue = values.length;
          break;
        case "min":
          aggregatedValue = Math.min(...values);
          break;
        case "max":
          aggregatedValue = Math.max(...values);
          break;
      }

      result.push({
        id: key,
        label: key,
        value: aggregatedValue,
        x: key,
        y: aggregatedValue,
      });
    });

    // Sort result if sortMode is specified (for bar charts)
    if (chart.sortMode && chart.type === "bar") {
      if (chart.sortMode === "ascending") {
        result.sort((a, b) => a.value - b.value);
      } else if (chart.sortMode === "descending") {
        result.sort((a, b) => b.value - a.value);
      }
      // "none" or undefined means no sorting
    }

    return result;
  }, [chart, data, schema]);

  const chartTheme = {
    axis: {
      ticks: {
        text: { fill: theme.palette.text.primary },
      },
      legend: {
        text: { fill: theme.palette.text.primary },
      },
    },
    legends: {
      text: { fill: theme.palette.text.primary },
    },
    labels: {
      text: { fill: theme.palette.text.primary },
    },
    tooltip: {
      container: {
        background: theme.palette.background.paper,
        color: theme.palette.text.primary,
      },
    },
  };

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
      return (
        <Box sx={chartContainerSx}>
        <ResponsiveBar
          data={processedData}
          keys={["value"]}
          indexBy="id"
          margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
          padding={0.3}
          colors={{ scheme: "nivo" }}
          theme={chartTheme}
          axisBottom={{
            tickRotation: -45,
            legend: chart.xAxis,
            legendPosition: "middle",
            legendOffset: 40,
          }}
          axisLeft={{
            legend: chart.yAxis || "Value",
            legendPosition: "middle",
            legendOffset: -50,
          }}
        />
        </Box>
      );

    case "line":
      return (
        <Box sx={chartContainerSx}>
        <ResponsiveLine
          data={[
            {
              id: chart.name,
              data: processedData.map((d) => ({ x: d.x, y: d.y })),
            },
          ]}
          margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear" }}
          curve="monotoneX"
          colors={{ scheme: "nivo" }}
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
        />
        </Box>
      );

    case "pie":
      return (
        <Box sx={chartContainerSx}>
        <ResponsivePie
          data={processedData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          innerRadius={0.5}
          padAngle={0.7}
          cornerRadius={3}
          colors={{ scheme: "nivo" }}
          theme={chartTheme}
          arcLinkLabelsTextColor={theme.palette.text.primary}
          arcLabelsTextColor={theme.palette.background.paper}
        />
        </Box>
      );

    case "scatter":
      return (
        <Box sx={chartContainerSx}>
        <ResponsiveScatterPlot
          data={[
            {
              id: chart.name,
              data: processedData.map((d) => ({ x: d.x, y: d.y })),
            },
          ]}
          margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
          xScale={{ type: "linear" }}
          yScale={{ type: "linear" }}
          colors={{ scheme: "nivo" }}
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
        />
        </Box>
      );

    case "boxplot":
      return (
        <Box sx={chartContainerSx}>
        <ResponsiveBoxPlot
          theme={chartTheme as any}
          data={processedData}
          margin={{ top: 40, right: 140, bottom: 80, left: 60 }}
          minValue="auto"
          maxValue="auto"
          colors={{ scheme: "nivo" }}
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
          borderRadius={2}
          padding={0.12}
        />
        </Box>
      );

    default:
      return <Typography>Unsupported chart type</Typography>;
  }
}
