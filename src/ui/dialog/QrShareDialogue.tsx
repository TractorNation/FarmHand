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
  Zoom,
} from "@mui/material";
import { useState, forwardRef } from "react";
import CopyIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadIcon from "@mui/icons-material/DownloadRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { TransitionProps } from "@mui/material/transitions";

/**
 * Props for the QR export dialog
 */

interface QrExportDialogProps {
  open: boolean;
  onClose: () => void;
  qrCodeData: QrCode;
  handleSaveQR: () => void;
  handleCopy: () => void;
  allowSaveToHistory?: boolean;
}

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="down" ref={ref} {...props} />;
});

export default function QrShareDialog(props: QrExportDialogProps) {
  const {
    open,
    onClose,
    qrCodeData,
    handleSaveQR,
    handleCopy,
    allowSaveToHistory,
  } = props;
  const theme = useTheme();
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const copy = () => {
    setSnackbarOpen(true);
    handleCopy();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} slots={{ transition: Transition }}>
        <DialogContent
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Stack direction={"column"} height={"100%"} spacing={3}>
            <Typography variant="subtitle1">
              Scan to import this match to another device
            </Typography>
            {qrCodeData ? (
              <img
                src={`data:image/svg+xml;base64,${btoa(qrCodeData.image)}`}
                alt="QR Code"
                style={{ borderRadius: 20 }}
              />
            ) : (
              <Typography
                variant="subtitle1"
                sx={{ mt: 2, mb: 1, color: theme.palette.error.main }}
              >
                Failed to load QR code.
              </Typography>
            )}
            <Stack
              direction={"row"}
              width={"100%"}
              justifyContent={"space-evenly"}
            >
              <Button variant="contained" color="secondary" onClick={copy}>
                <CopyIcon sx={{ mr: 1 }} /> copy
              </Button>
              <Button variant="contained" color="secondary">
                <DownloadIcon sx={{ mr: 1 }} />
                download
              </Button>
            </Stack>
            {allowSaveToHistory && (
              <Button
                autoFocus
                color="inherit"
                variant="contained"
                sx={{
                  backgroundColor: theme.palette.primary.dark,
                  width: "100%",
                }}
                onClick={() => handleSaveQR()}
              >
                Save to match history
              </Button>
            )}
          </Stack>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        slots={{ transition: Slide }}
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
