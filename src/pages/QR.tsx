import {
  Box,
  Button,
  Card,
  Fab,
  Grid,
  IconButton,
  Slide,
  Snackbar,
  Stack,
  Typography,
  useTheme,
  Zoom,
} from "@mui/material";
import QrScanIcon from "@mui/icons-material/QrCodeScannerRounded";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";
import { useEffect, useMemo, useState } from "react";
import {
  exists,
  BaseDirectory,
  readDir,
  readTextFile,
} from "@tauri-apps/plugin-fs";
import QrScannerPopup from "../ui/dialog/QrScannerPopup";
import QrShareDialog from "../ui/dialog/QrShareDialogue";
import useDialog from "../hooks/useDialog";
import { useAsyncFetch } from "../hooks/useAsyncFetch";
import {
  exportQrCodesToCsv,
  exportQrCodesToJson,
  GetDescFromSvg,
} from "../utils/GeneralUtils";
import useToggle from "../hooks/useToggle";
import ExportIcon from "@mui/icons-material/IosShareRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { useSchema } from "../context/SchemaContext";
import ExportDialog from "../ui/dialog/ExportDialog";

const fetchQrCodes = async () => {
  const folderExists = await exists("saved-matches", {
    baseDir: BaseDirectory.AppLocalData,
  });

  if (!folderExists) {
    console.log("saved matches folder does not exist");
    return;
  }

  const files = await readDir("saved-matches", {
    baseDir: BaseDirectory.AppLocalData,
  });

  const images = await Promise.all(
    files
      .filter((file) => file.name.endsWith(".svg"))
      .map(async (file) => {
        const contents = await readTextFile(`saved-matches/${file.name}`, {
          baseDir: BaseDirectory.AppLocalData,
        });

        const data = GetDescFromSvg(contents);

        return {
          name: file.name,
          data: data,
          image: contents,
        };
      })
  );
  return images;
};

const fabStyle = {
  position: "fixed",
  bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
  right: "calc(16px + env(safe-area-inset-right, 0px))",
};

