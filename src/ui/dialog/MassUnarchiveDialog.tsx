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
import UnarchiveIcon from "@mui/icons-material/UnarchiveRounded";
import FolderIcon from "@mui/icons-material/FolderRounded";
import { useState } from "react";

interface MassUnarchiveDialogProps {
  open: boolean;
  onClose: () => void;
  onUnarchive: (includeFolders: boolean) => void;
  selectedCodesCount: number;
  selectedFoldersCount: number;
  totalCodesInFolders: number;
}

export default function MassUnarchiveDialog(props: MassUnarchiveDialogProps) {
  const {
    open,
    onClose,
    onUnarchive,
    selectedCodesCount,
    selectedFoldersCount,
    totalCodesInFolders,
  } = props;

  const [unarchiveOption, setUnarchiveOption] = useState<"codes" | "folders">("codes");

  const handleClose = () => {
    setUnarchiveOption("codes");
    onClose();
  };

  const handleUnarchive = () => {
    onUnarchive(unarchiveOption === "folders");
    setUnarchiveOption("codes");
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
          <UnarchiveIcon sx={{ mr: 1 }} color="secondary" />
          Unarchive QR Codes
        </DialogTitle>
        <DialogContent>
          <Typography>
            Would you like to unarchive {selectedCodesCount} code
            {selectedCodesCount !== 1 ? "s" : ""}?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={() => onUnarchive(false)}
            color="secondary"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Unarchive
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
        <UnarchiveIcon sx={{ mr: 1 }} color="secondary" />
        Unarchive Selection
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
            value={unarchiveOption}
            onChange={(e) => setUnarchiveOption(e.target.value as "codes" | "folders")}
          >
            <FormControlLabel
              value="codes"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    Unarchive codes only
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unarchive the {selectedCodesCount} selected codes. Folders will remain in the archive but become empty.
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
                    Unarchive folders and codes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unarchive the {selectedFoldersCount} folder{selectedFoldersCount !== 1 ? "s" : ""} and all their codes together.
                  </Typography>
                </Box>
              }
              sx={{ alignItems: "flex-start" }}
            />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          onClick={handleUnarchive}
          color="secondary"
          variant="contained"
          sx={{ borderRadius: 2 }}
        >
          Unarchive
        </Button>
      </DialogActions>
    </Dialog>
  );
}
