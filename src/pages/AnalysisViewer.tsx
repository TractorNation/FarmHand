import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Box,
  Typography,
  useTheme,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  IconButton,
  Stack,
  Chip,
  Button,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import PageHeader from "../ui/PageHeader";
import AnalysisIcon from "@mui/icons-material/AutoGraphRounded";
import BarChartIcon from "@mui/icons-material/BarChartRounded";
import BoxPlotIcon from "@mui/icons-material/CandlestickChartRounded";
import LineChartIcon from "@mui/icons-material/ShowChartRounded";
import PieChartIcon from "@mui/icons-material/PieChartRounded";
import ScatterPlotIcon from "@mui/icons-material/ScatterPlotRounded";
import HeatmapIcon from "@mui/icons-material/GradientRounded";
import FilterIcon from "@mui/icons-material/FilterListRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import SaveIcon from "@mui/icons-material/SaveRounded";
import PushPinIcon from "@mui/icons-material/PushPinRounded";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import { useAnalysis } from "../context/AnalysisContext";
import { useSchema } from "../context/SchemaContext";
import { useAsyncFetch } from "../hooks/useAsyncFetch";
import { fetchQrCodes, decodeQR } from "../utils/QrUtils";
import { getSchemaFromHash } from "../utils/SchemaUtils";
import { createSchemaHash } from "../utils/GeneralUtils";
import useDialog from "../hooks/useDialog";
import ChartRenderer from "../ui/ChartRenderer";
import FilterDialog from "../ui/dialog/AnalysisFilterDialog";
import ChartConfigDialog from "../ui/dialog/ChartConfigDialog";
import StoreManager, { StoreKeys } from "../utils/StoreManager";

