import { useMemo, useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  IconButton,
  useTheme,
  Card,
  CardContent,
  Snackbar,
  Paper,
  Chip,
  InputAdornment,
} from "@mui/material";
import {
  DndContext,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import SaveIcon from "@mui/icons-material/SaveRounded";
import SchemaIcon from "@mui/icons-material/SchemaRounded";
import WarningIcon from "@mui/icons-material/WarningRounded";
import SearchIcon from "@mui/icons-material/SearchRounded";
import Slide from "@mui/material/Slide";
import useDialog from "../hooks/useDialog";
import { useSchema } from "../context/SchemaContext";
import { deleteSchema, saveSchema } from "../utils/SchemaUtils";
import EditableComponentCard from "../ui/EditableComponentCard";
import PageHeader from "../ui/PageHeader";
import CreateSchemaDialog from "../ui/dialog/CreateSchemaDialog";
import AddSectionDialog from "../ui/dialog/AddSectionDialog";
import RenameSectionDialog from "../ui/dialog/RenameSectionDialog";
import RenameSchemaDialog from "../ui/dialog/RenameSchemaDialog";
import DeleteSchemaDialog from "../ui/dialog/DeleteSchemaDialog";
import DeleteSectionDialog from "../ui/dialog/DeleteSectionDialog";
import DuplicateNameDialog from "../ui/dialog/DuplicateNameDialog";
import UnsavedSchemaChangesDialog from "../ui/dialog/UnsavedSchemaChangesDialog";

function DroppableSection({
  section,
  children,
}: {
  section: SectionData;
  sectionIndex: number;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: section.title,
  });

  return (
    <div ref={setNodeRef} style={{ minHeight: "50px" }}>
      {children}
    </div>
  );
}

