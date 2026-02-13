import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  IconButton,
  useTheme,
  Card,
  Paper,
  Chip,
  Snackbar,
  Slide,
  Alert,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router";
import AddIcon from "@mui/icons-material/AddRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import SchemaIcon from "@mui/icons-material/SchemaRounded";
import ShareIcon from "@mui/icons-material/ShareRounded";
import useDialog from "../hooks/useDialog";
import { useSchema } from "../context/SchemaContext";
import { deleteSchema, saveSchema } from "../utils/SchemaUtils";
import PageHeader from "../ui/PageHeader";
import CreateDialog from "../ui/dialog/CreateDialog";
import RenameDialog from "../ui/dialog/RenameDialog";
import DeleteDialog from "../ui/dialog/DeleteDialog";
import DuplicateNameDialog from "../ui/dialog/DuplicateNameDialog";
import ShareDialog from "../ui/dialog/ShareDialog";

export default function Schemas() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { showWarning } = location.state || {};

  const { availableSchemas, refreshSchemas } = useSchema();
  const [shareDialogOpen, openShareDialog, closeShareDialog] = useDialog();
  const [schemaToShare, setSchemaToShare] = useState<Schema | null>(null);
  const [warningOpen, , closeWarning] = useDialog(showWarning || false);

  const [newSchemaDialogOpen, openNewSchemaDialog, closeNewSchemaDialog] =
    useDialog();
  const [
    schemaRenameDialogOpen,
    openSchemaRenameDialog,
    closeSchemaRenameDialog,
  ] = useDialog();
  const [
    deleteSchemaDialogOpen,
    openDeleteSchemaDialog,
    closeDeleteSchemaDialog,
  ] = useDialog();
  const [
    duplicateNameDialogOpen,
    openDuplicateNameDialog,
    closeDuplicateNameDialog,
  ] = useDialog();

  const [schemaToRename, setSchemaToRename] = useState<SchemaMetaData | null>(
    null
  );
  const [schemaToDelete, setSchemaToDelete] = useState<SchemaMetaData | null>(
    null
  );
  const [duplicateNameError, setDuplicateNameError] = useState("");

  const checkSchemaNameExists = (name: string, excludeName?: string) => {
    return availableSchemas.some(
      (s) =>
        s.name.toLowerCase() === name.toLowerCase() && s.name !== excludeName
    );
  };

  const handleCreateSchema = async (newSchemaName: string) => {
    const trimmedName = newSchemaName.trim();
    if (!trimmedName) return;

    if (checkSchemaNameExists(trimmedName)) {
      setDuplicateNameError(`Schema "${trimmedName}" already exists`);
      openDuplicateNameDialog();
      return;
    }

    await saveSchema({
      name: trimmedName,
      sections: [
        {
          title: "Match Info",
          fields: [
            {
              id: 1,
              name: "Match Number",
              type: "number",
              required: true,
              props: { min: 1, max:  100},
            },
            {
              id: 2,
              name: "Team Number",
              type: "number",
              required: true,
              props: { min: 1, max: 100000 },
            },
          ],
        },
      ],
    } as Schema);
    closeNewSchemaDialog();
    await refreshSchemas();
  };

  const handleRenameSchema = async (newSchemaName: string) => {
    const trimmedName = newSchemaName.trim();
    if (
      !schemaToRename ||
      !trimmedName ||
      trimmedName === schemaToRename.name
    ) {
      closeSchemaRenameDialog();
      return;
    }

    if (checkSchemaNameExists(trimmedName, schemaToRename.name)) {
      setDuplicateNameError(`Schema "${trimmedName}" already exists`);
      openDuplicateNameDialog();
      closeSchemaRenameDialog();
      return;
    }

    const newSchema: Schema = {
      ...schemaToRename.schema,
      name: trimmedName,
    };
    await saveSchema(newSchema);
    await deleteSchema(schemaToRename);

    await refreshSchemas();
    closeSchemaRenameDialog();
  };

  const handleDeleteSchema = async () => {
    if (!schemaToDelete) return;
    await deleteSchema(schemaToDelete);
    await refreshSchemas();
    closeDeleteSchemaDialog();
    setSchemaToDelete(null);
  };

  const handleEditSchema = (schemaName: string) => {
    navigate(`/schemas/${encodeURIComponent(schemaName)}`);
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 3,
        bgcolor: theme.palette.background.default,
      }}
    >
      {/* Header */}
      <PageHeader
        icon={<SchemaIcon sx={{ fontSize: 28 }} />}
        title="Schemas"
        subtitle="Manage scouting form layouts"
        leadingComponent={
          <IconButton
            onClick={() => navigate("/settings")}
            sx={{
              color: theme.palette.primary.main,
            }}
          >
            <ArrowBackIcon />
          </IconButton>
        }
      />

      {/* Schema List */}
      {availableSchemas.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 3,
            border: `2px dashed ${theme.palette.divider}`,
            mb: 3,
          }}
        >
          <SchemaIcon
            sx={{
              fontSize: 64,
              color: theme.palette.text.disabled,
              mb: 2,
            }}
          />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No schemas yet
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create your first schema to get started
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2} sx={{ mb: 3 }}>
          {availableSchemas.map((s, i) => (
            <Card
              key={i}
              elevation={0}
              sx={{
                border: `2px solid ${theme.palette.divider}`,
                borderRadius: 3,
                transition: "all 0.3s ease",
                px: 2,
                py: 2,
                cursor: "pointer",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 4px 12px ${theme.palette.primary.main}20`,
                },
              }}
              onClick={() => handleEditSchema(s.name)}
            >
              <Stack
                direction={"row"}
                alignItems={"center"}
                justifyContent={"space-between"}
                spacing={2}
                sx={{ mb: 1, width: "100%" }}
              >
                <Stack direction={"column"} sx={{ minWidth: 0 }}>
                  <Typography variant="h6" noWrap>
                    {s.name}
                  </Typography>
                  <Stack direction={"row"} spacing={2}>
                    <Typography variant="body1" color="text.secondary">
                      {s.schema.sections?.length || 0} sections
                    </Typography>
                    {s.type === "default" && (
                      <Box>
                        {s.type === "default" && (
                          <Chip
                            label="Built-in"
                            size="small"
                            sx={{
                              backgroundColor: theme.palette.info.main,
                              color: theme.palette.info.contrastText,
                              fontWeight: 600,
                              fontFamily: theme.typography.body1,
                            }}
                          />
                        )}
                      </Box>
                    )}
                  </Stack>
                </Stack>
                <Stack direction={"row"} spacing={1}>
                  <>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        setSchemaToShare(s.schema);
                        openShareDialog();
                      }}
                    >
                      <ShareIcon />
                    </IconButton>
                    {!(s.type === "default") && (
                      <Box>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setSchemaToRename(s);
                            openSchemaRenameDialog();
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setSchemaToDelete(s);
                            openDeleteSchemaDialog();
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )}
                  </>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}

      <Button
        variant="contained"
        size="large"
        startIcon={<AddIcon />}
        onClick={openNewSchemaDialog}
        color="primary"
        sx={{
          borderRadius: 2,
          py: 1.5,
        }}
      >
        Create New Schema
      </Button>

      {/* New Schema Dialog */}
      <CreateDialog
        open={newSchemaDialogOpen}
        onClose={closeNewSchemaDialog}
        onCreate={handleCreateSchema}
        title="Create New Schema"
        label="Schema Name"
        actionButtonText="Create"
      />

      {/* Rename Schema Dialog */}
      <RenameDialog
        open={schemaRenameDialogOpen}
        onClose={closeSchemaRenameDialog}
        onRename={handleRenameSchema}
        initialName={schemaToRename?.name || ""}
        title="Rename Schema"
      />

      {/* Delete Schema Confirmation Dialog */}
      <DeleteDialog
        open={deleteSchemaDialogOpen}
        onClose={closeDeleteSchemaDialog}
        onDelete={handleDeleteSchema}
        title={`Delete Schema "${
          schemaToDelete?.name.substring(0, 20) || ""
        }..."?`}
      >
        Are you sure you want to delete this schema? This action cannot be
        undone.
      </DeleteDialog>

      {/* Duplicate Name Warning Dialog */}
      <DuplicateNameDialog
        open={duplicateNameDialogOpen}
        onClose={closeDuplicateNameDialog}
        errorMessage={duplicateNameError}
      />

      {schemaToShare && (
        <ShareDialog
          mode="schema"
          open={shareDialogOpen}
          onClose={closeShareDialog}
          schema={schemaToShare}
        />
      )}

      <Snackbar
        open={warningOpen}
        onClose={closeWarning}
        slots={{ transition: Slide }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ width: "100%" }}
        autoHideDuration={5000}
      >
        <Alert onClose={closeWarning} severity="warning" variant="filled">
          Editing schemas can create issues with your team's data. Only do so if
          you have permission from your lead scouter.
        </Alert>
      </Snackbar>
    </Box>
  );
}
