import {
  Dialog,
  DialogContent,
  Stack,
  Typography,
  Button,
  Snackbar,
  Slide,
  IconButton,
  useTheme,
  useMediaQuery,
  Box,
  DialogActions,
  DialogTitle,
} from "@mui/material";
import { useState } from "react";
import CopyIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import DownloadIcon from "@mui/icons-material/DownloadRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";

import {
  archiveQrCode,
  decodeQR,
  deleteQrCode,
  unarchiveQrCode,
} from "../../utils/QrUtils";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import useDialog from "../../hooks/useDialog";
import { saveFileWithDialog } from "../../utils/GeneralUtils";
import ArchiveIcon from "@mui/icons-material/ArchiveRounded";
import UnarchiveIcon from "@mui/icons-material/UnarchiveRounded";

/**
 * Props for the QR export dialog
 */
interface QrExportDialogProps {
  open: boolean;
  onClose: () => void;
  qrCodeData: QrCode;
  handleSaveQR?: () => void;
  forQrPage?: boolean;
  isArchived?: boolean;
  onDelete?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  canDelete?: boolean;
}

export default function QrShareDialog(props: QrExportDialogProps) {
  const {
    open,
    onClose,
    qrCodeData,
    handleSaveQR,
    forQrPage,
    isArchived,
    onDelete,
    onArchive,
    onUnarchive,
    canDelete,
  } = props;
  const theme = useTheme();
  const [deletePopupOpen, openDeletePopup, closeDeletePopup] = useDialog();
  const [archivePopupOpen, openArchivePopup, closeArchivePopup] = useDialog();
  const [unarchivePopupOpen, openUnarchivePopup, closeUnarchivePopup] =
    useDialog();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const isLandscape = useMediaQuery("(orientation: landscape)");

  const handleCopy = async () => {
    setSnackbarOpen(true);
    const decoded = await decodeQR(qrCodeData.data);
    console.log(decoded);
    await writeText(JSON.stringify(decoded, null, 2));
  };

  const handleDownload = async () => {
    await saveFileWithDialog(qrCodeData.image, qrCodeData.name);
  };

  const handleDelete = async () => {
    await deleteQrCode(qrCodeData);
    closeDeletePopup();
    onClose();
    onDelete?.();
  };

  const handleArchive = async () => {
    if (!qrCodeData) return;
    await archiveQrCode(qrCodeData);
    closeArchivePopup();
    onClose();
    onArchive?.();
  };

  const handleUnarchive = async () => {
    await unarchiveQrCode(qrCodeData);
    closeUnarchivePopup();
    onClose();
    onUnarchive?.();
  };

  if (!qrCodeData) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth={isLandscape ? "sm" : "xs"}
        slotProps={{
          paper: {
            elevation: 24,
            sx: {
              borderRadius: 3,
              overflow: "hidden",
              backgroundColor: theme.palette.background.paper,
              p: isLandscape ? 3 : 2,
              maxHeight: "90dvh",
              display: "flex",
              flexDirection: isLandscape ? "row" : "column",
              justifyContent: "center",
              alignItems: "center",
              boxSizing: "border-box",
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            },
          },
        }}
      >
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: isLandscape ? "row" : "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
          }}
        >
          {/* QR Image */}
          {qrCodeData ? (
            <Box
              sx={{
                flexShrink: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  border: `2px solid ${theme.palette.divider}`,
                  boxShadow: `0 4px 12px ${theme.palette.primary.main}15`,
                }}
              >
                <img
                  src={`data:image/svg+xml;base64,${btoa(qrCodeData.image)}`}
                  alt="QR Code"
                  style={{
                    width: isLandscape ? "40vh" : "70vw",
                    maxWidth: "300px",
                    display: "block",
                  }}
                />
              </Box>
            </Box>
          ) : (
            <Typography
              variant="subtitle1"
              sx={{ color: theme.palette.error.main }}
            >
              Failed to load QR code.
            </Typography>
          )}

          <Stack spacing={2} sx={{ width: "100%" }}>
            <Typography
              variant="h6"
              textAlign="center"
              sx={{ fontWeight: 600 }}
            >
              {qrCodeData.name}
            </Typography>
            <Typography
              variant="body1"
              textAlign="center"
              color="text.secondary"
            >
              Scan to import this match to another device
            </Typography>

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="outlined"
                color="primary"
                onClick={handleCopy}
                startIcon={<CopyIcon />}
                sx={{
                  borderRadius: 2,
                  borderWidth: 2,
                  "&:hover": {
                    borderWidth: 2,
                  },
                }}
              >
                Copy
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleDownload}
                startIcon={<DownloadIcon />}
                sx={{
                  borderRadius: 2,
                  borderWidth: 2,
                  "&:hover": {
                    borderWidth: 2,
                  },
                }}
              >
                Download
              </Button>
            </Stack>

            <Stack spacing={1} width="100%">
              {!forQrPage && (
                <Button
                  color="primary"
                  variant="contained"
                  sx={{
                    width: "100%",
                    borderRadius: 2,
                  }}
                  onClick={handleSaveQR}
                >
                  Save to Match History
                </Button>
              )}
              {forQrPage && !isArchived && (
                <Button
                  color="warning"
                  variant="outlined"
                  onClick={openArchivePopup}
                  startIcon={<ArchiveIcon />}
                  sx={{ width: "100%", borderRadius: 2 }}
                >
                  Archive
                </Button>
              )}
              {isArchived && (
                <Button
                  color="secondary"
                  variant="outlined"
                  onClick={openUnarchivePopup}
                  startIcon={<UnarchiveIcon />}
                  sx={{ width: "100%", borderRadius: 2 }}
                >
                  Unarchive
                </Button>
              )}
              {forQrPage && canDelete && (
                <Button
                  color="error"
                  variant="contained"
                  onClick={openDeletePopup}
                  sx={{ width: "100%", borderRadius: 2 }}
                  startIcon={<DeleteIcon />}
                >
                  Delete QR
                </Button>
              )}
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {/*Delete Qr confirmation popup*/}
      <Dialog
        open={deletePopupOpen}
        onClose={closeDeletePopup}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              minWidth: 400,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            fontWeight: 600,
          }}
        >
          <DeleteIcon sx={{ mr: 1 }} color="error" />
          Delete Qr
        </DialogTitle>
        <DialogContent>
          Are you sure you want to delete this code? This action cannot be
          undone.
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Delete
          </Button>
          <Button onClick={closeDeletePopup} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Archive Qr confirmation popup */}
      <Dialog
        open={archivePopupOpen}
        onClose={closeArchivePopup}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              minWidth: 400,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            fontWeight: 600,
          }}
        >
          <ArchiveIcon sx={{ mr: 1 }} color="warning" />
          Archive Qr
        </DialogTitle>
        <DialogContent>
          Are you sure you want to archive this code?
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleArchive}
            color="warning"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Archive
          </Button>
          <Button onClick={closeArchivePopup} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unarchive Qr confirmation popup */}
      <Dialog
        open={unarchivePopupOpen}
        onClose={closeUnarchivePopup}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              minWidth: 400,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            fontWeight: 600,
          }}
        >
          <ArchiveIcon sx={{ mr: 1 }} color="primary" />
          Unarchive Qr
        </DialogTitle>
        <DialogContent>
          Are you sure you want to unarchive this code?
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeUnarchivePopup} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={handleUnarchive}
            color="secondary"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Unarchive
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        slots={{ transition: Slide }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        slotProps={{
          content: {
            sx: {
              backgroundColor: theme.palette.success.main,
              color: theme.palette.success.contrastText,
              fontFamily: theme.typography.subtitle1,
              borderRadius: 2,
            },
          },
        }}
        message="Form data copied to clipboard"
        autoHideDuration={1200}
        action={
          <IconButton
            onClick={() => {
              setSnackbarOpen(false);
            }}
          >
            <CloseIcon />
          </IconButton>
        }
      />
    </>
  );
}
