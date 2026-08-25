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
  DEFAULT_FIELD_IMAGE_URL,
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
  const [previewUrl, setPreviewUrl] = useState(DEFAULT_FIELD_IMAGE_URL);
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
    // No selection means auto paths fall back to the bundled field, so preview that
    // rather than nothing — what is shown here is what the scout will draw on.
    if (!value) {
      setPreviewUrl(DEFAULT_FIELD_IMAGE_URL);
      return;
    }
    setError(null);
    fieldImageUrl(value)
      .then((url) => !cancelled && setPreviewUrl(url ?? DEFAULT_FIELD_IMAGE_URL))
      .catch(() => !cancelled && setPreviewUrl(DEFAULT_FIELD_IMAGE_URL));
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

      <Box
        component="img"
        src={previewUrl}
        alt="Playing field"
        // This is the screen where a broken image is discoverable, so it is the screen
        // that has to say so. A silent broken thumbnail reads as "the upload failed".
        onError={() =>
          previewUrl !== DEFAULT_FIELD_IMAGE_URL &&
          setError(
            "This image is stored on the device but the app could not display it. Auto paths will use the built-in field."
          )
        }
        sx={{
          width: "100%",
          maxWidth: 320,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
        }}
      />

      {!value && (
        <Typography variant="caption" color="text.secondary">
          No image chosen. Auto paths use the field built into the app.
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
