import { Chip, Paper, Stack, Typography, useTheme } from "@mui/material";
import { useScoutData } from "../../context/ScoutDataContext";

/** Slot fields worth keeping on screen for the whole form, in display order. */
const CONTEXT_FIELDS = [
  "Match Number",
  "Alliance",
  "Position",
  "Team Number",
] as const;

interface ScoutContextBarProps {
  schema: Schema;
}

/**
 * Persistent "who am I scouting" strip.
 *
 * Lives at the page level rather than inside a section, so the match/team stays
 * visible on every step — a scout on the Teleop screen still needs to know which
 * robot they are watching.
 */
export default function ScoutContextBar({ schema }: ScoutContextBarProps) {
  const theme = useTheme();
  const {
    getMatchDataMap,
    watchedMatchNumber,
    watchedAlliance,
    watchedPosition,
    getTeamForCurrentSlot,
  } = useScoutData();

  const matchDataMap = getMatchDataMap();

  // Prefer the reactive watched values so this updates as the scout types. Team
  // Number has no watched mirror, so fall back to the derived slot lookup and then
  // to the stored value (correct by the time a step change re-renders).
  const reactive: Record<string, string | null> = {
    "Match Number": watchedMatchNumber,
    Alliance: watchedAlliance,
    Position: watchedPosition,
    "Team Number": getTeamForCurrentSlot(),
  };

  const items = CONTEXT_FIELDS.flatMap((name) => {
    const field = schema.sections
      .flatMap((s) => s.fields)
      .find((f) => f.name === name);
    if (!field) return [];

    const value = reactive[name] ?? matchDataMap.get(field.id);
    if (value == null || value === "") return [];
    return [{ label: name, value: String(value) }];
  });

  if (items.length === 0) return null;

  const alliance = reactive.Alliance?.toLowerCase();
  const accent =
    alliance === "red"
      ? theme.palette.error.main
      : alliance === "blue"
        ? theme.palette.info.main
        : theme.palette.divider;

  return (
    <Paper
      elevation={0}
      sx={{
        px: 2,
        py: 1.25,
        mb: 2,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderLeft: `6px solid ${accent}`,
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ flexWrap: "wrap", alignItems: "center" }}
      >
        {items.map((item) => (
          <Chip
            key={item.label}
            size="small"
            variant="outlined"
            label={
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                >
                  {item.label}:{" "}
                </Typography>
                {item.value}
              </Typography>
            }
            sx={{ borderRadius: 1.5 }}
          />
        ))}
      </Stack>
    </Paper>
  );
}
