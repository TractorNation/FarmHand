import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/WarningRounded";

interface UnsavedChangesDialogProps {
  open: boolean;
  onClose: () => void;
  onDiscard: () => void;
}

export default function UnsavedChangesDialog({
  open,
  onClose,
  onDiscard,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 3, minwidth: 'fit-content' } } }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <WarningIcon sx={{mr: 1}} color="warning" />
        Unsaved Changes
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          You have unsaved changes. Are you sure you want to leave without
          saving? All changes will be lost.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>
          Continue Editing
        </Button>
        <Button
          onClick={onDiscard}
          variant="contained"
          color="warning"
          sx={{ borderRadius: 2 }}
        >
          Discard Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
