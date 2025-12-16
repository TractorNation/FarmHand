import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import { ReactNode } from "react";

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  title: string;
  children: ReactNode;
}

export default function DeleteDialog(props: DeleteDialogProps) {
  const { open, onClose, onDelete, title, children } = props;

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
        <DeleteIcon color="error" sx={{ mr: 1 }} />
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{children}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onDelete} variant="contained" color="error" sx={{ borderRadius: 2 }}>
          Delete
        </Button>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
