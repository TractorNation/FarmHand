import { useMemo } from "react";
import {
  filterAndSortQrCodes,
  type QrSortFilterParams,
} from "../utils/qrSortFilter";

/**
 * Memoised wrapper over `filterAndSortQrCodes`, shared by the QR and Archive pages.
 * The filtering itself is pure and lives in `utils/qrSortFilter.ts` so it can be
 * tested without a renderer.
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
}: QrSortFilterParams) {
  return useMemo(
    () =>
      filterAndSortQrCodes({
        qrCodes,
        filters,
        sortMode,
        sortDirection,
        matchNumberFilter,
        teamNumberFilter,
        dateRangeStart,
        dateRangeEnd,
      }),
    [
      qrCodes,
      filters,
      sortMode,
      sortDirection,
      matchNumberFilter,
      teamNumberFilter,
      dateRangeStart,
      dateRangeEnd,
    ]
  );
}
