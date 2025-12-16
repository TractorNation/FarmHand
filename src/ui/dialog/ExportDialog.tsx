import {
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  DialogActions,
  Button,
} from "@mui/material";
import { useState } from "react";
import ExportIcon from "@mui/icons-material/IosShareRounded";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (fileType: "csv" | "json") => void;
}

export default function ExportDialog(props: ExportDialogProps) {
  const [fileType, setFileType] = useState<"csv" | "json">("csv");
  const { open, onClose, onExport } = props;

  const handleExportClick = () => {
    onExport(fileType);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            minWidth: 'fit-content',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <ExportIcon color="primary" />
        Select Export Format
      </DialogTitle>{" "}
      <DialogContent>
        <FormControl sx={{ mt: 1 }}>
          <FormLabel sx={{ fontWeight: 600, mb: 1 }}>File Type</FormLabel>
          <RadioGroup
            value={fileType}
            onChange={(e) => setFileType(e.target.value as "csv" | "json")}
          >
            <FormControlLabel value="csv" control={<Radio />} label="CSV" />
            <FormControlLabel value="json" control={<Radio />} label="JSON" />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          onClick={handleExportClick}
          variant="contained"
          sx={{ borderRadius: 2 }}
        >
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );
}
