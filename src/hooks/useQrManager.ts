import { useState } from "react";
import { useQrSelection } from "./useQrSelection";
import { useQrSortFilter } from "./useQrSortFilter";

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
  const [sortMode, setSortMode] = useState<SortMode>("none");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("ascending");
  const [matchNumberFilter, setMatchNumberFilter] = useState("");
  const [teamNumberFilter, setTeamNumberFilter] = useState("");

  // Apply filtering and sorting
  const filteredAndSortedQrCodes = useQrSortFilter({
    qrCodes,
    filters,
    sortMode,
    sortDirection,
    matchNumberFilter,
    teamNumberFilter,
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

    // Filter methods
    updateFilters,
    clearFilters,
    setMatchNumberFilter,
    setTeamNumberFilter,

    // Sort state
    sortMode,
    sortDirection,

    // Sort methods
    setSortMode,
    setSortDirection,
  };
}
