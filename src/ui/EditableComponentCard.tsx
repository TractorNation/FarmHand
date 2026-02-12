import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import DropdownInput from "./components/DropdownInput";
import { useEffect, useRef, useState } from "react";
import useToggle from "../hooks/useToggle";
import ExpandIcon from "@mui/icons-material/ExpandMoreRounded";
import DragIcon from "@mui/icons-material/DragIndicatorRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import NumberInput from "./components/NumberInput";
import useDialog from "../hooks/useDialog";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import RenameDialog from "./dialog/RenameDialog";
import DeleteDialog from "./dialog/DeleteDialog";
import TextInput from "./components/TextInput";

/* Properties for the Component Card*/
interface ComponentCardProps {
  component: Component;
  onChange: (component: Component) => void;
  onDelete?: (component: Component) => void;
  editable?: boolean;
}

export default function EditableComponentCard(props: ComponentCardProps) {
  const { component, onChange, editable, onDelete } = props;
  const [editedComponent, setEditedComponent] = useState(component);
  const [active, toggleActive] = useToggle(true);
  const [deleteDialogOpen, openDeleteDialog, closeDeleteDialog] = useDialog();
  const [renameDialogOpen, openRenameDialog, closeRenameDialog] = useDialog();
  const [itemToDelete, setItemToDelete] = useState<Component | null>(null);
  const [newFieldName, setNewFieldName] = useState("");
  const [dropdownInputValue, setDropdownInputValue] = useState(
    component.props?.options?.join(",") || ""
  );
  const [rawDefaultValue, setRawDefaultValue] = useState("");
  const [dropdownError, setDropdownError] = useState<string | null>(null);
  const theme = useTheme();
  const [defaultValueError, setDefaultValueError] = useState<string | null>(
    null
  );

  const isProtected =
    component.name === "Match Number" || component.name === "Team Number";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: component.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition, // Disable transition during drag
    opacity: isDragging ? 0.3 : 1,
    cursor: isDragging ? "grabbing" : "default",
  };

  // Ref to track the ID of the component whose dropdownInputValue was last synced from props.
  const lastSyncedComponentId = useRef(component.id);

  const isTypeUnselected = !editedComponent.type;

  useEffect(() => {
    setEditedComponent(component);
    if (component.id !== lastSyncedComponentId.current) {
      // Dropdown
      const initialDropdownValue = component.props?.options?.join(",") || "";
      setDropdownInputValue(initialDropdownValue);
      if (component.type.toLowerCase() === "dropdown" || component.type.toLowerCase() === "multiplechoice") {
        validateDropdown(initialDropdownValue);
      }

      // Default Value
      const { default: defaultValue, selectsRange } = component.props || {};
      let initialDefaultValue = "";
      if (defaultValue !== undefined && defaultValue !== null) {
        if (selectsRange) {
          initialDefaultValue = Array.isArray(defaultValue)
            ? defaultValue.join(",")
            : `${defaultValue},${defaultValue}`;
        } else {
          initialDefaultValue = String(defaultValue);
        }
      }
      setRawDefaultValue(initialDefaultValue);
      lastSyncedComponentId.current = component.id;
    } else if (component.type.toLowerCase() === "dropdown" || component.type.toLowerCase() === "multiplechoice") {
      validateDropdown(dropdownInputValue);
    }
  }, [component]);

  useEffect(() => {
    if (editedComponent.type.toLowerCase() !== "slider") {
      setDefaultValueError(null);
      return;
    }

    const {
      default: defaultValue,
      min,
      max,
      selectsRange,
    } = editedComponent.props || {};

    if (defaultValue === undefined) {
      setDefaultValueError(null);
      return;
    }

    const minVal = min === undefined ? -Infinity : min;
    const maxVal = max === undefined ? Infinity : max;
    let error: string | null = null;

    if (selectsRange) {
      const values = Array.isArray(defaultValue)
        ? defaultValue
        : [defaultValue, defaultValue];
      if (values.length === 2) {
        if (values[0] < minVal || values[1] > maxVal || values[0] > values[1]) {
          error = `Range must be within ${min ?? "min"}-${
            max ?? "max"
          } and start <= end.`;
        }
      }
    } else {
      const value = Array.isArray(defaultValue)
        ? defaultValue[0]
        : defaultValue;
      if (typeof value === "number" && (value < minVal || value > maxVal)) {
        error = `Value must be within ${min ?? "min"}-${max ?? "max"}.`;
      }
    }
    setDefaultValueError(error);
  }, [editedComponent]);

  const handleFieldChange = (field: keyof Component | string, value: any) => {
    let newComponent: Component;
    if (
      field === "name" ||
      field === "type" ||
      field === "required" ||
      field === "doubleWidth" ||
      field === "note"
    ) {
      newComponent = { ...editedComponent, [field]: value };
    } else {
      // Convert null to undefined for optional numeric props
      const propValue = value === null ? undefined : value;
      newComponent = {
        ...editedComponent,
        props: { ...editedComponent.props, [field]: propValue },
      };
    }
    setEditedComponent(newComponent);
    onChange(newComponent);
  };

  const validateDropdown = (value: string) => {
    const options = value
      .split(",")
      .map((opt) => opt.trim())
      .filter(Boolean);

    if (value.trim() === "") {
      setDropdownError("At least one option is required.");
      return false;
    }
    if (options.length === 0 && value.trim() !== "") {
      setDropdownError("Invalid format. Ensure options are comma-separated.");
      return false;
    }

    setDropdownError(null);
    return true;
  };

  const renderTypeSpecificProps = () => {
    switch (editedComponent.type.toLowerCase()) {
      case "multiplechoice":
      case "dropdown":
        return (
          <TextField
            label="Options (comma-separated)"
            value={dropdownInputValue}
            onChange={(e) => {
              const newValue = e.target.value;
              setDropdownInputValue(newValue);
              const isValid = validateDropdown(newValue);
              const options = newValue
                .split(",")
                .map((opt) => opt.trim())
                .filter(Boolean);
              if (isValid) {
                handleFieldChange("options", options);
              }
            }}
            error={!!dropdownError}
            helperText={dropdownError}
            slotProps={{ formHelperText: { sx: { fontFamily: "inherit" } } }}
            fullWidth
            sx={{
              "& legend": {
                transition: "unset",
              },
            }}
          />
        );
      case "counter":
        return (
          <>
            <NumberInput
              label="Default Value (Optional)"
              value={
                editedComponent.props?.default !== undefined
                  ? Number(editedComponent.props.default)
                  : 0
              }
              onChange={(value) => handleFieldChange("default", value)}
            />
            <Stack direction="row" spacing={2}>
              <NumberInput
                label="Min (Optional)"
                value={editedComponent.props?.min ?? null}
                onChange={(value) => handleFieldChange("min", value)}
                error={false}
              />
              <NumberInput
                label="Max (Optional)"
                value={editedComponent.props?.max ?? null}
                onChange={(value) => handleFieldChange("max", value)}
                error={false}
              />
            </Stack>
          </>
        );
      case "text":
        return (
          <FormControlLabel
            control={
              <Switch
                checked={editedComponent.props?.multiline || false}
                onChange={(e) =>
                  handleFieldChange("multiline", e.target.checked)
                }
              />
            }
            label="Multiline?"
          />
        );

      case "slider":
        return (
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={editedComponent.props?.selectsRange || false}
                  onChange={(e) =>
                    handleFieldChange("selectsRange", e.target.checked)
                  }
                />
              }
              label="Range Slider?"
            />
            <NumberInput
              label="Step (Optional)"
              value={editedComponent.props?.step ?? null}
              onChange={(value) => handleFieldChange("step", value)}
              min={1}
            />
            <TextField
              label="Default Value (Optional)"
              type="text"
              value={rawDefaultValue}
              onChange={(e) => {
                const newValue = e.target.value;
                setRawDefaultValue(newValue);

                if (editedComponent.props?.selectsRange) {
                  if (newValue.trim() === "") {
                    handleFieldChange("default", undefined);
                    return;
                  }
                  const parts = newValue.split(",");
                  if (parts.length === 2) {
                    const num1 = parseInt(parts[0].trim(), 10);
                    const num2 = parseInt(parts[1].trim(), 10);
                    if (!isNaN(num1) && !isNaN(num2)) {
                      handleFieldChange("default", [num1, num2]);
                    }
                  }
                } else {
                  if (newValue.trim() === "") {
                    handleFieldChange("default", undefined);
                  } else {
                    const num = parseInt(newValue, 10);
                    if (!isNaN(num)) {
                      handleFieldChange("default", num);
                    }
                  }
                }
              }}
              fullWidth
              error={!!defaultValueError}
              helperText={defaultValueError}
              slotProps={{ formHelperText: { sx: { fontFamily: "inherit" } } }}
            />
            <Stack direction="row" spacing={2}>
              <NumberInput
                label="Min (Optional)"
                value={editedComponent.props?.min ?? null}
                onChange={(value) => handleFieldChange("min", value)}
                error={false}
              />
              <NumberInput
                label="Max (Optional)"
                value={editedComponent.props?.max ?? null}
                onChange={(value) => handleFieldChange("max", value)}
                error={false}
              />
            </Stack>
          </>
        );
      case "number":
        return (
          <Stack direction="row" spacing={2}>
            <NumberInput
              label="Min (Optional)"
              value={editedComponent.props?.min ?? null}
              onChange={(value) => handleFieldChange("min", value)}
              error={false}
            />
            <NumberInput
              label="Max (Optional)"
              value={editedComponent.props?.max ?? null}
              onChange={(value) => handleFieldChange("max", value)}
              error={false}
            />
          </Stack>
        );
      case "grid":
        return (
          <>
            <Stack direction="row" spacing={2}>
              <NumberInput
                label="Rows"
                value={editedComponent.props?.rows ?? null}
                onChange={(value) => handleFieldChange("rows", value)}
                min={1}
                max={50}
              />
              <NumberInput
                label="Columns"
                value={editedComponent.props?.cols ?? null}
                onChange={(value) => handleFieldChange("cols", value)}
                min={1}
                max={50}
              />
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={editedComponent.props?.cellLabel === "coordinates"}
                  onChange={(e) =>
                    handleFieldChange(
                      "cellLabel",
                      e.target.checked ? "coordinates" : undefined
                    )
                  }
                />
              }
              label="Show Coordinates?"
            />
          </>
        );
      default:
        return null;
    }
  };

  if (!editable) {
    return (
      <>
        <Card
          variant="outlined"
          elevation={0}
          sx={{
            borderColor: theme.palette.divider,
            borderWidth: 2,
            borderStyle: "solid",
            borderRadius: 3,
            p: 2,
            height: "100%",
            backgroundColor: theme.palette.background.paper,
            transition: "all 0.2s ease",
            alignContent: "center",
            justifyContent: "flex-start",
            display: "flex",
            flexDirection: "row",
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {component.name}
          </Typography>
          <Typography variant="subtitle1" sx={{ ml: 2 }} color="text.secondary">
            Type: {component.type.toUpperCase()}
          </Typography>
        </Card>
      </>
    );
  }

  return (
    <>
      <Accordion
        ref={setNodeRef}
        style={style}
        expanded={active}
        onChange={() => {
          if (!isDragging) {
            toggleActive();
          }
        }}
        disableGutters
        elevation={0}
        sx={{
          mb: 2,
          height: "100%",
          width: "100%",
          display: "flex",
          alignContent: "center",
          flexDirection: "column",
          backgroundColor: theme.palette.background.paper,
          borderRadius: 3,
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: isTypeUnselected
            ? theme.palette.error.main
            : active
            ? theme.palette.primary.main
            : theme.palette.divider,
          transition: "all 0.3s ease",
          "&:before": {
            display: "none",
          },
          "&:hover": !active
            ? {
                borderColor: isTypeUnselected
                  ? theme.palette.error.light
                  : theme.palette.primary.main,
                boxShadow: `0 4px 12px ${
                  isTypeUnselected
                    ? theme.palette.error.main
                    : theme.palette.primary.main
                }15`,
              }
            : {},
        }}
      >
        <AccordionSummary
          expandIcon={
            <ExpandIcon
              sx={{
                color: isTypeUnselected
                  ? theme.palette.error.main
                  : theme.palette.primary.main,
                fontSize: 28,
              }}
            />
          }
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ flexGrow: 1 }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={0} alignItems="center">
              <Box
                {...listeners}
                {...attributes}
                sx={{
                  p: 1,
                  cursor: isDragging ? "grabbing" : "grab",
                  display: "flex",
                  alignItems: "center",
                  "&:hover": {
                    opacity: 0.7,
                  },
                  touchAction: "none",
                }}
              >
                <DragIcon />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {editedComponent.name}
              </Typography>
            </Stack>
            <Stack direction={"row"}>
              <IconButton
                component="div"
                onClick={(e) => {
                  e.stopPropagation();
                  setNewFieldName(editedComponent.name);
                  openRenameDialog();
                }}
                sx={{
                  "&:hover": {
                    backgroundColor: `${
                      isTypeUnselected
                        ? theme.palette.error.main
                        : theme.palette.primary.main
                    }20`,
                    color: isTypeUnselected
                      ? theme.palette.error.main
                      : theme.palette.primary.main,
                  },
                }}
                disabled={isProtected}
              >
                <EditIcon />
              </IconButton>
              <IconButton
                component="div"
                onClick={(e) => {
                  e.stopPropagation();
                  setItemToDelete(editedComponent);
                  openDeleteDialog();
                }}
                sx={{
                  "&:hover": {
                    backgroundColor: `${theme.palette.error.main}20`,
                    color: theme.palette.error.main,
                  },
                }}
                disabled={isProtected}
              >
                <DeleteIcon />
              </IconButton>
            </Stack>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {isTypeUnselected && (
              <Typography color="error" variant="subtitle2">
                Please select a field type.
              </Typography>
            )}
            <DropdownInput
              label="Type"
              value={
                editedComponent.type === "multiplechoice"
                  ? "Multiple Choice"
                  : editedComponent.type.charAt(0).toUpperCase() +
                    editedComponent.type.slice(1)
              }
              disabled={isProtected}
              onChange={(value) => {
                const type =
                  value === "Multiple Choice" ? "multiplechoice" : value.toLowerCase();
                handleFieldChange("type", type);
              }}
              options={[
                "Checkbox",
                "Counter",
                "Dropdown",
                "Multiple Choice",
                "Text",
                "Number",
                "Slider",
                "Timer",
                "Grid",
                "Filler",
              ]}
              allowUnset={false}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editedComponent.required || false}
                  disabled={isProtected}
                  onChange={(e) =>
                    handleFieldChange("required", e.target.checked)
                  }
                />
              }
              label="Required?"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editedComponent.doubleWidth || false}
                  disabled={isProtected}
                  onChange={(e) =>
                    handleFieldChange("doubleWidth", e.target.checked)
                  }
                />
              }
              label="Double Wide?"
            />
            {isProtected && (editedComponent.name === "Match Number" || editedComponent.name === "Team Number") && (
              <FormControlLabel
                control={
                  <Switch
                    checked={editedComponent.props?.pullFromTBA || false}
                    onChange={(e) =>
                      handleFieldChange("pullFromTBA", e.target.checked)
                    }
                  />
                }
                label="Pull from The Blue Alliance?"
              />
            )}
            {renderTypeSpecificProps()}
            <TextInput 
              label="Note (Optional)"
              value={editedComponent.note || ""}
              onChange={(value) => handleFieldChange("note", value)}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        onDelete={() => {
          if (itemToDelete) {
            onDelete?.(itemToDelete);
          }
          closeDeleteDialog();
        }}
        title={`Delete Field "${itemToDelete?.name || ""}"?`}
      >
        Are you sure you want to delete this field? This action cannot be
        undone.
      </DeleteDialog>

      {/* Rename Field Dialog */}
      <RenameDialog
        open={renameDialogOpen}
        initialName={newFieldName}
        onClose={closeRenameDialog}
        onRename={(newName) => {
          handleFieldChange("name", newName);
          closeRenameDialog();
        }}
        title="Rename Field"
      />
    </>
  );
}
