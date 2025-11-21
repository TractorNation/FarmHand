import { Box, Fab, Stack, Zoom } from "@mui/material";
import QrScanIcon from "@mui/icons-material/QrCodeScannerRounded";
import ExportIcon from "@mui/icons-material/IosShareRounded";
import ArchiveIcon from "@mui/icons-material/ArchiveRounded";

interface Props {
  selecting: boolean;
  disabled: boolean;
  onScan: () => void;
  onExport: () => void;
  onMassArchive: () => void;
}

export default function QrPageFab({
  selecting,
  disabled,
  onScan,
  onExport,
  onMassArchive,
}: Props) {
  const fabStyle = {
    position: "fixed",
    bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
    right: "calc(16px + env(safe-area-inset-right, 0px))",
  };

  return (
    <Box sx={{ zIndex: 1000 }}>
      <Zoom in={!selecting} unmountOnExit>
        <Fab
          color="primary"
          variant="extended"
          size="large"
          sx={fabStyle}
          onClick={onScan}
        >
          <QrScanIcon sx={{ mr: 1 }} /> Scan
        </Fab>
      </Zoom>
      <Zoom in={selecting} unmountOnExit>
        <Stack
          direction={"row"}
          justifyContent={"space-between"}
          sx={{
            zIndex: 1000,
            position: "fixed",
            bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
            left: 0,
            right: 0,
            paddingLeft: "calc(16px + env(safe-area-inset-left, 0px))",
            paddingRight: "calc(16px + env(safe-area-inset-right, 0px))",
          }}
        >
          <Fab
            color="warning"
            variant="extended"
            size="large"
            disabled={disabled}
            onClick={onMassArchive}
          >
            <ArchiveIcon sx={{ mr: 1 }} /> Send to archive
          </Fab>
          <Fab
            color="primary"
            variant="extended"
            size="large"
            disabled={disabled}
            onClick={onExport}
          >
            <ExportIcon sx={{ mr: 1 }} /> Export
          </Fab>
        </Stack>
      </Zoom>
    </Box>
  );
}
