import { useState, useEffect, useCallback } from "react";
import { useQrSelection } from "./useQrSelection";
import { useQrSortFilter } from "./useQrSortFilter";
import StoreManager, { StoreKeys } from "../utils/StoreManager";

interface UseQrManagerParams {
  qrCodes: QrCode[];
}

/**
 * Combined hook that manages filtering, sorting, and selection for QR codes
 * Reusable across multiple pages (QR page, Archive page, etc.)
 */
export function useQrManager({ qrCodes }: UseQrManagerParams) {
  // Filter and sort state
  const [filters, setFilters] = useState<FilterOption[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("match number");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("ascending");
  const [matchNumberFilter, setMatchNumberFilter] = useState("");
  const [teamNumberFilter, setTeamNumberFilter] = useState("");
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null);

  // Load persisted sort preferences on mount
  useEffect(() => {
    async function loadSortPreferences() {
      const savedMode = await StoreManager.get(StoreKeys.preferences.SORT_MODE);
      const savedDirection = await StoreManager.get(StoreKeys.preferences.SORT_DIRECTION);
      if (savedMode === "match number" || savedMode === "recent" || savedMode === "none") {
        setSortMode(savedMode);
      }
      if (savedDirection === "ascending" || savedDirection === "descending") {
        setSortDirection(savedDirection);
      }
    }
    loadSortPreferences();
  }, []);

  const handleSetSortMode = useCallback((mode: SortMode) => {
    setSortMode(mode);
    StoreManager.set(StoreKeys.preferences.SORT_MODE, mode);
  }, []);

  const handleSetSortDirection = useCallback((direction: SortDirection) => {
    setSortDirection(direction);
    StoreManager.set(StoreKeys.preferences.SORT_DIRECTION, direction);
  }, []);

  // Apply filtering and sorting
  const filteredAndSortedQrCodes = useQrSortFilter({
    qrCodes,
    filters,
    sortMode,
    sortDirection,
    matchNumberFilter,
    teamNumberFilter,
    dateRangeStart,
    dateRangeEnd,
  });

  // Selection logic
  const selection = useQrSelection(filteredAndSortedQrCodes);

  // Filter management helpers
  const updateFilters = (filter: FilterOption) => {
    if (filters.includes(filter)) {
      setFilters(filters.filter((f) => f !== filter));
    } else {
      setFilters([...filters, filter]);
    }
  };

  const clearFilters = () => {
    setFilters([]);
    setMatchNumberFilter("");
    setTeamNumberFilter("");
  };

  const toggleSelectionMode = () => {
    if (selection.selecting) {
      selection.resetSelection();
    }
    selection.toggleSelecting();
  };

  return {
    // Filtered and sorted data
    filteredQrCodes: filteredAndSortedQrCodes,

    // Selection state and methods
    ...selection,
    toggleSelectionMode,

    // Filter state
    filters,
    matchNumberFilter,
    teamNumberFilter,
    dateRangeStart,
    dateRangeEnd,
    setDateRangeStart,
    setDateRangeEnd,

    // Filter methods
    updateFilters,
    clearFilters,
    setMatchNumberFilter,
    setTeamNumberFilter,

    // Sort state
    sortMode,
    sortDirection,

    // Sort methods
    setSortMode: handleSetSortMode,
    setSortDirection: handleSetSortDirection,
  };
}
