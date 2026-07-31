import { Box, Typography, useTheme } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  asAutoPathValue,
  dequantizePoint,
  pathStatus,
  pathToSummary,
  pathVocabulary,
} from "../../utils/PathCodec";
import { resolveFieldImage } from "../../utils/FieldImage";
import { useSettings } from "../../context/SettingsContext";

interface PathPreviewProps {
  value: any;
  props?: ComponentProps;
  /** Rendered height in pixels. Width fills the container. */
  maxHeight?: number;
}

/**
 * Read-only rendering of a recorded auto path over the playing field image.
 *
 * Used by the match review step and the saved-QR preview. Drawing rather than
 * listing coordinates is the whole point of capturing a path.
 */
export default function PathPreview({
  value,
  props: fieldProps,
  maxHeight = 220,
}: PathPreviewProps) {
  const theme = useTheme();
  const { settings } = useSettings();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [aspect, setAspect] = useState(2);

  const path = useMemo(() => asAutoPathValue(value), [value]);
  const vocab = useMemo(() => pathVocabulary(fieldProps), [fieldProps]);
  const status = pathStatus(path);
  const summary = useMemo(() => pathToSummary(path, vocab), [path, vocab]);

  useEffect(() => {
    let cancelled = false;
    resolveFieldImage(fieldProps?.fieldImageKey, settings.FIELD_IMAGE_KEY)
      .then((r) => !cancelled && setImageUrl(r.url))
      .catch(() => !cancelled && setImageUrl(null));
    return () => {
      cancelled = true;
    };
  }, [fieldProps?.fieldImageKey, settings.FIELD_IMAGE_KEY]);

  useEffect(() => {
    if (!imageUrl) {
      imageRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      if (img.naturalHeight > 0) setAspect(img.naturalWidth / img.naturalHeight);
      redraw();
    };
    img.src = imageUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (imageRef.current) {
      ctx.drawImage(imageRef.current, 0, 0, w, h);
    } else {
      ctx.fillStyle = theme.palette.background.default;
      ctx.fillRect(0, 0, w, h);
    }

    const points = path.points.map((p) => dequantizePoint(p, w, h));
    if (points.length > 1) {
      ctx.strokeStyle = theme.palette.primary.main;
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
    }
    if (points.length > 0) {
      ctx.fillStyle = theme.palette.success.main;
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    path.events.forEach((event, index) => {
      const anchor = points[event.afterPoint];
      if (!anchor) return;
      ctx.fillStyle = theme.palette.secondary.main;
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = theme.palette.secondary.contrastText;
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(index + 1), anchor.x, anchor.y);
    });
  };

  useEffect(redraw);

  if (status !== "PATH") {
    return (
      <Typography variant="body2" color="text.secondary">
        {status === "NO_AUTO" ? "No autonomous" : "Not recorded"}
      </Typography>
    );
  }

  return (
    <Box>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          maxHeight,
          aspectRatio: String(aspect),
          display: "block",
          borderRadius: 6,
          border: `1px solid ${theme.palette.divider}`,
        }}
      />
      <Typography variant="caption" color="text.secondary">
        Start {summary.startZone} · {summary.actionSequence || "no actions"}
      </Typography>
    </Box>
  );
}
