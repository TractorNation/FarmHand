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
import { useState, useEffect } from "react";
import DownloadIcon from "@mui/icons-material/DownloadRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { saveFileWithDialog } from "../../utils/GeneralUtils";
import { QrCodeBuilder } from "../../utils/QrUtils";

interface SchemaShareDialogProps {
  open: boolean;
  onClose: () => void;
  schema: Schema;
}

export default function SchemaShareDialog({
  open,
  onClose,
  schema,
}: SchemaShareDialogProps) {
  const theme = useTheme();
  const isLandscape = useMediaQuery("(orientation: landscape)");
  const [qrCode, setQrCode] = useState<QrCode | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && schema) {
      setLoading(true);
      QrCodeBuilder.build
        .SCHEMA(schema)
        .then(setQrCode)
        .catch((err) => console.error("Failed to create schema QR:", err))
        .finally(() => setLoading(false));
    }
  }, [open, schema]);

  const handleDownload = async () => {
    if (!qrCode) return;
    await saveFileWithDialog(qrCode.image, qrCode.name);
    setSnackbarOpen(true);
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
            ) : qrCode ? (
              <Box
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  border: `2px solid ${theme.palette.divider}`,
                  boxShadow: `0 4px 12px ${theme.palette.secondary.main}15`,
                }}
              >
                <img
                  src={`data:image/svg+xml;base64,${btoa(qrCode.image)}`}
                  alt="Schema QR Code"
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
              {schema.name}
            </Typography>
            <Typography
              variant="body1"
              textAlign="center"
              color="text.secondary"
            >
              Scan this code to import the schema on another device
            </Typography>

            <Stack spacing={1} width="100%">
              <Button
                variant="contained"
                color="secondary"
                onClick={handleDownload}
                disabled={!qrCode}
                startIcon={<DownloadIcon />}
                sx={{
                  width: "100%",
                  borderRadius: 2,
                }}
              >
                Download QR Code
              </Button>
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
        message="Schema QR code downloaded"
        autoHideDuration={1200}
        action={
          <IconButton onClick={() => setSnackbarOpen(false)}>
            <CloseIcon />
          </IconButton>
        }
      />
    </>
  );
}
