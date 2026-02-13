import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  Box,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import FolderIcon from "@mui/icons-material/FolderRounded";
import { useState } from "react";

interface MassDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onDelete: (includeFolders: boolean) => void;
  selectedCodesCount: number;
  selectedFoldersCount: number;
  totalCodesInFolders: number;
}

export default function MassDeleteDialog(props: MassDeleteDialogProps) {
  const {
    open,
    onClose,
    onDelete,
    selectedCodesCount,
    selectedFoldersCount,
    totalCodesInFolders,
  } = props;

  const [deleteOption, setDeleteOption] = useState<"codes" | "folders">("codes");

  const handleClose = () => {
    setDeleteOption("codes");
    onClose();
  };

  const handleDelete = () => {
    onDelete(deleteOption === "folders");
    setDeleteOption("codes");
  };

  // If no folders are selected, show simple dialog
  if (selectedFoldersCount === 0) {
    return (
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
          <DeleteIcon sx={{ mr: 1 }} color="error" />
          Delete QR Codes
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to permanently delete {selectedCodesCount} code
            {selectedCodesCount !== 1 ? "s" : ""}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={() => onDelete(false)}
            color="error"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Folders are selected - show options
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
        <DeleteIcon sx={{ mr: 1 }} color="error" />
        Delete Selection
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          You have selected {selectedFoldersCount} folder
          {selectedFoldersCount !== 1 ? "s" : ""} containing {totalCodesInFolders} code
          {totalCodesInFolders !== 1 ? "s" : ""}
          {selectedCodesCount > totalCodesInFolders && (
            <>, plus {selectedCodesCount - totalCodesInFolders} individual code
            {selectedCodesCount - totalCodesInFolders !== 1 ? "s" : ""}</>
          )}.
        </Typography>

        <FormControl component="fieldset">
          <RadioGroup
            value={deleteOption}
            onChange={(e) => setDeleteOption(e.target.value as "codes" | "folders")}
          >
            <FormControlLabel
              value="codes"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    Delete codes only
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Delete the {selectedCodesCount} selected codes. Folders will remain but become empty.
                  </Typography>
                </Box>
              }
              sx={{ alignItems: "flex-start", mb: 1 }}
            />
            <FormControlLabel
              value="folders"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    <FolderIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: "text-bottom" }} />
                    Delete folders and codes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Delete the {selectedFoldersCount} folder{selectedFoldersCount !== 1 ? "s" : ""} and all their codes permanently.
                  </Typography>
                </Box>
              }
              sx={{ alignItems: "flex-start" }}
            />
          </RadioGroup>
        </FormControl>

        <Typography variant="body2" color="error" sx={{ mt: 2 }}>
          Warning: This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          color="error"
          variant="contained"
          sx={{ borderRadius: 2 }}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
