import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { useState, useEffect } from "react";
import AddIcon from "@mui/icons-material/AddRounded";

interface CreateSchemaDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (schemaName: string) => void;
}

export default function CreateSchemaDialog({
  open,
  onClose,
  onCreate,
}: CreateSchemaDialogProps) {
  const [schemaName, setSchemaName] = useState("");

  useEffect(() => {
    if (open) {
      setSchemaName(""); // Reset when dialog opens
    }
  }, [open]);

  const handleCreate = () => {
    if (schemaName.trim()) {
      onCreate(schemaName.trim());
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 400 } } }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <AddIcon color="primary" />
        Create New Schema
      </DialogTitle>{" "}
      <DialogContent>
        <TextField
          autoFocus
          label="Schema Name"
          value={schemaName}
          onChange={(e) => setSchemaName(e.target.value)}
          fullWidth
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={!schemaName.trim()}
          sx={{ borderRadius: 2 }}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
