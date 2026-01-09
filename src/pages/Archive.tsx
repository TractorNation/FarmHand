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
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import ShareDialog from "../ui/dialog/ShareDialog";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import FolderIcon from "@mui/icons-material/FolderRounded";
import ArchiveIcon from "@mui/icons-material/ArchiveRounded";
import UnarchiveIcon from "@mui/icons-material/UnarchiveRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import PageHeader from "../ui/PageHeader";
import QrGrid from "../ui/qr/QrGrid";
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
  const [unarchiveDialogOpen, openUnarchiveDialog, closeUnarchiveDialog] =
    useDialog();
  const [folderDialogOpen, openFolderDialog, closeFolderDialog] = useDialog();
  const [deleteDialogOpen, openDeleteDialog, closeDeleteDialog] = useDialog();
  const [activeQrCode, setActiveQrCode] = useState<QrCode | null>(null);

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
  const handleMassUnarchive = async () => {
    await Promise.all(
      qrManager.selectedCodes.map(async (c) => await unarchiveQrCode(c))
    );
    qrManager.resetSelection();
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
            />
          </Box>

          {/* Floating Action Buttons */}
          <Zoom in={qrManager.selecting} unmountOnExit>
            <Stack
              direction={"row"}
              justifyContent={"space-between"}
              sx={{
                position: "fixed",
                bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
                left: 0,
                right: 0,
                paddingLeft: "calc(16px + env(safe-area-inset-left, 0px))",
                paddingRight: "calc(16px + env(safe-area-inset-right, 0px))",
              }}
            >
              <Fab
                color="error"
                variant="extended"
                size="large"
                disabled={qrManager.noCodesSelected}
                onClick={openDeleteDialog}
              >
                <DeleteIcon sx={{ mr: 1 }} /> Delete
              </Fab>
              <Fab
                color="secondary"
                variant="extended"
                size="large"
                disabled={qrManager.noCodesSelected}
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
            Would you like to unarchive {qrManager.selectedCodes.length} code
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
            Are you sure you want to permanently delete
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
