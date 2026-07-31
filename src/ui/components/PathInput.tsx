import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import UndoIcon from "@mui/icons-material/UndoRounded";
import ClearIcon from "@mui/icons-material/DeleteSweepRounded";
import FullscreenIcon from "@mui/icons-material/FullscreenRounded";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExitRounded";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AutoPathValue,
  DEFAULT_PATH_EPSILON,
  MAX_PATH_TOKENS,
  PathEvent,
  PathPoint,
  asAutoPathValue,
  dequantizePoint,
  quantizePoint,
  simplifyPath,
} from "../../utils/PathCodec";
import { resolvePathIcon } from "../../config/pathIcons";
import { resolveFieldImage } from "../../utils/FieldImage";
import { useSettings } from "../../context/SettingsContext";
import useDialog from "../../hooks/useDialog";
import WarningDialog from "../dialog/WarningDialog";

interface PathInputProps {
  value?: AutoPathValue | any;
  onChange?: (value: AutoPathValue) => void;
  /** Schema-declared vocabulary and options for this field. */
  props?: ComponentProps;
}

/** Movement in CSS pixels before a press counts as a drag rather than a tap. */
const DRAG_THRESHOLD = 4;

/** Fallback aspect ratio when no field image is available (roughly an FRC field). */
const FALLBACK_ASPECT = 2;

