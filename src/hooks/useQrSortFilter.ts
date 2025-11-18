import { useMemo } from "react";
import { getDataFromQrName } from "../utils/QrUtils";

interface UseQrSortFilterParams {
  qrCodes: QrCode[];
  filters: FilterOption[];
  sortMode: SortMode;
  sortDirection: SortDirection;
  matchNumberFilter?: string;
  teamNumberFilter?: string;
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
}: UseQrSortFilterParams) {
  const processedQrCodes = useMemo(() => {
    let filtered = qrCodes.filter((code) => {
      const data = getDataFromQrName(code.name);
      if (filters.includes("match number") && matchNumberFilter) {
        return data.MatchNumber.includes(matchNumberFilter);
      }
      if (filters.includes("team number") && teamNumberFilter) {
        return data.TeamNumber.includes(teamNumberFilter);
      }

      if (
        filters.includes("day") ||
        filters.includes("week") ||
        filters.includes("month")
      ) {
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
  ]);

  return processedQrCodes;
}
