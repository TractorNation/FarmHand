import {
  Box,
  Button,
  Snackbar,
  Stack,
  Typography,
  Slide,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  useMediaQuery,
  IconButton,
} from "@mui/material";
import { useSchema } from "../context/SchemaContext";
import { useAsyncFetch } from "../hooks/useAsyncFetch";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import FolderIcon from "@mui/icons-material/FolderRounded";
import { useQrManager } from "../hooks/useQrManager";
import useDialog from "../hooks/useDialog";
import QrScannerDialog from "../ui/dialog/QrScannerDialog";
import ShareDialog from "../ui/dialog/ShareDialog";
import SendToDialog from "../ui/dialog/SendToDialog";
import ExportDialog from "../ui/dialog/ExportDialog";
import DeleteFolderDialog from "../ui/dialog/DeleteFolderDialog";
import RenameDialog from "../ui/dialog/RenameDialog";
import ArchiveIcon from "@mui/icons-material/ArchiveRounded";
import { exportQrCodesToCsv, exportQrCodesToJson } from "../utils/GeneralUtils";
import { archiveQrCode, fetchQrCodes, deleteQrCode } from "../utils/QrUtils";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";
import { useMemo, useState, useEffect, useRef } from "react";
import { useLocation } from "react-router";
import QrPageFab from "../ui/qr/QrFab";
import QrGrid from "../ui/qr/QrGrid";
import { useTheme } from "@mui/material/styles";
import PageHeader from "../ui/PageHeader";
import SortFilterMenu from "../ui/SortFilterMenu";
import { useFolderManager } from "../hooks/useFolderManager";
import CreateDialog from "../ui/dialog/CreateDialog";