export default function PathInput({
  value,
  onChange,
  props: fieldProps,
}: PathInputProps) {
  const theme = useTheme();
  const { settings } = useSettings();

  const actions = fieldProps?.pathActions ?? [];
  const pieces = fieldProps?.gamePieces ?? [];
  const epsilon = fieldProps?.simplifyEpsilon ?? DEFAULT_PATH_EPSILON;

  const path = useMemo(() => asAutoPathValue(value), [value]);

  const [armedPiece, setArmedPiece] = useState<number | null>(
    pieces.length > 0 ? 0 : null
  );
  const [pendingAction, setPendingAction] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [showClearWarning, openClearWarning, closeClearWarning] = useDialog();

  const [fieldImage, setFieldImage] = useState<{
    url: string | null;
    fellBack: boolean;
  }>({ url: null, fellBack: false });
  const [aspect, setAspect] = useState(FALLBACK_ASPECT);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  // Raw pointer samples for the in-progress stroke, simplified on release.
  const strokeRef = useRef<PathPoint[]>([]);
  const drawingRef = useRef(false);
  const movedRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  // --- field image -------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    resolveFieldImage(fieldProps?.fieldImageKey, settings.FIELD_IMAGE_KEY)
      .then((resolved) => {
        if (!cancelled) {
          setFieldImage({ url: resolved.url, fellBack: resolved.fellBack });
        }
      })
      .catch(() => {
        if (!cancelled) setFieldImage({ url: null, fellBack: false });
      });
    return () => {
      cancelled = true;
    };
  }, [fieldProps?.fieldImageKey, settings.FIELD_IMAGE_KEY]);

  useEffect(() => {
    if (!fieldImage.url) {
      imageRef.current = null;
      setAspect(FALLBACK_ASPECT);
      return;
    }
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      if (img.naturalHeight > 0) {
        setAspect(img.naturalWidth / img.naturalHeight);
      }
      draw();
    };
    img.src = fieldImage.url;
    // draw is stable enough for this effect; redrawing happens on every state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldImage.url]);

  // --- rendering ---------------------------------------------------------

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    if (cssWidth === 0 || cssHeight === 0) return;

    // Size the backing store to the device pixel ratio so lines stay crisp.
    if (canvas.width !== cssWidth * dpr || canvas.height !== cssHeight * dpr) {
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    if (imageRef.current) {
      ctx.drawImage(imageRef.current, 0, 0, cssWidth, cssHeight);
    } else {
      ctx.fillStyle = theme.palette.background.default;
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      // A centre line gives some spatial reference without a real field image.
      ctx.strokeStyle = theme.palette.divider;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(cssWidth / 2, 0);
      ctx.lineTo(cssWidth / 2, cssHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const committed = path.points.map((p) =>
      dequantizePoint(p, cssWidth, cssHeight)
    );
    const live = strokeRef.current.map((p) =>
      dequantizePoint(p, cssWidth, cssHeight)
    );
    const all = [...committed, ...live];

    if (all.length > 1) {
      ctx.strokeStyle = theme.palette.primary.main;
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(all[0].x, all[0].y);
      for (let i = 1; i < all.length; i++) ctx.lineTo(all[i].x, all[i].y);
      ctx.stroke();
    }

    // Start marker.
    if (all.length > 0) {
      ctx.fillStyle = theme.palette.success.main;
      ctx.beginPath();
      ctx.arc(all[0].x, all[0].y, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Head marker — where the next event will land.
    if (all.length > 1) {
      const head = all[all.length - 1];
      ctx.fillStyle = theme.palette.primary.main;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Event markers, numbered in the order they were logged.
    path.events.forEach((event, index) => {
      const anchor = committed[event.afterPoint];
      if (!anchor) return;
      ctx.fillStyle = theme.palette.secondary.main;
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = theme.palette.secondary.contrastText;
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(index + 1), anchor.x, anchor.y);
    });
  }, [path, theme]);

  useEffect(() => {
    draw();
  }, [draw, fullscreen]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  // --- editing -----------------------------------------------------------

  const commit = (next: AutoPathValue) => onChange?.(next);

  const atTokenLimit =
    path.points.length - 1 + path.events.length >= MAX_PATH_TOKENS;

  const canvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      px: e.clientX - rect.left,
      py: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (path.noAuto || atTokenLimit) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    movedRef.current = false;
    const { px, py, width, height } = canvasPoint(e);
    startRef.current = { x: px, y: py };
    strokeRef.current = [quantizePoint(px, py, width, height)];
    draw();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const { px, py, width, height } = canvasPoint(e);

    if (!movedRef.current && startRef.current) {
      const dx = px - startRef.current.x;
      const dy = py - startRef.current.y;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      movedRef.current = true;
    }

    strokeRef.current.push(quantizePoint(px, py, width, height));
    draw();
  };

  const finishStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    const stroke = strokeRef.current;
    strokeRef.current = [];
    if (stroke.length === 0) return;

    // A tap contributes a single point; a drag contributes the whole simplified
    // stroke. Either way the path grows from its existing head.
    const appended = movedRef.current ? stroke : [stroke[stroke.length - 1]];
    const merged: AutoPathValue = {
      ...path,
      points: [...path.points, ...appended],
    };

    // Simplify only the freshly added tail so earlier geometry and its event
    // anchors are never rewritten under the scout.
    const head = path.points.length;
    const tail = simplifyPath(
      { noAuto: false, points: merged.points.slice(Math.max(0, head - 1)), events: [] },
      epsilon
    ).points;

    const kept =
      head === 0
        ? tail
        : [...merged.points.slice(0, head - 1), ...tail];

    commit({ ...path, points: kept.slice(0, MAX_PATH_TOKENS + 1) });
  };

  /** Places an event at the current path head. Never changes any mode. */
  const placeEvent = (actionIndex: number, resultIndex: number | null) => {
    if (path.noAuto || path.points.length === 0 || atTokenLimit) return;
    const event: PathEvent = {
      afterPoint: path.points.length - 1,
      action: actionIndex,
      piece: pieces.length > 0 ? armedPiece : null,
      result: resultIndex,
    };
    commit({ ...path, events: [...path.events, event] });
    setPendingAction(null);
  };

  const handleActionTap = (actionIndex: number) => {
    const results = actions[actionIndex]?.results;
    if (results && results.length > 0) {
      // Reveal the result buttons; the event lands once an outcome is chosen.
      setPendingAction((prev) => (prev === actionIndex ? null : actionIndex));
      return;
    }
    placeEvent(actionIndex, null);
  };

  const handleUndo = () => {
    if (path.events.length === 0 && path.points.length === 0) return;

    // Undo whichever token was added last. Events are appended in order, so the
    // last event is newest if it is anchored to the final point.
    const lastEvent = path.events[path.events.length - 1];
    if (lastEvent && lastEvent.afterPoint === path.points.length - 1) {
      commit({ ...path, events: path.events.slice(0, -1) });
      return;
    }
    const points = path.points.slice(0, -1);
    commit({
      ...path,
      points,
      // Drop any event that was anchored to the point being removed.
      events: path.events.filter((e) => e.afterPoint < points.length),
    });
  };

  const handleClear = () => {
    commit({ noAuto: false, points: [], events: [] });
    setPendingAction(null);
    closeClearWarning();
  };

  const handleNoAutoToggle = (checked: boolean) => {
    // Turning it on clears geometry: "no autonomous" and "here is the path it ran"
    // cannot both be true, and leaving stale points would encode a contradiction.
    commit(
      checked
        ? { noAuto: true, points: [], events: [] }
        : { ...path, noAuto: false }
    );
    setPendingAction(null);
  };

  // --- render ------------------------------------------------------------

  if (actions.length === 0) {
    return (
      <Alert severity="warning" sx={{ borderRadius: 2 }}>
        This Auto Path field has no actions configured. Add at least one action in
        the schema editor.
      </Alert>
    );
  }

  const disabled = path.noAuto;

  const canvasBlock = (
    <Box
      ref={wrapperRef}
      sx={{
        position: "relative",
        width: "100%",
        opacity: disabled ? 0.4 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        onPointerLeave={finishStroke}
        style={{
          width: "100%",
          aspectRatio: String(aspect),
          display: "block",
          borderRadius: 8,
          border: `2px solid ${theme.palette.divider}`,
          // Required so a finger drag draws instead of scrolling the page.
          touchAction: "none",
          cursor: disabled ? "not-allowed" : "crosshair",
        }}
      />
    </Box>
  );

  return (
    <Stack spacing={1.5} sx={{ width: "100%" }}>
      <FormControlLabel
        control={
          <Switch
            checked={path.noAuto}
            onChange={(e) => handleNoAutoToggle(e.target.checked)}
          />
        }
        label="Robot had no autonomous"
        sx={{ m: 0 }}
      />

      {fieldImage.fellBack && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          This schema asks for a playing field image that isn't on this device.
          Using the default from Settings.
        </Alert>
      )}
      {!fieldImage.url && !fieldImage.fellBack && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No playing field image set. Choose one in Settings to draw over the real
          field.
        </Alert>
      )}

      {fullscreen ? (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: theme.zIndex.modal,
            bgcolor: theme.palette.background.paper,
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            overflow: "auto",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Auto path
            </Typography>
            <Button
              onClick={() => setFullscreen(false)}
              startIcon={<FullscreenExitIcon />}
              sx={{ borderRadius: 2, minHeight: 44 }}
            >
              Exit
            </Button>
          </Stack>
          {canvasBlock}
          <PathControls />
        </Box>
      ) : (
        <>
          {canvasBlock}
          <PathControls />
        </>
      )}

      <WarningDialog
        open={showClearWarning}
        onClose={closeClearWarning}
        onConfirm={handleClear}
        title="Clear path"
        message="This removes the drawn path and every action placed on it. This cannot be undone."
        confirmText="Clear"
        cancelText="Cancel"
      />
    </Stack>
  );

  /** Piece/action chips plus the undo, clear and fullscreen row. */
  function PathControls() {
    return (
      <Stack spacing={1.25}>
        {pieces.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Game piece
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 0.5 }}>
              {pieces.map((piece, index) => {
                const Icon = resolvePathIcon(piece.icon);
                return (
                  <Chip
                    key={`${piece.label}-${index}`}
                    icon={<Icon />}
                    label={piece.label}
                    disabled={disabled}
                    color={armedPiece === index ? "primary" : "default"}
                    variant={armedPiece === index ? "filled" : "outlined"}
                    onClick={() => setArmedPiece(index)}
                    sx={{ minHeight: 44, borderRadius: 2, px: 0.5 }}
                  />
                );
              })}
            </Stack>
          </Box>
        )}

        <Box>
          <Typography variant="caption" color="text.secondary">
            Action {path.points.length === 0 && "— draw or tap the field first"}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 0.5 }}>
            {actions.map((action, index) => {
              const Icon = resolvePathIcon(action.icon);
              return (
                <Chip
                  key={`${action.label}-${index}`}
                  icon={<Icon />}
                  label={action.label}
                  disabled={disabled || path.points.length === 0 || atTokenLimit}
                  color={pendingAction === index ? "secondary" : "default"}
                  variant={pendingAction === index ? "filled" : "outlined"}
                  onClick={() => handleActionTap(index)}
                  sx={{ minHeight: 44, borderRadius: 2, px: 0.5 }}
                />
              );
            })}
          </Stack>
        </Box>

        {pendingAction !== null && actions[pendingAction]?.results && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              {actions[pendingAction].label} result
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              sx={{ mt: 0.5, flexWrap: "wrap" }}
              onChange={(_, resultIndex) => {
                if (resultIndex !== null) placeEvent(pendingAction, resultIndex);
              }}
            >
              {actions[pendingAction].results!.map((result, resultIndex) => (
                <ToggleButton
                  key={result}
                  value={resultIndex}
                  sx={{ borderRadius: 2, minHeight: 44, px: 2 }}
                >
                  {result}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        )}

        {atTokenLimit && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            This path is at its maximum detail. Undo or clear to add more.
          </Alert>
        )}

        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<UndoIcon />}
            disabled={disabled || (path.points.length === 0 && path.events.length === 0)}
            onClick={handleUndo}
            sx={{ borderRadius: 2, minHeight: 44 }}
          >
            Undo
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            startIcon={<ClearIcon />}
            disabled={path.points.length === 0 && path.events.length === 0 && !path.noAuto}
            onClick={openClearWarning}
            sx={{ borderRadius: 2, minHeight: 44 }}
          >
            Clear path
          </Button>
          {!fullscreen && (
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<FullscreenIcon />}
              onClick={() => setFullscreen(true)}
              sx={{ borderRadius: 2, minHeight: 44 }}
            >
              Full screen
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
            {path.points.length} point{path.points.length !== 1 ? "s" : ""} ·{" "}
            {path.events.length} action{path.events.length !== 1 ? "s" : ""}
          </Typography>
        </Stack>
      </Stack>
    );
  }
}
