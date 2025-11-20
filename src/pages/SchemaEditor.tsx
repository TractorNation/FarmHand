import { useState, useMemo, useEffect, useRef, ReactNode } from "react";
import { useParams, useNavigate } from "react-router";
import {
  SortableContext,
  verticalListSortingStrategy,
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
import AddSectionDialog from "../ui/dialog/AddSectionDialog";
import DeleteSectionDialog from "../ui/dialog/DeleteSectionDialog";
import DuplicateNameDialog from "../ui/dialog/DuplicateNameDialog";
import RenameSectionDialog from "../ui/dialog/RenameSectionDialog";
import UnsavedSchemaChangesDialog from "../ui/dialog/UnsavedSchemaChangesDialog";
import { saveSchema } from "../utils/SchemaUtils";
import SchemaShareDialog from "../ui/dialog/SchemaShareDialog";

type DropTarget = {
  sectionIndex: number;
  fieldIndex: number;
};

type DragMeta =
  | { type: "field"; sectionIndex: number; fieldIndex: number }
  | { type: "section"; sectionIndex: number };

function DroppableSection({
  section,
  sectionIndex,
  children,
}: {
  section: SectionData;
  sectionIndex: number;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: section.title,
    data: {
      type: "section",
      sectionIndex,
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
  const scrollPositionRef = useRef(0);
  const dropPreviewRef = useRef<DropTarget | null>(null);

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
      navigate("/schemas");
    }
  };

  const handleDiscardChanges = () => {
    closeUnsavedChangesDialog();
    navigate("/schemas");
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

  const getOriginalSectionIndex = (filteredIndex: number) => {
    if (!searchQuery.trim() || !editingSchema) return filteredIndex;

    const filteredSection = filteredSchema!.sections[filteredIndex];
    return editingSchema.sections.findIndex(
      (s: SectionData) => s.title === filteredSection!.title
    );
  };

  function handleDragStart(event: DragStartEvent) {
    isDraggingRef.current = true;
    scrollPositionRef.current = window.scrollY; // Save scroll position
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

  const determineDropTargetById = (
    schema: Schema,
    overId: string | number
  ): DropTarget | null => {
    const sectionIndex = schema.sections.findIndex(
      (s: SectionData) => s.title === overId
    );

    if (sectionIndex !== -1) {
      return {
        sectionIndex,
        fieldIndex: schema.sections[sectionIndex].fields.length,
      };
    }

    for (let i = 0; i < schema.sections.length; i++) {
      const fieldIndex = schema.sections[i].fields.findIndex(
        (f: Component) => f.id === overId
      );
      if (fieldIndex !== -1) {
        return { sectionIndex: i, fieldIndex };
      }
    }

    return null;
  };

  const getDropTargetFromEvent = (
    schema: Schema,
    active: DragOverEvent["active"] | DragEndEvent["active"],
    over: DragOverEvent["over"]
  ): DropTarget | null => {
    if (!over) return null;

    const data = over.data?.current as DragMeta | undefined;
    const sortableData = (over.data?.current as any)?.sortable as
      | { containerId: string | number; index: number }
      | undefined;

    console.log("getDropTargetFromEvent: Over Data", data);
    console.log("getDropTargetFromEvent: Sortable Data", sortableData);

    if (sortableData) {
      const sectionIndex =
        data?.type === "field" && typeof data.sectionIndex === "number"
          ? data.sectionIndex
          : schema.sections.findIndex(
              (s: SectionData) => s.title === sortableData.containerId
            );

      if (sectionIndex === -1 || sectionIndex === undefined) {
        console.log("getDropTargetFromEvent: Section Index not found");
        return determineDropTargetById(schema, over.id);
      }

      let fieldIndex =
        typeof sortableData.index === "number"
          ? sortableData.index
          : data?.type === "field"
          ? data.fieldIndex
          : schema.sections[sectionIndex].fields.findIndex(
              (f: Component) => f.id === over.id
            );

      if (fieldIndex < 0 || fieldIndex === undefined) {
        console.log("getDropTargetFromEvent: Field Index not found");
        fieldIndex = schema.sections[sectionIndex].fields.length;
      }

      const activeRect =
        active.rect.current.translated ?? active.rect.current.initial;
      const overRect = over.rect;

      if (activeRect && overRect) {
        const isBelowMidpoint =
          activeRect.top + activeRect.height / 2 >
          overRect.top + overRect.height / 2;
        if (isBelowMidpoint) {
          fieldIndex += 1;
        }
      }

      const clampedIndex = Math.min(
        Math.max(fieldIndex, 0),
        schema.sections[sectionIndex].fields.length
      );

      console.log("getDropTargetFromEvent: Calculated Drop Target", {
        sectionIndex,
        fieldIndex: clampedIndex,
      });

      return {
        sectionIndex,
        fieldIndex: clampedIndex,
      };
    }

    if (data?.type === "section") {
      const section = schema.sections[data.sectionIndex];
      if (!section) {
        console.log("getDropTargetFromEvent: Section not found");
        return null;
      }
      return {
        sectionIndex: data.sectionIndex,
        fieldIndex: section.fields.length,
      };
    }

    console.log("getDropTargetFromEvent: No Sortable Data or Section Data");
    return determineDropTargetById(schema, over.id);
  };

  const getSourceFromActive = (
    schema: Schema,
    active: DragEndEvent["active"] | DragOverEvent["active"]
  ): DropTarget | null => {
    const data = active.data?.current as DragMeta | undefined;
    if (data?.type === "field") {
      return {
        sectionIndex: data.sectionIndex,
        fieldIndex: data.fieldIndex,
      };
    }
    return findFieldLocation(schema, active.id);
  };

  function handleDragOver(event: DragOverEvent) {
    if (!editingSchema) return;
    const { active, over } = event;
    if (!active) {
      console.log("handleDragOver: Active is null");
      return;
    }

    if (!over) {
      console.log("handleDragOver: Over is null");
      return;
    }

    const source = getSourceFromActive(editingSchema, active);
    const destination = getDropTargetFromEvent(editingSchema, active, over);

    console.log("handleDragOver: Source", source);
    console.log("handleDragOver: Destination", destination);

    if (!source || !destination) {
      console.log("handleDragOver: Source or destination is null");
      return;
    }

    const isSameSpot =
      dropPreviewRef.current &&
      dropPreviewRef.current.sectionIndex === destination.sectionIndex &&
      dropPreviewRef.current.fieldIndex === destination.fieldIndex;

    if (isSameSpot) {
      console.log("handleDragOver: Same spot");
      return;
    }

    dropPreviewRef.current = destination;
  }

  function resetDragState() {
    isDraggingRef.current = false;
    lastUpdateRef.current = "";
    setActiveId(null);
    dropPreviewRef.current = null;
  }

  function handleDragEnd(event?: DragEndEvent) {
    const storedScrollY = scrollPositionRef.current;
    resetDragState();

    // Restore scroll position after a short delay to let React finish rendering
    requestAnimationFrame(() => {
      window.scrollTo(0, storedScrollY);
    });

    if (!event || !editingSchema) return;

    const { active, over } = event;
    if (!active || !over) return;

    setEditingSchema((prev) => {
      if (!prev) return prev;

      const source = getSourceFromActive(prev, active);
      const destination = getDropTargetFromEvent(prev, active, over);

      if (!source || !destination) return prev;

      const movingWithinSamePosition =
        source.sectionIndex === destination.sectionIndex &&
        source.fieldIndex === destination.fieldIndex;

      if (movingWithinSamePosition) return prev;

      const newSections = prev.sections.map((section: SectionData) => ({
        ...section,
        fields: [...section.fields],
      }));

      const [movedField] = newSections[source.sectionIndex].fields.splice(
        source.fieldIndex,
        1
      );

      if (!movedField) return prev;

      const targetFields = newSections[destination.sectionIndex].fields;

      let insertIndex = destination.fieldIndex;
      if (
        source.sectionIndex === destination.sectionIndex &&
        source.fieldIndex < destination.fieldIndex
      ) {
        insertIndex = Math.max(destination.fieldIndex - 1, 0);
      }

      targetFields.splice(insertIndex, 0, movedField);

      return { ...prev, sections: newSections };
    });
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

          <AddSectionDialog
            open={sectionDialogOpen}
            onClose={closeSectionDialog}
            onAdd={handleAddSection}
          />

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
        </Box>
      </DndContext>

      {editingSchema && (
        <SchemaShareDialog
          open={shareDialogOpen}
          onClose={closeShareDialog}
          schema={editingSchema}
        />
      )}
    </>
  );
}
