import {
  Dialog,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Skeleton,
  useMediaQuery,
  useTheme,
  Paper,
} from "@mui/material";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { Result } from "@zxing/library";
import { useEffect, useRef, useState } from "react";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";
import {
  createQrCodeFromImportedData,
  saveQrCode,
  validateQR,
} from "../../utils/QrUtils";
import { useSchema } from "../../context/SchemaContext";

/**
 * Props for the qr scanner
 */
interface QrScannerDialogueProps {
  open: boolean;
  onClose: () => void;
  onImport: () => void;
}

interface CameraDevice {
  index: number;
  id: string;
}

const corners = [
  {
    top: 0,
    left: 0,
    borderTop: "4px solid",
    borderLeft: "4px solid",
    borderRadius: "16px 0 0 0",
  },
  {
    top: 0,
    right: 0,
    borderTop: "4px solid",
    borderRight: "4px solid",
    borderRadius: "0 16px 0 0",
  },
  {
    bottom: 0,
    left: 0,
    borderBottom: "4px solid",
    borderLeft: "4px solid",
    borderRadius: "0 0 0 16px",
  },
  {
    bottom: 0,
    right: 0,
    borderBottom: "4px solid",
    borderRight: "4px solid",
    borderRadius: "0 0 16px 0",
  },
];

async function getCameraDevices(): Promise<MediaDeviceInfo[]> {
  try {
    // Request permission so device labels become available
    await navigator.mediaDevices.getUserMedia({ video: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === "videoinput");
  } catch {
    return [];
  }
}

export default function QrScannerDialogue(props: QrScannerDialogueProps) {
  const { open, onClose, onImport } = props;
  const { schema } = useSchema();
  const [activeCamera, setActiveCamera] = useState<CameraDevice>();
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [hasCamera, setHasCamera] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);

  const theme = useTheme();
  const isLandscape = useMediaQuery("(orientation: landscape)");

  const addToList = (result: Result) => {
    const text = result.getText();
    if (validateQR(text)) {
      setResults((currentResults) => {
        if (currentResults.includes(text)) {
          return currentResults;
        }
        const newResults = [...currentResults, text];
        return newResults;
      });
    }
  };

  const importQRList = async () => {
    if (!results || results.length === 0) return;

    await Promise.all(
      results.map(async (code) => {
        const savedCode: QrCode = await createQrCodeFromImportedData(
          code,
          schema!
        );
        await saveQrCode(savedCode);
      })
    );

    onImport();
    onClose();
  };

  // Initialize available cameras when opened
  useEffect(() => {
    if (!open) return;
    async function init() {
      const devices = await getCameraDevices();
      setCameraDevices(devices);
      if (devices.length > 0) {
        setHasCamera(true);
        const id = devices[0].deviceId;
        setActiveCamera({ index: 0, id });
      } else {
        setHasCamera(false);
      }
    }
    init();
  }, [open]);

  // Start scanning when a camera is available
  useEffect(() => {
    if (!open || !hasCamera || cameraDevices.length === 0 || !videoRef.current)
      return;

    const selectedCamera = cameraDevices[activeCamera?.index ?? 0];
    const reader = new BrowserQRCodeReader();
    readerRef.current = reader;

    let controls: IScannerControls;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: selectedCamera.deviceId },
        });
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        // Start scanning loop
        controls = await reader.decodeFromVideoDevice(
          activeCamera?.id,
          video,
          (result) => {
            if (result) addToList(result);
          }
        );
      } catch (err) {
        console.error("Camera error:", err);
      }
    })();

    return () => {
      if (!controls) return;
      controls.stop();
      readerRef.current = null;
    };
  }, [open, activeCamera, hasCamera]);

  const handleSwitchCamera = () => {
    if (cameraDevices.length <= 1) return;
    const currentIndex = activeCamera?.index ?? 0;
    const nextIndex = (currentIndex + 1) % cameraDevices.length;
    setActiveCamera({
      index: nextIndex,
      id: cameraDevices[nextIndex].deviceId,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={isLandscape ? "md" : "sm"}
      slotProps={{
        paper: {
          elevation: 24,
          sx: {
            display: "flex",
            flexDirection: isLandscape ? "row" : "column",
            justifyContent: "flex-start",
            alignItems: "stretch",
            backgroundColor: theme.palette.background.default,
            borderRadius: 3,
            height: isLandscape ? "80dvh" : "auto",
            maxHeight: "90dvh",
            overflow: "hidden",
            p: isLandscape ? 2 : 0,
            boxSizing: "border-box",
            paddingTop: "env(safe-area-inset-top, 0px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          },
        },
      }}
    >
      {/* Camera Section */}
      <Box
        sx={{
          flex: isLandscape ? 1 : "0 0 auto",
          p: 2,
          width: isLandscape ? "auto" : "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {!hasCamera ? (
          <Skeleton
            variant="rounded"
            width="100%"
            sx={{
              borderRadius: 3,
              aspectRatio: "1/1",
              maxHeight: isLandscape ? "none" : "50vh",
            }}
          />
        ) : (
          <>
            <Box
              sx={{
                position: "relative",
                borderRadius: 3,
                overflow: "hidden",
                backgroundColor: "background.default",
                aspectRatio: "1/1",
                width: "100%",
                maxHeight: isLandscape ? "none" : "50vh",
                border: `2px solid ${theme.palette.divider}`,
              }}
            >
              <video
                ref={videoRef}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
                muted
                playsInline
              />

              {/* Corner Frame */}
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Box sx={{ width: "60%", height: "60%", position: "relative" }}>
                  {corners.map((style, i) => (
                    <Box
                      key={i}
                      sx={{
                        color: theme.palette.primary.main,
                        position: "absolute",
                        width: 40,
                        height: 40,
                        ...style,
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>

            {cameraDevices.length > 1 && (
              <Button
                onClick={handleSwitchCamera}
                variant="contained"
                color="info"
                fullWidth
                sx={{ mt: 2, borderRadius: 2 }}
              >
                Switch Camera
              </Button>
            )}
          </>
        )}
      </Box>

      {/* Scanned Results Section */}
      <Box
        sx={{
          flex: isLandscape ? 1 : "1 1 auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          minHeight: isLandscape ? "auto" : 200,
          overflow: "hidden",
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, flexShrink: 0, fontWeight: 600 }}>
          Scanned Codes ({results.length})
        </Typography>

        <List
          dense
          sx={{
            flexGrow: 1,
            overflow: "auto",
            mb: 2,
            maxHeight: isLandscape ? "none" : 250,
          }}
        >
          {results.map((code, i) => (
            <Paper
              key={i}
              elevation={0}
              sx={{
                mb: 1,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <ListItem>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <QrCodeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={code}
                  slotProps={{
                    primary: {
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    },
                  }}
                />
              </ListItem>
            </Paper>
          ))}
        </List>

        <Button
          variant="contained"
          fullWidth
          size="large"
          sx={{ flexShrink: 0, borderRadius: 2 }}
          onClick={importQRList}
          disabled={results.length === 0}
        >
          Import All ({results.length})
        </Button>
      </Box>
    </Dialog>
  );
}
