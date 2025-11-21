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

interface AddSectionDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (sectionName: string) => void;
}

export default function AddSectionDialog({
  open,
  onClose,
  onAdd,
}: AddSectionDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
    }
  }, [open]);

  const handleAdd = () => {
    if (name.trim()) {
      onAdd(name.trim());
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
        Add Section
      </DialogTitle>{" "}
      <DialogContent>
        <TextField
          autoFocus
          label="Section Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          onClick={handleAdd}
          disabled={!name.trim()}
          variant="contained"
          sx={{ borderRadius: 2 }}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
