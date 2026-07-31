import { Chip, Tooltip } from "@mui/material";

interface SchemaHashChipProps {
  /** 8-char schema hash, or null when the code could not be parsed. */
  hash: string | null;
  /** Resolved schema name, when this device has the schema. */
  name?: string | null;
  size?: "small" | "medium";
}

/**
 * Shows which schema a match or record belongs to.
 *
 * The hash is the real identity — it changes with any edit to the schema, and it is
 * what decoding a code depends on — so it is always shown, with the friendly name
 * added when the schema is present on this device. A code from an unknown schema
 * still renders its hash rather than nothing, since that hash is what the user needs
 * in order to find and import the right schema.
 */
export default function SchemaHashChip({
  hash,
  name,
  size = "small",
}: SchemaHashChipProps) {
  if (!hash) return null;

  const known = Boolean(name);
  const label = known ? `${name} · ${hash}` : hash;

  return (
    <Tooltip
      title={
        known
          ? `Schema "${name}" (${hash})`
          : `Schema ${hash} is not on this device`
      }
    >
      <Chip
        label={label}
        size={size}
        variant="outlined"
        color={known ? "default" : "warning"}
        sx={{
          maxWidth: "100%",
          borderRadius: 1,
          fontFamily: "monospace",
          fontSize: 11,
          height: 22,
          "& .MuiChip-label": {
            px: 0.75,
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
        }}
      />
    </Tooltip>
  );
}
