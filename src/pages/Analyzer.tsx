import { useState } from "react";
import {
  Box,
  Divider,
  Typography,
  useTheme,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from "@mui/material";
import PageHeader from "../ui/PageHeader";
import AnalysisIcon from "@mui/icons-material/AutoGraphRounded";
import BarChartIcon from "@mui/icons-material/BarChartRounded";
import LineChartIcon from "@mui/icons-material/ShowChartRounded";
import PieChartIcon from "@mui/icons-material/PieChartRounded";
import ScatterPlotIcon from "@mui/icons-material/ScatterPlotRounded";
import AddIcon from "@mui/icons-material/AddRounded";

export default function Analyzer() {
  const theme = useTheme();
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  // Placeholder chart types - these will be draggable later
  const chartTypes = [
    { id: "bar", label: "Bar Chart", icon: <BarChartIcon /> },
    { id: "line", label: "Line Chart", icon: <LineChartIcon /> },
    { id: "pie", label: "Pie Chart", icon: <PieChartIcon /> },
    { id: "scatter", label: "Scatter Plot", icon: <ScatterPlotIcon /> },
  ];

  const handleSpeedDialOpen = () => {
    setSpeedDialOpen(true);
  };

  const handleSpeedDialClose = () => {
    setSpeedDialOpen(false);
  };

  const handleChartTypeClick = (chartId: string) => {
    // TODO: Handle chart type selection/drag
    console.log("Selected chart type:", chartId);
    handleSpeedDialClose();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Box px={3} pt={2} sx={{ flexShrink: 0 }}>
        <PageHeader
          icon={<AnalysisIcon sx={{ fontSize: 28 }} />}
          title="Match data Analysis"
          subtitle="View and organize scouting data"
        />
      </Box>
      <Divider sx={{ flexShrink: 0 }} />

      {/* Main Content Area (Working Zone) */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          height: "100%",
          overflow: "auto",
          minHeight: 0,
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Typography color="text.secondary">
          Tap the + button to add chart types to your analysis.
        </Typography>
      </Box>

      {/* Speed Dial for Chart Types */}
      <SpeedDial
        ariaLabel="Add chart types"
        sx={{
          position: "fixed",
          bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          right: "calc(16px + env(safe-area-inset-right, 0px))",
        }}
        icon={<SpeedDialIcon />}
        onClose={handleSpeedDialClose}
        onOpen={handleSpeedDialOpen}
        open={speedDialOpen}
      >
        {chartTypes.map((chart) => (
          <SpeedDialAction
            key={chart.id}
            icon={chart.icon}
            tooltipTitle={chart.label}
            tooltipOpen
            onClick={() => handleChartTypeClick(chart.id)}
          />
        ))}
      </SpeedDial>
    </Box>
  );
}
