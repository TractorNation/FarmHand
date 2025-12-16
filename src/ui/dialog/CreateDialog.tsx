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

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  title: string;
  label: string;
  actionButtonText?: string;
}

export default function CreateDialog(props: CreateDialogProps) {
  const { open, onClose, onCreate, title, label, actionButtonText } = props;
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setName(""); // Reset when dialog opens
    }
  }, [open]);

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim());
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 3, minWidth: "fit-content" } } }}
    >
      <DialogTitle
        sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}
      >
        <AddIcon color="primary" />
        {title}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          label={label}
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
          onClick={handleCreate}
          variant="contained"
          disabled={!name.trim()}
          sx={{ borderRadius: 2 }}
        >
          {actionButtonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
