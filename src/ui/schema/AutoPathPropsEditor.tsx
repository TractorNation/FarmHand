import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useEffect, useState } from "react";
import {
  MAX_PATH_ACTIONS,
  MAX_PATH_PIECES,
  MAX_PATH_RESULTS,
} from "../../utils/PathCodec";
import {
  DEFAULT_PATH_ICON,
  PATH_ICON_KEYS,
  PATH_ICON_REGISTRY,
  resolvePathIcon,
} from "../../config/pathIcons";
import { fieldImageUrl, listFieldImages, pickFieldImage } from "../../utils/FieldImage";

interface AutoPathPropsEditorProps {
  props?: ComponentProps;
  onChange: (key: keyof ComponentProps, value: any) => void;
}

/** Icon picker rendered as a compact select showing the glyph itself. */
function IconSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <Select
      size="small"
      value={PATH_ICON_KEYS.includes(value) ? value : DEFAULT_PATH_ICON}
      onChange={(e) => onChange(e.target.value)}
      sx={{ borderRadius: 2, minWidth: 88 }}
      renderValue={(key) => {
        const Icon = resolvePathIcon(key);
        return <Icon fontSize="small" />;
      }}
    >
      {PATH_ICON_KEYS.map((key) => {
        const Icon = PATH_ICON_REGISTRY[key].Icon;
        return (
          <MenuItem key={key} value={key}>
            <Icon fontSize="small" sx={{ mr: 1 }} />
            {PATH_ICON_REGISTRY[key].label}
          </MenuItem>
        );
      })}
    </Select>
  );
}

/**
 * Schema-editor controls for an autopath field: the field image override, the game
 * pieces a scout can arm, and the actions they can log.
 *
 * The caps are enforced here by disabling Add rather than by validating on save, so
 * the limit is visible before it is hit.
 */
