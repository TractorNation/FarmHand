import {
  Dialog,
  DialogContent,
  Stack,
  Typography,
  Button,
  Snackbar,
  Slide,
  useTheme,
  useMediaQuery,
  Box,
  DialogTitle,
  DialogActions,
  Alert,
  IconButton,
  Tab,
  Tabs,
} from "@mui/material";
import { useState, useEffect, useMemo } from "react";
import DownloadIcon from "@mui/icons-material/DownloadRounded";
import CopyIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import ArchiveIcon from "@mui/icons-material/ArchiveRounded";
import UnarchiveIcon from "@mui/icons-material/UnarchiveRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardRounded";
import { saveFileWithDialog } from "../../utils/exportMatches";
import { matchDataJsonToMap } from "../../utils/schemaFields";
import { getMatchSortKey } from "../../utils/valueFormat";
import {
  QrCodeBuilder,
  decodeQrWithSchemas,
  reconstructMatchDataFromArray,
  deleteQrCode,
  archiveQrCode,
  unarchiveQrCode,
  markQrCodeAsScanned,
  markQrCodeAsUnscanned,
  parseQrHeader,
  getSchemaHashFromQrString,
  getDataFromQrName,
} from "../../utils/QrUtils";
import { getSchemaFromHash } from "../../utils/SchemaUtils";
import { useSchema } from "../../context/SchemaContext";
import MatchPreviewPanel from "../scout/MatchPreviewPanel";
import { formatValue } from "../scout/MatchDataReview";
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
  allQrCodes?: QrCode[];
  onSave?: (code: QrCode) => Promise<void>;
  forQrPage?: boolean;
  isArchived?: boolean;
  onDelete?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onScanned?: () => void;
  onChangeQrCode?: (code: QrCode) => void;
  canDelete?: boolean;
}

