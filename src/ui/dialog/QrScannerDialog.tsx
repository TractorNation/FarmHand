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
  IconButton,
  Chip,
  Stack,
} from "@mui/material";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { Result } from "@zxing/library";
import { useEffect, useRef, useState } from "react";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";
import SchemaIcon from "@mui/icons-material/DescriptionRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import ErrorIcon from "@mui/icons-material/ErrorOutlineRounded";
import {
  createQrCodeFromImportedData,
  decodeSchemaQR,
  getQRType,
  saveQrCode,
  validateQR,
} from "../../utils/QrUtils";
import { saveSchema } from "../../utils/SchemaUtils";
import { useSchema } from "../../context/SchemaContext";

interface QrScannerDialogueProps {
  open: boolean;
  onClose: () => void;
  onImport: () => void;
}

interface ScannedItem {
  data: string;
  type: "MATCH" | "SCHEMA" | "UNKNOWN";
  displayName?: string;
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
    await navigator.mediaDevices.getUserMedia({ video: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === "videoinput");
  } catch {
    return [];
  }
}

export default function QrScannerDialogue({
  open,
  onClose,
  onImport,
}: QrScannerDialogueProps) {
  const { schema, refreshSchemas } = useSchema();
  const [activeCamera, setActiveCamera] = useState<{
    index: number;
    id: string;
  }>();
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [hasCamera, setHasCamera] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [hasMixedTypes, setHasMixedTypes] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);

  const theme = useTheme();
  const isLandscape = useMediaQuery("(orientation: landscape)");

  const addToList = async (result: Result) => {
    const text = result.getText();
    const qrType = getQRType(text);

    if (qrType === "UNKNOWN" || !validateQR(text)) {
      return;
    }

    setScannedItems((current) => {
      // Don't add duplicates
      if (current.some((item) => item.data === text)) {
        return current;
      }

      let displayName = text;
      if (qrType === "SCHEMA") {
        // Try to decode to get schema name
        decodeSchemaQR(text).then((decodedSchema) => {
          if (decodedSchema) {
            setScannedItems((items) =>
              items.map((item) =>
                item.data === text
                  ? { ...item, displayName: decodedSchema.name }
                  : item
              )
            );
          }
        });
      }

      const newItem: ScannedItem = { data: text, type: qrType, displayName };
      const newItems = [...current, newItem];

      // Check if we have mixed types
      const types = new Set(newItems.map((item) => item.type));
      setHasMixedTypes(types.size > 1);

      return newItems;
    });
  };

  const removeItem = (index: number) => {
    setScannedItems((current) => {
      const newItems = current.filter((_, i) => i !== index);
      const types = new Set(newItems.map((item) => item.type));
      setHasMixedTypes(types.size > 1);
      return newItems;
    });
  };

  const importScannedItems = async () => {
    if (scannedItems.length === 0 || hasMixedTypes) return;

    const firstType = scannedItems[0].type;

    if (firstType === "MATCH") {
      // Import as matches
      await Promise.all(
        scannedItems.map(async (item) => {
          const savedCode: QrCode = await createQrCodeFromImportedData(
            item.data,
            schema!
          );
          await saveQrCode(savedCode);
        })
      );
    } else if (firstType === "SCHEMA") {
      // Import as schemas
      await Promise.all(
        scannedItems.map(async (item) => {
          const decodedSchema = await decodeSchemaQR(item.data);
          if (decodedSchema) {
            await saveSchema(decodedSchema);
          }
        })
      );
      await refreshSchemas();
    }

    onImport();
    onClose();
  };

  // Initialize cameras
  useEffect(() => {
    if (!open) return;
    async function init() {
      const devices = await getCameraDevices();
      setCameraDevices(devices);
      if (devices.length > 0) {
        setHasCamera(true);
        setActiveCamera({ index: 0, id: devices[0].deviceId });
      } else {
        setHasCamera(false);
      }
    }
    init();
  }, [open]);

  // Start scanning
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

  const getItemIcon = (type: ScannedItem["type"]) => {
    switch (type) {
      case "MATCH":
        return <QrCodeIcon color="primary" />;
      case "SCHEMA":
        return <SchemaIcon color="secondary" />;
      case "UNKNOWN":
        return <ErrorIcon color="error" />;
    }
  };

  const getItemColor = (type: ScannedItem["type"]) => {
    switch (type) {
      case "MATCH":
        return "primary";
      case "SCHEMA":
        return "secondary";
      case "UNKNOWN":
        return "error";
    }
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
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2, flexShrink: 0 }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Scanned Items ({scannedItems.length})
          </Typography>
          {hasMixedTypes && (
            <Chip
              icon={<ErrorIcon />}
              label="Mixed Types"
              color="error"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Stack>

        {hasMixedTypes && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
              border: `2px solid ${theme.palette.error.main}`,
              backgroundColor: `${theme.palette.error.main}10`,
            }}
          >
            <Typography variant="body2" color="error.main">
              Cannot import mixed types. Remove match codes or schema codes to
              continue.
            </Typography>
          </Paper>
        )}

        <List
          dense
          sx={{
            flexGrow: 1,
            overflow: "auto",
            mb: 2,
            maxHeight: isLandscape ? "none" : 250,
          }}
        >
          {scannedItems.map((item, i) => (
            <Paper
              key={i}
              elevation={0}
              sx={{
                mb: 1,
                borderRadius: 2,
                border: `2px solid ${
                  hasMixedTypes
                    ? theme.palette.error.main
                    : theme.palette[getItemColor(item.type)].main
                }`,
                backgroundColor: hasMixedTypes
                  ? `${theme.palette.error.main}10`
                  : "transparent",
              }}
            >
              <ListItem
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => removeItem(i)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getItemIcon(item.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography
                        variant="body2"
                        sx={{
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.displayName || item.data}
                      </Typography>
                      <Chip
                        label={item.type}
                        size="small"
                        color={getItemColor(item.type)}
                        sx={{
                          height: 20,
                          fontSize: "0.7rem",
                          fontWeight: 600,
                        }}
                      />
                    </Stack>
                  }
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
          onClick={importScannedItems}
          disabled={scannedItems.length === 0 || hasMixedTypes}
        >
          Import All ({scannedItems.length})
        </Button>
      </Box>
    </Dialog>
  );
}