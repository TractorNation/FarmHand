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
} from "@mui/material";
import { useState } from "react";
import CopyIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadIcon from "@mui/icons-material/DownloadRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { decodeQR } from "../../utils/QrUtils";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

/**
 * Props for the QR export dialog
 */

interface QrExportDialogProps {
  open: boolean;
  onClose: () => void;
  qrCodeData: QrCode;
  handleSaveQR?: () => void;
  allowSaveToHistory?: boolean;
}

export default function QrShareDialog(props: QrExportDialogProps) {
  const { open, onClose, qrCodeData, handleSaveQR, allowSaveToHistory } = props;
  const theme = useTheme();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const isLandscape = useMediaQuery("(orientation: landscape)");

  const copy = async () => {
    setSnackbarOpen(true);
    const decoded = await decodeQR(qrCodeData.data);
    console.log(decoded);
    await writeText(JSON.stringify(decoded, null, 2));
  };

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
              <img
                src={`data:image/svg+xml;base64,${btoa(qrCodeData.image)}`}
                alt="QR Code"
                style={{
                  width: isLandscape ? "40vh" : "70vw",
                  maxWidth: "300px",
                  borderRadius: 20,
                }}
              />
            </Box>
          ) : (
            <Typography
              variant="subtitle1"
              sx={{ color: theme.palette.error.main }}
            >
              Failed to load QR code.
            </Typography>
          )}

          {/* Text + Buttons */}
          <Stack spacing={2} alignItems="center">
            <Typography variant="subtitle1" textAlign="center">
              Scan to import this match to another device
            </Typography>

            <Stack direction="row" spacing={2}>
              <Button variant="contained" color="primary" onClick={copy}>
                <CopyIcon sx={{ mr: 1 }} /> Copy
              </Button>
              <Button variant="contained" color="primary">
                <DownloadIcon sx={{ mr: 1 }} /> Download
              </Button>
            </Stack>

            {allowSaveToHistory && (
              <Button
                color="primary"
                variant="contained"
                sx={{
                  width: "100%",
                }}
                onClick={handleSaveQR}
              >
                Save to Match History
              </Button>
            )}
          </Stack>
        </DialogContent>
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
