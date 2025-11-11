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
            borderWidth: 1,
            borderStyle: "solid",
            borderRadius: 2,
            p: 2,
            height: "100%",
            backgroundColor: theme.palette.background.default,
            transition: "border-color 0.2s ease, background-color 0.2s ease",
            alignContent: "center",
            justifyContent: "flex-start",
            display: "flex",
            flexDirection: "row",
            mb: 2,
          }}
        >
          <Typography variant="h6">{component.name}</Typography>
          <Typography variant="subtitle1" sx={{ ml: 2 }}>
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
        disableGutters
        elevation={active ? 2 : 1}
        sx={{
          mb: 2,
          height: "100%",
          width: "100%",
          display: "flex",
          alignContent: "center",
          flexDirection: "column",
          backgroundColor: theme.palette.background.default,
          borderRadius: 2,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: active
            ? theme.palette.primary.main
            : theme.palette.divider,
          transition: "all 0.2s ease",
          "&:before": {
            display: "none",
          },
        }}
      >
        <AccordionSummary
          expandIcon={
            <ExpandIcon sx={{ color: theme.palette.secondary.main }} />
          }
          onClick={toggleActive}
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ flexGrow: 1 }}
            justifyContent="space-between"
          >
            <Typography variant="h6">{editedComponent.name}</Typography>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setNewFieldName(editedComponent.name);
                openRenameDialog();
              }}
            >
              <EditIcon />
            </IconButton>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
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
            <Button
              onClick={() => {
                setItemToDelete(editedComponent);
                openDeleteDialog();
              }}
              color="error"
              variant="contained"
              startIcon={<DeleteIcon />}
            >
              Delete Field
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Delete Field "{itemToDelete?.name}"?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this field? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancel</Button>
          <Button
            onClick={() => {
              if (itemToDelete) {
                onDelete?.(itemToDelete);
              }
              closeDeleteDialog();
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Field Dialog */}
      <Dialog open={renameDialogOpen} onClose={closeRenameDialog}>
        <DialogTitle>Rename Field</DialogTitle>
        <DialogContent>
          <TextField
            label="Field Name"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRenameDialog}>Cancel</Button>
          <Button
            onClick={() => {
              handleFieldChange("name", newFieldName);
              closeRenameDialog();
            }}
            variant="contained"
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
