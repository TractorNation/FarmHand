import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import { useEffect, useState } from "react";
import {
  BATCH_SIZE_BY_BREAKPOINT,
  BatchChunk,
  buildBatchQrCodes,
  renderBatchChunks,
} from "../../utils/BatchBuilder";
import {
  getSchemaHashFromQrString,
  rawMatchPayload,
} from "../../utils/QrUtils";
import { getSchemaFromHash } from "../../utils/SchemaUtils";
import { useSchema } from "../../context/SchemaContext";

interface BatchQrDialogProps {
  open: boolean;
  onClose: () => void;
  qrCodes: QrCode[];
}

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      chunks: BatchChunk[];
      images: string[];
      effectiveSize: number;
      limitedByCapacity: boolean;
      skipped: number;
    };

/**
 * Displays the selected matches as a small number of batch QR codes.
 *
 * One code per chunk, paged, with a per-page scanned tick so the operator can keep
 * their place while a second device reads them.
 */
export default function BatchQrDialog({
  open,
  onClose,
  qrCodes,
}: BatchQrDialogProps) {
  const theme = useTheme();
  const { availableSchemas } = useSchema();

  // The generating device's screen decides how physically small each module
  // renders, so the cap comes from a real breakpoint on this device.
  const isMediumUp = useMediaQuery(theme.breakpoints.up("md"));
  const isSmallUp = useMediaQuery(theme.breakpoints.up("sm"));
  const maxPerCode = isMediumUp
    ? BATCH_SIZE_BY_BREAKPOINT.md
    : isSmallUp
      ? BATCH_SIZE_BY_BREAKPOINT.sm
      : BATCH_SIZE_BY_BREAKPOINT.xs;

  const [state, setState] = useState<State>({ kind: "loading" });
  const [page, setPage] = useState(0);
  const [scanned, setScanned] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState({ kind: "loading" });
    setPage(0);
    setScanned(new Set());

    (async () => {
      try {
        if (qrCodes.length === 0) throw new Error("No matches selected");

        const schemaHash = getSchemaHashFromQrString(qrCodes[0].data);
        if (!schemaHash) throw new Error("Selected codes are not FarmHand codes");

        const schema = await getSchemaFromHash(schemaHash, availableSchemas);
        if (!schema) {
          throw new Error(
            `No schema on this device matches hash ${schemaHash}. Import the schema QR code first.`
          );
        }

        // A batch carries one schema hash, so codes from another schema are left out
        // rather than silently mislabelled.
        const usable = qrCodes.filter(
          (c) => getSchemaHashFromQrString(c.data) === schemaHash
        );

        // Reuse each code's saved bytes verbatim. Decoding and re-encoding would
        // round-trip through reconstructMatchDataFromArray and bake its substituted
        // defaults into the batch, corrupting values and inflating the payload.
        const entries = [];
        for (const code of usable) {
          const raw = rawMatchPayload(code.data);
          // usable is already filtered to codes sharing this schema hash, so a parse
          // failure here means a malformed file rather than an older format.
          if (!raw) throw new Error(`Could not read saved code "${code.name}"`);
          entries.push(raw);
        }

        const built = await buildBatchQrCodes({ schemaHash, entries, maxPerCode });
        const images = await renderBatchChunks(built.chunks);

        if (!cancelled) {
          setState({
            kind: "ready",
            chunks: built.chunks,
            images,
            effectiveSize: built.effectiveSize,
            limitedByCapacity: built.limitedByCapacity,
            skipped: qrCodes.length - usable.length,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, qrCodes, availableSchemas, maxPerCode]);

  const toggleScanned = (index: number) =>
    setScanned((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>Batch QR codes</DialogTitle>
      <DialogContent>
        {state.kind === "loading" && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {state.kind === "error" && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {state.message}
          </Alert>
        )}

        {state.kind === "ready" && (
          <Stack spacing={2} alignItems="center">
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {qrCodes.length - state.skipped} match
              {qrCodes.length - state.skipped !== 1 ? "es" : ""} in{" "}
              {state.chunks.length} code{state.chunks.length !== 1 ? "s" : ""} (
              {state.effectiveSize} per code)
            </Typography>

            {state.limitedByCapacity && (
              <Alert severity="info" sx={{ borderRadius: 2, width: "100%" }}>
                These matches are large enough that fewer than {maxPerCode} fit per
                code. Split across {state.chunks.length} codes to stay scannable.
              </Alert>
            )}

            {state.skipped > 0 && (
              <Alert severity="warning" sx={{ borderRadius: 2, width: "100%" }}>
                {state.skipped} selected code
                {state.skipped !== 1 ? "s were" : " was"} recorded with a different
                schema and left out — a batch carries one schema.
              </Alert>
            )}

            <Box
              sx={{
                border: `2px solid ${theme.palette.divider}`,
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <img
                src={`data:image/svg+xml;base64,${btoa(state.images[page])}`}
                alt={`Batch QR ${page + 1}`}
                style={{ width: "100%", maxWidth: 340, display: "block" }}
              />
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                sx={{ minWidth: 48, minHeight: 48 }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Chip
                label={`${page + 1} / ${state.chunks.length}`}
                sx={{ fontWeight: 600, minWidth: 84 }}
              />
              <IconButton
                onClick={() =>
                  setPage((p) => Math.min(state.chunks.length - 1, p + 1))
                }
                disabled={page >= state.chunks.length - 1}
                sx={{ minWidth: 48, minHeight: 48 }}
              >
                <ArrowForwardIcon />
              </IconButton>
            </Stack>

            <Button
              variant={scanned.has(page) ? "contained" : "outlined"}
              color={scanned.has(page) ? "success" : "primary"}
              startIcon={
                scanned.has(page) ? (
                  <CheckCircleIcon />
                ) : (
                  <RadioButtonUncheckedIcon />
                )
              }
              onClick={() => toggleScanned(page)}
              sx={{ borderRadius: 2, minHeight: 48 }}
            >
              {scanned.has(page)
                ? `Code ${page + 1} scanned`
                : `Mark code ${page + 1} scanned`}
            </Button>

            <Typography variant="caption" color="text.secondary">
              {scanned.size} of {state.chunks.length} codes scanned ·{" "}
              {state.chunks[page].count} match
              {state.chunks[page].count !== 1 ? "es" : ""} on this code
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: 2 }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