export default function ShareDialog(props: ShareDialogProps) {
  const {
    open,
    onClose,
    mode,
    schema,
    qrCodeData,
    allQrCodes = [],
    onSave,
    forQrPage,
    isArchived,
    onDelete,
    onArchive,
    onUnarchive,
    onScanned,
    onChangeQrCode,
    canDelete,
  } = props;
  const theme = useTheme();
  const isLandscape = useMediaQuery("(orientation: landscape)");
  const { availableSchemas } = useSchema();
  const [downloadSnackbarOpen, setDownloadSnackbarOpen] = useState(false);
  const [copySnackbarOpen, setCopySnackbarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"qr" | "data">("qr");

  // State for schema QR generation
  const [generatedQrCode, setGeneratedQrCode] = useState<QrCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentQrCode, setCurrentQrCode] = useState<QrCode | null>(null);

  // Track pending scanned state changes (will be applied on navigation or dialog close)
  const [pendingScannedChanges, setPendingScannedChanges] = useState<
    Map<string, boolean>
  >(new Map());

  // Dialogs for match mode actions
  const [deletePopupOpen, openDeletePopup, closeDeletePopup] = useDialog();
  const [archivePopupOpen, openArchivePopup, closeArchivePopup] = useDialog();
  const [unarchivePopupOpen, openUnarchivePopup, closeUnarchivePopup] =
    useDialog();

  // Clear pending changes when dialog closes
  useEffect(() => {
    if (!open) {
      setPendingScannedChanges(new Map());
      // Always reopen on the QR tab — that is what the dialog is primarily for.
      setActiveTab("qr");
    }
  }, [open]);

  // Update current QR code when dialog opens or qrCodeData changes
  useEffect(() => {
    if (open && mode === "match" && qrCodeData) {
      setCurrentQrCode((prev) => {
        // If switching to a different QR code, update immediately
        if (!prev || prev.name !== qrCodeData.name) {
          return qrCodeData;
        }

        // If it's the same QR code, only update if there's no pending change for it
        // This preserves any pending scanned state changes
        const hasPendingChange = pendingScannedChanges.has(qrCodeData.name);
        if (hasPendingChange) {
          // Keep current state with pending change applied
          return prev;
        }

        // No pending changes, update normally
        return {
          ...prev,
          ...qrCodeData,
          scanned: qrCodeData.scanned ?? prev.scanned,
        };
      });
    }
  }, [open, mode, qrCodeData, pendingScannedChanges]);

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

  // Find matching QR codes for navigation (same schema, device, different match numbers)
  // Parse QR data synchronously to avoid async issues
  const navigationQrCodesSync = useMemo(() => {
    if (mode !== "match" || !currentQrCode || !allQrCodes.length) return [];

    try {
      // Parsed via parseQrHeader rather than split(":") — a Base45 payload can
      // itself contain colons, and the prefix and hash are uppercase.
      const current = parseQrHeader(currentQrCode.data);
      if (!current) return [];

      // Filter QR codes with same schema and device (include current one)
      // Note: allQrCodes is already filtered by the parent (archived/unarchived)
      const matching = allQrCodes.filter((qr) => {
        const header = parseQrHeader(qr.data);
        return (
          header !== null &&
          header.schemaHash === current.schemaHash &&
          header.deviceId === current.deviceId
        );
      });

      // Sort by match number
      return matching.sort((a, b) => {
        const aData = getDataFromQrName(a.name);
        const bData = getDataFromQrName(b.name);
        const [aLevel, aNum] = getMatchSortKey(aData.MatchNumber);
        const [bLevel, bNum] = getMatchSortKey(bData.MatchNumber);
        return aLevel !== bLevel ? aLevel - bLevel : aNum - bNum;
      });
    } catch {
      return [];
    }
  }, [mode, currentQrCode, allQrCodes]);

  const currentIndex = useMemo(() => {
    if (!currentQrCode || !navigationQrCodesSync.length) return -1;
    return navigationQrCodesSync.findIndex(
      (qr) => qr.name === currentQrCode.name
    );
  }, [currentQrCode, navigationQrCodesSync]);

  const canNavigatePrevious = currentIndex > 0;
  const canNavigateNext =
    currentIndex >= 0 && currentIndex < navigationQrCodesSync.length - 1;

  const handleNavigatePrevious = async () => {
    if (!canNavigatePrevious || !onChangeQrCode) return;

    // Apply pending changes silently (no refresh) before navigating
    await applyPendingScannedChanges(false);

    const prevQr = navigationQrCodesSync[currentIndex - 1];
    onChangeQrCode(prevQr);
  };

  const handleNavigateNext = async () => {
    if (!canNavigateNext || !onChangeQrCode) return;

    // Apply pending changes silently (no refresh) before navigating
    await applyPendingScannedChanges(false);

    const nextQr = navigationQrCodesSync[currentIndex + 1];
    onChangeQrCode(nextQr);
  };

  // Apply pending scanned state changes
  const applyPendingScannedChanges = async (shouldRefresh: boolean = true) => {
    if (pendingScannedChanges.size === 0) return;

    try {
      const changes = Array.from(pendingScannedChanges.entries());

      // Apply all pending changes
      await Promise.all(
        changes.map(async ([qrName, scannedState]) => {
          // Find the QR code in allQrCodes
          const qrCode = allQrCodes.find((qr) => qr.name === qrName);
          if (!qrCode) return;

          if (scannedState) {
            await markQrCodeAsScanned(qrCode.name);
          } else {
            await markQrCodeAsUnscanned(qrCode.name);
          }
        })
      );

      // Clear pending changes
      setPendingScannedChanges(new Map());

      // Only trigger refresh if requested (to avoid flashes during navigation)
      if (shouldRefresh) {
        onScanned?.();
      }
    } catch (error) {
      console.error("Failed to apply pending scanned changes:", error);
    }
  };

  // Get the effective scanned state (pending or actual)
  const getEffectiveScannedState = (qrCode: QrCode | null): boolean => {
    if (!qrCode) return false;
    // Check if there's a pending change for this QR code
    const pendingState = pendingScannedChanges.get(qrCode.name);
    if (pendingState !== undefined) {
      return pendingState;
    }
    return qrCode.scanned === true;
  };

  const handleToggleScanned = () => {
    if (!currentQrCode) return;

    const currentScanned = getEffectiveScannedState(currentQrCode);
    const newScannedState = !currentScanned;

    // Update pending changes map (no persistence yet)
    setPendingScannedChanges((prev) => {
      const newMap = new Map(prev);
      newMap.set(currentQrCode.name, newScannedState);
      return newMap;
    });

    // Update local UI state immediately (visual only, no persistence)
    const updatedQrCode = {
      ...currentQrCode,
      scanned: newScannedState,
    };

    setCurrentQrCode(updatedQrCode);
  };

  const displayQrCode = mode === "match" ? currentQrCode : generatedQrCode;
  const title =
    mode === "schema" ? schema?.name || "" : displayQrCode?.name || "";
  const description =
    mode === "schema"
      ? "Scan this code to import the schema on another device"
      : "Scan to import this match to another device";
  const qrCodeImage =
    mode === "schema"
      ? generatedQrCode?.image || null
      : displayQrCode?.image || null;
  const qrCodeName =
    mode === "schema"
      ? generatedQrCode?.name || "schema_qr"
      : displayQrCode?.name || "match_qr";
  const handleDownload = async () => {
    if (!qrCodeImage) return;
    try {
      await saveFileWithDialog(qrCodeImage, qrCodeName);
      setDownloadSnackbarOpen(true);
    } catch {
      // User cancelled the save dialog or save failed; do nothing.
    }
  };

  /**
   * Copies the match as a readable "Field: value" listing rather than the raw
   * DecodedQr JSON — the point of copying is to paste it somewhere a human reads.
   */
  const handleCopy = async () => {
    if (!displayQrCode) return;
    try {
      const decoded = await decodeQrWithSchemas(
        displayQrCode.data,
        availableSchemas
      );
      const hash = getSchemaHashFromQrString(displayQrCode.data) ?? "";
      const codeSchema = await getSchemaFromHash(hash, availableSchemas);

      if (!codeSchema) {
        await writeText(displayQrCode.data);
      } else {
        const values = matchDataJsonToMap(
          reconstructMatchDataFromArray(codeSchema, decoded.data)
        );
        const lines = codeSchema.sections.flatMap((section) => [
          `[${section.title}]`,
          ...section.fields
            .filter((f) => f.type !== "filler")
            .map((f) => `${f.name}: ${formatValue(values.get(f.id), f.type)}`),
          "",
        ]);
        await writeText(lines.join("\n").trimEnd());
      }
      setCopySnackbarOpen(true);
    } catch {
      // Fall back to the raw payload so the action never silently does nothing.
      await writeText(displayQrCode.data);
      setCopySnackbarOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!displayQrCode) return;
    await deleteQrCode(displayQrCode.name);
    closeDeletePopup();
    onClose();
    onDelete?.();
  };

  const handleArchive = async () => {
    if (!displayQrCode) return;
    await archiveQrCode(displayQrCode.name);
    closeArchivePopup();
    onClose();
    onArchive?.();
  };

  const handleUnarchive = async () => {
    if (!displayQrCode) return;
    await unarchiveQrCode(displayQrCode.name);
    closeUnarchivePopup();
    onClose();
    onUnarchive?.();
  };

  // Handle dialog close - apply pending changes first
  const handleDialogClose = async () => {
    // Apply any pending scanned changes and refresh before closing
    await applyPendingScannedChanges(true);
    onClose();
  };

  if (mode === "match" && !currentQrCode) return null;

  const effectiveScannedState = getEffectiveScannedState(currentQrCode);

  return (
    <>
      <Dialog
        open={open}
        onClose={handleDialogClose}
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
              flexDirection: "column",
              // Not "center" on either axis: with overflowing content, a flex
              // container that centers its child clips symmetrically off both ends
              // instead of allowing scroll to reach it. "stretch" gives the child a
              // concrete cross-axis size so its own overflow-y:auto can take over.
              justifyContent: "flex-start",
              alignItems: "stretch",
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
            // Landscape puts the code or the match data beside the buttons. Stacked,
            // a short window spends its whole height on the QR and leaves the buttons
            // strung across a wide dialog below it.
            flexDirection: isLandscape ? "row" : "column",
            alignItems: "stretch",
            gap: isLandscape ? 3 : 2,
            width: "100%",
            flex: "1 1 auto",
            minHeight: 0,
            // Landscape: each pane owns its own scrollbar. Portrait: this is the
            // scroller, unchanged.
            overflowY: isLandscape ? "hidden" : "auto",
          }}
        >
          {/* Content pane — left in landscape, top in portrait. */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              ...(isLandscape
                ? { flex: "1 1 auto", minWidth: 0, minHeight: 0 }
                : { width: "100%" }),
            }}
          >
          {mode === "match" && (
            <Tabs
              value={activeTab}
              onChange={(_, next) => setActiveTab(next)}
              variant="fullWidth"
            >
              <Tab label="QR Code" value="qr" sx={{ minHeight: 48 }} />
              <Tab label="Match Data" value="data" sx={{ minHeight: 48 }} />
            </Tabs>
          )}

          {/*
            The scroller. Given a real height by the pane above rather than left to
            size itself: a flex child with overflow and no minHeight collapses to its
            content, and the match data ended up in a scroll box with no room to
            scroll in — top and bottom bounds landing on the same pixel.
          */}
          <Box
            sx={{
              width: "100%",
              ...(isLandscape
                ? { flex: "1 1 auto", minHeight: 0, overflowY: "auto" }
                : {}),
            }}
          >
          {mode === "match" && activeTab === "data" ? (
            <Box sx={{ width: "100%", overflow: isLandscape ? "visible" : "auto" }}>
              <MatchPreviewPanel qrCode={currentQrCode!} />
            </Box>
          ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: isLandscape ? "row" : "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              width: "100%",
            }}
          >
          {/* QR Image with Navigation */}
          <Box
            sx={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 1,
            }}
          >
            {mode === "match" && navigationQrCodesSync.length > 1 && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  width: "100%",
                }}
              >
                <IconButton
                  onClick={handleNavigatePrevious}
                  disabled={!canNavigatePrevious}
                  sx={{
                    color: theme.palette.primary.main,
                    "&:disabled": {
                      color: theme.palette.action.disabled,
                    },
                  }}
                >
                  <ArrowBackIcon />
                </IconButton>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ minWidth: "80px", textAlign: "center" }}
                >
                  {currentIndex >= 0 && navigationQrCodesSync.length > 0
                    ? `${currentIndex + 1} / ${navigationQrCodesSync.length}`
                    : ""}
                </Typography>
                <IconButton
                  onClick={handleNavigateNext}
                  disabled={!canNavigateNext}
                  sx={{
                    color: theme.palette.primary.main,
                    "&:disabled": {
                      color: theme.palette.action.disabled,
                    },
                  }}
                >
                  <ArrowForwardIcon />
                </IconButton>
              </Box>
            )}
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
                    maxWidth: "min(300px, 100%)",
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
                    position: "relative",
                  }}
                >
                  <img
                    src={`data:image/svg+xml;base64,${btoa(qrCodeImage)}`}
                    alt="QR Code"
                    style={{
                      width: isLandscape ? "40vh" : "70vw",
                      maxWidth: "min(300px, 100%)",
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
          </Box>
          </Box>
          )}
          </Box>
          </Box>
          {/* end content pane */}

          {/* Actions pane — right in landscape, below in portrait. */}
          <Stack
            spacing={2}
            sx={
              isLandscape
                ? {
                    // A column of its own so the buttons keep a sane width instead
                    // of stretching the full dialog, and scroll on their own when a
                    // short window cannot fit them all. Clamped rather than fixed: a
                    // narrow landscape window would otherwise give half the dialog to
                    // buttons and leave the code nowhere to go.
                    flex: "0 0 auto",
                    width: "clamp(220px, 32%, 320px)",
                    minHeight: 0,
                    overflowY: "auto",
                  }
                : { width: "100%" }
            }
          >
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
                  {forQrPage && (
                    <Button
                      variant={effectiveScannedState ? "contained" : "outlined"}
                      color={effectiveScannedState ? "success" : "primary"}
                      onClick={handleToggleScanned}
                      startIcon={
                        effectiveScannedState ? (
                          <CheckCircleIcon />
                        ) : (
                          <RadioButtonUncheckedIcon />
                        )
                      }
                      sx={{ width: "100%", borderRadius: 2 }}
                    >
                      {effectiveScannedState
                        ? "Mark as Unscanned"
                        : "Mark as Scanned"}
                    </Button>
                  )}
                  {!forQrPage && (
                    <Button
                      color="primary"
                      variant="contained"
                      sx={{ width: "100%", borderRadius: 2 }}
                      onClick={() =>
                        onSave && displayQrCode && onSave(displayQrCode)
                      }
                    >
                      Complete Scout
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
              {forQrPage && (
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleDialogClose}
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
              )}
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
            slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 'fit-content' } } }}
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
            slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 'fit-content' } } }}
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
            slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 'fit-content' } } }}
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
        autoHideDuration={1200}
      >
        <Alert
          onClose={() => setDownloadSnackbarOpen(false)}
          severity="success"
          variant="filled"
        >
          "QR code downloaded"
        </Alert>
      </Snackbar>

      <Snackbar
        open={copySnackbarOpen}
        onClose={() => setCopySnackbarOpen(false)}
        slots={{ transition: Slide }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        autoHideDuration={1200}
      >
        <Alert
          onClose={() => setCopySnackbarOpen(false)}
          severity="success"
          variant="filled"
        >
          Form data copied to clipboard
        </Alert>
      </Snackbar>
    </>
  );
}
