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

interface DeleteFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onDelete: (deleteOption: "codes" | "folder") => void;
  folderName: string;
  codeCount: number;
}

export default function DeleteFolderDialog(props: DeleteFolderDialogProps) {
  const { open, onClose, onDelete, folderName, codeCount } = props;
  const [deleteOption, setDeleteOption] = useState<"codes" | "folder">("codes");

  const handleClose = () => {
    setDeleteOption("codes");
    onClose();
  };

  const handleDelete = () => {
    // If folder is empty, always delete the folder
    if (codeCount === 0) {
      onDelete("folder");
    } else {
      onDelete(deleteOption);
    }
    setDeleteOption("codes");
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      slotProps={{ paper: { sx: { borderRadius: 3, minWidth: "fit-content" } } }}
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
        Delete Folder
      </DialogTitle>
      <DialogContent>
        {codeCount === 0 ? (
          <>
            <Typography sx={{ mb: 2 }}>
              The folder "{folderName}" is empty. Delete this folder?
            </Typography>
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              Warning: This action cannot be undone.
            </Typography>
          </>
        ) : (
          <>
            <Typography sx={{ mb: 2 }}>
              The folder "{folderName}" contains {codeCount} QR code{codeCount !== 1 ? "s" : ""}. What would you like to delete?
            </Typography>

            <FormControl component="fieldset">
              <RadioGroup
                value={deleteOption}
                onChange={(e) => setDeleteOption(e.target.value as "codes" | "folder")}
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
                        Delete the {codeCount} QR code{codeCount !== 1 ? "s" : ""} inside this folder. The folder will remain but become empty.
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: "flex-start", mb: 1 }}
                />
                <FormControlLabel
                  value="folder"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={500}>
                        <FolderIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: "text-bottom" }} />
                        Delete folder and codes
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Delete the folder and all {codeCount} QR code{codeCount !== 1 ? "s" : ""} inside it permanently.
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
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={handleDelete}
          variant="contained"
          color="error"
          sx={{ borderRadius: 2 }}
        >
          Delete
        </Button>
        <Button onClick={handleClose} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
