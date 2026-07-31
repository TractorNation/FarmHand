import { Box, Typography } from "@mui/material";
import useProcessedData from "../hooks/useProcessedData";
import BarChart from "./charts/BarChart";
import LineChart from "./charts/LineChart";
import PieChart from "./charts/PieChart";
import ScatterChart from "./charts/ScatterChart";
import BoxPlotChart from "./charts/BoxPlotChart";
import HeatMapChart from "./charts/HeatMapChart";

interface ChartRendererProps {
  chart: Chart;
  data: any[];
  schema?: Schema;
}

/**
 * Turns a chart config plus raw match data into a rendered chart.
 *
 * Dispatch only: shaping the data lives in `src/analysis/`, and each chart type is
 * its own component under `./charts`.
 *
 * The heat map handles its own empty state, because it can distinguish "no data"
 * from "the selected field cannot be heat-mapped".
 */
export default function ChartRenderer({
  chart,
  data,
  schema,
}: ChartRendererProps) {
  const processedData = useProcessedData(chart, data, schema);

  if (chart.type === "heatmap") {
    return <HeatMapChart chart={chart} data={processedData} schema={schema} />;
  }

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

  switch (chart.type) {
    case "bar":
      return <BarChart chart={chart} data={processedData} />;
    case "line":
      return <LineChart chart={chart} data={processedData} />;
    case "pie":
      return <PieChart chart={chart} data={processedData} />;
    case "scatter":
      return <ScatterChart chart={chart} data={processedData} />;
    case "boxplot":
      return <BoxPlotChart chart={chart} data={processedData} />;
    default:
      return <Typography>Unsupported chart type</Typography>;
  }
}
