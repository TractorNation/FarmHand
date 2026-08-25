import {
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import EditIcon from "@mui/icons-material/EditRounded";
import { parseGridData } from "../../utils/grid";
import { asAutoPathValue, pathStatus } from "../../utils/PathCodec";
import PathPreview from "./PathPreview";

/**
 * Humanizes a stored field value for display.
 *
 * Exported because the QR preview and the CSV/JSON exporters want the same
 * wording for the same value.
 */
export function formatValue(value: any, fieldType: string): string {
  // autopath is checked before the empty guard: "not recorded" is itself a
  // meaningful answer that must not render as a bare dash.
  if (fieldType === "autopath") {
    const path = asAutoPathValue(value);
    switch (pathStatus(path)) {
      case "NO_AUTO":
        return "No autonomous";
      case "NOT_RECORDED":
        return "Not recorded";
      default:
        return `${path.points.length} points, ${path.events.length} actions`;
    }
  }

  // Decoded records preserve "never touched" as null rather than substituting a
  // default, so this is a real answer worth naming — same wording as autopath's
  // NOT_RECORDED above, instead of a dash that reads as missing UI.
  if (value === undefined || value === null || value === "") {
    return "Not recorded";
  }

  switch (fieldType) {
    case "checkbox":
      return value ? "Yes" : "No";

    case "grid": {
      const parsed = parseGridData(String(value));
      if (!parsed) return String(value);
      const count = parsed.checkedIndices.length;
      if (count === 0) return "None selected";
      return `${count} cell${count !== 1 ? "s" : ""} selected`;
    }

    default:
      return String(value);
  }
}

interface MatchDataReviewProps {
  schema: Schema;
  /** Field id → value. Use matchDataJsonToMap() to adapt a decoded QR record. */
  values: Map<number, any>;
  /**
   * When provided, each section header gets an Edit button carrying its index.
   * Used by the Scout review step to jump back to a section.
   */
  onEditSection?: (sectionIndex: number) => void;
}

/**
 * Read-only section-by-section listing of a match's values.
 *
 * Shared by the Scout wizard's review step, CompleteScoutDialog, and the saved-QR
 * preview so all three describe a match identically.
 */
export default function MatchDataReview({
  schema,
  values,
  onEditSection,
}: MatchDataReviewProps) {
  const theme = useTheme();

  return (
    <Stack spacing={2}>
      {schema.sections.map((section, sectionIndex) => {
        // Filler fields are layout spacers with no value worth reviewing.
        const fields = section.fields.filter((f) => f.type !== "filler");
        if (fields.length === 0) return null;

        return (
          <Paper
            key={section.title}
            elevation={0}
            sx={{
              p: 2,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              backgroundColor: theme.palette.background.default,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
                color="primary"
              >
                {section.title}
              </Typography>
              {onEditSection && (
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => onEditSection(sectionIndex)}
                  sx={{ borderRadius: 2, minHeight: 40 }}
                >
                  Edit
                </Button>
              )}
            </Stack>

            <Stack spacing={1.5}>
              {fields.map((field, fieldIndex) => (
                <Box key={field.id}>
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{ alignItems: "flex-start" }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        minWidth: "140px",
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {field.name}:
                    </Typography>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {field.type === "autopath" ? (
                        <PathPreview
                          value={values.get(field.id)}
                          props={field.props}
                        />
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{ wordBreak: "break-word" }}
                        >
                          {formatValue(values.get(field.id), field.type)}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                  {fieldIndex < fields.length - 1 && (
                    <Divider sx={{ mt: 1.5 }} />
                  )}
                </Box>
              ))}
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
