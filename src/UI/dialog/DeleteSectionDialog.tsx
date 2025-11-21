import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteRounded";

interface DeleteSectionDialogProps {
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  sectionName: string | null;
}

export default function DeleteSectionDialog({
  open,
  onClose,
  onDelete,
  sectionName,
}: DeleteSectionDialogProps) {
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
        <DeleteIcon color="error" />
        Delete Section {sectionName}?
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete this section and all of its fields?
          This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onDelete}
          variant="contained"
          color="error"
          sx={{ borderRadius: 2 }}
        >
          Delete
        </Button>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
