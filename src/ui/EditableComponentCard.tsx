import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import DropdownInput from "./components/DropdownInput";
import { useEffect, useState } from "react";
import useToggle from "../hooks/useToggle";
import ExpandIcon from "@mui/icons-material/ExpandMoreRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import useDialog from "../hooks/useDialog";

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
  const theme = useTheme();

  const isTypeUnselected = !editedComponent.type;

  useEffect(() => {
    setEditedComponent(component);
  }, [component]);

  const handleFieldChange = (field: keyof Component | string, value: any) => {
    let newComponent: Component;
    if (field === "name" || field === "type" || field === "required") {
      // These are direct properties of the Component
      newComponent = { ...editedComponent, [field]: value };
    } else {
      // These are properties that belong in the 'props' object
      newComponent = {
        ...editedComponent,
        props: { ...editedComponent.props, [field]: value },
      };
    }
    setEditedComponent(newComponent);
    onChange(newComponent);
  };

  const renderTypeSpecificProps = () => {
    switch (editedComponent.type.toLowerCase()) {
      case "dropdown":
        return (
          <TextField
            label="Options (comma-separated)"
            value={editedComponent.props?.options?.join(",") || ""}
            onChange={(e) =>
              handleFieldChange("options", e.target.value.split(","))
            }
            fullWidth
          />
        );
      case "counter":
        return (
          <>
            <TextField
              label="Default Value"
              type="number"
              value={
                editedComponent.props?.default !== undefined
                  ? String(editedComponent.props.default)
                  : ""
              }
              onChange={(e) =>
                handleFieldChange("default", parseInt(e.target.value))
              }
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Min"
                type="number"
                value={editedComponent.props?.min ?? ""}
                onChange={(e) =>
                  handleFieldChange(
                    "min",
                    parseInt(e.target.value) || undefined
                  )
                }
                size="small"
                fullWidth
              />
              <TextField
                label="Max"
                type="number"
                value={editedComponent.props?.max ?? ""}
                onChange={(e) =>
                  handleFieldChange(
                    "max",
                    parseInt(e.target.value) || undefined
                  )
                }
                size="small"
                fullWidth
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
        expanded={active}
        onChange={toggleActive}
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
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {editedComponent.name}
            </Typography>
            <Stack direction={"row"}>
              <IconButton
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
              >
                <EditIcon />
              </IconButton>
              <IconButton
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
                editedComponent.type.charAt(0).toUpperCase() +
                editedComponent.type.slice(1)
              }
              onChange={(value) =>
                handleFieldChange("type", value.toLowerCase())
              }
              options={["Text", "Counter", "Dropdown", "Checkbox"]}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editedComponent.required || false}
                  onChange={(e) =>
                    handleFieldChange("required", e.target.checked)
                  }
                />
              }
              label="Required?"
            />
            {renderTypeSpecificProps()}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              minWidth: 400,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Delete Field "{itemToDelete?.name}"?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this field? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              if (itemToDelete) {
                onDelete?.(itemToDelete);
              }
              closeDeleteDialog();
            }}
            color="error"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Delete
          </Button>
          <Button onClick={closeDeleteDialog} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Field Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={closeRenameDialog}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              minWidth: 400,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Rename Field</DialogTitle>
        <DialogContent>
          <TextField
            label="Field Name"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeRenameDialog} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const trimmedName = newFieldName.trim();
              if (trimmedName) {
                handleFieldChange("name", trimmedName);
              }
              closeRenameDialog();
            }}
            variant="contained"
            disabled={!newFieldName.trim()}
            sx={{ borderRadius: 2 }}
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
