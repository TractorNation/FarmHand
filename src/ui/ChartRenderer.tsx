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

export default function ChartRenderer({ chart, data, schema }: ChartRendererProps) {
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

    for (let sectionIdx = 0; sectionIdx < schema.sections.length; sectionIdx++) {
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

    // Group and aggregate data
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

    // Aggregate based on chart type
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

    // Sort result if sortMode is specified (for bar and boxplot charts)
    if (chart.sortMode && (chart.type === "bar" || chart.type === "boxplot")) {
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
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <Typography color="text.secondary">No data available</Typography>
      </Box>
    );
  }

  switch (chart.type) {
    case "bar":
      return (
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
      );

    case "line":
      return (
        <ResponsiveLine
          data={[{ id: chart.name, data: processedData.map((d) => ({ x: d.x, y: d.y })) }]}
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
      );

    case "pie":
      return (
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
      );

    case "scatter":
      return (
        <ResponsiveScatterPlot
          data={[{ id: chart.name, data: processedData.map((d) => ({ x: d.x, y: d.y })) }]}
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
      );

    default:
      return <Typography>Unsupported chart type</Typography>;
  }
}