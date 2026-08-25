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
import FlipFieldIcon from "@mui/icons-material/Rotate90DegreesCwRounded";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AutoPathValue,
  DEFAULT_PATH_EPSILON,
  MAX_PATH_TOKENS,
  PathEvent,
  PathPoint,
  asAutoPathValue,
  dequantizePoint,
  flipPoint,
  quantizePoint,
  simplifyPath,
} from "../../utils/PathCodec";
import {
  DEFAULT_FIELD_IMAGE_URL,
  loadImageElement,
  resolveFieldImage,
} from "../../utils/FieldImage";
import { resolvePathIcon } from "../../config/pathIcons";
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

/** Aspect ratio used until the field image reports its own (roughly an FRC field). */
const FALLBACK_ASPECT = 2;

interface PathControlsProps {
  /** The path being edited. Drives the counts and every enabled/disabled rule. */
  path: AutoPathValue;
  /** Schema-declared game pieces. The picker row is dropped when there are none. */
  pieces: PathOption[];
  /** Schema-declared actions. Never empty — PathInput warns instead of rendering. */
  actions: PathAction[];
  /** Index of the armed game piece, or null when none is armed. */
  armedPiece: number | null;
  onArmPiece: (index: number) => void;
  /** Action waiting on a result choice, or null when nothing is pending. */
  pendingAction: number | null;
  onActionTap: (index: number) => void;
  onPlaceEvent: (actionIndex: number, resultIndex: number) => void;
  onUndo: () => void;
  onClear: () => void;
  /** Whether the field view is drawn rotated 180 degrees. */
  flipped: boolean;
  onToggleFlip: () => void;
  /**
   * Opens the full-screen view. Left out by the full-screen layout itself, which is
   * what drops the button there — it has its own exit control instead.
   */
  onEnterFullscreen?: () => void;
  /** Whether the path can take no more points or events. */
  atTokenLimit: boolean;
  /** Whether the scout marked the robot as having run no autonomous. */
  disabled: boolean;
}

/**
 * The controls under an auto-path canvas: the game-piece and action choosers, the
 * result buttons for an action that has outcomes, and the undo/clear/full-screen/flip
 * row.
 *
 * PathInput renders this in both its in-card and full-screen layouts, so it takes
 * everything it shows as props and owns no state of its own.
 *
 * Declared at module scope rather than inside PathInput: a component defined in
 * another component body is a new type on every render, which remounts this whole
 * subtree — dropping button ripples and focus — each time the path changes.
 */
function PathControls({
  path,
  pieces,
  actions,
  armedPiece,
  onArmPiece,
  pendingAction,
  onActionTap,
  onPlaceEvent,
  onUndo,
  onClear,
  flipped,
  onToggleFlip,
  onEnterFullscreen,
  atTokenLimit,
  disabled,
}: PathControlsProps) {
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
                  onClick={() => onArmPiece(index)}
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
                onClick={() => onActionTap(index)}
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
              if (resultIndex !== null) onPlaceEvent(pendingAction, resultIndex);
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
          onClick={onUndo}
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
          onClick={onClear}
          sx={{ borderRadius: 2, minHeight: 44 }}
        >
          Clear path
        </Button>
        {onEnterFullscreen && (
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            startIcon={<FullscreenIcon />}
            onClick={onEnterFullscreen}
            sx={{ borderRadius: 2, minHeight: 44 }}
          >
            Full screen
          </Button>
        )}
        {/*
          Deliberately still enabled when the no-autonomous switch is on: this
          changes the view, not the recording, and a scout should be able to set
          their side of the arena before a robot has done anything.
        */}
        <Button
          size="small"
          variant={flipped ? "contained" : "outlined"}
          startIcon={<FlipFieldIcon />}
          aria-label="Rotate the field view 180 degrees"
          onClick={onToggleFlip}
          sx={{ borderRadius: 2, minHeight: 44 }}
        >
          Flip field
        </Button>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
          {path.points.length} point{path.points.length !== 1 ? "s" : ""} ·{" "}
          {path.events.length} action{path.events.length !== 1 ? "s" : ""}
        </Typography>
      </Stack>
    </Stack>
  );
}

