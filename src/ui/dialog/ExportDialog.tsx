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

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (fileType: "csv" | "json") => void;
}

export default function exportDialog(props: ExportDialogProps) {
  const [fileType, setFileType] = useState<"csv" | "json">("csv");
  const { open, onClose, onExport } = props;

  const handleExportClick = () => {
    onExport(fileType);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Select Export Format</DialogTitle>
      <DialogContent>
        <FormControl>
          <FormLabel>File Type</FormLabel>
          <RadioGroup
            value={fileType}
            onChange={(e) => setFileType(e.target.value as "csv" | "json")}
          >
            <FormControlLabel value="csv" control={<Radio />} label="CSV" />
            <FormControlLabel value="json" control={<Radio />} label="JSON" />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleExportClick} variant="contained">
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );
}
