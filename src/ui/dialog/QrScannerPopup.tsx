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
  alpha,
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
interface QrScannerPopupProps {
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

export default function QrScannerPopup(props: QrScannerPopupProps) {
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
      maxWidth={isLandscape ? "md" : "xs"}
      slotProps={{
        paper: {
          elevation: 24,
          sx: {
            display: "flex",
            flexDirection: isLandscape ? "row" : "column",
            justifyContent: "center",
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
          flex: isLandscape ? 1 : "none",
          p: 2,
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
            sx={{ borderRadius: 3, aspectRatio: "1/1" }}
          />
        ) : (
          <>
            <Box
              sx={{
                position: "relative",
                borderRadius: 3,
                overflow: "hidden",
                backgroundColor: "background.default",
                aspectRatio: isLandscape ? "4/3" : "1/1",
                width: "100%",
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
                        color: alpha(theme.palette.common.white, 0.5),
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
                sx={{ mt: 1 }}
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
          flex: isLandscape ? 1 : "none",
          p: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Scanned Codes ({results.length})
          </Typography>
          <List
            dense
            sx={{ maxHeight: isLandscape ? "55dvh" : "35vh", overflow: "auto" }}
          >
            {results.map((code, i) => (
              <ListItem
                key={i}
                sx={{ bgcolor: "action.hover", borderRadius: 2, mb: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <QrCodeIcon />
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
            ))}
          </List>
        </Box>

        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 2 }}
          onClick={importQRList}
        >
          Import All
        </Button>
      </Box>
    </Dialog>
  );
}