export default function PathInput({
  value,
  onChange,
  props: fieldProps,
}: PathInputProps) {
  const theme = useTheme();
  const { settings, setSetting } = useSettings();

  /**
   * Draw the field rotated 180° for scouts working the far side of the arena.
   *
   * Lives in settings rather than local state so the choice carries from one match to
   * the next (PathInput remounts on every form reset) and stays shared with the
   * PathPreview on the review step, which is mounted at the same time.
   */
  const flipped = settings.FIELD_FLIPPED;

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
    url: string;
    fellBack: boolean;
  }>({ url: DEFAULT_FIELD_IMAGE_URL, fellBack: false });
  const [imageRefused, setImageRefused] = useState(false);
  const [fitSize, setFitSize] = useState<{ w: number; h: number } | null>(null);
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
        if (!cancelled) {
          setFieldImage({ url: DEFAULT_FIELD_IMAGE_URL, fellBack: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fieldProps?.fieldImageKey, settings.FIELD_IMAGE_KEY]);

  useEffect(() => {
    let cancelled = false;

    const show = (img: HTMLImageElement) => {
      if (cancelled) return;
      imageRef.current = img;
      if (img.naturalHeight > 0) {
        setAspect(img.naturalWidth / img.naturalHeight);
      }
      draw();
    };

    loadImageElement(fieldImage.url).then(async (img) => {
      if (cancelled) return;
      if (img) {
        setImageRefused(false);
        show(img);
        return;
      }
      // A real file the webview still refused. Draw the bundled field so a scout has
      // something under their finger, and flag it: leaving imageRef null paints a flat
      // rectangle that reads as an empty field rather than a broken one.
      setImageRefused(fieldImage.url !== DEFAULT_FIELD_IMAGE_URL);
      const fallback = await loadImageElement(DEFAULT_FIELD_IMAGE_URL);
      if (fallback) show(fallback);
    });

    return () => {
      cancelled = true;
    };
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
      ctx.save();
      if (flipped) {
        // Translate to the far corner and rotate a half turn, which negates both axes.
        // Restoring afterwards leaves the markers and their numbers upright.
        ctx.translate(cssWidth, cssHeight);
        ctx.rotate(Math.PI);
      }
      ctx.drawImage(imageRef.current, 0, 0, cssWidth, cssHeight);
      ctx.restore();
    } else {
      // Only reached before the image decodes, or if it fails to.
      ctx.fillStyle = theme.palette.background.default;
      ctx.fillRect(0, 0, cssWidth, cssHeight);
    }

    // Points are held in the unrotated field frame; the flip is applied on the way out.
    const toView = (p: PathPoint) =>
      dequantizePoint(flipped ? flipPoint(p) : p, cssWidth, cssHeight);

    const committed = path.points.map(toView);
    const live = strokeRef.current.map(toView);
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
  }, [path, theme, flipped]);

  useEffect(() => {
    draw();
  }, [draw, fullscreen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    /*
      The Scout wizard keeps every section mounted and hides the inactive ones, so this
      canvas is 0x0 while the field image decodes and draw() has nowhere to paint. Only
      the element itself knows when it gains a size — a window resize listener never
      fires for a display change, nor for entering full screen.
    */
    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas);
    return () => observer.disconnect();
    // fullscreen re-parents the canvas, so the observer has to re-attach to the new one.
  }, [draw, fullscreen]);

  /*
    Full screen sizes the field from the space actually left over rather than from its
    own width. Deriving the height from a 100%-wide canvas is what pushed the field
    past the bottom of a wide window: the overlay scrolled, and a scout mid-stroke was
    drawing rather than panning it back.

    Measured instead of clamped in CSS because aspect-ratio only transfers a max-height
    back into the width when the width is not already definite — a wide window would
    otherwise squash the field instead of shrinking it. Layout phase, so the first
    frame is already fitted rather than snapping to size after it paints.
  */
  useLayoutEffect(() => {
    const box = wrapperRef.current;
    if (!fullscreen || !box) {
      setFitSize(null);
      return;
    }

    const measure = () => {
      const { width, height } = box.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const w = Math.min(width, height * aspect);
      setFitSize((prev) =>
        prev && Math.abs(prev.w - w) < 0.5 ? prev : { w, h: w / aspect }
      );
    };

    measure();
    // The box takes its height from the flex row it sits in, never from this child, so
    // writing a size back here cannot feed another resize.
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [fullscreen, aspect]);

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

  /** Canvas coordinates to a grid point in the unrotated field frame. */
  const capturePoint = (
    px: number,
    py: number,
    width: number,
    height: number
  ) => {
    const point = quantizePoint(px, py, width, height);
    return flipped ? flipPoint(point) : point;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (path.noAuto || atTokenLimit) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    movedRef.current = false;
    const { px, py, width, height } = canvasPoint(e);
    startRef.current = { x: px, y: py };
    strokeRef.current = [capturePoint(px, py, width, height)];
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

    strokeRef.current.push(capturePoint(px, py, width, height));
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
        ...(fullscreen && {
          // Basis 0 rather than auto so this row is whatever the header and controls
          // leave behind, independent of the field inside it.
          flex: "1 1 0",
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }),
      }}
    >
      <Box
        sx={
          // Bounded by whichever edge runs out first when full screen; in the card it
          // still fills the width and lets the page decide the height.
          fullscreen && fitSize
            ? { position: "relative", width: fitSize.w, height: fitSize.h }
            : { position: "relative", width: "100%", aspectRatio: String(aspect) }
        }
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          onPointerLeave={finishStroke}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            display: "block",
            borderRadius: 8,
            border: `2px solid ${theme.palette.divider}`,
            // Required so a finger drag draws instead of scrolling the page.
            touchAction: "none",
            cursor: disabled ? "not-allowed" : "crosshair",
          }}
        />
      </Box>
    </Box>
  );

  /*
    Built once and rendered in whichever layout is active, the same way canvasBlock is.
    Leaving out onEnterFullscreen is what drops the button from the full-screen
    layout, which has its own exit control.
  */
  const controls = (
    <PathControls
      path={path}
      pieces={pieces}
      actions={actions}
      armedPiece={armedPiece}
      onArmPiece={setArmedPiece}
      pendingAction={pendingAction}
      onActionTap={handleActionTap}
      onPlaceEvent={placeEvent}
      onUndo={handleUndo}
      onClear={openClearWarning}
      flipped={flipped}
      onToggleFlip={() => setSetting("FIELD_FLIPPED", !flipped)}
      onEnterFullscreen={fullscreen ? undefined : () => setFullscreen(true)}
      atTokenLimit={atTokenLimit}
      disabled={disabled}
    />
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

      {(fieldImage.fellBack || imageRefused) && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          {imageRefused
            ? "The chosen playing field image could not be loaded. Using the default field instead."
            : "This schema asks for a playing field image that isn't on this device. Using the default field instead."}
        </Alert>
      )}

      {fullscreen ? (
        /*
          Portalled to the body: an ancestor transform captures fixed positioning, and
          InputCard's hover lift would otherwise collapse this overlay back into its
          grid cell, flickering as hover follows it. Context still flows through.
        */
        createPortal(
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
              // Nothing here is allowed to scroll: a scout drawing on the field would
              // be panning it instead, and a stray scroll position hides the controls.
              // The field yields height instead, since it is the only part that can.
              overflow: "hidden",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ flexShrink: 0 }}
            >
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
            <Box sx={{ flexShrink: 0 }}>{controls}</Box>
          </Box>,
          document.body
        )
      ) : (
        <>
          {canvasBlock}
          {controls}
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
}
