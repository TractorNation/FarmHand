import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  useTheme,
  Card,
  CardContent,
  Snackbar,
  Paper,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import SaveIcon from "@mui/icons-material/SaveRounded";
import SchemaIcon from "@mui/icons-material/DescriptionRounded";
import Slide from "@mui/material/Slide";
import useDialog from "../hooks/useDialog";
import { useSchema } from "../context/SchemaContext";
import { deleteSchema, saveSchema } from "../utils/SchemaUtils";
import EditableComponentCard from "../ui/EditableComponentCard";

export default function SchemaEditor() {
  const theme = useTheme();
  const { availableSchemas, refreshSchemas } = useSchema();
  const [editingSchema, setEditingSchema] = useState<any | null>(null);
  const [sectionDialogOpen, openSectionDialog, closeSectionDialog] =
    useDialog();
  const [renameDialogOpen, openRenameDialog, closeRenameDialog] = useDialog();
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
    deleteSectionDialogOpen,
    openDeleteSectionDialog,
    closeDeleteSectionDialog,
  ] = useDialog();
  const [newSchemaDialogOpen, openNewSchemaDialog, closeNewSchemaDialog] =
    useDialog();
  const [sectionToRenameIndex, setSectionToRenameIndex] = useState<
    number | null
  >(null);
  const [newSchemaName, setNewSchemaName] = useState("");
  const [schemaToRename, setSchemaToRename] = useState<SchemaMetaData | null>(
    null
  );
  const [schemaToDelete, setSchemaToDelete] = useState<SchemaMetaData | null>(
    null
  );
  const [sectionToDeleteIndex, setSectionToDeleteIndex] = useState<
    number | null
  >(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const isEditable =
    editingSchema &&
    availableSchemas.find((s) => s.name === editingSchema.name)?.type ===
      "generated";

  const handleCreateSchema = async () => {
    await saveSchema({ name: newSchemaName, sections: [] } as Schema);
    closeNewSchemaDialog();
    await refreshSchemas();
    setNewSchemaName("");
  };

  const handleRenameSchema = async () => {
    if (!schemaToRename || !newSchemaName) {
      closeSchemaRenameDialog();
      return;
    }

    const newSchema: Schema = {
      ...schemaToRename.schema,
      name: newSchemaName,
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
  };

  const handleSaveSchema = async () => {
    if (!editingSchema) return;
    await saveSchema(editingSchema);
    const newSchemas = await refreshSchemas();
    const updatedSchema = newSchemas.find((s) => s.name === editingSchema.name);

    if (updatedSchema) {
      setEditingSchema(updatedSchema.schema);
    }
    setSnackbarOpen(true);
  };

  const handleAddSection = () => {
    if (!editingSchema) return;
    setEditingSchema({
      ...editingSchema,
      sections: [
        ...editingSchema.sections,
        { title: newSectionName, fields: [] },
      ],
    });
    setNewSectionName("");
    closeSectionDialog();
  };

  const handleDeleteSection = () => {
    if (!editingSchema || sectionToDeleteIndex === null) return;

    const newSections = editingSchema.sections.filter(
      (_: any, index: number) => index !== sectionToDeleteIndex
    );

    setEditingSchema({
      ...editingSchema,
      sections: newSections,
    });

    closeDeleteSectionDialog();
  };

  const handleAddField = (sectionIndex: number) => {
    if (!editingSchema || !isEditable) return;

    const allIds = editingSchema.sections.flatMap((s: SectionData) =>
      s.fields.map((f: Component) => f.id)
    );
    const maxId = Math.max(0, ...allIds);

    const newField: Component = {
      id: maxId + 1,
      name: "New Field",
      type: "Text",
      required: false,
      props: {},
    };

    const newSections = [...editingSchema.sections];
    newSections[sectionIndex].fields.push(newField);
    setEditingSchema({
      ...editingSchema,
      sections: newSections,
    });
  };

  const handleDeleteField = (component: Component) => {
    if (!editingSchema) return;

    const newSections = editingSchema.sections.map((section: SectionData) => {
      return {
        ...section,
        fields: section.fields.filter(
          (field: Component) => field.id !== component.id
        ),
      };
    });
    setEditingSchema({
      ...editingSchema,
      sections: newSections,
    });
  };

  const handleComponentChange = (
    sectionIndex: number,
    fieldIndex: number,
    updatedComponent: any
  ) => {
    if (!editingSchema) return;

    const newSections = [...editingSchema.sections];
    const newFields = [...newSections[sectionIndex].fields];
    newFields[fieldIndex] = updatedComponent;
    newSections[sectionIndex].fields = newFields;

    setEditingSchema({
      ...editingSchema,
      sections: newSections,
    });
  };

  const handleSectionTitleChange = (sectionIndex: number, newTitle: string) => {
    if (!editingSchema || !isEditable) return;

    const newSections = [...editingSchema.sections];
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      title: newTitle,
    };

    setEditingSchema({
      ...editingSchema,
      sections: newSections,
    });
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
      {!editingSchema ? (
        <>
          {/* Header */}
          <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.main}05 100%)`,
            border: `1px solid ${theme.palette.primary.main}40`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
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
              <SchemaIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                Schemas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage your scouting form templates
              </Typography>
            </Box>
          </Stack>
        </Paper>

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
              <Typography variant="body2" color="text.secondary">
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
                    "&:hover": {
                      borderColor: theme.palette.primary.main,
                      boxShadow: `0 4px 12px ${theme.palette.primary.main}20`,
                    },
                  }}
                  onClick={() => {
                    setEditingSchema({ ...s.schema });
                  }}
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
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <Typography variant="h6">{s.name}</Typography>
                            {s.type === "default" && (
                              <Chip
                                label="Built-in"
                                size="small"
                                sx={{
                                  backgroundColor: theme.palette.info.main,
                                  color: theme.palette.info.contrastText,
                                }}
                              />
                            )}
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
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
                                setNewSchemaName(s.name);
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
                            onClick={() => setEditingSchema({ ...s.schema })}
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
        </>
      ) : (
        <>
          {/* Editing Header */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.main}05 100%)`,
              border: `1px solid ${theme.palette.primary.main}40`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton
                onClick={() => setEditingSchema(null)}
                sx={{
                  color: theme.palette.primary.main,
                }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {availableSchemas.find((s) => s.name === editingSchema.name)
                    ?.type === "generated"
                    ? "Editing"
                    : "Viewing"}
                  : {editingSchema.name}
                </Typography>
                {!isEditable && (
                  <Typography variant="body2" color="text.secondary">
                    Built-in schemas are read-only
                  </Typography>
                )}
              </Box>
              {isEditable && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveSchema}
                  startIcon={<SaveIcon />}
                  size="large"
                  sx={{ borderRadius: 2 }}
                >
                  Save Schema
                </Button>
              )}
            </Stack>
          </Paper>

          <Stack spacing={3}>
            {editingSchema.sections?.length ? (
              editingSchema.sections.map((section: SectionData, i: number) => (
                <Card
                  key={i}
                  elevation={0}
                  sx={{
                    border: `2px solid ${theme.palette.divider}`,
                    borderRadius: 3,
                  }}
                >
                  <Box
                    sx={{
                      background: `linear-gradient(135deg, ${theme.palette.secondary.main}15 0%, ${theme.palette.secondary.main}05 100%)`,
                      borderBottom: `2px solid ${theme.palette.divider}`,
                      p: 2,
                    }}
                  >
                    {isEditable ? (
                      <Stack
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {section.title}
                        </Typography>
                        <Stack direction="row">
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              setSectionToRenameIndex(i);
                              setNewSectionTitle(section.title);
                              openRenameDialog();
                            }}
                            sx={{
                              "&:hover": {
                                backgroundColor: `${theme.palette.secondary.main}20`,
                                color: theme.palette.secondary.main,
                              },
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => {
                              setSectionToDeleteIndex(i);
                              openDeleteSectionDialog();
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
                      </Stack>
                    ) : (
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {section.title}
                      </Typography>
                    )}
                  </Box>
                  <CardContent>
                    {section.fields.length ? (
                      section.fields.map((field: Component, id) => (
                        <EditableComponentCard
                          key={id}
                          component={field}
                          onChange={(updatedComponent) =>
                            handleComponentChange(i, id, updatedComponent)
                          }
                          onDelete={(component) => handleDeleteField(component)}
                          editable={!!isEditable}
                        />
                      ))
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        (No fields yet)
                      </Typography>
                    )}
                    {isEditable && (
                      <Button
                        variant="outlined"
                        onClick={() => handleAddField(i)}
                        color="secondary"
                        sx={{ mt: 2, borderRadius: 2 }}
                        startIcon={<AddIcon />}
                      >
                        Add Field
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: "center",
                  borderRadius: 3,
                  border: `2px dashed ${theme.palette.divider}`,
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  No sections yet. Add one below.
                </Typography>
              </Paper>
            )}

            {isEditable && (
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={openSectionDialog}
                color="secondary"
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                }}
              >
                Add Section
              </Button>
            )}
          </Stack>
        </>
      )}

      {/* Add Section Dialog */}
      <Dialog open={sectionDialogOpen} onClose={closeSectionDialog}>
        <DialogTitle>Add Section</DialogTitle>
        <DialogContent>
          <TextField
            label="Section Name"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSectionDialog}>Cancel</Button>
          <Button onClick={handleAddSection} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Schema Dialog */}
      <Dialog open={newSchemaDialogOpen} onClose={closeNewSchemaDialog}>
        <DialogTitle>Create Schema</DialogTitle>
        <DialogContent>
          <TextField
            label="Schema Name"
            value={newSchemaName}
            onChange={(e) => setNewSchemaName(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeNewSchemaDialog}>Cancel</Button>
          <Button onClick={handleCreateSchema} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Section Dialog */}
      <Dialog open={renameDialogOpen} onClose={closeRenameDialog}>
        <DialogTitle>Rename Section</DialogTitle>
        <DialogContent>
          <TextField
            label="Section Name"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRenameDialog}>Cancel</Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (sectionToRenameIndex !== null) {
                handleSectionTitleChange(sectionToRenameIndex, newSectionTitle);
              }
              closeRenameDialog();
            }}
            variant="contained"
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Schema Dialog */}
      <Dialog open={schemaRenameDialogOpen} onClose={closeSchemaRenameDialog}>
        <DialogTitle>Rename Schema</DialogTitle>
        <DialogContent>
          <TextField
            label="Schema Name"
            value={newSchemaName}
            onChange={(e) => setNewSchemaName(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSchemaRenameDialog}>Cancel</Button>
          <Button onClick={handleRenameSchema} variant="contained">
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Schema Confirmation Dialog */}
      <Dialog open={deleteSchemaDialogOpen} onClose={closeDeleteSchemaDialog}>
        <DialogTitle>Delete Schema "{schemaToDelete?.name}"?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this schema? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteSchemaDialog}>Cancel</Button>
          <Button
            onClick={handleDeleteSchema}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Section Dialog */}
      <Dialog open={deleteSectionDialogOpen} onClose={closeDeleteSectionDialog}>
        <DialogTitle>
          Delete Section "
          {sectionToDeleteIndex !== null &&
            editingSchema?.sections[sectionToDeleteIndex]?.title}
          "?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this section and all of its fields?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteSectionDialog}>Cancel</Button>
          <Button
            onClick={handleDeleteSection}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        slots={{ transition: Slide }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        slotProps={{
          content: {
            sx: {
              backgroundColor: theme.palette.success.main,
              color: theme.palette.success.contrastText,
              fontFamily: theme.typography.subtitle1,
            },
          },
        }}
        message="Successfully saved schema"
        autoHideDuration={1200}
        action={
          <IconButton
            onClick={() => {
              setSnackbarOpen(false);
            }}
          >
            <CloseIcon />
          </IconButton>
        }
      />
    </Box>
  );
}
