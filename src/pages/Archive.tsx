import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Stack,
  useTheme,
  Fab,
  Zoom,
  Dialog,
  DialogTitle,  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import ShareDialog from "../ui/dialog/ShareDialog";
import SendToDialog from "../ui/dialog/SendToDialog";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import FolderIcon from "@mui/icons-material/FolderRounded";
import ArchiveIcon from "@mui/icons-material/ArchiveRounded";
import UnarchiveIcon from "@mui/icons-material/UnarchiveRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import RemoveFromFolderIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import PageHeader from "../ui/PageHeader";
import QrGrid from "../ui/qr/QrGrid";
import RenameDialog from "../ui/dialog/RenameDialog";
import DeleteFolderDialog from "../ui/dialog/DeleteFolderDialog";
import ArchiveFab from "../ui/qr/ArchiveFab";
import { useMemo, useState } from "react";
import { useAsyncFetch } from "../hooks/useAsyncFetch";
import useDialog from "../hooks/useDialog";
import { useQrManager } from "../hooks/useQrManager";
import { fetchQrCodes, unarchiveQrCode, deleteQrCode } from "../utils/QrUtils";
import SortFilterMenu from "../ui/SortFilterMenu";
import { useFolderManager } from "../hooks/useFolderManager";
import CreateDialog from "../ui/dialog/CreateDialog";

