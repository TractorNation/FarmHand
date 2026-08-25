import { getDataFromQrName } from "./QrUtils";
import { getMatchSortKey } from "./valueFormat";

/**
 * Filtering and sorting for the QR and Archive lists.
 *
 * Pure and separate from `useQrSortFilter` so the date arithmetic is testable without
 * a renderer.
 */

export interface QrSortFilterParams {
  qrCodes: QrCode[];
  filters: FilterOption[];
  sortMode: SortMode;
  sortDirection: SortDirection;
  matchNumberFilter?: string;
  teamNumberFilter?: string;
  dateRangeStart?: Date | null;
  dateRangeEnd?: Date | null;
}

/**
 * Reads the save time out of a code's filename.
 *
 * `generateQrFileName` writes `Date.now()` — **milliseconds**. Do not multiply by
 * 1000 again: that puts every code around the year 58500 and breaks all four date
 * filters in two different directions — `day` and `date range` match nothing at all,
 * while `week` and `month` match everything.
 *
 * Returns null when the name carries no parseable timestamp, so callers can decide
 * rather than comparing against an Invalid Date (every such comparison is false, which
 * silently made the filters disagree with each other).
 */
function parseCodeDate(timestamp: string): Date | null {
  const ms = parseInt(timestamp, 10);
  if (isNaN(ms)) return null;
  return new Date(ms);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

export function filterAndSortQrCodes({
  qrCodes,
  filters,
  sortMode,
  sortDirection,
  matchNumberFilter = "",
  teamNumberFilter = "",
  dateRangeStart = null,
  dateRangeEnd = null,
}: QrSortFilterParams): QrCode[] {
  const hasWindowFilter =
    filters.includes("day") ||
    filters.includes("week") ||
    filters.includes("month");
  const hasRangeFilter =
    filters.includes("date range") && !!dateRangeStart && !!dateRangeEnd;

  let filtered = qrCodes.filter((code) => {
    const data = getDataFromQrName(code.name);

    if (filters.includes("match number") && matchNumberFilter) {
      if (!data.MatchNumber.includes(matchNumberFilter)) return false;
    }

    if (filters.includes("team number") && teamNumberFilter) {
      if (!data.TeamNumber.includes(teamNumberFilter)) return false;
    }

    if (filters.includes("unscanned") && code.scanned) return false;

    if (hasRangeFilter || hasWindowFilter) {
      const codeDate = parseCodeDate(data.Timestamp);
      // A code whose name carries no date cannot be shown to fall inside the
      // requested window, so it is excluded rather than leaking through.
      if (!codeDate) return false;

      if (hasRangeFilter) {
        const startDate = new Date(dateRangeStart!);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRangeEnd!);
        endDate.setHours(23, 59, 59, 999);

        if (codeDate < startDate || codeDate > endDate) return false;
      }

      if (hasWindowFilter) {
        const now = new Date();

        if (filters.includes("day") && !isSameDay(codeDate, now)) return false;

        if (filters.includes("week")) {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (codeDate < weekAgo) return false;
        }

        if (filters.includes("month")) {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (codeDate < monthAgo) return false;
        }
      }
    }

    return true;
  });

  if (sortMode !== "none") {
    filtered = [...filtered].sort((a, b) => {
      const aData = getDataFromQrName(a.name);
      const bData = getDataFromQrName(b.name);

      let comparison = 0;

      if (sortMode === "match number") {
        const [aLevel, aNum] = getMatchSortKey(aData.MatchNumber);
        const [bLevel, bNum] = getMatchSortKey(bData.MatchNumber);
        comparison = aLevel !== bLevel ? aLevel - bLevel : aNum - bNum;
      } else if (sortMode === "recent") {
        comparison = parseInt(aData.Timestamp) - parseInt(bData.Timestamp);
      }

      return sortDirection === "ascending" ? comparison : -comparison;
    });
  }

  return filtered;
}
