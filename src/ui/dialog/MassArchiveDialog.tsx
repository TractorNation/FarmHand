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
import ArchiveIcon from "@mui/icons-material/ArchiveRounded";
import FolderIcon from "@mui/icons-material/FolderRounded";
import { useState } from "react";

interface MassArchiveDialogProps {
  open: boolean;
  onClose: () => void;
  onArchive: (includeFolders: boolean) => void;
  selectedCodesCount: number;
  selectedFoldersCount: number;
  totalCodesInFolders: number;
}

export default function MassArchiveDialog(props: MassArchiveDialogProps) {
  const {
    open,
    onClose,
    onArchive,
    selectedCodesCount,
    selectedFoldersCount,
    totalCodesInFolders,
  } = props;

  const [archiveOption, setArchiveOption] = useState<"codes" | "folders">("codes");

  const handleClose = () => {
    setArchiveOption("codes");
    onClose();
  };

  const handleArchive = () => {
    onArchive(archiveOption === "folders");
    setArchiveOption("codes");
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
          <ArchiveIcon sx={{ mr: 1 }} color="warning" />
          Archive QR Codes
        </DialogTitle>
        <DialogContent>
          <Typography>
            Would you like to archive {selectedCodesCount} code
            {selectedCodesCount !== 1 ? "s" : ""}?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={() => onArchive(false)}
            color="warning"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Archive
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
        <ArchiveIcon sx={{ mr: 1 }} color="warning" />
        Archive Selection
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
            value={archiveOption}
            onChange={(e) => setArchiveOption(e.target.value as "codes" | "folders")}
          >
            <FormControlLabel
              value="codes"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    Archive codes only
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Archive the {selectedCodesCount} selected codes. Folders will remain but become empty.
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
                    Archive folders and codes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Archive the {selectedFoldersCount} folder{selectedFoldersCount !== 1 ? "s" : ""} and all their codes together.
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
          onClick={handleArchive}
          color="warning"
          variant="contained"
          sx={{ borderRadius: 2 }}
        >
          Archive
        </Button>
      </DialogActions>
    </Dialog>
  );
}
