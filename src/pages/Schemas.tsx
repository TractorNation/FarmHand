import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Divider,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  useTheme,
  Card,
  CardContent,
  Snackbar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import SaveIcon from "@mui/icons-material/SaveRounded";
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
          <Typography variant="h4" gutterBottom>
            Schemas
          </Typography>
          <List sx={{ flexGrow: 1 }}>
            {availableSchemas.map((s, i) => (
              <ListItem
                key={i}
                secondaryAction={
                  s.type === "generated" ? (
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setSchemaToRename(s);
                          setNewSchemaName(s.name);
                          openSchemaRenameDialog();
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSchemaToDelete(s);
                          openDeleteSchemaDialog();
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={1}>
                      <Button
                        onClick={() => setEditingSchema({ ...s.schema })}
                        variant="outlined"
                        color="secondary"
                      >
                        View
                      </Button>
                    </Stack>
                  )
                }
              >
                <ListItemButton
                  onClick={() => setEditingSchema({ ...s.schema })}
                >
                  <ListItemText primary={s.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openNewSchemaDialog}
            color="primary"
          >
            Create New Schema
          </Button>
        </>
      ) : (
        <>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={() => setEditingSchema(null)}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5">
              {availableSchemas.find((s) => s.name === editingSchema.name)
                ?.type === "generated"
                ? "Editing"
                : "Viewing"}
              : {editingSchema.name}
            </Typography>
          </Stack>
          <Divider sx={{ my: 2 }} />

          <Stack spacing={3}>
            {editingSchema.sections?.length ? (
              editingSchema.sections.map((section: SectionData, i: number) => (
                <Card key={i} variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent>
                    {isEditable ? (
                      <Stack
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        sx={{ flexGrow: 1 }}
                        justifyContent="space-between"
                      >
                        <Typography variant="h6">{section.title}</Typography>
                        <Stack direction="row">
                          <IconButton
                            onClick={() => {
                              setSectionToRenameIndex(i);
                              setNewSectionTitle(section.title);
                              openRenameDialog();
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => {
                              setSectionToDeleteIndex(i);
                              openDeleteSectionDialog();
                            }}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </Stack>
                    ) : (
                      <Typography variant="h6" gutterBottom>
                        {section.title}
                      </Typography>
                    )}
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
                        sx={{ mt: 2 }}
                      >
                        Add Field
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Typography color="text.secondary">
                No sections yet. Add one below.
              </Typography>
            )}

            {isEditable && (
              <Stack
                direction="row"
                spacing={2}
                justifyContent="space-between"
                width="100%"
                sx={{ mt: 3 }}
              >
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openSectionDialog}
                  color="secondary"
                >
                  Add Section
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveSchema}
                  startIcon={<SaveIcon />}
                >
                  Save Schema
                </Button>
              </Stack>
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
        <Button onClick={closeNewSchemaDialog}>Cancel</Button>
        <DialogActions>
          <Button onClick={handleCreateSchema} variant="contained">
            Add
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
            onClick={() => {
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
          <Button
            onClick={handleDeleteSchema}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
          <Button onClick={closeDeleteSchemaDialog}>Cancel</Button>
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
          <Button
            onClick={handleDeleteSection}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
          <Button onClick={closeDeleteSectionDialog}>Cancel</Button>
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