export default function QRPage() {
  const isLandscape = useMediaQuery("(orientation: landscape)");
  const theme = useTheme();
  const location = useLocation();
  const { availableSchemas } = useSchema();
  const [allQrCodes, loading, error, refetch] = useAsyncFetch(fetchQrCodes);
  const [scannerOpen, openScanner, closeScanner] = useDialog();
  const hasOpenedFromNavigation = useRef(false);

  // Open scanner if navigated with openScanner state (only once)
  useEffect(() => {
    if (location.state?.openScanner && !hasOpenedFromNavigation.current) {
      hasOpenedFromNavigation.current = true;
      openScanner();
      // Clear the state to prevent reopening on re-renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state, openScanner]);

  const [qrDialogOpen, openQrDialog, closeQrDialog] = useDialog();
  const [sendToDialogOpen, openSendToDialog, closeSendToDialog] = useDialog();
  const [exportDialogOpen, openExportDialog, closeExportDialog] = useDialog();
  const [folderDialogOpen, openFolderDialog, closeFolderDialog] = useDialog();
  const [renameFolderDialogOpen, openRenameFolderDialog, closeRenameFolderDialog] = useDialog();
  const [deleteFolderDialogOpen, openDeleteFolderDialog, closeDeleteFolderDialog] = useDialog();
  const [archiveFolderDialogOpen, openArchiveFolderDialog, closeArchiveFolderDialog] = useDialog();

  const [activeQrCode, setActiveQrCode] = useState<QrCode | null>(null);
  const [activeFolderForAction, setActiveFolderForAction] = useState<QrFolder | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const folderManager = useFolderManager({ showArchived: false });

  const unarchivedQrCodes = useMemo(
    () => allQrCodes?.filter((code) => !code.archived) ?? [],
    [allQrCodes]
  );

  // Filter QR codes based on current folder
  const displayQrCodes = useMemo(() => {
    if (!folderManager.currentFolder) {
      // Root view: show codes NOT in any folder
      return unarchivedQrCodes.filter((qr) => {
        return !folderManager.folders.some((folder) =>
          folder.qrCodes.includes(qr.name)
        );
      });
    }

    // Folder view: show only codes in this folder
    const folderData = folderManager.currentFolderData;
    if (!folderData) return [];

    return unarchivedQrCodes.filter((qr) =>
      folderData.qrCodes.includes(qr.name)
    );
  }, [folderManager.currentFolder, folderManager.folders, unarchivedQrCodes]);

  const qrManager = useQrManager({ qrCodes: displayQrCodes });

  // Find the folder that contains all selected codes (if any)
  const folderContainingAllSelected = useMemo(() => {
    if (qrManager.selectedCodes.length === 0) return null;

    const selectedNames = new Set(qrManager.selectedCodes.map((c) => c.name));

    // Find folders that contain all selected codes
    const matchingFolders = folderManager.folders.filter((folder) => {
      const folderCodes = new Set(folder.qrCodes);
      return [...selectedNames].every((name) => folderCodes.has(name));
    });

    // Return the folder if exactly one folder contains all codes
    return matchingFolders.length === 1 ? matchingFolders[0] : null;
  }, [qrManager.selectedCodes, folderManager.folders]);

  const handleRemoveFromFolder = async () => {
    if (!folderContainingAllSelected || qrManager.selectedCodes.length === 0)
      return;

    const qrNames = qrManager.selectedCodes.map((c) => c.name);
    await folderManager.removeQrCodesFromFolder(
      qrNames,
      folderContainingAllSelected.id
    );

    setSuccessMessage(
      `Removed ${qrNames.length} code${qrNames.length !== 1 ? "s" : ""} from ${folderContainingAllSelected.name}`
    );
    setSuccess(true);
    qrManager.resetSelection();
    qrManager.toggleSelectionMode();
    refetch();
  };

  const executeExport = async (type: "csv" | "json") => {
    if (qrManager.selectedCodes.length === 0) return;
    const fn =
      type === "csv"
        ? await exportQrCodesToCsv(qrManager.selectedCodes, availableSchemas)
        : await exportQrCodesToJson(qrManager.selectedCodes, availableSchemas);
    setSuccessMessage(`Exported to ${fn}`);
    setSuccess(true);
    qrManager.resetSelection();
    closeExportDialog();
  };

  const executeMoveToArchive = async (includeFolders: boolean) => {
    // Archive all selected codes
    await Promise.all(
      qrManager.selectedCodes.map(async (c) => await archiveQrCode(c))
    );

    // If including folders, archive the selected folders too
    if (includeFolders) {
      await Promise.all(
        folderManager.selectedFolders.map(async (folder) => {
          await folderManager.archiveFolder(folder.id);
        })
      );
    }

    qrManager.resetSelection();
    folderManager.resetFolderSelection();
    qrManager.toggleSelectionMode();
    refetch();
  };

  const executeMoveToFolder = async (folderId: string) => {
    if (qrManager.selectedCodes.length === 0 && folderManager.selectedFolders.length === 0)
      return;

    const qrNames =
      qrManager.selectedCodes.length > 0
        ? qrManager.selectedCodes.map((c) => c.name)
        : folderManager.selectedFolders.flatMap((f) => f.qrCodes);
    const uniqueQrNames = [...new Set(qrNames)];

    if (uniqueQrNames.length === 0) return;

    // Remove from source folders when moving (except target)
    for (const folder of folderManager.folders) {
      if (folder.id === folderId) continue;
      const toRemove = uniqueQrNames.filter((n) => folder.qrCodes.includes(n));
      if (toRemove.length > 0) {
        await folderManager.removeQrCodesFromFolder(toRemove, folder.id);
      }
    }

    await folderManager.addQrCodesToFolder(uniqueQrNames, folderId);

    const folder = folderManager.folders.find((f) => f.id === folderId);
    setSuccessMessage(
      `Moved ${uniqueQrNames.length} code${uniqueQrNames.length !== 1 ? "s" : ""} to ${folder?.name ?? "folder"}`
    );
    setSuccess(true);
    qrManager.resetSelection();
    folderManager.resetFolderSelection();
    qrManager.toggleSelectionMode();
    closeSendToDialog();
    refetch();
  };

  // Folder action handlers
  const handleRenameFolder = (folder: QrFolder) => {
    setActiveFolderForAction(folder);
    openRenameFolderDialog();
  };

  const handleDeleteFolder = async (folder: QrFolder) => {
    setActiveFolderForAction(folder);

    // If folder has no codes, delete it directly without showing dialog
    if (folder.qrCodes.length === 0) {
      await folderManager.deleteFolder(folder.id, false);
      setActiveFolderForAction(null);
      return;
    }

    // If folder has codes, show dialog with options
    openDeleteFolderDialog();
  };

  const handleArchiveFolder = (folder: QrFolder) => {
    setActiveFolderForAction(folder);
    openArchiveFolderDialog();
  };

  const executeRenameFolder = async (newName: string) => {
    if (!activeFolderForAction) return;
    await folderManager.renameFolder(activeFolderForAction.id, newName);
    closeRenameFolderDialog();
    setActiveFolderForAction(null);
  };

  const executeDeleteFolder = async (deleteOption: "codes" | "folder") => {
    if (!activeFolderForAction) return;

    if (deleteOption === "codes") {
      // Delete only the codes inside the folder
      const codesToDelete = unarchivedQrCodes.filter((qr) =>
        activeFolderForAction.qrCodes.includes(qr.name)
      );
      await Promise.all(
        codesToDelete.map(async (c) => await deleteQrCode(c))
      );
      // Remove codes from folder (folder becomes empty)
      await folderManager.removeQrCodesFromFolder(
        activeFolderForAction.qrCodes,
        activeFolderForAction.id
      );
    } else {
      // Delete folder and all codes inside
      await folderManager.deleteFolder(activeFolderForAction.id, true);
    }

    closeDeleteFolderDialog();
    setActiveFolderForAction(null);
    refetch();
  };

  const executeArchiveFolder = async () => {
    if (!activeFolderForAction) return;
    await folderManager.archiveFolder(activeFolderForAction.id);
    closeArchiveFolderDialog();
    setActiveFolderForAction(null);
    refetch();
  };

  // Handle folder selection - select all valid QR codes in the folder
  const handleSelectFolder = (folder: QrFolder, qrCodesInFolder: QrCode[]) => {
    // Filter to only include unarchived codes
    const validCodes = qrCodesInFolder.filter((qr) => !qr.archived);

    // If folder is already selected, deselect all its codes
    if (folderManager.isFolderSelected(folder)) {
      validCodes.forEach((qr) => {
        if (qrManager.codeIsSelected(qr)) {
          qrManager.updateSelectedCodes(qr);
        }
      });
      folderManager.toggleFolderSelection(folder);
    } else {
      // Select all valid codes from the folder
      validCodes.forEach((qr) => {
        if (!qrManager.codeIsSelected(qr)) {
          qrManager.updateSelectedCodes(qr);
        }
      });
      folderManager.toggleFolderSelection(folder);
    }
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
        onSendTo={openSendToDialog}
        onExport={openExportDialog}
        showRemoveFromFolder={Boolean(folderContainingAllSelected)}
        onRemoveFromFolder={handleRemoveFromFolder}
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
              subtitle={`${qrManager.filteredQrCodes.length} code${qrManager.filteredQrCodes.length !== 1 ? "s" : ""
                } ${qrManager.filteredQrCodes.length !== unarchivedQrCodes.length
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
            <Stack
              direction="row"
              justifyContent="space-between"
              mb={3}
              spacing={2}
            >
              <SortFilterMenu
                dateRangeEnd={qrManager.dateRangeEnd}
                dateRangeStart={qrManager.dateRangeStart}
                onDateRangeStartChange={qrManager.setDateRangeStart}
                onDateRangeEndChange={qrManager.setDateRangeEnd}
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

              <Stack direction={isLandscape ? "row" : "column"} spacing={2}>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<FolderIcon />}
                  onClick={openFolderDialog}
                  sx={{ borderRadius: 2 }}
                >
                  New Folder
                </Button>
                {qrManager.selecting && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => qrManager.selectAllCodes(true)}
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
                    Select all
                  </Button>
                )}
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
            </Stack>

            {folderManager.currentFolder && (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <IconButton
                  onClick={() => folderManager.setCurrentFolder(null)}
                >
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6">
                  {folderManager.currentFolderData?.name || "Folder"}
                </Typography>
              </Stack>
            )}

            <QrGrid
              validQrCodes={qrManager.validQrCodes}
              invalidQrCodes={qrManager.invalidQrCodes}
              folders={folderManager.currentFolder ? [] : folderManager.folders}
              onClickFolder={(folderId) =>
                folderManager.setCurrentFolder(folderId)
              }
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
              // Folder selection props
              onSelectFolder={handleSelectFolder}
              isFolderSelected={folderManager.isFolderSelected}
              // Folder action props
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
              onArchiveFolder={handleArchiveFolder}
              isArchivePage={false}
              allQrCodes={unarchivedQrCodes}
            />
          </Box>
        </>
      )}

      <QrScannerDialog
        open={scannerOpen}
        onClose={closeScanner}
        onImport={refetch}
      />
      <ShareDialog
        mode="match"
        qrCodeData={activeQrCode!}
        allQrCodes={unarchivedQrCodes}
        open={qrDialogOpen}
        onClose={closeQrDialog}
        forQrPage
        isArchived={false}
        onDelete={refetch}
        onArchive={refetch}
        onScanned={refetch}
        onChangeQrCode={(code) => {
          setActiveQrCode(code);
        }}
      />
      <SendToDialog
        open={sendToDialogOpen}
        onClose={closeSendToDialog}
        onMoveToFolder={executeMoveToFolder}
        onMoveToArchive={executeMoveToArchive}
        folders={folderManager.folders}
        selectedCodesCount={qrManager.selectedCodes.length}
        selectedFolders={folderManager.selectedFolders}
      />
      <ExportDialog
        open={exportDialogOpen}
        onClose={closeExportDialog}
        onExport={executeExport}
      />

      {/* Archive Folder Confirmation Dialog */}
      <Dialog
        open={archiveFolderDialogOpen}
        onClose={closeArchiveFolderDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
          <ArchiveIcon sx={{ mr: 1 }} color="warning" /> Archive Folder
        </DialogTitle>
        <DialogContent>
          <Typography>
            Would you like to archive the folder "{activeFolderForAction?.name}"
            and all {activeFolderForAction?.qrCodes.length ?? 0} QR code
            {activeFolderForAction?.qrCodes.length !== 1 ? "s" : ""} inside it?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={closeArchiveFolderDialog}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={executeArchiveFolder}
            color="warning"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Archive
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Folder Dialog */}
      <RenameDialog
        open={renameFolderDialogOpen}
        onClose={closeRenameFolderDialog}
        onRename={executeRenameFolder}
        initialName={activeFolderForAction?.name ?? ""}
        title="Rename Folder"
      />

      {/* Delete Folder Dialog */}
      <DeleteFolderDialog
        open={deleteFolderDialogOpen}
        onClose={closeDeleteFolderDialog}
        onDelete={executeDeleteFolder}
        folderName={activeFolderForAction?.name ?? ""}
        codeCount={activeFolderForAction?.qrCodes.length ?? 0}
      />

      <Snackbar
        open={success}
        onClose={() => setSuccess(false)}
        autoHideDuration={1200}
        slots={{ transition: Slide }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccess(false)}
          severity="success"
          variant="filled"
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Add CreateDialog for folder */}
      <CreateDialog
        open={folderDialogOpen}
        onClose={closeFolderDialog}
        onCreate={(name) => {
          folderManager.createFolder(name);
          closeFolderDialog();
        }}
        title="Create Folder"
        label="Folder Name"
        actionButtonText="Create"
      />
    </>
  );
}
