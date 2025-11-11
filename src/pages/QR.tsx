import {
  Box,
  Button,
  Snackbar,
  Stack,
  Typography,
  IconButton,
  Slide,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { useSchema } from "../context/SchemaContext";
import { useAsyncFetch } from "../hooks/useAsyncFetch";
import { useQrSelection } from "../hooks/useQrSelection";
import useDialog from "../hooks/useDialog";
import QrScannerPopup from "../ui/dialog/QrScannerPopup";
import QrShareDialog from "../ui/dialog/QrShareDialogue";
import ExportDialog from "../ui/dialog/ExportDialog";
import { exportQrCodesToCsv, exportQrCodesToJson } from "../utils/GeneralUtils";
import { useState } from "react";
import QrPageFab from "../ui/qr/QrFab";
import QrGrid from "../ui/qr/QrGrid";
import { fetchQrCodes } from "../utils/QrUtils";

export default function QRPage() {
  const { availableSchemas } = useSchema();
  const [qrCodes, loading, error, refetch] = useAsyncFetch(fetchQrCodes);
  const selection = useQrSelection(qrCodes!);
  const [scannerOpen, openScanner, closeScanner] = useDialog();
  const [qrDialogOpen, openQrDialog, closeQrDialog] = useDialog();
  const [exportDialogOpen, openExportDialog, closeExportDialog] = useDialog();
  const [activeQrCode, setActiveQrCode] = useState<QrCode | null>(null);
  const [success, setSuccess] = useState(false);
  const [filename, setFilename] = useState("");

  if (loading) return <Typography>Loading...</Typography>;
  if (error)
    return <Typography color="error">Error fetching QR codes</Typography>;
  if (!qrCodes)
    return (
      <Box textAlign="center" py={8}>
        <Typography>No QR codes found</Typography>
      </Box>
    );

  const executeExport = async (type: "csv" | "json") => {
    if (selection.selectedCodes.length === 0) return;
    const fn =
      type === "csv"
        ? await exportQrCodesToCsv(selection.selectedCodes, availableSchemas)
        : await exportQrCodesToJson(selection.selectedCodes, availableSchemas);
    setFilename(fn);
    setSuccess(true);
    selection.resetSelection();
    closeExportDialog();
  };

  return (
    <>
      <QrPageFab
        selecting={selection.selecting}
        disabled={selection.noCodesSelected}
        onScan={openScanner}
        onExport={openExportDialog}
      />

      <Box px={3} pt={2}>
        <Stack direction="row" justifyContent="space-between" mb={2}>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" color="secondary">
              Filter
            </Button>
            <Button variant="contained" color="secondary">
              Sort
            </Button>
          </Stack>
          <Button
            variant={selection.selecting ? "outlined" : "contained"}
            color="secondary"
            onClick={selection.toggleSelecting}
          >
            {selection.selecting ? "Cancel" : "Select"}
          </Button>
        </Stack>

        <QrGrid
          validQrCodes={selection.validQrCodes}
          invalidQrCodes={selection.invalidQrCodes}
          selecting={selection.selecting}
          codeIsSelected={selection.codeIsSelected}
          onSelect={selection.updateSelectedCodes}
          onClickQr={(c) => {
            openQrDialog();
            setActiveQrCode(c);
          }}
        />
      </Box>

      <QrScannerPopup
        open={scannerOpen}
        onClose={closeScanner}
        onImport={refetch}
      />
      <QrShareDialog
        qrCodeData={activeQrCode!}
        open={qrDialogOpen}
        onClose={closeQrDialog}
        forQrPage
      />
      <ExportDialog
        open={exportDialogOpen}
        onClose={closeExportDialog}
        onExport={executeExport}
      />

      <Snackbar
        open={success}
        onClose={() => setSuccess(false)}
        message={`Exported to ${filename}`}
        autoHideDuration={2000}
        slots={{ transition: Slide }}
        action={
          <IconButton onClick={() => setSuccess(false)}>
            <CloseIcon />
          </IconButton>
        }
      />
    </>
  );
}
