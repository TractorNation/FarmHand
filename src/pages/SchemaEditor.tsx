import { useState, useMemo, useEffect, useRef, ReactNode } from "react";
import { useParams, useNavigate } from "react-router";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  DndContext,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  IconButton,
  Stack,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Card,
  Box,
  Typography,
  CardContent,
  Paper,
  Slide,
  Snackbar,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import EditableComponentCard from "../ui/EditableComponentCard";
import PageHeader from "../ui/PageHeader";
import SaveIcon from "@mui/icons-material/SaveRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import WarningIcon from "@mui/icons-material/WarningRounded";
import SearchIcon from "@mui/icons-material/SearchRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import SchemaIcon from "@mui/icons-material/SchemaRounded";
import ShareIcon from "@mui/icons-material/ShareRounded";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import useDialog from "../hooks/useDialog";
import { useSchema } from "../context/SchemaContext";
import CreateDialog from "../ui/dialog/CreateDialog";
import DeleteDialog from "../ui/dialog/DeleteDialog";
import DuplicateNameDialog from "../ui/dialog/DuplicateNameDialog";
import UnsavedSchemaChangesDialog from "../ui/dialog/UnsavedSchemaChangesDialog";
import { saveSchema } from "../utils/SchemaUtils";
import ShareDialog from "../ui/dialog/ShareDialog";
import RenameDialog from "../ui/dialog/RenameDialog";

function DroppableSection({
  section,
  children,
}: {
  section: SectionData;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: section.title,
    data: {
      type: "section",
    },
  });

  return (
    <div ref={setNodeRef} style={{ minHeight: "50px", width: "100%" }}>
      {children}
    </div>
  );
}

