import {
  Box,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useNavigate } from "react-router";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/AddRounded";
import BarChartIcon from "@mui/icons-material/BarChartRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import PageHeader from "../ui/PageHeader";
import { useAnalysis } from "../context/AnalysisContext";
import { useSchema } from "../context/SchemaContext";
import useDialog from "../hooks/useDialog";
import DeleteDialog from "../ui/dialog/DeleteDialog";
import { useState, useEffect } from "react";
import { createSchemaHash } from "../utils/GeneralUtils";

export default function Analyses() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { analyses, saveAnalysis, deleteAnalysis } = useAnalysis();
  const { availableSchemas } = useSchema();
  const [createDialogOpen, openCreateDialog, closeCreateDialog] = useDialog();
  const [deleteDialogOpen, openDeleteDialog, closeDeleteDialog] = useDialog();
  const [analysisToDelete, setAnalysisToDelete] = useState<Analysis | null>(null);
  const [analysisName, setAnalysisName] = useState("");
  const [selectedSchemaHash, setSelectedSchemaHash] = useState<string>("");
  const [schemaHashMap, setSchemaHashMap] = useState<Map<string, string>>(new Map());

  // Pre-calculate schema hashes
  useEffect(() => {
    const calculateHashes = async () => {
      const hashMap = new Map<string, string>();
      await Promise.all(
        availableSchemas.map(async (schemaMeta) => {
          const hash = await createSchemaHash(schemaMeta.schema);
          hashMap.set(schemaMeta.name, hash);
        })
      );
      setSchemaHashMap(hashMap);
    };
    if (availableSchemas.length > 0) {
      calculateHashes();
    }
  }, [availableSchemas]);

  const handleCreateAnalysis = async () => {
    if (!analysisName.trim() || !selectedSchemaHash) {
      return;
    }
    
    const newAnalysis: Analysis = {
      id: Date.now(),
      name: analysisName.trim(),
      selectedTeams: [],
      selectedMatches: [],
      charts: [],
      createdAt: new Date(),
      schemaHash: selectedSchemaHash,
    };
    await saveAnalysis(newAnalysis);
    handleCloseCreateDialog();
    navigate(`/analyses/${newAnalysis.id}`);
  };

  const handleOpenCreateDialog = () => {
    if (availableSchemas.length > 0 && schemaHashMap.size > 0) {
      // Set default to first schema
      const firstSchemaHash = schemaHashMap.get(availableSchemas[0].name);
      if (firstSchemaHash) {
        setSelectedSchemaHash(firstSchemaHash);
      }
    }
    openCreateDialog();
  };

  const handleCloseCreateDialog = () => {
    setAnalysisName("");
    setSelectedSchemaHash("");
    closeCreateDialog();
  };

  const handleDelete = async () => {
    if (analysisToDelete) {
      await deleteAnalysis(analysisToDelete.id);
      closeDeleteDialog();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        icon={<BarChartIcon sx={{ fontSize: 28 }} />}
        title="Data Analysis"
        subtitle="View and manage your scouting analyses"
      />

      <Stack spacing={2} sx={{ mb: 3 }}>
        {analyses.map((analysis) => (
          <Card
            key={analysis.id}
            elevation={0}
            sx={{
              border: `2px solid ${theme.palette.divider}`,
              borderRadius: 3,
              cursor: "pointer",
              transition: "all 0.3s ease",
              "&:hover": {
                borderColor: theme.palette.primary.main,
                boxShadow: theme.customShadows.card,
              },
            }}
            onClick={() => navigate(`/analyses/${analysis.id}`)}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">{analysis.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {analysis.charts.length} charts • Created{" "}
                    {new Date(analysis.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setAnalysisToDelete(analysis);
                    openDeleteDialog();
                  }}
                  sx={{
                    "&:hover": {
                      backgroundColor: `${theme.palette.error.main}20`,
                      color: theme.palette.error.main,
                    },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Button
        variant="contained"
        size="large"
        startIcon={<AddIcon />}
        onClick={handleOpenCreateDialog}
        sx={{ borderRadius: 2 }}
        disabled={availableSchemas.length === 0}
      >
        Create New Analysis
      </Button>

      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 'fit-content' } } }}
      >
        <DialogTitle
          sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}
        >
          <AddIcon color="primary" />
          Create New Analysis
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              label="Analysis Name"
              value={analysisName}
              onChange={(e) => setAnalysisName(e.target.value)}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Schema</InputLabel>
              <Select
                value={selectedSchemaHash}
                label="Schema"
                onChange={(e) => {
                  setSelectedSchemaHash(e.target.value);
                }}
              >
                {availableSchemas.map((schemaMeta) => {
                  const hash = schemaHashMap.get(schemaMeta.name);
                  if (!hash) return null;
                  return (
                    <MenuItem key={hash} value={hash}>
                      {schemaMeta.name}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseCreateDialog} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateAnalysis}
            variant="contained"
            disabled={!analysisName.trim() || !selectedSchemaHash}
            sx={{ borderRadius: 2 }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        onDelete={handleDelete}
        title={`Delete "${analysisToDelete?.name}"?`}
      >
        This will permanently delete this analysis and all its charts.
      </DeleteDialog>
    </Box>
  );
}