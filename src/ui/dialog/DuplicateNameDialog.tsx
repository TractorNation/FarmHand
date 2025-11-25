import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/WarningRounded";

interface DuplicateNameDialogProps {
  open: boolean;
  onClose: () => void;
  errorMessage: string;
}

export default function DuplicateNameDialog({
  open,
  onClose,
  errorMessage,
}: DuplicateNameDialogProps) {
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
        <WarningIcon color="warning" />
        Duplicate Name
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{errorMessage}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>
          Ok
        </Button>
      </DialogActions>
    </Dialog>
  );
}
