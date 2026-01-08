import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Radio,
  Checkbox,
  Box,
  Typography,
  Chip,
  Stack,
  TextField,
  InputAdornment,
} from "@mui/material";
import FilterIcon from "@mui/icons-material/FilterListRounded";
import SortIcon from "@mui/icons-material/SortRounded";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownwardRounded";
import CheckIcon from "@mui/icons-material/CheckRounded";
import SearchIcon from "@mui/icons-material/SearchRounded";
import ClearIcon from "@mui/icons-material/ClearRounded";
import { useState, MouseEvent } from "react";

interface SortFilterButtonsProps {
  sortMode: SortMode;
  sortDirection: SortDirection;
  onSortModeChange: (mode: SortMode) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
  activeFilters: FilterOption[];
  onFilterToggle: (filter: FilterOption) => void;
  onClearFilters: () => void;
  matchNumberFilter: string;
  teamNumberFilter: string;
  onMatchNumberFilterChange: (value: string) => void;
  onTeamNumberFilterChange: (value: string) => void;
  dateRangeStart: Date | null;
  dateRangeEnd: Date | null;
  onDateRangeStartChange: (date: Date | null) => void;
  onDateRangeEndChange: (date: Date | null) => void;
}

export default function SortFilterButtons({
  sortMode,
  sortDirection,
  onSortModeChange,
  onSortDirectionChange,
  activeFilters,
  onFilterToggle,
  onClearFilters,
  matchNumberFilter,
  teamNumberFilter,
  onMatchNumberFilterChange,
  onTeamNumberFilterChange,
  dateRangeStart,
  dateRangeEnd,
  onDateRangeStartChange,
  onDateRangeEndChange,
}: SortFilterButtonsProps) {
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);

  const handleSortClick = (event: MouseEvent<HTMLButtonElement>) => {
    setSortAnchor(event.currentTarget);
  };

  const handleFilterClick = (event: MouseEvent<HTMLButtonElement>) => {
    setFilterAnchor(event.currentTarget);
  };

  const handleSortClose = () => {
    setSortAnchor(null);
  };

  const handleFilterClose = () => {
    setFilterAnchor(null);
  };

  const sortModes: { value: SortMode; label: string }[] = [
    { value: "match number", label: "Match Number" },
    { value: "recent", label: "Recent" },
    { value: "none", label: "None" },
  ];

  const filterOptions: { value: FilterOption; label: string }[] = [
    { value: "match number", label: "Match Number" },
    { value: "team number", label: "Team Number" },
    { value: "unscanned", label: "Unscanned" },
    { value: "day", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "date range", label: "Date Range" },
  ];

  return (
    <>
      <Stack direction="row" spacing={2}>
        {/* Filter Button */}
        <Button
          variant="outlined"
          color="info"
          startIcon={<FilterIcon />}
          onClick={handleFilterClick}
          sx={{
            borderRadius: 2,
            borderWidth: 2,
            "&:hover": {
              borderWidth: 2,
            },
            position: "relative",
          }}
        >
          Filter
          {activeFilters.length > 0 && (
            <Chip
              label={activeFilters.length}
              size="small"
              color="primary"
              sx={{
                height: 20,
                minWidth: 20,
                ml: 1,
                "& .MuiChip-label": {
                  px: 0.75,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                },
              }}
            />
          )}
        </Button>

        {/* Sort Button */}
        <Button
          variant="outlined"
          color="info"
          startIcon={<SortIcon />}
          onClick={handleSortClick}
          sx={{
            borderRadius: 2,
            borderWidth: 2,
            "&:hover": {
              borderWidth: 2,
            },
          }}
        >
          Sort
        </Button>
      </Stack>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchor}
        open={Boolean(filterAnchor)}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              mt: 1,
              minWidth: 280,
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ fontWeight: 600 }}
          >
            Filter By
          </Typography>
        </Box>
        <Divider />

        {/* Match Number Filter with Input */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <MenuItem
            onClick={() => onFilterToggle("match number")}
            sx={{ py: 1, px: 0, mb: 1 }}
          >
            <Checkbox
              checked={activeFilters.includes("match number")}
              sx={{ mr: 1, p: 0 }}
            />
            <ListItemText primary="Match Number" />
          </MenuItem>
          {activeFilters.includes("match number") && (
            <TextField
              size="small"
              placeholder="Enter match number"
              value={matchNumberFilter}
              onChange={(e) => onMatchNumberFilterChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              fullWidth
              type="number"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: matchNumberFilter && (
                    <InputAdornment position="end">
                      <Box
                        component="span"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMatchNumberFilterChange("");
                        }}
                        sx={{
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          "&:hover": { opacity: 0.7 },
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </Box>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                },
              }}
            />
          )}
        </Box>

        {/* Team Number Filter with Input */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <MenuItem
            onClick={() => onFilterToggle("team number")}
            sx={{ py: 1, px: 0, mb: 1 }}
          >
            <Checkbox
              checked={activeFilters.includes("team number")}
              sx={{ mr: 1, p: 0 }}
            />
            <ListItemText primary="Team Number" />
          </MenuItem>
          {activeFilters.includes("team number") && (
            <TextField
              size="small"
              placeholder="Enter team number"
              value={teamNumberFilter}
              onChange={(e) => onTeamNumberFilterChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              fullWidth
              type="number"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: teamNumberFilter && (
                    <InputAdornment position="end">
                      <Box
                        component="span"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTeamNumberFilterChange("");
                        }}
                        sx={{
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          "&:hover": { opacity: 0.7 },
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </Box>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                },
              }}
            />
          )}
        </Box>

        <Divider />

        {filterOptions.slice(3, 6).map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => onFilterToggle(option.value)}
            sx={{ py: 1.5 }}
          >
            <Checkbox
              checked={activeFilters.includes(option.value)}
              sx={{ mr: 1, p: 0 }}
            />
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
        {/* Date Range Filter */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <MenuItem
            onClick={() => onFilterToggle("date range")}
            sx={{ py: 1, px: 0, mb: 1 }}
          >
            <Checkbox
              checked={activeFilters.includes("date range")}
              sx={{ mr: 1, p: 0 }}
            />
            <ListItemText primary="Date Range" />
          </MenuItem>
          {activeFilters.includes("date range") && (
            <Stack spacing={1.5}>
              <TextField
                size="small"
                label="Start Date"
                type="date"
                value={
                  dateRangeStart
                    ? dateRangeStart.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  onDateRangeStartChange(
                    e.target.value ? new Date(e.target.value) : null
                  )
                }
                onClick={(e) => e.stopPropagation()}
                fullWidth
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                  },
                }}
              />
              <TextField
                size="small"
                label="End Date"
                type="date"
                value={
                  dateRangeEnd ? dateRangeEnd.toISOString().split("T")[0] : ""
                }
                onChange={(e) =>
                  onDateRangeEndChange(
                    e.target.value ? new Date(e.target.value) : null
                  )
                }
                onClick={(e) => e.stopPropagation()}
                fullWidth
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                  },
                }}
              />
            </Stack>
          )}
        </Box>

        {activeFilters.length > 0 && [
          <Divider sx={{ my: 1 }} />,
          <MenuItem
            onClick={() => {
              onClearFilters();
              handleFilterClose();
            }}
            sx={{ py: 1.5, color: "error.main" }}
          >
            <ListItemText primary="Clear All Filters" />
          </MenuItem>,
        ]}
      </Menu>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortAnchor}
        open={Boolean(sortAnchor)}
        onClose={handleSortClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              mt: 1,
              minWidth: 220,
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ fontWeight: 600 }}
          >
            Sort By
          </Typography>
        </Box>
        <Divider />
        {sortModes.map((mode) => (
          <MenuItem
            key={mode.value}
            onClick={() => onSortModeChange(mode.value)}
            sx={{ py: 1.5 }}
          >
            <Radio checked={sortMode === mode.value} sx={{ mr: 1, p: 0 }} />
            <ListItemText primary={mode.label} />
            {sortMode === mode.value && (
              <ListItemIcon sx={{ minWidth: "auto", ml: 1 }}>
                <CheckIcon fontSize="small" color="primary" />
              </ListItemIcon>
            )}
          </MenuItem>
        ))}
        <Divider sx={{ my: 1 }} />
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ fontWeight: 600 }}
          >
            Direction
          </Typography>
        </Box>
        <MenuItem
          onClick={() => onSortDirectionChange("descending")}
          sx={{ py: 1.5 }}
        >
          <Radio
            checked={sortDirection === "descending"}
            sx={{ mr: 1, p: 0 }}
          />
          <ListItemIcon sx={{ minWidth: "auto", mr: 1.5 }}>
            <ArrowDownwardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Descending" />
        </MenuItem>
        <MenuItem
          onClick={() => onSortDirectionChange("ascending")}
          sx={{ py: 1.5 }}
        >
          <Radio checked={sortDirection === "ascending"} sx={{ mr: 1, p: 0 }} />
          <ListItemIcon sx={{ minWidth: "auto", mr: 1.5 }}>
            <ArrowUpwardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Ascending" />
        </MenuItem>
      </Menu>
    </>
  );
}