export default function AutoPathPropsEditor({
  props,
  onChange,
}: AutoPathPropsEditorProps) {
  const theme = useTheme();
  const pieces = props?.gamePieces ?? [];
  const actions = props?.pathActions ?? [];

  const [images, setImages] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Raw text of the "Results" field per action index, kept separate from the parsed
  // `results` array so typing ", " isn't immediately collapsed by the split/trim/filter
  // that derives the array — that re-derivation on every keystroke ate commas and
  // trailing spaces before the user could finish typing the next result.
  const [resultsDrafts, setResultsDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    listFieldImages()
      .then(setImages)
      .catch(() => setImages([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const key = props?.fieldImageKey;
    if (!key) {
      setPreviewUrl(null);
      return;
    }
    fieldImageUrl(key)
      .then((url) => !cancelled && setPreviewUrl(url))
      .catch(() => !cancelled && setPreviewUrl(null));
    return () => {
      cancelled = true;
    };
  }, [props?.fieldImageKey]);

  const updatePieces = (next: PathOption[]) =>
    onChange("gamePieces", next.length > 0 ? next : undefined);

  const updateActions = (next: PathAction[]) =>
    onChange("pathActions", next.length > 0 ? next : undefined);

  const removeAction = (index: number) => {
    updateActions(actions.filter((_, i) => i !== index));
    setResultsDrafts((prev) => {
      const next: Record<number, string> = {};
      for (const [key, value] of Object.entries(prev)) {
        const i = Number(key);
        if (i < index) next[i] = value;
        else if (i > index) next[i - 1] = value;
      }
      return next;
    });
  };

  const commitResultsDraft = (index: number, raw: string) => {
    const results = raw
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean)
      .slice(0, MAX_PATH_RESULTS);
    updateActions(
      actions.map((a, i) =>
        i === index
          ? { ...a, results: results.length > 0 ? results : undefined }
          : a
      )
    );
    setResultsDrafts((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handlePickImage = async () => {
    const key = await pickFieldImage();
    if (!key) return;
    setImages(await listFieldImages());
    onChange("fieldImageKey", key);
  };

  return (
    <Stack spacing={2}>
      {actions.length === 0 && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Add at least one action — a path with no actions can't record what the
          robot did.
        </Alert>
      )}

      {/* Field image override ------------------------------------------- */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Playing field image
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Leave unset to use the default from Settings. If this schema is shared with
          a device that doesn't have the image, that device falls back to its own
          default.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }} useFlexGap>
          <Select
            size="small"
            displayEmpty
            value={
              props?.fieldImageKey && images.includes(props.fieldImageKey)
                ? props.fieldImageKey
                : ""
            }
            onChange={(e) =>
              onChange("fieldImageKey", e.target.value || undefined)
            }
            sx={{ borderRadius: 2, minWidth: 200 }}
          >
            <MenuItem value="">
              <em>Use global default</em>
            </MenuItem>
            {images.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </Select>
          <Button
            variant="outlined"
            onClick={handlePickImage}
            sx={{ borderRadius: 2, minHeight: 40 }}
          >
            Import image
          </Button>
        </Stack>
        {props?.fieldImageKey && !images.includes(props.fieldImageKey) && (
          <Alert severity="info" sx={{ mt: 1, borderRadius: 2 }}>
            This schema references "{props.fieldImageKey}", which isn't on this
            device. Scouting will use the Settings default.
          </Alert>
        )}
        {previewUrl && (
          <Box
            component="img"
            src={previewUrl}
            alt="Playing field"
            sx={{
              mt: 1,
              width: "100%",
              maxWidth: 280,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
            }}
          />
        )}
      </Box>

      <Divider />

      {/* Game pieces ---------------------------------------------------- */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Game pieces ({pieces.length}/{MAX_PATH_PIECES})
          </Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            disabled={pieces.length >= MAX_PATH_PIECES}
            onClick={() =>
              updatePieces([
                ...pieces,
                { label: `Piece ${pieces.length + 1}`, icon: DEFAULT_PATH_ICON },
              ])
            }
            sx={{ borderRadius: 2, minHeight: 40 }}
          >
            Add
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Optional. Limited to {MAX_PATH_PIECES} so the chip row stays usable
          one-handed on a phone.
        </Typography>

        <Stack spacing={1} sx={{ mt: 1 }}>
          {pieces.map((piece, index) => (
            <Paper
              key={index}
              elevation={0}
              sx={{
                p: 1,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <IconSelect
                  value={piece.icon}
                  onChange={(icon) =>
                    updatePieces(
                      pieces.map((p, i) => (i === index ? { ...p, icon } : p))
                    )
                  }
                />
                <TextField
                  size="small"
                  label="Label"
                  value={piece.label}
                  onChange={(e) =>
                    updatePieces(
                      pieces.map((p, i) =>
                        i === index ? { ...p, label: e.target.value } : p
                      )
                    )
                  }
                  fullWidth
                />
                <IconButton
                  onClick={() => updatePieces(pieces.filter((_, i) => i !== index))}
                  aria-label={`Remove ${piece.label}`}
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Box>

      <Divider />

      {/* Actions -------------------------------------------------------- */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Actions ({actions.length}/{MAX_PATH_ACTIONS})
          </Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            disabled={actions.length >= MAX_PATH_ACTIONS}
            onClick={() =>
              updateActions([
                ...actions,
                { label: `Action ${actions.length + 1}`, icon: DEFAULT_PATH_ICON },
              ])
            }
            sx={{ borderRadius: 2, minHeight: 40 }}
          >
            Add
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Results are optional outcomes for an action, e.g. "Made, Missed". Up to{" "}
          {MAX_PATH_RESULTS} each.
        </Typography>

        <Stack spacing={1} sx={{ mt: 1 }}>
          {actions.map((action, index) => (
            <Paper
              key={index}
              elevation={0}
              sx={{
                p: 1,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconSelect
                    value={action.icon}
                    onChange={(icon) =>
                      updateActions(
                        actions.map((a, i) => (i === index ? { ...a, icon } : a))
                      )
                    }
                  />
                  <TextField
                    size="small"
                    label="Label"
                    value={action.label}
                    onChange={(e) =>
                      updateActions(
                        actions.map((a, i) =>
                          i === index ? { ...a, label: e.target.value } : a
                        )
                      )
                    }
                    fullWidth
                  />
                  <IconButton
                    onClick={() => removeAction(index)}
                    aria-label={`Remove ${action.label}`}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
                <TextField
                  size="small"
                  label="Results (comma-separated, optional)"
                  value={resultsDrafts[index] ?? (action.results ?? []).join(", ")}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setResultsDrafts((prev) => ({ ...prev, [index]: raw }));
                  }}
                  onBlur={(e) => commitResultsDraft(index, e.target.value)}
                  helperText={
                    (
                      resultsDrafts[index] ?? (action.results ?? []).join(", ")
                    )
                      .split(",")
                      .map((r) => r.trim())
                      .filter(Boolean).length >= MAX_PATH_RESULTS
                      ? `Maximum ${MAX_PATH_RESULTS} results`
                      : undefined
                  }
                  fullWidth
                />
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
