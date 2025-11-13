import {
  Box,
  Button,
  Snackbar,
  Stack,
  Typography,
  IconButton,
  Slide,
  Paper,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { useSchema } from "../context/SchemaContext";
import { useAsyncFetch } from "../hooks/useAsyncFetch";
import { useQrSelection } from "../hooks/useQrSelection";
import useDialog from "../hooks/useDialog";
import QrScannerDialog from "../ui/dialog/QrScannerDialog";
import QrShareDialog from "../ui/dialog/QrShareDialog";
import ExportDialog from "../ui/dialog/ExportDialog";
import { exportQrCodesToCsv, exportQrCodesToJson } from "../utils/GeneralUtils";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";
import FilterIcon from "@mui/icons-material/FilterListRounded";
import SortIcon from "@mui/icons-material/SortRounded";
import { useState } from "react";
import QrPageFab from "../ui/qr/QrFab";
import QrGrid from "../ui/qr/QrGrid";
import { fetchQrCodes } from "../utils/QrUtils";
import { useTheme } from "@mui/material/styles";
import PageHeader from "../ui/PageHeader";

export default function QRPage() {
  const theme = useTheme();
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
      {!qrCodes || qrCodes.length === 0 ? (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 6,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}10 0%, ${theme.palette.primary.main}05 100%)`,
              border: `2px dashed ${theme.palette.divider}`,
              maxWidth: 400,
            }}
          >
            <QrCodeIcon
              sx={{
                fontSize: 80,
                mb: 2,
                color: theme.palette.primary.main,
                opacity: 0.5,
              }}
            />
            <Typography
              variant="h6"
              color="text.primary"
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              No QR codes found
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Scan a QR code or scout a match to get started
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<QrCodeIcon />}
              onClick={openScanner}
              sx={{ borderRadius: 2 }}
            >
              Scan QR Code
            </Button>
          </Paper>
        </Box>
      ) : (
        <>
          <Box px={3} pt={2}>
            {/* Header */}
            <PageHeader
              icon={<QrCodeIcon sx={{ fontSize: 28 }} />}
              title="QR Codes"
              subtitle={`${qrCodes.length} code${
                qrCodes.length !== 1 ? "s" : ""
              } collected`}
              trailingComponent={
                selection.selecting &&
                selection.selectedCodes.length > 0 && (
                  <Chip
                    label={`${selection.selectedCodes.length} selected`}
                    color="primary"
                    sx={{ fontWeight: 600 }}
                  />
                )
              }
            />

            {/* Action Bar */}
            <Stack direction="row" justifyContent="space-between" mb={3}>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<FilterIcon />}
                  sx={{
                    borderRadius: 2,
                    borderWidth: 2,
                    "&:hover": {
                      borderWidth: 2,
                    },
                  }}
                >
                  Filter
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<SortIcon />}
                  sx={{
                    borderRadius: 2,
                    borderWidth: 2,
                    "&:hover": {
                      borderWidth: 2,
                    },
                  }}
                >
                  Sort
                </Button>
              </Stack>
              <Button
                variant={selection.selecting ? "outlined" : "contained"}
                color="secondary"
                onClick={selection.toggleSelecting}
                sx={{
                  borderRadius: 2,
                  ...(selection.selecting && {
                    borderWidth: 2,
                    "&:hover": {
                      borderWidth: 2,
                    },
                  }),
                }}
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
        </>
      )}

      <QrScannerDialog
        open={scannerOpen}
        onClose={closeScanner}
        onImport={refetch}
      />
      <QrShareDialog
        qrCodeData={activeQrCode!}
        open={qrDialogOpen}
        onClose={closeQrDialog}
        forQrPage
        onDelete={refetch}
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
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        slotProps={{
          content: {
            sx: {
              backgroundColor: theme.palette.success.main,
              color: theme.palette.success.contrastText,
            },
          },
        }}
        action={
          <IconButton onClick={() => setSuccess(false)}>
            <CloseIcon />
          </IconButton>
        }
      />
    </>
  );
}