export default function SchemaEditor() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { schemaName } = useParams<{ schemaName: string }>();
  const { availableSchemas, refreshSchemas } = useSchema();

  const [editingSchema, setEditingSchema] = useState<Schema | null>(null);
  const [originalSchema, setOriginalSchema] = useState<Schema | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [nextFieldId, setNextFieldId] = useState(1);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [duplicateNameError, setDuplicateNameError] = useState("");

  const [sectionDialogOpen, openSectionDialog, closeSectionDialog] =
    useDialog();
  const [renameDialogOpen, openRenameDialog, closeRenameDialog] = useDialog();
  const [shareDialogOpen, openShareDialog, closeShareDialog] = useDialog();
  const [warningDialogOpen, openWarningDialog, closeWarningDialog] =
    useDialog();
  const [
    deleteSectionDialogOpen,
    openDeleteSectionDialog,
    closeDeleteSectionDialog,
  ] = useDialog();
  const [
    unsavedChangesDialogOpen,
    openUnsavedChangesDialog,
    closeUnsavedChangesDialog,
  ] = useDialog();
  const [
    duplicateNameDialogOpen,
    openDuplicateNameDialog,
    closeDuplicateNameDialog,
  ] = useDialog();

  const [sectionToRenameIndex, setSectionToRenameIndex] = useState<
    number | null
  >(null);
  const [sectionToDeleteIndex, setSectionToDeleteIndex] = useState<
    number | null
  >(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const isDraggingRef = useRef(false);
  const lastUpdateRef = useRef<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
      onActivation: (event) => {
        event.event.preventDefault();
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 100,
      },
      onActivation: (event) => {
        event.event.preventDefault();
      },
    })
  );

  const isEditable =
    editingSchema &&
    availableSchemas.find((s) => s.name === editingSchema.name)?.type ===
      "generated";

  // Load schema when component mounts or schemaName changes
  useEffect(() => {
    if (!schemaName) return;

    const decodedName = decodeURIComponent(schemaName);
    const schema = availableSchemas.find((s) => s.name === decodedName);

    if (schema) {
      const schemaCopy = JSON.parse(JSON.stringify(schema.schema));
      setEditingSchema(schemaCopy);
      setOriginalSchema(JSON.parse(JSON.stringify(schemaCopy)));
    }
  }, [schemaName, availableSchemas]);

  // Initialize nextFieldId when editing schema changes
  useEffect(() => {
    if (editingSchema) {
      const allIds = editingSchema.sections.flatMap((s: SectionData) =>
        s.fields.map((f: Component) => f.id)
      );
      const maxId = Math.max(0, ...allIds);
      setNextFieldId(maxId + 1);
    }
  }, [editingSchema]);

  // Check for unsaved changes
  useEffect(() => {
    if (!editingSchema || !originalSchema) {
      setHasUnsavedChanges(false);
      return;
    }

    const hasChanges =
      JSON.stringify(editingSchema) !== JSON.stringify(originalSchema);
    setHasUnsavedChanges(hasChanges);
  }, [editingSchema, originalSchema]);

  const activeComponent = useMemo(() => {
    if (!activeId || !editingSchema) return null;

    for (const section of editingSchema.sections) {
      const field = section.fields.find((f: Component) => f.id === activeId);
      if (field) return field;
    }
    return null;
  }, [activeId, editingSchema]);

  const filteredSchema = useMemo(() => {
    if (!editingSchema || !searchQuery.trim()) {
      return editingSchema;
    }

    const query = searchQuery.toLowerCase();
    const filteredSections = editingSchema.sections
      .map((section: SectionData) => {
        const sectionMatches = section.title.toLowerCase().includes(query);
        const filteredFields = section.fields.filter((field: Component) =>
          field.name.toLowerCase().includes(query)
        );

        if (sectionMatches || filteredFields.length > 0) {
          return {
            ...section,
            fields: sectionMatches ? section.fields : filteredFields,
          };
        }
        return null;
      })
      .filter(Boolean);

    return {
      ...editingSchema,
      sections: filteredSections,
    } as Schema;
  }, [editingSchema, searchQuery]);

  const isSchemaSaveable = useMemo(() => {
    if (!editingSchema) return false;

    for (const section of editingSchema.sections) {
      for (const field of section.fields) {
        if (!field.type) return false;
        if (field.type === "dropdown" && !field.props?.options) return false;
      }
    }
    return true;
  }, [editingSchema]);

  const getOriginalSectionIndex = (filteredIndex: number) => {
    if (!searchQuery.trim() || !editingSchema) {
      return filteredIndex;
    }
    const filteredSection = filteredSchema!.sections[filteredIndex];
    return editingSchema.sections.findIndex(
      (s) => s.title === filteredSection.title
    );
  };

  const checkSectionNameExists = (name: string, excludeIndex?: number) => {
    if (!editingSchema) return false;
    return editingSchema.sections.some(
      (s: SectionData, i: number) =>
        s.title.toLowerCase() === name.toLowerCase() && i !== excludeIndex
    );
  };

  const checkFieldNameExists = (
    sectionIndex: number,
    name: string,
    excludeFieldIndex?: number
  ) => {
    if (!editingSchema) return false;
    const section = editingSchema.sections[sectionIndex];
    if (!section) return false;
    return section.fields.some(
      (f: Component, i: number) =>
        f.name.toLowerCase() === name.toLowerCase() && i !== excludeFieldIndex
    );
  };

  const handleBackClick = () => {
    if (hasUnsavedChanges && isEditable) {
      openUnsavedChangesDialog();
    } else {
      navigate("/schemas", { state: { showWarning: false } });
    }
  };

  const handleDiscardChanges = () => {
    closeUnsavedChangesDialog();
    navigate("/schemas");
  };

  const handleSaveSchema = async () => {
    closeWarningDialog();
    if (!editingSchema) return;
    await saveSchema(editingSchema);
    const newSchemas = await refreshSchemas();
    const updatedSchema = newSchemas.find((s) => s.name === editingSchema.name);

    if (updatedSchema) {
      const updatedSchemaCopy = JSON.parse(
        JSON.stringify(updatedSchema.schema)
      );
      setEditingSchema(updatedSchemaCopy);
      setOriginalSchema(JSON.parse(JSON.stringify(updatedSchemaCopy)));
    }
    setSnackbarOpen(true);
  };

  const handleAddSection = (newSectionName: string) => {
    if (!editingSchema) return;
    if (checkSectionNameExists(newSectionName)) {
      setDuplicateNameError(`Section "${newSectionName}" already exists`);
      openDuplicateNameDialog();
      return;
    }
    setEditingSchema({
      ...editingSchema,
      sections: [
        ...editingSchema.sections,
        { title: newSectionName, fields: [] },
      ],
    });
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
    setSectionToDeleteIndex(null);
  };

  const handleAddField = (sectionIndex: number) => {
    if (!editingSchema || !isEditable) return;

    const newField: Component = {
      id: nextFieldId,
      name: `New Field ${nextFieldId}`,
      type: "",
      required: false,
      props: {},
    };

    const newSections = [...editingSchema.sections];
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      fields: [...newSections[sectionIndex].fields, newField],
    };

    setEditingSchema({
      ...editingSchema,
      sections: newSections,
    });
    setNextFieldId(nextFieldId + 1);
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
    updatedComponent: Component
  ) => {
    if (!editingSchema) return;

    if (
      updatedComponent.name !==
      editingSchema.sections[sectionIndex].fields[fieldIndex].name
    ) {
      if (
        checkFieldNameExists(sectionIndex, updatedComponent.name, fieldIndex)
      ) {
        setDuplicateNameError(
          `Field "${updatedComponent.name}" already exists in this section`
        );
        openDuplicateNameDialog();
        return;
      }
    }

    const newSections = [...editingSchema.sections];
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      fields: [
        ...newSections[sectionIndex].fields.slice(0, fieldIndex),
        updatedComponent,
        ...newSections[sectionIndex].fields.slice(fieldIndex + 1),
      ],
    };

    setEditingSchema({
      ...editingSchema,
      sections: newSections,
    });
  };

  const handleSectionTitleChange = (
    sectionIndex: number,
    newSectionName: string
  ) => {
    if (!editingSchema || !isEditable) return;

    if (checkSectionNameExists(newSectionName, sectionIndex)) {
      setDuplicateNameError(`Section "${newSectionName}" already exists`);
      openDuplicateNameDialog();
      return;
    }
    const newSections = [...editingSchema.sections];
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      title: newSectionName,
    };

    setEditingSchema({
      ...editingSchema,
      sections: newSections,
    });
  };

  function handleDragStart(event: DragStartEvent) {
    isDraggingRef.current = true;
    setActiveId(event.active.id);
  }

  const findFieldLocation = (
    schema: Schema,
    fieldId: string | number
  ): { sectionIndex: number; fieldIndex: number } | null => {
    for (let i = 0; i < schema.sections.length; i++) {
      const fieldIndex = schema.sections[i].fields.findIndex(
        (f: Component) => f.id === fieldId
      );
      if (fieldIndex !== -1) {
        return { sectionIndex: i, fieldIndex };
      }
    }
    return null;
  };

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

    if (!over || !editingSchema || active.id === over.id) {
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    const sourceLocation = findFieldLocation(editingSchema, activeId);
    if (!sourceLocation) return;
    const sourceContainerId =
      editingSchema.sections[sourceLocation.sectionIndex].title;

    const overLocation = findFieldLocation(editingSchema, overId);
    const overContainerId = overLocation
      ? editingSchema.sections[overLocation.sectionIndex].title
      : overId.toString();

    if (sourceContainerId === overContainerId) {
      return; // Same container, handled by onDragEnd
    }

    // Cross-container move
    setEditingSchema((prevSchema) => {
      if (!prevSchema) return null;

      const fromSectionIndex = prevSchema.sections.findIndex(
        (s) => s.title === sourceContainerId
      );
      const toSectionIndex = prevSchema.sections.findIndex(
        (s) => s.title === overContainerId
      );

      if (fromSectionIndex === -1 || toSectionIndex === -1) {
        return prevSchema;
      }

      const fromFieldIndex = prevSchema.sections[
        fromSectionIndex
      ].fields.findIndex((f) => f.id === activeId);
      if (fromFieldIndex === -1) {
        return prevSchema;
      }

      const overFieldInDest = findFieldLocation(prevSchema, overId);
      let toFieldIndex = overFieldInDest
        ? overFieldInDest.fieldIndex
        : prevSchema.sections[toSectionIndex].fields.length;

      // Adjust index based on drop position relative to the 'over' item
      if (overFieldInDest && over.rect && active.rect.current.translated) {
        const isBelow =
          active.rect.current.translated.top >
          over.rect.top + over.rect.height / 2;
        if (isBelow) {
          toFieldIndex += 1;
        }
      }

      const newSections = JSON.parse(JSON.stringify(prevSchema.sections));
      const [movedField] = newSections[fromSectionIndex].fields.splice(
        fromFieldIndex,
        1
      );
      newSections[toSectionIndex].fields.splice(toFieldIndex, 0, movedField);

      return { ...prevSchema, sections: newSections };
    });
  }

  function resetDragState() {
    isDraggingRef.current = false;
    lastUpdateRef.current = "";
    setActiveId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const sourceLocation = findFieldLocation(editingSchema!, active.id);
      const overLocation = findFieldLocation(editingSchema!, over.id);

      // Only handle same-container sorting.
      if (
        sourceLocation &&
        overLocation &&
        sourceLocation.sectionIndex === overLocation.sectionIndex
      ) {
        const { sectionIndex, fieldIndex: fromIndex } = sourceLocation;
        const { fieldIndex: toIndex } = overLocation;

        if (fromIndex !== toIndex) {
          setEditingSchema((schema) => {
            if (!schema) return null;
            const newSections = JSON.parse(JSON.stringify(schema.sections));
            newSections[sectionIndex].fields = arrayMove(
              newSections[sectionIndex].fields,
              fromIndex,
              toIndex
            );
            return { ...schema, sections: newSections };
          });
        }
      }
    }

    resetDragState();
  }

  function handleDragCancel() {
    resetDragState();
  }

  if (!editingSchema) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Loading schema...
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCenter}
      >
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
          <PageHeader
            icon={<SchemaIcon sx={{ fontSize: 28 }} />}
            title={`${isEditable ? "Editing" : "Viewing"}: ${
              editingSchema.name
            }`}
            subtitle={
              isEditable
                ? "Change or create form fields"
                : "Built-in schemas are view only"
            }
            leadingComponent={
              <IconButton
                onClick={handleBackClick}
                sx={{
                  color: theme.palette.primary.main,
                }}
              >
                <ArrowBackIcon />
              </IconButton>
            }
            trailingComponent={
              <Stack direction="row" spacing={2}>
                <IconButton
                  onClick={openShareDialog}
                  sx={{
                    color: theme.palette.secondary.main,
                    "&:hover": {
                      backgroundColor: `${theme.palette.secondary.main}20`,
                    },
                  }}
                >
                  <ShareIcon />
                </IconButton>
                <Stack direction="column" spacing={2} alignItems="center">
                  {isEditable && hasUnsavedChanges && (
                    <Chip
                      icon={<WarningIcon />}
                      label="Unsaved Changes"
                      color="warning"
                      sx={{
                        fontWeight: 600,
                        fontFamily: theme.typography.body1,
                      }}
                    />
                  )}
                  {isEditable && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={openWarningDialog}
                      startIcon={<SaveIcon />}
                      size="large"
                      disabled={!isSchemaSaveable}
                      sx={{ borderRadius: 2 }}
                    >
                      Save Schema
                    </Button>
                  )}
                </Stack>
              </Stack>
            }
          />

          {editingSchema.sections?.length > 0 && (
            <TextField
              placeholder="Search sections and fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              sx={{ mb: 3 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setSearchQuery("")}
                        size="small"
                      >
                        <CloseIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}

          <Stack spacing={3}>
            {filteredSchema?.sections?.length ? (
              filteredSchema.sections.map((section: SectionData, i: number) => {
                const originalIndex = getOriginalSectionIndex(i);
                const isProtectedSection = section.fields.some(
                  (field: Component) =>
                    field.name === "Match Number" ||
                    field.name === "Team Number"
                );
                return (
                  <DroppableSection key={section.title} section={section}>
                    <SortableContext
                      id={section.title}
                      items={section.fields.map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <Card
                        elevation={0}
                        sx={{
                          border: `2px solid ${theme.palette.divider}`,
                          borderRadius: 3,
                        }}
                      >
                        <Box
                          sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.main}05 100%)`,
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
                                  onClick={() => {
                                    setSectionToRenameIndex(originalIndex);
                                    openRenameDialog();
                                  }}
                                  sx={{
                                    "&:hover": {
                                      backgroundColor: `${theme.palette.primary.main}20`,
                                      color: theme.palette.primary.main,
                                    },
                                  }}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  onClick={() => {
                                    setSectionToDeleteIndex(originalIndex);
                                    openDeleteSectionDialog();
                                  }}
                                  disabled={isProtectedSection}
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
                            section.fields.map((field: Component) => {
                              const fieldIndex = editingSchema.sections[
                                originalIndex
                              ].fields.findIndex(
                                (f: Component) => f.id === field.id
                              );
                              return (
                                <EditableComponentCard
                                  key={field.id}
                                  component={field}
                                  onChange={(updatedComponent) =>
                                    handleComponentChange(
                                      originalIndex,
                                      fieldIndex,
                                      updatedComponent
                                    )
                                  }
                                  onDelete={(component) =>
                                    handleDeleteField(component)
                                  }
                                  editable={!!isEditable}
                                />
                              );
                            })
                          ) : (
                            <Typography
                              variant="body1"
                              color="text.secondary"
                              sx={{ p: 2, textAlign: "center" }}
                            >
                              {searchQuery.trim()
                                ? "No matching fields"
                                : "Drop fields here or add a new field"}
                            </Typography>
                          )}
                          {isEditable && !searchQuery.trim() && (
                            <Button
                              variant="contained"
                              onClick={() => handleAddField(originalIndex)}
                              color="secondary"
                              sx={{ mt: 2, borderRadius: 2 }}
                              startIcon={<AddIcon />}
                            >
                              Add Field
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </SortableContext>
                  </DroppableSection>
                );
              })
            ) : searchQuery.trim() ? (
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: "center",
                  borderRadius: 3,
                  border: `2px dashed ${theme.palette.divider}`,
                }}
              >
                <SearchIcon
                  sx={{
                    fontSize: 64,
                    color: theme.palette.text.disabled,
                    mb: 2,
                  }}
                />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No results found
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Try a different search term
                </Typography>
              </Paper>
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

            {isEditable && !searchQuery.trim() && (
              <Button
                variant="outlined"
                size="large"
                startIcon={<AddIcon />}
                onClick={openSectionDialog}
                color="primary"
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  borderWidth: 2,
                  "&:hover": { borderWidth: 2 },
                }}
              >
                Add Section
              </Button>
            )}
          </Stack>

          <CreateDialog
            open={sectionDialogOpen}
            onClose={closeSectionDialog}
            onCreate={handleAddSection}
            title="Add Section"
            label="Section Name"
            actionButtonText="Add"
          />

          <RenameDialog
            open={renameDialogOpen}
            onClose={closeRenameDialog}
            onRename={(newSectionName) => {
              if (sectionToRenameIndex !== null) {
                handleSectionTitleChange(sectionToRenameIndex, newSectionName);
              }
              closeRenameDialog();
            }}
            initialName={
              sectionToRenameIndex !== null
                ? editingSchema?.sections[sectionToRenameIndex]?.title || ""
                : ""
            }
            title="Rename Section"
          />

          <DeleteDialog
            open={deleteSectionDialogOpen}
            onClose={closeDeleteSectionDialog}
            onDelete={handleDeleteSection}
            title={`Delete Section "${
              sectionToDeleteIndex !== null
                ? editingSchema?.sections[sectionToDeleteIndex]?.title || null
                : null
            }"?`}
          >
            Are you sure you want to delete this section and all of its fields?
            This action cannot be undone.
          </DeleteDialog>

          <DuplicateNameDialog
            open={duplicateNameDialogOpen}
            onClose={closeDuplicateNameDialog}
            errorMessage={duplicateNameError}
          />

          <UnsavedSchemaChangesDialog
            open={unsavedChangesDialogOpen}
            onClose={closeUnsavedChangesDialog}
            onDiscard={handleDiscardChanges}
          />

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

          <DragOverlay dropAnimation={undefined}>
            {activeComponent ? (
              <Box
                sx={{
                  opacity: 0.9,
                  cursor: "grabbing",
                  transform: "rotate(2deg)",
                  boxShadow: theme.shadows[8],
                }}
              >
                <EditableComponentCard
                  component={activeComponent}
                  onChange={() => {}}
                  editable={false}
                />
              </Box>
            ) : null}
          </DragOverlay>
        </Box>
      </DndContext>

      {editingSchema && (
        <ShareDialog
          mode="schema"
          open={shareDialogOpen}
          onClose={closeShareDialog}
          schema={editingSchema}
        />
      )}

      <Dialog open={warningDialogOpen}>
        <DialogTitle>
          <WarningIcon sx={{ mr: 1 }} color="warning" /> Warning
        </DialogTitle>
        <DialogContent>
          Changing a schema could result in inaccurate data for the rest of your
          team. If you are actively using this schema, make sure to share it
          with ALL other devices being used. If you are not your teams lead
          scouter, check with them before making any changes.
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="primary" onClick={closeWarningDialog}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleSaveSchema}
          >
            Continue Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