export default function ArchivePage() {
  const theme = useTheme();
  const [allQrCodes, loading, error, refetch] = useAsyncFetch(fetchQrCodes);
  const [qrDialogOpen, openQrDialog, closeQrDialog] = useDialog();
  const [sendToDialogOpen, openSendToDialog, closeSendToDialog] = useDialog();
  const [unarchiveDialogOpen, openUnarchiveDialog, closeUnarchiveDialog] =
    useDialog();
  const [folderDialogOpen, openFolderDialog, closeFolderDialog] = useDialog();
  const [deleteDialogOpen, openDeleteDialog, closeDeleteDialog] = useDialog();
  const [renameFolderDialogOpen, openRenameFolderDialog, closeRenameFolderDialog] = useDialog();
  const [deleteFolderDialogOpen, openDeleteFolderDialog, closeDeleteFolderDialog] = useDialog();
  const [unarchiveFolderDialogOpen, openUnarchiveFolderDialog, closeUnarchiveFolderDialog] = useDialog();
  
  const [activeQrCode, setActiveQrCode] = useState<QrCode | null>(null);
  const [activeFolderForAction, setActiveFolderForAction] = useState<QrFolder | null>(null);

  const archivedQrCodes = useMemo(
    () => allQrCodes?.filter((code) => code.archived) || [],
    [allQrCodes]
  );
  const folderManager = useFolderManager({ showArchived: true });

  const displayQrCodes = useMemo(() => {
    if (!folderManager.currentFolder) {
      return archivedQrCodes.filter((qr) => {
        return !folderManager.folders.some((folder) =>
          folder.qrCodes.includes(qr.name)
        );
      });
    }

    const folderData = folderManager.currentFolderData;
    if (!folderData) return [];

    return archivedQrCodes.filter((qr) => folderData.qrCodes.includes(qr.name));
  }, [folderManager.currentFolder, folderManager.folders, archivedQrCodes]);

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
    
    qrManager.resetSelection();
    qrManager.toggleSelectionMode();
    refetch();
  };
  
  const handleMassUnarchive = async () => {
    // Unarchive all selected codes
    await Promise.all(
      qrManager.selectedCodes.map(async (c) => await unarchiveQrCode(c))
    );
    // Unarchive selected folders (and their codes)
    await Promise.all(
      folderManager.selectedFolders.map(async (folder) =>
        folderManager.unarchiveFolder(folder.id)
      )
    );
    qrManager.resetSelection();
    folderManager.resetFolderSelection();
    closeUnarchiveDialog();
    qrManager.toggleSelectionMode();
    refetch();
  };

  const handleMassDelete = async () => {
    await Promise.all(
      qrManager.selectedCodes.map(async (c) => await deleteQrCode(c))
    );
    qrManager.resetSelection();
    closeDeleteDialog();
    qrManager.toggleSelectionMode();
    refetch();
  };

  // Folder action handlers
  const handleRenameFolder = (folder: QrFolder) => {
    setActiveFolderForAction(folder);
    openRenameFolderDialog();
  };

  const handleDeleteFolder = async (folder: QrFolder) => {
    // Always show dialog to give user options (delete codes only or codes + folder)
    // Even if folder is empty, showing dialog is clearer
    setActiveFolderForAction(folder);
    openDeleteFolderDialog();
  };

  const handleUnarchiveFolder = (folder: QrFolder) => {
    setActiveFolderForAction(folder);
    openUnarchiveFolderDialog();
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
      if (activeFolderForAction.qrCodes.length > 0) {
        // Only try to delete codes that actually exist in archivedQrCodes
        const codesToDelete = archivedQrCodes.filter((qr) =>
          activeFolderForAction.qrCodes.includes(qr.name)
        );
        
        // Delete codes with error handling - continue even if some fail
        await Promise.allSettled(
          codesToDelete.map(async (c) => {
            try {
              await deleteQrCode(c);
            } catch (error) {
              console.warn(`Failed to delete QR code ${c.name}:`, error);
              // Continue with other deletions even if one fails
            }
          })
        );
        
        // Remove codes from folder (folder becomes empty)
        // Remove all codes that were in the folder, even if some weren't deleted
        await folderManager.removeQrCodesFromFolder(
          activeFolderForAction.qrCodes,
          activeFolderForAction.id
        );
      }
    } else {
      // Delete folder and all codes inside (or just folder if empty)
      if (activeFolderForAction.qrCodes.length > 0) {
        // Only try to delete codes that actually exist
        const codesToDelete = archivedQrCodes.filter((qr) =>
          activeFolderForAction.qrCodes.includes(qr.name)
        );
        
        // Delete codes with error handling
        await Promise.allSettled(
          codesToDelete.map(async (c) => {
            try {
              await deleteQrCode(c);
            } catch (error) {
              console.warn(`Failed to delete QR code ${c.name}:`, error);
              // Continue with other deletions even if one fails
            }
          })
        );
      }
      
      // Delete the folder itself
      await folderManager.deleteFolder(activeFolderForAction.id, false);
    }
    
    closeDeleteFolderDialog();
    setActiveFolderForAction(null);
    refetch();
  };

  const executeUnarchiveFolder = async () => {
    if (!activeFolderForAction) return;
    await folderManager.unarchiveFolder(activeFolderForAction.id);
    closeUnarchiveFolderDialog();
    setActiveFolderForAction(null);
    refetch();
  };

  // Move codes to folder (and remove from source folders when moving)
  const executeMoveToFolder = async (folderId: string) => {
    if (qrManager.selectedCodes.length === 0 && folderManager.selectedFolders.length === 0)
      return;

    // Collect all codes to move (from individual selection + folder selection)
    const qrNames =
      qrManager.selectedCodes.length > 0
        ? qrManager.selectedCodes.map((c) => c.name)
        : folderManager.selectedFolders.flatMap((f) => f.qrCodes);
    const uniqueQrNames = [...new Set(qrNames)];

    if (uniqueQrNames.length === 0) return;

    // Remove from source folders (any folder that contains them, except target)
    for (const folder of folderManager.folders) {
      if (folder.id === folderId) continue;
      const toRemove = uniqueQrNames.filter((n) => folder.qrCodes.includes(n));
      if (toRemove.length > 0) {
        await folderManager.removeQrCodesFromFolder(toRemove, folder.id);
      }
    }

    await folderManager.addQrCodesToFolder(uniqueQrNames, folderId);

    qrManager.resetSelection();
    folderManager.resetFolderSelection();
    qrManager.toggleSelectionMode();
    closeSendToDialog();
    refetch();
  };

  // Delete selected folders
  const handleDeleteSelectedFolders = async () => {
    if (folderManager.selectedFolders.length === 0) return;
    
    // If only one folder selected, use the existing delete dialog
    if (folderManager.selectedFolders.length === 1) {
      const folder = folderManager.selectedFolders[0];
      setActiveFolderForAction(folder);
      openDeleteFolderDialog();
      return;
    }
    
    // For multiple folders, delete them all with their codes
    // (Could add a bulk delete dialog later if needed)
    await Promise.all(
      folderManager.selectedFolders.map(async (folder: QrFolder) => {
        await folderManager.deleteFolder(folder.id, true);
      })
    );
    
    folderManager.resetFolderSelection();
    refetch();
  };

  // Handle folder selection - select all valid QR codes in the folder
  const handleSelectFolder = (folder: QrFolder, qrCodesInFolder: QrCode[]) => {
    // Filter to only include archived codes
    const validCodes = qrCodesInFolder.filter((qr) => qr.archived);
    
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
      {!archivedQrCodes || archivedQrCodes.length === 0 ? (
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
              background: `linear-gradient(135deg, ${theme.palette.secondary.main}10 0%, ${theme.palette.secondary.main}05 100%)`,
              border: `2px dashed ${theme.palette.divider}`,
              maxWidth: 400,
            }}
          >
            <QrCodeIcon
              sx={{
                fontSize: 80,
                mb: 2,
                color: theme.palette.secondary.main,
                opacity: 0.5,
              }}
            />
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Archive Empty
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Add saved codes to the archive to see them here
            </Typography>
          </Paper>
        </Box>
      ) : (
        <>
          <Box px={3} pt={2}>
            {/* Header */}
            <PageHeader
              icon={<ArchiveIcon sx={{ fontSize: 28 }} />}
              title="QR Archive"
              subtitle={`${qrManager.filteredQrCodes.length} code${
                qrManager.filteredQrCodes.length !== 1 ? "s" : ""
              } ${
                qrManager.filteredQrCodes.length !== archivedQrCodes.length
                  ? "filtered"
                  : "archived"
              }`}
              trailingComponent={
                qrManager.selecting &&
                (qrManager.selectedCodes.length > 0 ||
                  folderManager.selectedFolders.length > 0) && (
                  <Chip
                    label={`${qrManager.selectedCodes.length} code${
                      qrManager.selectedCodes.length !== 1 ? "s" : ""
                    }${
                      folderManager.selectedFolders.length > 0
                        ? `, ${folderManager.selectedFolders.length} folder${
                            folderManager.selectedFolders.length !== 1
                              ? "s"
                              : ""
                          }`
                        : ""
                    } selected`}
                    color="primary"
                    sx={{ fontWeight: 600, fontFamily: theme.typography.body1 }}
                  />
                )
              }
            />

            {/* Action Bar */}
            <Stack direction="row" justifyContent="space-between" mb={3}>
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

              <Stack direction={"row"} spacing={2}>
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
              validQrCodes={qrManager.filteredQrCodes}
              invalidQrCodes={[]}
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
              onUnarchiveFolder={handleUnarchiveFolder}
              isArchivePage={true}
              allQrCodes={archivedQrCodes}
            />
          </Box>

          {/* Floating Action Buttons */}
          <ArchiveFab
            selecting={qrManager.selecting}
            disabled={qrManager.noCodesSelected && folderManager.selectedFolders.length === 0}
            onSendTo={openSendToDialog}
          />
          
          {/* Remove from folder button - shows when all selected codes are in a single folder */}
          {qrManager.selecting && folderContainingAllSelected && (
            <Zoom in={qrManager.selecting} unmountOnExit>
              <Fab
                color="secondary"
                variant="extended"
                size="large"
                onClick={handleRemoveFromFolder}
                sx={{
                  position: "fixed",
                  bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
                  left: "calc(16px + env(safe-area-inset-left, 0px))",
                  zIndex: 1000,
                }}
              >
                <RemoveFromFolderIcon sx={{ mr: 1 }} /> Remove from folder
              </Fab>
            </Zoom>
          )}
          
          <Zoom in={qrManager.selecting} unmountOnExit>
            <Stack
              direction={"row"}
              justifyContent={"flex-end"}
              spacing={2}
              sx={{
                position: "fixed",
                bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
                right: 0,
                paddingRight: "calc(16px + env(safe-area-inset-right, 0px))",
              }}
            >
              <Fab
                color="error"
                variant="extended"
                size="large"
                disabled={qrManager.noCodesSelected && folderManager.selectedFolders.length === 0}
                onClick={() => {
                  // If folders are selected, delete folders; otherwise delete codes
                  if (folderManager.selectedFolders.length > 0) {
                    handleDeleteSelectedFolders();
                  } else {
                    openDeleteDialog();
                  }
                }}
              >
                <DeleteIcon sx={{ mr: 1 }} /> Delete
              </Fab>
              <Fab
                color="secondary"
                variant="extended"
                size="large"
                disabled={
                  qrManager.noCodesSelected &&
                  folderManager.selectedFolders.length === 0
                }
                onClick={openUnarchiveDialog}
              >
                <UnarchiveIcon sx={{ mr: 1 }} /> Unarchive
              </Fab>
            </Stack>
          </Zoom>
        </>
      )}

      <ShareDialog
        mode="match"
        qrCodeData={activeQrCode!}
        allQrCodes={archivedQrCodes}
        open={qrDialogOpen}
        onClose={closeQrDialog}
        forQrPage
        isArchived
        onDelete={refetch}
        onUnarchive={refetch}
        onScanned={refetch}
        onChangeQrCode={(code) => {
          setActiveQrCode(code);
        }}
        canDelete
      />
      <SendToDialog
        open={sendToDialogOpen}
        onClose={closeSendToDialog}
        onMoveToFolder={executeMoveToFolder}
        folders={folderManager.folders}
        selectedCodesCount={
          qrManager.selectedCodes.length > 0
            ? qrManager.selectedCodes.length
            : folderManager.selectedFolders.reduce(
                (s, f) => s + f.qrCodes.length,
                0
              )
        }
        selectedFolders={folderManager.selectedFolders}
        showArchiveTab={false}
      />

      {/* Unarchive Confirmation Dialog */}
      <Dialog
        open={unarchiveDialogOpen}
        onClose={closeUnarchiveDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
          <UnarchiveIcon sx={{ mr: 1 }} color="primary" />
          Unarchive QR Codes
        </DialogTitle>
        <DialogContent>
          <Typography>
            Would you like to unarchive{" "}
            {folderManager.selectedFolders.length > 0 ? (
              <>
                {folderManager.selectedFolders.length} folder
                {folderManager.selectedFolders.length !== 1 ? "s" : ""} and{" "}
              </>
            ) : null}
            {qrManager.selectedCodes.length} code
            {qrManager.selectedCodes.length !== 1 ? "s" : ""}?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={closeUnarchiveDialog}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMassUnarchive}
            color="secondary"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Unarchive
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unarchive Folder Confirmation Dialog */}
      <Dialog
        open={unarchiveFolderDialogOpen}
        onClose={closeUnarchiveFolderDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
          <UnarchiveIcon sx={{ mr: 1 }} color="secondary" /> Unarchive Folder
        </DialogTitle>
        <DialogContent>
          <Typography>
            Would you like to unarchive the folder "{activeFolderForAction?.name}"
            and all {activeFolderForAction?.qrCodes.length ?? 0} QR code
            {activeFolderForAction?.qrCodes.length !== 1 ? "s" : ""} inside it?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={closeUnarchiveFolderDialog}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={executeUnarchiveFolder}
            color="secondary"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Unarchive
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
          <DeleteIcon sx={{ mr: 1 }} color="error" />
          Delete QR Codes
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to permanently delete{" "}
            {qrManager.selectedCodes.length} code
            {qrManager.selectedCodes.length !== 1 ? "s" : ""}? This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={closeDeleteDialog}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMassDelete}
            color="error"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
