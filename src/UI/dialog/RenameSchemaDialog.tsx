import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { useState, useEffect } from "react";
import EditIcon from "@mui/icons-material/EditRounded";

interface RenameSchemaDialogProps {
  open: boolean;
  onClose: () => void;
  onRename: (newSchemaName: string) => void;
  initialName: string;
}

export default function RenameSchemaDialog({
  open,
  onClose,
  onRename,
  initialName,
}: RenameSchemaDialogProps) {
  const [schemaName, setSchemaName] = useState(initialName);

  useEffect(() => {
    if (open) {
      setSchemaName(initialName); // Reset when dialog opens or initialName changes
    }
  }, [open, initialName]);

  const handleRename = () => {
    if (schemaName.trim()) {
      onRename(schemaName.trim());
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
        <EditIcon sx={{mr: 1}} color="primary" />
        Rename Schema
      </DialogTitle>
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
          onClick={handleRename}
          disabled={!schemaName.trim()}
          variant="contained"
          sx={{ borderRadius: 2 }}
        >
          Rename
        </Button>
      </DialogActions>
    </Dialog>
  );
}
