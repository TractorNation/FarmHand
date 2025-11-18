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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { useSchema } from "../context/SchemaContext";
import { useAsyncFetch } from "../hooks/useAsyncFetch";
import { useQrManager } from "../hooks/useQrManager";
import useDialog from "../hooks/useDialog";
import QrScannerDialog from "../ui/dialog/QrScannerDialog";
import QrShareDialog from "../ui/dialog/QrShareDialog";
import ExportDialog from "../ui/dialog/ExportDialog";
import { exportQrCodesToCsv, exportQrCodesToJson } from "../utils/GeneralUtils";
import { archiveQrCode, fetchQrCodes } from "../utils/QrUtils";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";
import { useMemo, useState } from "react";
import QrPageFab from "../ui/qr/QrFab";
import QrGrid from "../ui/qr/QrGrid";
import { useTheme } from "@mui/material/styles";
import PageHeader from "../ui/PageHeader";
import SortFilterMenu from "../ui/SortFilterMenu";

export default function QRPage() {
  const theme = useTheme();
  const { availableSchemas } = useSchema();
  const [allQrCodes, loading, error, refetch] = useAsyncFetch(fetchQrCodes);
  const [scannerOpen, openScanner, closeScanner] = useDialog();
  const [qrDialogOpen, openQrDialog, closeQrDialog] = useDialog();
  const [exportDialogOpen, openExportDialog, closeExportDialog] = useDialog();
  const [archiveDialogOpen, openArchiveDialog, closeArchiveDialog] =
    useDialog();
  const [activeQrCode, setActiveQrCode] = useState<QrCode | null>(null);
  const [success, setSuccess] = useState(false);
  const [filename, setFilename] = useState("");

  const unarchivedQrCodes = useMemo(
    () => allQrCodes?.filter((code) => !code.archived) ?? [],
    [allQrCodes]
  );

  // Use the combined hook - all filter, sort, and selection logic in one place!
  const qrManager = useQrManager({ qrCodes: unarchivedQrCodes });

  const executeExport = async (type: "csv" | "json") => {
    if (qrManager.selectedCodes.length === 0) return;
    const fn =
      type === "csv"
        ? await exportQrCodesToCsv(qrManager.selectedCodes, availableSchemas)
        : await exportQrCodesToJson(qrManager.selectedCodes, availableSchemas);
    setFilename(fn);
    setSuccess(true);
    qrManager.resetSelection();
    closeExportDialog();
  };

  const executeMassArchive = async () => {
    await Promise.all(
      qrManager.selectedCodes.map(async (c) => await archiveQrCode(c))
    );
    qrManager.resetSelection();
    closeArchiveDialog();
    qrManager.toggleSelectionMode();
    refetch();
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (error)
    return <Typography color="error">Error fetching QR codes</Typography>;

  return (
    <>
      <QrPageFab
        selecting={qrManager.selecting}
        disabled={qrManager.noCodesSelected}
        onScan={openScanner}
        onExport={openExportDialog}
        onMassArchive={openArchiveDialog}
      />

      {!unarchivedQrCodes || unarchivedQrCodes.length === 0 ? (
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
              subtitle={`${qrManager.filteredQrCodes.length} code${
                qrManager.filteredQrCodes.length !== 1 ? "s" : ""
              } ${
                qrManager.filteredQrCodes.length !== unarchivedQrCodes.length
                  ? "filtered"
                  : "collected"
              }`}
              trailingComponent={
                qrManager.selecting &&
                qrManager.selectedCodes.length > 0 && (
                  <Chip
                    label={`${qrManager.selectedCodes.length} selected`}
                    color="primary"
                    sx={{ fontWeight: 600, fontFamily: theme.typography.body1 }}
                  />
                )
              }
            />

            {/* Action Bar */}
            <Stack direction="row" justifyContent="space-between" mb={3}>
              <SortFilterMenu
                sortMode={qrManager.sortMode}
                sortDirection={qrManager.sortDirection}
                activeFilters={qrManager.filters}
                onSortModeChange={qrManager.setSortMode}
                onSortDirectionChange={qrManager.setSortDirection}
                onFilterToggle={qrManager.updateFilters}
                onClearFilters={qrManager.clearFilters}
                matchNumberFilter={qrManager.matchNumberFilter}
                teamNumberFilter={qrManager.teamNumberFilter}
                onMatchNumberFilterChange={qrManager.setMatchNumberFilter}
                onTeamNumberFilterChange={qrManager.setTeamNumberFilter}
              />

              <Button
                variant={qrManager.selecting ? "outlined" : "contained"}
                color="secondary"
                onClick={qrManager.toggleSelectionMode}
                sx={{
                  borderRadius: 2,
                  ...(qrManager.selecting && {
                    borderWidth: 2,
                    "&:hover": {
                      borderWidth: 2,
                    },
                  }),
                }}
              >
                {qrManager.selecting ? "Cancel" : "Select"}
              </Button>
            </Stack>

            <QrGrid
              validQrCodes={qrManager.validQrCodes}
              invalidQrCodes={qrManager.invalidQrCodes}
              selecting={qrManager.selecting}
              codeIsSelected={qrManager.codeIsSelected}
              onSelect={qrManager.updateSelectedCodes}
              onClickQr={(c) => {
                openQrDialog();
                setActiveQrCode(c);
              }}
              toggleSelectMode={qrManager.toggleSelectionMode}
              filter={qrManager.filters}
              sortMode={qrManager.sortMode}
              sortDirection={qrManager.sortDirection}
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
        isArchived={false}
        onDelete={refetch}
        onArchive={refetch}
      />
      <ExportDialog
        open={exportDialogOpen}
        onClose={closeExportDialog}
        onExport={executeExport}
      />

      {/* Mass Archive Confirmation Dialog */}
      <Dialog
        open={archiveDialogOpen}
        onClose={closeArchiveDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Archive QR Codes</DialogTitle>
        <DialogContent>
          <Typography>
            Would you like to archive {qrManager.selectedCodes.length} match
            {qrManager.selectedCodes.length !== 1 ? "es" : ""}?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={closeArchiveDialog}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={executeMassArchive}
            color="warning"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Archive
          </Button>
        </DialogActions>
      </Dialog>

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
