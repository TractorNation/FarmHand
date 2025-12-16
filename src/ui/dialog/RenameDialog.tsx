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

interface RenameDialogProps {
  open: boolean;
  onClose: () => void;
  onRename: (newName: string) => void;
  initialName: string;
  title?: string;
}

export default function RenameDialog(props: RenameDialogProps) {
  const { open, onClose, onRename, initialName, title } = props;
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) {
      setName(initialName); // Reset when dialog opens or initialName changes
    }
  }, [open, initialName]);

  const handleRename = () => {
    if (name.trim()) {
      onRename(name.trim());
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 'fit-content' } } }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <EditIcon sx={{ mr: 1 }} color="primary" />
        {title || "Rename"}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          label=" name"
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
          onClick={handleRename}
          disabled={!name.trim()}
          variant="contained"
          sx={{ borderRadius: 2 }}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
