import {
  Box,
  Grid,
  Typography,
  Stack,
  Button,
  Paper,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useMemo, useState } from "react";
import ClearIcon from "@mui/icons-material/ClearRounded";
import ZoomInIcon from "@mui/icons-material/ZoomInRounded";
import ZoomOutIcon from "@mui/icons-material/ZoomOutRounded";

/**
 * Props for the Grid input component
 */
interface GridInputProps {
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
  cols?: number;
  cellLabel?: (row: number, col: number, index: number) => string;
  showCoordinates?: boolean;
}

/**
 * A configurable grid input where each cell can be toggled on/off
 * Stores an array of active cell indices
 *
 * @param props {@link GridInputProps}
 * @returns A grid of clickable cells that track their active state
 */
export default function GridInput(props: GridInputProps) {
  const {
    value: rawValue,
    onChange,
    rows = 3,
    cols = 3,
    cellLabel,
    showCoordinates = false,
  } = props;
  const theme = useTheme();

  const activeIndices = useMemo(() => {
    if (Array.isArray(rawValue)) {
      return rawValue;
    }
    if (typeof rawValue === "string") {
      const match = rawValue.match(/\[(.*)\]/);
      if (match && match[1]) {
        if (match[1].trim() === "") return [];
        return match[1]
          .split(",")
          .map((n) => parseInt(n.trim(), 10))
          .filter((n) => !isNaN(n));
      }
    }
    return [];
  }, [rawValue]);

  const totalCells = rows * cols;
  const [zoomLevel, setZoomLevel] = useState(1);

  // Calculate base cell size based on grid dimensions
  const baseCellSize = useMemo(() => {
    const maxCells = Math.max(rows, cols);

    if (maxCells <= 5) return 60;
    if (maxCells <= 10) return 48;
    if (maxCells <= 20) return 36;
    if (maxCells <= 30) return 28;
    return 24;
  }, [rows, cols]);

  // Apply zoom to cell size
  const cellSize = useMemo(() => {
    return Math.round(baseCellSize * zoomLevel);
  }, [baseCellSize, zoomLevel]);

  // Calculate container dimensions
  const containerWidth = useMemo(() => {
    return cols * cellSize + (cols - 1) * 4; 
  }, [cols, cellSize]);

  const containerHeight = useMemo(() => {
    return rows * cellSize + (rows - 1) * 4; 
  }, [rows, cellSize]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3)); 
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.25));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const formatGridValue = (indices: number[]): string => {
    return `${rows}x${cols}:[${indices.sort((a, b) => a - b).join(",")}]`;
  };

  const cells = useMemo(() => {
    return Array.from({ length: totalCells }, (_, i) => i);
  }, [totalCells]);

  const isCellActive = (index: number) => activeIndices.includes(index);

  const toggleCell = (index: number) => {
    if (!onChange) return;

    const newIndices = isCellActive(index)
      ? activeIndices.filter((i) => i !== index)
      : [...activeIndices, index];

    onChange(formatGridValue(newIndices));
  };

  const clearAll = () => {
    if (onChange) {
      onChange(formatGridValue([]));
    }
  };

  const getCellCoordinates = (index: number) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    return { row, col };
  };

  const getCellLabel = (index: number) => {
    const { row, col } = getCellCoordinates(index);
    if (cellLabel) {
      return cellLabel(row, col, index);
    }
    if (showCoordinates) {
      return `${row},${col}`;
    }
    return "";
  };

  return (
    <Stack spacing={2} sx={{ width: "100%", alignItems: "center" }}>
      {/* Info display */}
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {rows}x{cols} grid • {activeIndices.length} selected
        </Typography>
        {activeIndices.length > 0 && (
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            startIcon={<ClearIcon />}
            onClick={clearAll}
            sx={{
              borderRadius: 2,
            }}
          >
            Clear
          </Button>
        )}
      </Stack>

      {/* Scrollable grid container */}
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: "min(100%, 500px)",
          maxHeight: "400px",
          overflow: "auto",
          border: `2px solid ${theme.palette.divider}`,
          borderRadius: 2,
          p: 2,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          // Custom scrollbar styling
          "&::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
          },
          "&::-webkit-scrollbar-track": {
            background: theme.palette.background.default,
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: theme.palette.divider,
            borderRadius: "4px",
            "&:hover": {
              background: theme.palette.text.secondary,
            },
          },
        }}
      >
        <Box
          sx={{
            width: `${containerWidth}px`,
            height: `${containerHeight}px`,
            flexShrink: 0,
          }}
        >
          <Grid
            container
            spacing={0.5}
            sx={{
              width: "100%",
              height: "100%",
            }}
          >
            {cells.map((index) => {
              const isActive = isCellActive(index);
              const label = getCellLabel(index);

              return (
                <Grid
                  size={{ xs: 12 / cols }}
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "stretch",
                  }}
                >
                  <Box
                    onClick={() => toggleCell(index)}
                    sx={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      borderRadius: 1,
                      border: `2px solid ${
                        isActive
                          ? theme.palette.secondary.main
                          : theme.palette.divider
                      }`,
                      backgroundColor: isActive
                        ? theme.palette.secondary.main
                        : theme.palette.background.paper,
                      color: isActive
                        ? theme.palette.secondary.contrastText
                        : theme.palette.text.secondary,
                      transition: "all 0.15s ease",
                      flexShrink: 0,
                      "&:hover": {
                        borderColor: theme.palette.secondary.main,
                        backgroundColor: isActive
                          ? theme.palette.secondary.dark
                          : `${theme.palette.secondary.main}20`,
                        transform: "scale(1.1)",
                        zIndex: 1,
                      },
                      "&:active": {
                        transform: "scale(0.95)",
                      },
                    }}
                  >
                    {label && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: isActive ? 600 : 400,
                          fontSize: cellSize > 40 ? "0.7rem" : "0.6rem",
                          lineHeight: 1,
                        }}
                      >
                        {label}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Paper>

      {/* Zoom controls at bottom */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          backgroundColor: theme.palette.background.paper,
          border: `2px solid ${theme.palette.divider}`,
          borderRadius: 2,
          p: 1,
        }}
      >
        <IconButton
          size="small"
          onClick={handleZoomOut}
          disabled={zoomLevel <= 0.25}
          sx={{
            "&:disabled": {
              opacity: 0.3,
            },
          }}
        >
          <ZoomOutIcon />
        </IconButton>
        <Button
          size="small"
          variant="text"
          onClick={handleResetZoom}
          sx={{
            minWidth: "70px",
            fontSize: "0.875rem",
            px: 1.5,
            fontWeight: 600,
          }}
        >
          {Math.round(zoomLevel * 100)}%
        </Button>
        <IconButton
          size="small"
          onClick={handleZoomIn}
          disabled={zoomLevel >= 3}
          sx={{
            "&:disabled": {
              opacity: 0.3,
            },
          }}
        >
          <ZoomInIcon />
        </IconButton>
      </Stack>
    </Stack>
  );
}