export default function AnalysisViewer() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { analyses, saveAnalysis } = useAnalysis();
  const { availableSchemas } = useSchema();
  const [allQrCodes] = useAsyncFetch(fetchQrCodes);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<Schema | null>(null);

  // Find the current analysis
  const analysis = useMemo(
    () => analyses.find((a) => a.id === Number(id)),
    [analyses, id]
  );

  // Local state for editing
  const [editingAnalysis, setEditingAnalysis] = useState<Analysis | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pinnedCharts, setPinnedCharts] = useState<Map<string, { pinned: boolean }>>(new Map());

  // Load schema based on analysis schemaHash
  useEffect(() => {
    const loadSchema = async () => {
      if (!editingAnalysis || availableSchemas.length === 0) {
        return;
      }

      // If no schemaHash, use first available schema (backwards compatibility)
      if (!editingAnalysis.schemaHash) {
        const firstSchema = availableSchemas[0]?.schema;
        if (firstSchema) {
          setSelectedSchema(firstSchema);
          // Update the analysis with the schema hash
          const hash = await createSchemaHash(firstSchema);
          setEditingAnalysis({
            ...editingAnalysis,
            schemaHash: hash,
          });
        }
        return;
      }

      const schema = await getSchemaFromHash(
        editingAnalysis.schemaHash,
        availableSchemas
      );
      setSelectedSchema(schema || null);
    };
    loadSchema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingAnalysis?.schemaHash, availableSchemas]);

  // Dialogs
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [filterDialogOpen, openFilterDialog, closeFilterDialog] = useDialog();
  const [chartConfigOpen, openChartConfig, closeChartConfig] = useDialog();
  const [currentChartType, setCurrentChartType] = useState<
    Chart["type"] | null
  >(null);
  const [editingChart, setEditingChart] = useState<Chart | null>(null);

  // Initialize editing state
  useEffect(() => {
    if (analysis) {
      setEditingAnalysis(JSON.parse(JSON.stringify(analysis)));
    }
  }, [analysis]);

  // Load pinned charts from store
  useEffect(() => {
    const loadPinnedCharts = async () => {
      if (!editingAnalysis) return;
      
      const pinnedMap = new Map<string, { pinned: boolean }>();
      
      for (const chart of editingAnalysis.charts || []) {
        try {
          const pinnedData = await StoreManager.get(StoreKeys.analysis.pinned(chart.id));
          if (pinnedData) {
            const parsed = JSON.parse(pinnedData);
            if (parsed.pinned) {
              pinnedMap.set(chart.id, { pinned: true });
            }
          }
        } catch (error) {
          console.error(`Failed to load pinned data for chart ${chart.id}:`, error);
        }
      }
      
      setPinnedCharts(pinnedMap);
    };
    
    loadPinnedCharts();
  }, [editingAnalysis]);

  // Check for unsaved changes
  useEffect(() => {
    if (!analysis || !editingAnalysis) {
      setHasUnsavedChanges(false);
      return;
    }
    const hasChanges =
      JSON.stringify(analysis) !== JSON.stringify(editingAnalysis);
    setHasUnsavedChanges(hasChanges);
  }, [analysis, editingAnalysis]);

  useEffect(() => {
    if (!allQrCodes || !editingAnalysis || !selectedSchema) {
      setFilteredData([]);
      return;
    }

    const processData = async () => {
      // Find field indices for Match Number and Team Number
      const allFields = selectedSchema.sections.flatMap(
        (section) => section.fields
      );
      const matchNumberIndex = allFields.findIndex(
        (field) => field.name === "Match Number"
      );
      const teamNumberIndex = allFields.findIndex(
        (field) => field.name === "Team Number"
      );

      const decoded = await Promise.all(
        allQrCodes
          .filter((qr) => !qr.archived)
          .map(async (qr) => {
            try {
              const decoded = await decodeQR(qr.data);
              // Only include QR codes that match the analysis schema
              if (decoded.schemaHash !== editingAnalysis.schemaHash) {
                return null;
              }
              return { qr, decoded };
            } catch {
              return null;
            }
          })
      );

      const filtered = decoded.filter((item) => {
        if (!item || !item.decoded || !item.decoded.data) return false;

        // Apply team filter (only if teams are explicitly selected)
        if (editingAnalysis.selectedTeams.length > 0) {
          if (teamNumberIndex === -1) {
            // No team field in schema, can't filter by team - exclude this item
            return false;
          }
          const teamField = item.decoded.data[teamNumberIndex];
          if (teamField === undefined || teamField === null) return false;
          const teamNum = Number(teamField);
          if (
            isNaN(teamNum) ||
            !editingAnalysis.selectedTeams.includes(teamNum)
          ) {
            return false;
          }
        }

        // Apply match filter (only if matches are explicitly selected)
        // When selectedMatches.length === 0, include ALL matches (skip this filter)
        if (editingAnalysis.selectedMatches.length > 0) {
          if (matchNumberIndex === -1) {
            // No match field in schema, can't filter by match - exclude this item
            return false;
          }
          const matchField = item.decoded.data[matchNumberIndex];
          if (matchField === undefined || matchField === null) return false;
          const matchNum = Number(matchField);
          if (
            isNaN(matchNum) ||
            !editingAnalysis.selectedMatches.includes(matchNum)
          ) {
            return false;
          }
        }

        // Item passes all filters (or no filters are applied)
        return true;
      });

      setFilteredData(filtered);
    };

    processData();
  }, [allQrCodes, editingAnalysis, selectedSchema]);

  const chartTypes = [
    { id: "bar", label: "Bar Chart", icon: <BarChartIcon /> },
    { id: "line", label: "Line Chart", icon: <LineChartIcon /> },
    { id: "pie", label: "Pie Chart", icon: <PieChartIcon /> },
    { id: "scatter", label: "Scatter Plot", icon: <ScatterPlotIcon /> },
    { id: "boxplot", label: "Box Plot", icon: <BoxPlotIcon /> },
    {
      id: "heatmap",
      label: "Heatmap",
      icon: <HeatmapIcon sx={{ transform: "rotate(90deg)" }} />,
    },
  ];

  const handleSave = async () => {
    if (editingAnalysis) {
      await saveAnalysis(editingAnalysis);
    }
  };

  const handleAddChart = (chartType: Chart["type"]) => {
    setCurrentChartType(chartType);
    setEditingChart(null);
    openChartConfig();
    setSpeedDialOpen(false);
  };

  const handleEditChart = (chart: Chart) => {
    setEditingChart(chart);
    setCurrentChartType(chart.type);
    openChartConfig();
  };

  const handleSaveChart = (chartConfig: Partial<Chart>) => {
    if (!editingAnalysis) return;

    if (editingChart) {
      // Update existing chart
      setEditingAnalysis({
        ...editingAnalysis,
        charts: editingAnalysis.charts.map((c) =>
          c.id === editingChart.id ? { ...c, ...chartConfig } : c
        ),
      });
    } else {
      // Add new chart
      const newChart: Chart = {
        id: `chart-${Date.now()}`,
        name: chartConfig.name || "New Chart",
        type: currentChartType!,
        xAxis: chartConfig.xAxis,
        yAxis: chartConfig.yAxis,
        groupBy: chartConfig.groupBy,
        aggregation: chartConfig.aggregation || "sum",
        linearInterpolation: chartConfig.linearInterpolation || "natural",
        sortMode: chartConfig.sortMode || "none",
      };
      setEditingAnalysis({
        ...editingAnalysis,
        charts: [...editingAnalysis.charts!, newChart],
      });
    }
    closeChartConfig();
  };

  const handleDeleteChart = (chartId: string) => {
    if (!editingAnalysis) return;
    setEditingAnalysis({
      ...editingAnalysis,
      charts: editingAnalysis.charts!.filter((c) => c.id !== chartId),
    });
    // Remove pinned data if chart is deleted
    StoreManager.remove(StoreKeys.analysis.pinned(chartId));
    setPinnedCharts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(chartId);
      return newMap;
    });
  };

  const handlePinChart = async (chartId: string) => {
    if (!editingAnalysis) return;

    // Save chart reference to store (chartId and analysisId)
    const pinnedData = { 
      pinned: true, 
      chartId,
      analysisId: editingAnalysis.id 
    };
    await StoreManager.set(
      StoreKeys.analysis.pinned(chartId),
      JSON.stringify(pinnedData)
    );

    // Update local state
    setPinnedCharts((prev) => {
      const newMap = new Map(prev);
      newMap.set(chartId, { pinned: true });
      return newMap;
    });
  };

  const handleUnpinChart = async (chartId: string) => {
    // Remove from store
    await StoreManager.remove(StoreKeys.analysis.pinned(chartId));

    // Update local state
    setPinnedCharts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(chartId);
      return newMap;
    });
  };

  const handleUpdateFilters = (teams: number[], matches: number[]) => {
    if (!editingAnalysis) return;
    setEditingAnalysis({
      ...editingAnalysis,
      selectedTeams: teams,
      selectedMatches: matches,
    });
    closeFilterDialog();
  };

  if (!analysis || !editingAnalysis) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Analysis not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        icon={<AnalysisIcon sx={{ fontSize: 28 }} />}
        title={editingAnalysis.name}
        subtitle={`${filteredData.length} matches • ${
          editingAnalysis.charts!.length
        } charts`}
        leadingComponent={
          <IconButton onClick={() => navigate("/analyses")}>
            <ArrowBackIcon />
          </IconButton>
        }
        trailingComponent={
          <Stack direction="row" spacing={2} alignItems="center">
            {hasUnsavedChanges && (
              <Chip label="Unsaved Changes" color="warning" size="small" />
            )}
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={openFilterDialog}
              sx={{ borderRadius: 2 }}
            >
              Filters
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              sx={{ borderRadius: 2 }}
            >
              Save
            </Button>
          </Stack>
        }
      />

      {/* Filter Display */}
      {(editingAnalysis.selectedTeams.length > 0 ||
        editingAnalysis.selectedMatches.length > 0) && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {editingAnalysis.selectedTeams.length > 0 && (
            <Chip
              label={`Teams: ${editingAnalysis.selectedTeams.join(", ")}`}
              onDelete={() =>
                setEditingAnalysis({ ...editingAnalysis, selectedTeams: [] })
              }
            />
          )}
          {editingAnalysis.selectedMatches.length > 0 && (
            <Chip
              label={`Matches: ${editingAnalysis.selectedMatches.join(", ")}`}
              onDelete={() =>
                setEditingAnalysis({ ...editingAnalysis, selectedMatches: [] })
              }
            />
          )}
        </Stack>
      )}

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {editingAnalysis.charts!.map((chart) => {
          const isPinned = pinnedCharts.has(chart.id);
          return (
            <Grid size={{ xs: 12, md: 6 }} key={chart.id}>
              <Card
                elevation={0}
                sx={{
                  border: `2px solid ${theme.palette.divider}`,
                  borderRadius: 3,
                  overflow: "visible",
                }}
              >
                <CardContent sx={{ overflow: "visible" }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="h6">{chart.name}</Typography>
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        size="small"
                        onClick={() => (isPinned ? handleUnpinChart(chart.id) : handlePinChart(chart.id))}
                        sx={{
                          color: isPinned ? theme.palette.primary.main : theme.palette.text.secondary,
                        }}
                        title={isPinned ? "Unpin chart" : "Pin chart to dashboard"}
                      >
                        {isPinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleEditChart(chart)}
                        disabled={isPinned}
                        sx={{
                          opacity: isPinned ? 0.5 : 1,
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteChart(chart.id)}
                        disabled={isPinned}
                        sx={{
                          color: isPinned ? theme.palette.text.disabled : theme.palette.error.main,
                          opacity: isPinned ? 0.5 : 1,
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                  <Box
                    sx={{
                      height: 300,
                      overflow: "visible",
                      position: "relative",
                    }}
                  >
                    <ChartRenderer
                      chart={chart}
                      data={filteredData}
                      schema={selectedSchema || undefined}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {editingAnalysis.charts!.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No charts yet
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Tap the + button to add your first chart
          </Typography>
        </Box>
      )}

      {/* Speed Dial */}
      <SpeedDial
        ariaLabel="Add chart"
        sx={{
          position: "fixed",
          bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          right: "calc(16px + env(safe-area-inset-right, 0px))",
        }}
        icon={<SpeedDialIcon />}
        onClose={() => setSpeedDialOpen(false)}
        onOpen={() => setSpeedDialOpen(true)}
        open={speedDialOpen}
      >
        {chartTypes.map((chart) => (
          <SpeedDialAction
            key={chart.id}
            icon={chart.icon}
            slotProps={{ tooltip: { title: chart.label } }}
            onClick={() => handleAddChart(chart.id as Chart["type"])}
          />
        ))}
      </SpeedDial>

      {/* Filter Dialog */}
      <FilterDialog
        open={filterDialogOpen}
        onClose={closeFilterDialog}
        currentTeams={editingAnalysis.selectedTeams}
        currentMatches={editingAnalysis.selectedMatches}
        onSave={handleUpdateFilters}
        availableData={allQrCodes || []}
        schema={selectedSchema || undefined}
      />

      {/* Chart Config Dialog */}
      <ChartConfigDialog
        open={chartConfigOpen}
        onClose={closeChartConfig}
        chartType={currentChartType}
        existingChart={editingChart}
        onSave={handleSaveChart}
        schema={selectedSchema || undefined}
      />
    </Box>
  );
}