export default function SchemaEditor() {
  const theme = useTheme();
  const { availableSchemas, refreshSchemas } = useSchema();
  const [editingSchema, setEditingSchema] = useState<any | null>(null);
  const [originalSchema, setOriginalSchema] = useState<any | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
  const [newSchemaDialogOpen, openNewSchemaDialog, closeNewSchemaDialog] =
    useDialog();
  const [schemaToRename, setSchemaToRename] = useState<SchemaMetaData | null>(
    null
  );
  const [schemaToDelete, setSchemaToDelete] = useState<SchemaMetaData | null>(
    null
  );
  const [sectionToDeleteIndex, setSectionToDeleteIndex] = useState<
    number | null
  >(null);
  const [duplicateNameError, setDuplicateNameError] = useState("");

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [nextFieldId, setNextFieldId] = useState(1);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    })
  );
  const [activeId, setActiveId] = useState<string | number | null>(null);

  const activeComponent = useMemo(() => {
    if (!activeId || !editingSchema) return null;

    for (const section of editingSchema.sections) {
      const field = section.fields.find((f: Component) => f.id === activeId);
      if (field) return field;
    }
    return null;
  }, [activeId, editingSchema]);

  const isEditable =
    editingSchema &&
    availableSchemas.find((s) => s.name === editingSchema.name)?.type ===
      "generated";

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

  // Check for unsaved changes whenever editingSchema changes
  useEffect(() => {
    if (!editingSchema || !originalSchema) {
      setHasUnsavedChanges(false);
      return;
    }

    const hasChanges =
      JSON.stringify(editingSchema) !== JSON.stringify(originalSchema);
    setHasUnsavedChanges(hasChanges);
  }, [editingSchema, originalSchema]);

  // Filter sections and fields based on search query
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

        // Include section if it matches or has matching fields
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
    };
  }, [editingSchema, searchQuery]);

  const handleEditSchema = (schema: any) => {
    const schemaCopy = JSON.parse(JSON.stringify(schema));
    setEditingSchema(schemaCopy);
    setOriginalSchema(JSON.parse(JSON.stringify(schemaCopy)));
    setSearchQuery("");
  };

  const handleBackClick = () => {
    if (hasUnsavedChanges && isEditable) {
      openUnsavedChangesDialog();
    } else {
      setEditingSchema(null);
      setOriginalSchema(null);
      setHasUnsavedChanges(false);
      setSearchQuery("");
    }
  };

  const handleDiscardChanges = () => {
    setEditingSchema(null);
    setOriginalSchema(null);
    setHasUnsavedChanges(false);
    setSearchQuery("");
    closeUnsavedChangesDialog();
  };

  const checkSchemaNameExists = (name: string, excludeName?: string) => {
    return availableSchemas.some(
      (s) =>
        s.name.toLowerCase() === name.toLowerCase() && s.name !== excludeName
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
              type: "text",
              required: true,
              props: {},
            },
            {
              id: 2,
              name: "Team Number",
              type: "text",
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

  const handleSaveSchema = async () => {
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

  const isSchemaSaveable = useMemo(() => {
    if (!editingSchema) {
      return false;
    }
    for (const section of editingSchema.sections) {
      for (const field of section.fields) {
        if (!field.type) return false;
        if (field.type === "dropdown" && !field.props?.options) return false;
      }
    }
    return true;
  }, [editingSchema]);

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

    // Check for duplicate field name (excluding the current field)
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

  // Get the original section index for filtered results
  const getOriginalSectionIndex = (filteredIndex: number) => {
    if (!searchQuery.trim() || !editingSchema) return filteredIndex;

    const filteredSection = filteredSchema.sections[filteredIndex];
    return editingSchema.sections.findIndex(
      (s: SectionData) => s.title === filteredSection.title
    );
  };

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    setActiveId(active.id);
  }
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    setEditingSchema((prev: Schema) => {
      if (!prev) return null;

      // Find which section contains the active item
      let activeSectionIndex = -1;
      let activeFieldIndex = -1;

      for (let i = 0; i < prev.sections.length; i++) {
        const fieldIndex = prev.sections[i].fields.findIndex(
          (f: Component) => f.id === activeId
        );
        if (fieldIndex !== -1) {
          activeSectionIndex = i;
          activeFieldIndex = fieldIndex;
          break;
        }
      }

      if (activeSectionIndex === -1) return prev;

      // Determine the target section and position
      let overSectionIndex = -1;
      let overFieldIndex = -1;

      // Check if dropping over a section container (empty section or section itself)
      const overSection = prev.sections.find(
        (s: SectionData) => s.title === overId
      );
      if (overSection) {
        overSectionIndex = prev.sections.indexOf(overSection);
        overFieldIndex = overSection.fields.length; // Add to end
      } else {
        // Dropping over another field
        for (let i = 0; i < prev.sections.length; i++) {
          const fieldIndex = prev.sections[i].fields.findIndex(
            (f: Component) => f.id === overId
          );
          if (fieldIndex !== -1) {
            overSectionIndex = i;
            overFieldIndex = fieldIndex;
            break;
          }
        }
      }

      if (overSectionIndex === -1) return prev;

      // Same section - reorder
      if (activeSectionIndex === overSectionIndex) {
        if (activeFieldIndex === overFieldIndex) return prev;

        const newSections = [...prev.sections];
        const fields = [...newSections[activeSectionIndex].fields];
        const [movedItem] = fields.splice(activeFieldIndex, 1);
        fields.splice(overFieldIndex, 0, movedItem);

        newSections[activeSectionIndex] = {
          ...newSections[activeSectionIndex],
          fields,
        };

        return { ...prev, sections: newSections };
      }

      // Different section - move
      const newSections = [...prev.sections];
      const [movedItem] = newSections[activeSectionIndex].fields.splice(
        activeFieldIndex,
        1
      );
      newSections[overSectionIndex].fields.splice(overFieldIndex, 0, movedItem);

      return { ...prev, sections: newSections };
    });
  }

  // 3. Update handleDragEnd:
  function handleDragEnd() {
    setActiveId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
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
        {!editingSchema ? (
          <>
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
                      "&:hover": {
                        borderColor: theme.palette.primary.main,
                        boxShadow: `0 4px 12px ${theme.palette.primary.main}20`,
                      },
                    }}
                    onClick={() => handleEditSchema({ ...s.schema })}
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
                              onClick={() => handleEditSchema({ ...s.schema })}
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
            {/* Header */}
            <PageHeader
              icon={<SchemaIcon sx={{ fontSize: 28 }} />}
              title={`${
                availableSchemas.find((s) => s.name === editingSchema.name)
                  ?.type === "generated"
                  ? "Editing"
                  : "Viewing"
              }: ${editingSchema.name}`}
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
                <Stack direction="column" spacing={2} alignItems="center">
                  {isEditable && hasUnsavedChanges && (
                    <Chip
                      icon={<WarningIcon />}
                      label="Unsaved Changes"
                      color="warning"
                      sx={{
                        fontFamily: theme.typography.subtitle2,
                      }}
                    />
                  )}
                  {isEditable && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSaveSchema}
                      startIcon={<SaveIcon />}
                      size="large"
                      disabled={!isSchemaSaveable}
                      sx={{ borderRadius: 2 }}
                    >
                      Save Schema
                    </Button>
                  )}
                </Stack>
              }
            />

            {/* Search Bar */}
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
                filteredSchema.sections.map(
                  (section: SectionData, i: number) => {
                    const originalIndex = getOriginalSectionIndex(i);
                    const isProtectedSection = section.fields.some(
                      (field: Component) =>
                        field.name === "Match Number" ||
                        field.name === "Team Number"
                    );

                    return (
                      <DroppableSection
                        key={section.title}
                        section={section}
                        sectionIndex={originalIndex}
                      >
                        <SortableContext
                          id={section.title}
                          items={section.fields.map((f: Component) => f.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <Card
                            key={originalIndex}
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
                                  <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 600 }}
                                  >
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
                                <Typography
                                  variant="h6"
                                  sx={{ fontWeight: 600 }}
                                >
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
                                >
                                  {searchQuery.trim()
                                    ? "No matching fields"
                                    : "(No fields yet)"}
                                </Typography>
                              )}
                              {isEditable && !searchQuery.trim() && (
                                <Button
                                  variant="outlined"
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
                  }
                )
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
          </>
        )}

        {/* Add Section Dialog */}
        <AddSectionDialog
          open={sectionDialogOpen}
          onClose={closeSectionDialog}
          onAdd={handleAddSection}
        />

        {/* New Schema Dialog */}
        <CreateSchemaDialog
          open={newSchemaDialogOpen}
          onClose={closeNewSchemaDialog}
          onCreate={handleCreateSchema}
        />

        {/* Rename Section Dialog */}
        <RenameSectionDialog
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

        {/* Delete Section Dialog */}
        <DeleteSectionDialog
          open={deleteSectionDialogOpen}
          onClose={closeDeleteSectionDialog}
          onDelete={handleDeleteSection}
          sectionName={
            sectionToDeleteIndex !== null
              ? editingSchema?.sections[sectionToDeleteIndex]?.title || null
              : null
          }
        />

        {/* Duplicate Name Warning Dialog */}
        <DuplicateNameDialog
          open={duplicateNameDialogOpen}
          onClose={closeDuplicateNameDialog}
          errorMessage={duplicateNameError}
        />

        {/* Unsaved Changes Warning Dialog */}
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
      </Box>

      <DragOverlay dropAnimation={null}>
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
    </DndContext>
  );
}
