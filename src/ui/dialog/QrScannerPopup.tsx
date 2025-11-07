import {
  Dialog,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Skeleton
} from "@mui/material";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { Result } from "@zxing/library";
import { useEffect, useRef, useState } from "react";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";

/**
 * Props for the qr scanner
 */
interface QrScannerPopupProps {
  open: boolean;
  onClose: () => void;
  onScanListUpdate: (list: string[]) => void;
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
  const { open, onClose, onScanListUpdate } = props;
  const [activeCamera, setActiveCamera] = useState<CameraDevice>();
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [hasCamera, setHasCamera] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);

  const addToList = (result: Result) => {
    const text = result.getText();
    setResults((currentResults) => {
      if (currentResults.includes(text)) {
        return currentResults;
      }
      const newResults = [...currentResults, text];
      onScanListUpdate(newResults);
      return newResults;
    });
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Box sx={{ p: 2 }}>
        {!hasCamera ? (
          <Skeleton
            variant="rectangular"
            sx={{ borderRadius: 3, width: "100%", aspectRatio: "1/1" }}
          />
        ) : (
          <>
            <Box
              sx={{
                position: "relative",
                borderRadius: 3,
                overflow: "hidden",
                background: "#000",
                aspectRatio: "1/1",
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
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Box
                  sx={{
                    width: "60%",
                    height: "60%",
                    position: "relative",
                  }}
                >
                  {corners.map((style, i) => (
                    <Box
                      key={i}
                      sx={{
                        color: 'rgba(255, 255, 255, 0.5)',
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

        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
          Scanned Codes ({results.length})
        </Typography>

        <List dense sx={{ maxHeight: "35vh", overflow: "auto", p: 0.5 }}>
          {results.map((code, i) => (
            <ListItem
              key={i}
              sx={{
                bgcolor: "action.hover",
                borderRadius: 2,
                mb: 1,
              }}
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

        <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={onClose}>
          Import All
        </Button>
      </Box>
    </Dialog>
  );
}