export default function QRPage() {
  const { availableSchemas } = useSchema();

  const theme = useTheme();
  const [qrCodes, loadingQr, errorFetchingQr, refetchQrCodes] =
    useAsyncFetch(fetchQrCodes);
  const [activeCode, setActiveCode] = useState<QrCode | null>(null);
  const [selecting, toggleSelecting] = useToggle(false);
  const [validQrCodes, setValidQrCodes] = useState<QrCode[]>([]);
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [invalidQrCodes, setInvalidQrCodes] = useState<QrCode[]>([]);
  const [showQrPopup, openQrPopup, closeQrPopup] = useDialog();
  const [scannerOpen, openScanner, closeScanner] = useDialog();
  const [exportDialogOpen, openExportDialog, closeExportDialog] = useDialog();
  const [selectedCodes, setSelectedCodes] = useState<QrCode[]>([]);
  const [successDialogueOpen, setSuccessDialogueOpen] = useState(false);
  const [savedFileName, setSavedFileName] = useState("");

  const codeIsSelected = (code: QrCode) => {
    return selectedCodes.includes(code);
  };

  useEffect(() => {
    if (!qrCodes) return;

    if (!selecting || !selectedHash) {
      // If not selecting, or no hash is set, all codes are "valid" for display purposes
      setValidQrCodes(qrCodes);
      setInvalidQrCodes([]);
    } else {
      const valid: QrCode[] = [];
      const invalid: QrCode[] = [];
      qrCodes.forEach((code) => {
        const [, , schemaHash] = code.data.split(":");
        if (schemaHash === selectedHash) {
          valid.push(code);
        } else {
          invalid.push(code);
        }
      });
      setValidQrCodes(valid);
      setInvalidQrCodes(invalid);
    }
  }, [selecting, selectedHash, qrCodes]);

  const toggleSelectMode = () => {
    // When turning off select mode, reset selections
    if (selecting) {
      setSelectedCodes([]);
      setSelectedHash(null);
    }
    toggleSelecting();
  };

  const noCodesSelected = useMemo(() => {
    return selectedCodes.length === 0;
  }, [selectedCodes]);

  const updateSelectedCodes = (code: QrCode) => {
    const newSelectedCodes = codeIsSelected(code)
      ? selectedCodes.filter((c) => c !== code)
      : [...selectedCodes, code];

    setSelectedCodes(newSelectedCodes);

    if (newSelectedCodes.length === 1) {
      const [, , schemaHash] = newSelectedCodes[0].data.split(":");
      setSelectedHash(schemaHash);
    } else if (newSelectedCodes.length === 0) {
      setSelectedHash(null);
    }
  };

  const handleExport = () => {
    openExportDialog();
  };

  const executeExport = async (fileType: "csv" | "json") => {
    if (selectedCodes.length === 0) return;

    let filename = "";
    if (fileType === "csv") {
      filename = await exportQrCodesToCsv(selectedCodes, availableSchemas);
    } else {
      filename = await exportQrCodesToJson(selectedCodes, availableSchemas);
    }
    setSavedFileName(filename);
    setSuccessDialogueOpen(true);
    // Reset selection after export
    toggleSelectMode();
  };

  const selectImage = (image: QrCode) => {
    setActiveCode(image);
    openQrPopup();
  };

  if (loadingQr) {
    return (
      <Typography variant="h6" color="info">
        Loading...
      </Typography>
    );
  }

  if (errorFetchingQr) {
    return (
      <Typography variant="h6" color="error">
        Error fetching QR codes
      </Typography>
    );
  }

  return (
    <>
      <Zoom in={!selecting} unmountOnExit>
        <Fab
          color="primary"
          size="large"
          variant="extended"
          sx={fabStyle}
          onClick={openScanner}
        >
          <QrScanIcon sx={{ mr: 1 }} />
          Scan
        </Fab>
      </Zoom>
      <Zoom in={selecting} unmountOnExit>
        <Fab
          color="primary"
          size="large"
          variant="extended"
          disabled={noCodesSelected}
          sx={fabStyle}
          onClick={handleExport}
        >
          <ExportIcon sx={{ mr: 1 }} />
          Export
        </Fab>
      </Zoom>
      <Box sx={{ px: 3, pt: 2, justifyContent: "center" }}>
        {qrCodes && qrCodes.length > 0 ? (
          <>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Stack direction="row" spacing={2}>
                <Button variant="contained" color="secondary">
                  Filter
                </Button>
                <Button variant="contained" color="secondary">
                  Sort
                </Button>
              </Stack>
              <Stack>
                <Button
                  variant={selecting ? "outlined" : "contained"}
                  color="secondary"
                  onClick={toggleSelectMode}
                  sx={{
                    transition: "all 0.2s ease",
                  }}
                >
                  {selecting ? "Cancel" : "Select"}
                </Button>
              </Stack>
            </Box>

            {/*Saved qr codes */}
            <>
              <Grid container spacing={2}>
                {validQrCodes.map((qr, i) => {
                  return (
                    <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={i}>
                      <Card
                        elevation={2}
                        sx={{
                          borderColor: codeIsSelected(qr)
                            ? theme.palette.info.main
                            : "transparent",
                          borderWidth: codeIsSelected(qr) ? 2 : 1,
                          borderStyle: "solid",
                          borderRadius: 2,
                          p: 2,
                          maxWidth: "fit-content",
                          height: "100%",
                          backgroundColor: theme.palette.background.paper,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          alignContent: "center",
                          ":hover": {
                            borderColor: theme.palette.primary.main,
                            transform: "translateY(-2px)",
                            elevation: 8,
                            boxShadow: theme.shadows[8],
                          },
                        }}
                        onClick={() => {
                          if (selecting) {
                            updateSelectedCodes(qr);
                          } else {
                            selectImage(qr);
                          }
                        }}
                      >
                        <img
                          src={`data:image/svg+xml,${encodeURIComponent(
                            qr.image
                          )}`}
                          alt="QR Code"
                          style={{
                            borderRadius: 8,
                            width: "100%",
                            aspectRatio: "1/1",
                            objectFit: "contain",
                          }}
                        />
                        <Typography>{qr.name}</Typography>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
              {selecting && invalidQrCodes.length > 0 && (
                <>
                  <Typography
                    variant="h6"
                    sx={{ mt: 4, mb: 2, color: "text.secondary" }}
                  >
                    Incompatible Codes
                  </Typography>
                  <Grid container spacing={2}>
                    {invalidQrCodes.map((qr, i) => (
                      <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={i}>
                        <Card
                          elevation={1}
                          sx={{
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 2,
                            p: 2,
                            maxWidth: "fit-content",
                            height: "100%",
                            backgroundColor: theme.palette.background.paper,
                            alignContent: "center",
                            opacity: 0.5,
                            transition: "all 0.2s ease",
                          }}
                        >
                          <img
                            src={`data:image/svg+xml,${encodeURIComponent(
                              qr.image
                            )}`}
                            alt="QR Code"
                            style={{
                              borderRadius: 8,
                              width: "100%",
                              aspectRatio: "1/1",
                              objectFit: "contain",
                            }}
                          />
                          <Typography>{qr.name}</Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
            </>
          </>
        ) : (
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
            <QrCodeIcon
              sx={{
                fontSize: 64,
                mb: 2,
                opacity: 0.3,
                color: "text.secondary",
              }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No QR codes found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Scan a QR code or scout a match to get started
            </Typography>
          </Box>
        )}
      </Box>
      <QrScannerPopup
        open={scannerOpen}
        onClose={closeScanner}
        onImport={() => {
          refetchQrCodes();
          console.log("RE FETCHING QR");
        }}
      />

      <QrShareDialog
        open={showQrPopup}
        onClose={() => {
          closeQrPopup();
          refetchQrCodes();
        }}
        qrCodeData={activeCode!}
        forQrPage
      />
      <ExportDialog
        open={exportDialogOpen}
        onClose={closeExportDialog}
        onExport={executeExport}
      />

      <Snackbar
        open={successDialogueOpen}
        onClose={() => setSuccessDialogueOpen(false)}
        slots={{ transition: Slide }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          content: {
            sx: {
              backgroundColor: theme.palette.success.main,
              color: theme.palette.success.contrastText,
              fontFamily: theme.typography.subtitle1,
            },
          },
        }}
        message={`Exported successfully to ${savedFileName}`}
        autoHideDuration={1200}
        action={
          <IconButton
            onClick={() => {
              setSuccessDialogueOpen(false);
            }}
          >
            <CloseIcon />
          </IconButton>
        }
      />
    </>
  );
}
