import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  IconButton,
  useTheme,
  Card,
  CardContent,
  Paper,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import SchemaIcon from "@mui/icons-material/SchemaRounded";
import useDialog from "../hooks/useDialog";
import { useSchema } from "../context/SchemaContext";
import { deleteSchema, saveSchema } from "../utils/SchemaUtils";
import PageHeader from "../ui/PageHeader";
import CreateSchemaDialog from "../ui/dialog/CreateSchemaDialog";
import RenameSchemaDialog from "../ui/dialog/RenameSchemaDialog";
import DeleteSchemaDialog from "../ui/dialog/DeleteSchemaDialog";
import DuplicateNameDialog from "../ui/dialog/DuplicateNameDialog";

export default function Schemas() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { availableSchemas, refreshSchemas } = useSchema();

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
              props: {},
            },
            {
              id: 2,
              name: "Team Number",
              type: "number",
              required: true,
              props: {},
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
    if (!schemaToRename || !trimmedName) {
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
                cursor: "pointer",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 4px 12px ${theme.palette.primary.main}20`,
                },
              }}
              onClick={() => handleEditSchema(s.name)}
            >
              <CardContent>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    sx={{ flexGrow: 1 }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: `${theme.palette.primary.main}20`,
                        color: theme.palette.primary.main,
                      }}
                    >
                      <SchemaIcon />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h6">{s.name}</Typography>
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
                      </Stack>
                      <Typography variant="body1" color="text.secondary">
                        {s.schema.sections?.length || 0} sections
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    {s.type === "generated" ? (
                      <>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSchemaToRename(s);
                            openSchemaRenameDialog();
                          }}
                          variant="contained"
                          color="primary"
                          startIcon={<EditIcon />}
                        >
                          Rename
                        </Button>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setSchemaToDelete(s);
                            openDeleteSchemaDialog();
                          }}
                          sx={{
                            color: theme.palette.text.secondary,
                            "&:hover": {
                              backgroundColor: `${theme.palette.error.main}20`,
                              color: theme.palette.error.main,
                            },
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    ) : (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSchema(s.name);
                        }}
                        variant="outlined"
                        color="secondary"
                      >
                        View
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
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
      <CreateSchemaDialog
        open={newSchemaDialogOpen}
        onClose={closeNewSchemaDialog}
        onCreate={handleCreateSchema}
      />

      {/* Rename Schema Dialog */}
      <RenameSchemaDialog
        open={schemaRenameDialogOpen}
        onClose={closeSchemaRenameDialog}
        onRename={handleRenameSchema}
        initialName={schemaToRename?.name || ""}
      />

      {/* Delete Schema Confirmation Dialog */}
      <DeleteSchemaDialog
        open={deleteSchemaDialogOpen}
        onClose={closeDeleteSchemaDialog}
        onDelete={handleDeleteSchema}
        schemaName={schemaToDelete?.name || null}
      />

      {/* Duplicate Name Warning Dialog */}
      <DuplicateNameDialog
        open={duplicateNameDialogOpen}
        onClose={closeDuplicateNameDialog}
        errorMessage={duplicateNameError}
      />
    </Box>
  );
}
