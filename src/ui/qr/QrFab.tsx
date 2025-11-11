import { Fab, Zoom } from "@mui/material";
import QrScanIcon from "@mui/icons-material/QrCodeScannerRounded";
import ExportIcon from "@mui/icons-material/IosShareRounded";

interface Props {
  selecting: boolean;
  disabled: boolean;
  onScan: () => void;
  onExport: () => void;
}

export default function QrPageFab({ selecting, disabled, onScan, onExport }: Props) {
  const fabStyle = {
    position: "fixed",
    bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
    right: "calc(16px + env(safe-area-inset-right, 0px))",
  };

  return (
    <>
      <Zoom in={!selecting} unmountOnExit>
        <Fab color="primary" variant="extended" size="large" sx={fabStyle} onClick={onScan}>
          <QrScanIcon sx={{ mr: 1 }} /> Scan
        </Fab>
      </Zoom>
      <Zoom in={selecting} unmountOnExit>
        <Fab
          color="primary"
          variant="extended"
          size="large"
          sx={fabStyle}
          disabled={disabled}
          onClick={onExport}
        >
          <ExportIcon sx={{ mr: 1 }} /> Export
        </Fab>
      </Zoom>
    </>
  );
}
