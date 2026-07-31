import {
  Alert,
  Box,
  Button,
  MenuItem,
  Select,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import ImageIcon from "@mui/icons-material/ImageRounded";
import ClearIcon from "@mui/icons-material/ClearRounded";
import { useCallback, useEffect, useState } from "react";
import {
  fieldImageUrl,
  listFieldImages,
  pickFieldImage,
} from "../../utils/FieldImage";

interface FieldImageSettingProps {
  /** Currently selected filename, or "" for none. */
  value: string;
  onChange: (key: string) => void;
}

/**
 * Picker for the default playing field image used when drawing Auto paths.
 *
 * Chosen files are copied into app storage, so this lists what has already been
 * imported alongside a button to add another.
 */
export default function FieldImageSetting({
  value,
  onChange,
}: FieldImageSettingProps) {
  const theme = useTheme();
  const [available, setAvailable] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setAvailable(await listFieldImages());
    } catch {
      setAvailable([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    fieldImageUrl(value)
      .then((url) => !cancelled && setPreviewUrl(url))
      .catch(() => !cancelled && setPreviewUrl(null));
    return () => {
      cancelled = true;
    };
  }, [value]);

  const handlePick = async () => {
    setError(null);
    try {
      const key = await pickFieldImage();
      if (key) {
        await refresh();
        onChange(key);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Stack spacing={1.5} sx={{ minWidth: 240 }}>
      {available.length > 0 && (
        <Select
          size="small"
          value={available.includes(value) ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          displayEmpty
          sx={{ borderRadius: 2 }}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {available.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </Select>
      )}

      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          startIcon={<ImageIcon />}
          onClick={handlePick}
          sx={{ borderRadius: 2, minHeight: 44 }}
        >
          Choose image
        </Button>
        {value && (
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ClearIcon />}
            onClick={() => onChange("")}
            sx={{ borderRadius: 2, minHeight: 44 }}
          >
            Clear
          </Button>
        )}
      </Stack>

      {previewUrl && (
        <Box
          component="img"
          src={previewUrl}
          alt="Playing field"
          sx={{
            width: "100%",
            maxWidth: 320,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
          }}
        />
      )}

      {!value && (
        <Typography variant="caption" color="text.secondary">
          No image set. Auto paths will be drawn on a plain background.
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}
