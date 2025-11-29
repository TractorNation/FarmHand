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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import PageHeader from "../ui/PageHeader";
import AnalysisIcon from "@mui/icons-material/AutoGraphRounded";
import BarChartIcon from "@mui/icons-material/BarChartRounded";
import LineChartIcon from "@mui/icons-material/ShowChartRounded";
import PieChartIcon from "@mui/icons-material/PieChartRounded";
import ScatterPlotIcon from "@mui/icons-material/ScatterPlotRounded";
import FilterIcon from "@mui/icons-material/FilterListRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import SaveIcon from "@mui/icons-material/SaveRounded";
import { useAnalysis } from "../context/AnalysisContext";
import { useSchema } from "../context/SchemaContext";
import { useAsyncFetch } from "../hooks/useAsyncFetch";
import { fetchQrCodes, decodeQR } from "../utils/QrUtils";
import { getSchemaFromHash } from "../utils/SchemaUtils";
import { createSchemaHash } from "../utils/GeneralUtils";
import useDialog from "../hooks/useDialog";
import ChartRenderer from "../ui/ChartRenderer";

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
      const allFields = selectedSchema.sections.flatMap((section) => section.fields);
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
        if (!item) return false;

        // Apply team filter
        if (editingAnalysis.selectedTeams.length > 0 && teamNumberIndex !== -1) {
          const teamField = item.decoded.data[teamNumberIndex];
          if (teamField === undefined || teamField === null) return false;
          if (!editingAnalysis.selectedTeams.includes(Number(teamField))) {
            return false;
          }
        }

        // Apply match filter
        if (editingAnalysis.selectedMatches.length > 0 && matchNumberIndex !== -1) {
          const matchField = item.decoded.data[matchNumberIndex];
          if (matchField === undefined || matchField === null) return false;
          if (!editingAnalysis.selectedMatches.includes(Number(matchField))) {
            return false;
          }
        }

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
    { id: "boxplot", label: "Box Plot", icon: <BarChartIcon /> },
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
        {editingAnalysis.charts!.map((chart) => (
          <Grid size={{ xs: 12, md: 6 }} key={chart.id}>
            <Card
              elevation={0}
              sx={{
                border: `2px solid ${theme.palette.divider}`,
                borderRadius: 3,
              }}
            >
              <CardContent>
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
                      onClick={() => handleEditChart(chart)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteChart(chart.id)}
                      sx={{ color: theme.palette.error.main }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Stack>
                <Box sx={{ height: 300 }}>
                  <ChartRenderer
                    chart={chart}
                    data={filteredData}
                    schema={selectedSchema || undefined}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
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
            tooltipTitle={chart.label}
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

// Filter Dialog Component
function FilterDialog({
  open,
  onClose,
  currentTeams,
  currentMatches,
  onSave,
  availableData,
  schema,
}: {
  open: boolean;
  onClose: () => void;
  currentTeams: number[];
  currentMatches: number[];
  onSave: (teams: number[], matches: number[]) => void;
  availableData: QrCode[];
  schema?: Schema;
}) {
  const [selectedTeams, setSelectedTeams] = useState<number[]>(currentTeams);
  const [selectedMatches, setSelectedMatches] =
    useState<number[]>(currentMatches);
  const [uniqueTeams, setUniqueTeams] = useState<number[]>([]);
  const [uniqueMatches, setUniqueMatches] = useState<number[]>([]);

  useEffect(() => {
    setSelectedTeams(currentTeams);
    setSelectedMatches(currentMatches);
  }, [currentTeams, currentMatches, open]);

  // Extract unique teams and matches from QR codes
  useEffect(() => {
    const extractTeamsAndMatches = async () => {
      if (!schema || availableData.length === 0) {
        setUniqueTeams([]);
        setUniqueMatches([]);
        return;
      }

      // Find field indices for "Match Number" and "Team Number"
      const allFields = schema.sections.flatMap((section) => section.fields);
      const matchNumberIndex = allFields.findIndex(
        (field) => field.name === "Match Number"
      );
      const teamNumberIndex = allFields.findIndex(
        (field) => field.name === "Team Number"
      );

      if (matchNumberIndex === -1 && teamNumberIndex === -1) {
        setUniqueTeams([]);
        setUniqueMatches([]);
        return;
      }

      const teams = new Set<number>();
      const matches = new Set<number>();

      // Process all QR codes
      const nonArchivedCodes = availableData.filter((qr) => !qr.archived);
      const decodedResults = await Promise.all(
        nonArchivedCodes.map(async (qr) => {
          try {
            const decoded = await decodeQR(qr.data);
            return decoded;
          } catch (e) {
            return null;
          }
        })
      );

      // Extract teams and matches from decoded data
      decodedResults.forEach((decoded) => {
        if (!decoded) return;

        if (matchNumberIndex !== -1 && decoded.data[matchNumberIndex] !== undefined) {
          const matchNum = Number(decoded.data[matchNumberIndex]);
          if (!isNaN(matchNum) && matchNum > 0) {
            matches.add(matchNum);
          }
        }

        if (teamNumberIndex !== -1 && decoded.data[teamNumberIndex] !== undefined) {
          const teamNum = Number(decoded.data[teamNumberIndex]);
          if (!isNaN(teamNum) && teamNum > 0) {
            teams.add(teamNum);
          }
        }
      });

      setUniqueTeams(Array.from(teams).sort((a, b) => a - b));
      setUniqueMatches(Array.from(matches).sort((a, b) => a - b));
    };

    if (open) {
      extractTeamsAndMatches();
    }
  }, [availableData, schema, open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Filter Data</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Autocomplete
            multiple
            options={uniqueTeams}
            value={selectedTeams}
            onChange={(_, newValue) => setSelectedTeams(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Teams" placeholder="All teams" />
            )}
          />
          <Autocomplete
            multiple
            options={uniqueMatches}
            value={selectedMatches}
            onChange={(_, newValue) => setSelectedMatches(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Matches"
                placeholder="All matches"
              />
            )}
          />
          <Typography variant="body2" color="text.secondary">
            Leave empty to include all teams/matches
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSave(selectedTeams, selectedMatches)}
        >
          Apply Filters
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Chart Config Dialog Component
function ChartConfigDialog({
  open,
  onClose,
  chartType,
  existingChart,
  onSave,
  schema,
}: {
  open: boolean;
  onClose: () => void;
  chartType: Chart["type"] | null;
  existingChart: Chart | null;
  onSave: (config: Partial<Chart>) => void;
  schema?: Schema;
}) {
  const [name, setName] = useState("");
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");
  const [aggregation, setAggregation] = useState<Chart["aggregation"]>("sum");
  const [sortMode, setSortMode] = useState<Chart["sortMode"]>("none");

  useEffect(() => {
    if (open) {
      setName(existingChart?.name || "");
      setXAxis(existingChart?.xAxis || "");
      setYAxis(existingChart?.yAxis || "");
      setAggregation(existingChart?.aggregation || "sum");
      setSortMode(existingChart?.sortMode || "none");
    }
  }, [open, existingChart]);

  const handleSave = () => {
    onSave({ name, xAxis, yAxis, aggregation, sortMode });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {existingChart ? "Edit Chart" : `Add ${chartType} Chart`}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Chart Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>X-Axis Field</InputLabel>
            <Select
              value={xAxis}
              label="X-Axis Field"
              onChange={(e) => setXAxis(e.target.value)}
            >
              {schema?.sections.map((section) => [
                <MenuItem key={`${section.title}-header`} disabled sx={{ fontWeight: 600 }}>
                  {section.title}
                </MenuItem>,
                ...section.fields.map((field) => (
                  <MenuItem
                    key={`${section.title} - ${field.name}`}
                    value={`${section.title} - ${field.name}`}
                    sx={{ pl: 4 }}
                  >
                    {field.name}
                  </MenuItem>
                )),
              ])}
            </Select>
          </FormControl>

          {chartType !== "pie" && (
            <FormControl fullWidth>
              <InputLabel>Y-Axis Field</InputLabel>
              <Select
                value={yAxis}
                label="Y-Axis Field"
                onChange={(e) => setYAxis(e.target.value)}
              >
                {schema?.sections.map((section) => [
                  <MenuItem key={`${section.title}-header-y`} disabled sx={{ fontWeight: 600 }}>
                    {section.title}
                  </MenuItem>,
                  ...section.fields.map((field) => (
                    <MenuItem
                      key={`${section.title} - ${field.name}-y`}
                      value={`${section.title} - ${field.name}`}
                      sx={{ pl: 4 }}
                    >
                      {field.name}
                    </MenuItem>
                  )),
                ])}
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth>
            <InputLabel>Aggregation</InputLabel>
            <Select
              value={aggregation}
              label="Aggregation"
              onChange={(e) =>
                setAggregation(e.target.value as Chart["aggregation"])
              }
            >
              <MenuItem value="sum">Sum</MenuItem>
              <MenuItem value="average">Average</MenuItem>
              <MenuItem value="count">Count</MenuItem>
              <MenuItem value="min">Minimum</MenuItem>
              <MenuItem value="max">Maximum</MenuItem>
            </Select>
          </FormControl>

          {(chartType === "bar" || chartType === "boxplot") && (
            <FormControl fullWidth>
              <InputLabel>Sort Mode</InputLabel>
              <Select
                value={sortMode}
                label="Sort Mode"
                onChange={(e) =>
                  setSortMode(e.target.value as Chart["sortMode"])
                }
              >
                <MenuItem value="none">None (Natural Order)</MenuItem>
                <MenuItem value="ascending">Ascending (Low to High)</MenuItem>
                <MenuItem value="descending">Descending (High to Low)</MenuItem>
              </Select>
            </FormControl>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!name || !xAxis}
        >
          {existingChart ? "Save" : "Add Chart"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
