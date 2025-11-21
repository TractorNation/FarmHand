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

interface RenameSectionDialogProps {
  open: boolean;
  onClose: () => void;
  onRename: (newSectionName: string) => void;
  initialName: string;
}

export default function RenameSectionDialog({
  open,
  onClose,
  onRename,
  initialName,
}: RenameSectionDialogProps) {
  const [sectionName, setSectionName] = useState(initialName);

  useEffect(() => {
    if (open) {
      setSectionName(initialName); // Reset when dialog opens or initialName changes
    }
  }, [open, initialName]);

  const handleRename = () => {
    if (sectionName.trim()) {
      onRename(sectionName.trim());
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
        Rename Section
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          label="Section Name"
          value={sectionName}
          onChange={(e) => setSectionName(e.target.value)}
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
          variant="contained"
          disabled={!sectionName.trim()}
          sx={{ borderRadius: 2 }}
        >
          Rename
        </Button>
      </DialogActions>
    </Dialog>
  );
}
