/**
 * Parsing and formatting for stored field values that have a text representation.
 *
 * `parseTime`/`formatTime` are exact inverses and are shared by `TimerInput` and the
 * match codec, so a decoded timer renders byte-identically to what the scout saw.
 */

/**
 * Parse a timer string to deciseconds — the timer's real resolution.
 * Accepts "5.0" (5 seconds) and "2:30.0" (2 minutes 30 seconds).
 */
export function parseTime(timeString: string | undefined): number {
  if (!timeString || typeof timeString !== "string") {
    return 0;
  }
  if (timeString.includes(":")) {
    const parts = timeString.split(":");
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return Math.round((minutes * 60 + seconds) * 10);
  }
  const seconds = parseFloat(timeString) || 0;
  return Math.round(seconds * 10);
}

/**
 * Renders deciseconds back to a timer string — the inverse of {@link parseTime}.
 * Produces "12.3" under a minute and "2:30.0" at or above one.
 */
export function formatTime(timeInTenths: number): string {
  const totalSeconds = (timeInTenths || 0) / 10;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
  }
  return totalSeconds.toFixed(1);
}

/** Canonical match-label prefixes keyed by TBA comp_level. */
export const MATCH_PREFIX: Record<string, string> = {
  qm: "Qual",
  sf: "Semis",
  f: "Final",
} as const;

const PREFIX_ORDER: Record<string, number> = { Qual: 0, Semis: 1, Final: 2 };

/**
 * Returns a [compLevelOrder, matchNumber] sort key for a match label.
 * Qual < Semis < Final. Plain integers are treated as Qual-level.
 */
export function getMatchSortKey(matchLabel: string): [number, number] {
  const dashIdx = matchLabel.indexOf("-");
  if (dashIdx !== -1) {
    const prefix = matchLabel.substring(0, dashIdx);
    const num = parseInt(matchLabel.substring(dashIdx + 1), 10) || 0;
    return [PREFIX_ORDER[prefix] ?? 0, num];
  }
  const n = parseInt(matchLabel, 10);
  return [0, isNaN(n) ? 0 : n];
}
