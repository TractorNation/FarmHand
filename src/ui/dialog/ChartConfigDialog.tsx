import {
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  DialogActions,
  Button,
} from "@mui/material";
import { useState, useEffect, useMemo } from "react";

export default function ChartConfigDialog({
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
  const [linearInterpolation, setLinearInterpolation] =
    useState<Chart["linearInterpolation"]>("natural");
  const [sortMode, setSortMode] = useState<Chart["sortMode"]>("none");
  const [colorScheme, setColorScheme] = useState<string>("theme-primary");

  useEffect(() => {
    if (open) {
      setName(existingChart?.name || "");
      setXAxis(existingChart?.xAxis || "");
      setYAxis(existingChart?.yAxis || "");
      setAggregation(existingChart?.aggregation || "sum");
      setLinearInterpolation(existingChart?.linearInterpolation || "natural");
      setSortMode(existingChart?.sortMode || "none");
      setColorScheme(existingChart?.colorScheme || "theme-primary");
    }
  }, [open, existingChart]);

  const handleSave = () => {
    onSave({
      name,
      xAxis,
      yAxis,
      aggregation,
      sortMode,
      linearInterpolation,
      colorScheme,
    });
    onClose();
  };

  // Predefined color schemes for heatmaps
  // Using only sequential schemes since heatmaps show count data (0 to max)
  // Only including schemes that are confirmed to work with Nivo heatmap
  const heatmapColorSchemes = [
    { value: "theme-primary", label: "Theme Primary (Custom)" },
    { value: "blues", label: "Blues" },
    { value: "greens", label: "Greens" },
    { value: "greys", label: "Greys" },
    { value: "oranges", label: "Oranges" },
    { value: "purples", label: "Purples" },
    { value: "reds", label: "Reds" },
    { value: "viridis", label: "Viridis" },
    { value: "plasma", label: "Plasma" },
  ];

  // Get grid fields for heatmap
  const gridFields = useMemo(() => {
    if (chartType !== "heatmap" || !schema) return [];
    const fields: Array<{ section: string; field: Component }> = [];
    schema.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.type === "grid") {
          fields.push({ section: section.title, field });
        }
      });
    });
    return fields;
  }, [chartType, schema]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {existingChart
          ? "Edit Chart"
          : `Add ${
              chartType?.charAt(0).toUpperCase()! + chartType?.slice(1)!
            } Chart`}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Chart Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />

          {chartType === "heatmap" ? (
            <>
              <FormControl fullWidth>
                <InputLabel>Group By</InputLabel>
                <Select
                  value={xAxis}
                  label="Group By"
                  onChange={(e) => setXAxis(e.target.value)}
                >
                  {schema?.sections.map((section) => [
                    <MenuItem
                      key={`${section.title}-header-heatmap`}
                      disabled
                      sx={{ fontWeight: 600 }}
                    >
                      {section.title}
                    </MenuItem>,
                    ...section.fields.map((field) => (
                      <MenuItem
                        key={`${section.title} - ${field.name}-heatmap`}
                        value={`${section.title} - ${field.name}`}
                        sx={{ pl: 4 }}
                      >
                        {field.name}
                      </MenuItem>
                    )),
                  ])}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Grid Field</InputLabel>
                <Select
                  value={yAxis}
                  label="Grid Field"
                  onChange={(e) => setYAxis(e.target.value)}
                >
                  {gridFields.length === 0 ? (
                    <MenuItem disabled>
                      No compatible fields found in schema
                    </MenuItem>
                  ) : (
                    gridFields.map(({ section, field }) => (
                      <MenuItem
                        key={`${section} - ${field.name}`}
                        value={`${section} - ${field.name}`}
                      >
                        {field.name} ({section})
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Color Scheme</InputLabel>
                <Select
                  value={colorScheme}
                  label="Color Scheme"
                  onChange={(e) => setColorScheme(e.target.value)}
                >
                  {heatmapColorSchemes.map((scheme) => (
                    <MenuItem key={scheme.value} value={scheme.value}>
                      {scheme.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          ) : (
            <>
              <FormControl fullWidth>
                <InputLabel>X-Axis Field</InputLabel>
                <Select
                  value={xAxis}
                  label="X-Axis Field"
                  onChange={(e) => setXAxis(e.target.value)}
                >
                  {schema?.sections.map((section) => [
                    <MenuItem
                      key={`${section.title}-header`}
                      disabled
                      sx={{ fontWeight: 600 }}
                    >
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
                      <MenuItem
                        key={`${section.title}-header-y`}
                        disabled
                        sx={{ fontWeight: 600 }}
                      >
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
            </>
          )}

          {chartType !== "heatmap" && (
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
          )}

          {chartType === "line" && (
            <FormControl fullWidth>
              <InputLabel>Line</InputLabel>
              <Select
                value={linearInterpolation}
                label="Aggregation"
                onChange={(e) => setLinearInterpolation(e.target.value)}
              >
                <MenuItem value="basis">Basis</MenuItem>
                <MenuItem value="cardinal">Cardinal</MenuItem>
                <MenuItem value="catmullRom">CatmullRom</MenuItem>
                <MenuItem value="linear">Linear</MenuItem>
                <MenuItem value="monotoneX">MonotoneX</MenuItem>
                <MenuItem value="monotoneY">MonotoneY</MenuItem>
                <MenuItem value="natural">Natural</MenuItem>
                <MenuItem value="step">Step</MenuItem>
                <MenuItem value="stepBefore">Step Before</MenuItem>
                <MenuItem value="stepAfter">Step After</MenuItem>
              </Select>
            </FormControl>
          )}

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
          disabled={
            !name || (chartType === "heatmap" ? !xAxis || !yAxis : !xAxis)
          }
        >
          {existingChart ? "Save" : "Add Chart"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
