import { useMemo } from "react";
import { getDataFromQrName } from "../utils/QrUtils";

interface UseQrSortFilterParams {
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
 * Reusable hook for filtering and sorting QR codes
 * Can be used across multiple pages with similar functionality
 */
export function useQrSortFilter({
  qrCodes,
  filters,
  sortMode,
  sortDirection,
  matchNumberFilter = "",
  teamNumberFilter = "",
  dateRangeStart = null,
  dateRangeEnd = null,
}: UseQrSortFilterParams) {
  const processedQrCodes = useMemo(() => {
    let filtered = qrCodes.filter((code) => {
      const data = getDataFromQrName(code.name);

      if (filters.includes("match number") && matchNumberFilter) {
        if (!data.MatchNumber.includes(matchNumberFilter)) {
          return false;
        }
      }

      if (filters.includes("team number") && teamNumberFilter) {
        if (!data.TeamNumber.includes(teamNumberFilter)) {
          return false;
        }
      }

      if (filters.includes("unscanned")) {
        if (code.scanned) {
          return false;
        }
      }

      if (filters.includes("date range") && dateRangeStart && dateRangeEnd) {
        const codeDate = new Date(parseInt(data.Timestamp) * 1000);
        // Set hours to 0 for date-only comparison
        const startDate = new Date(dateRangeStart);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRangeEnd);
        endDate.setHours(23, 59, 59, 999);

        if (codeDate < startDate || codeDate > endDate) {
          return false;
        }
      }
      const hasDateFilter =
        filters.includes("day") ||
        filters.includes("week") ||
        filters.includes("month");

      if (hasDateFilter) {
        const codeDate = new Date(parseInt(data.Timestamp) * 1000);
        const now = new Date();

        if (filters.includes("day")) {
          const isToday =
            codeDate.getDate() === now.getDate() &&
            codeDate.getMonth() === now.getMonth() &&
            codeDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        }

        if (filters.includes("week")) {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (codeDate < weekAgo) return false;
        }

        if (filters.includes("month")) {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (codeDate < monthAgo) return false;
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
          comparison =
            parseInt(aData.MatchNumber) - parseInt(bData.MatchNumber);
        } else if (sortMode === "recent") {
          comparison = parseInt(aData.Timestamp) - parseInt(bData.Timestamp);
        }

        return sortDirection === "ascending" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [
    qrCodes,
    filters,
    sortMode,
    sortDirection,
    matchNumberFilter,
    teamNumberFilter,
    dateRangeStart,
    dateRangeEnd,
  ]);

  return processedQrCodes;
}
