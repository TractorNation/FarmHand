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
  DialogTitle,
  DialogActions,
} from "@mui/material";
import { useState, useEffect } from "react";
import DownloadIcon from "@mui/icons-material/DownloadRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import CopyIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import ArchiveIcon from "@mui/icons-material/ArchiveRounded";
import UnarchiveIcon from "@mui/icons-material/UnarchiveRounded";
import { saveFileWithDialog } from "../../utils/GeneralUtils";
import {
  QrCodeBuilder,
  decodeQR,
  deleteQrCode,
  archiveQrCode,
  unarchiveQrCode,
} from "../../utils/QrUtils";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import useDialog from "../../hooks/useDialog";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  mode: "schema" | "match";

  // Schema mode props
  schema?: Schema;

  // Match mode props
  qrCodeData?: QrCode | null;
  onSave?: (code: QrCode) => Promise<void>;
  forQrPage?: boolean;
  isArchived?: boolean;
  onDelete?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  canDelete?: boolean;
}

export default function ShareDialog(props: ShareDialogProps) {
  const {
    open,
    onClose,
    mode,
    schema,
    qrCodeData,
    onSave,
    forQrPage,
    isArchived,
    onDelete,
    onArchive,
    onUnarchive,
    canDelete,
  } = props;
  const theme = useTheme();
  const isLandscape = useMediaQuery("(orientation: landscape)");
  const [downloadSnackbarOpen, setDownloadSnackbarOpen] = useState(false);
  const [copySnackbarOpen, setCopySnackbarOpen] = useState(false);

  // State for schema QR generation
  const [generatedQrCode, setGeneratedQrCode] = useState<QrCode | null>(null);
  const [loading, setLoading] = useState(false);

  // Dialogs for match mode actions
  const [deletePopupOpen, openDeletePopup, closeDeletePopup] = useDialog();
  const [archivePopupOpen, openArchivePopup, closeArchivePopup] = useDialog();
  const [unarchivePopupOpen, openUnarchivePopup, closeUnarchivePopup] =
    useDialog();

  useEffect(() => {
    if (open && mode === "schema" && schema) {
      setLoading(true);
      QrCodeBuilder.build
        .SCHEMA(schema)
        .then(setGeneratedQrCode)
        .catch((err) => console.error("Failed to create schema QR:", err))
        .finally(() => setLoading(false));
    }
  }, [open, mode, schema]);

  const title = mode === "schema" ? schema?.name || "" : qrCodeData?.name || "";
  const description =
    mode === "schema"
      ? "Scan this code to import the schema on another device"
      : "Scan to import this match to another device";
  const qrCodeImage =
    mode === "schema"
      ? generatedQrCode?.image || null
      : qrCodeData?.image || null;
  const qrCodeName =
    mode === "schema"
      ? generatedQrCode?.name || "schema_qr"
      : qrCodeData?.name || "match_qr";
  const handleDownload = async () => {
    if (!qrCodeImage) return;
    await saveFileWithDialog(qrCodeImage, qrCodeName);
    setDownloadSnackbarOpen(true);
  };

  const handleCopy = async () => {
    if (!qrCodeData) return;
    setCopySnackbarOpen(true);
    const decoded = await decodeQR(qrCodeData.data);
    await writeText(JSON.stringify(decoded, null, 2));
  };

  const handleDelete = async () => {
    if (!qrCodeData) return;
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
    if (!qrCodeData) return;
    await unarchiveQrCode(qrCodeData);
    closeUnarchivePopup();
    onClose();
    onUnarchive?.();
  };

  if (mode === "match" && !qrCodeData) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth={isLandscape ? "md" : "sm"}
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
          <Box
            sx={{
              flexShrink: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {loading ? (
              <Box
                sx={{
                  width: isLandscape ? "40vh" : "70vw",
                  maxWidth: "300px",
                  aspectRatio: "1/1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `2px solid ${theme.palette.divider}`,
                  borderRadius: 3,
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  Generating QR...
                </Typography>
              </Box>
            ) : qrCodeImage ? (
              <Box
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  border: `2px solid ${theme.palette.divider}`,
                  boxShadow: `0 4px 12px ${theme.palette.primary.main}15`,
                }}
              >
                <img
                  src={`data:image/svg+xml;base64,${btoa(qrCodeImage)}`}
                  alt="QR Code"
                  style={{
                    width: isLandscape ? "40vh" : "70vw",
                    maxWidth: "300px",
                    display: "block",
                  }}
                />
              </Box>
            ) : (
              <Typography
                variant="subtitle1"
                sx={{ color: theme.palette.error.main }}
              >
                Failed to generate QR code
              </Typography>
            )}
          </Box>

          <Stack spacing={2} sx={{ width: "100%" }}>
            <Typography
              variant="h6"
              textAlign="center"
              sx={{ fontWeight: 600 }}
            >
              {title}
            </Typography>
            <Typography
              variant="body1"
              textAlign="center"
              color="text.secondary"
            >
              {description}
            </Typography>

            <Stack spacing={1} width="100%">
              {mode === "match" && (
                <>
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={handleCopy}
                      startIcon={<CopyIcon />}
                      sx={{
                        borderRadius: 2,
                        borderWidth: 2,
                        flexGrow: 1,
                        "&:hover": { borderWidth: 2 },
                      }}
                    >
                      Copy Data
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={handleDownload}
                      disabled={!qrCodeImage}
                      startIcon={<DownloadIcon />}
                      sx={{
                        borderRadius: 2,
                        borderWidth: 2,
                        flexGrow: 1,
                        "&:hover": {
                          borderWidth: 2,
                        },
                      }}
                    >
                      Download
                    </Button>
                  </Stack>
                  {!forQrPage && (
                    <Button
                      color="primary"
                      variant="contained"
                      sx={{ width: "100%", borderRadius: 2 }}
                      onClick={() => onSave && qrCodeData && onSave(qrCodeData)}
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
                </>
              )}
              <Button
                variant="outlined"
                color="secondary"
                onClick={onClose}
                sx={{
                  width: "100%",
                  borderRadius: 2,
                  borderWidth: 2,
                  "&:hover": {
                    borderWidth: 2,
                  },
                }}
              >
                Close
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs for Match mode */}
      {mode === "match" && (
        <>
          <Dialog
            open={deletePopupOpen}
            onClose={closeDeletePopup}
            slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 400 } } }}
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

          <Dialog
            open={archivePopupOpen}
            onClose={closeArchivePopup}
            slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 400 } } }}
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

          <Dialog
            open={unarchivePopupOpen}
            onClose={closeUnarchivePopup}
            slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 400 } } }}
          >
            <DialogTitle
              sx={{
                display: "flex",
                alignItems: "center",
                fontWeight: 600,
              }}
            >
              <UnarchiveIcon sx={{ mr: 1 }} color="primary" />
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
        </>
      )}

      {/* Snackbars */}
      <Snackbar
        open={downloadSnackbarOpen}
        onClose={() => setDownloadSnackbarOpen(false)}
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
        message="QR code downloaded"
        autoHideDuration={1200}
        action={
          <IconButton onClick={() => setDownloadSnackbarOpen(false)}>
            <CloseIcon />
          </IconButton>
        }
      />

      <Snackbar
        open={copySnackbarOpen}
        onClose={() => setCopySnackbarOpen(false)}
        slots={{ transition: Slide }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        slotProps={{
          content: {
            sx: {
              fontFamily: theme.typography.subtitle1,
              borderRadius: 2,
              backgroundColor: theme.palette.success.main,
              color: theme.palette.success.contrastText,
            },
          },
        }}
        message="Form data copied to clipboard"
        autoHideDuration={1200}
        action={
          <IconButton onClick={() => setCopySnackbarOpen(false)}>
            <CloseIcon />
          </IconButton>
        }
      />
    </>
  );
}
