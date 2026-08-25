import { useMemo } from "react";
import { useTheme } from "@mui/material/styles";

/**
 * Derives the Nivo chart theme from the active MUI theme.
 *
 * Lives here so all six chart components share one derivation.
 *
 * Returns the palette and border radius alongside the theme because every chart
 * needs all three, and they are derived from the same source.
 */
export function useChartTheme() {
  const theme = useTheme();

  // Get borderRadius as a number for bar charts (must be defined before chartTheme)
  const borderRadius = useMemo(() => {
    const br = theme.shape?.borderRadius;
    return typeof br === "number"
      ? br
      : typeof br === "string"
      ? parseInt(br, 10) || 4
      : 4;
  }, [theme.shape]);

  // Create comprehensive Nivo theme from Material-UI theme
  // Reference: https://nivo.rocks/guides/theming/
  const chartTheme = useMemo(() => {
    return {
      fontFamily: theme.typography.fontFamily,
      fontSize:
        typeof theme.typography.fontSize === "number"
          ? theme.typography.fontSize
          : 12,

      // Axes & Grid styling
      axis: {
        domain: {
          line: {
            stroke: theme.palette.divider,
            strokeWidth: 1,
          },
        },
        ticks: {
          line: {
            stroke: theme.palette.divider,
            strokeWidth: 1,
          },
          text: {
            fill: theme.palette.text.secondary,
            fontSize:
              typeof theme.typography.fontSize === "number"
                ? theme.typography.fontSize
                : 12,
            fontFamily: theme.typography.fontFamily,
          },
        },
        legend: {
          text: {
            fill: theme.palette.text.primary,
            fontSize:
              (typeof theme.typography.fontSize === "number"
                ? theme.typography.fontSize
                : 12) + 2,
            fontFamily: theme.typography.fontFamily,
            fontWeight: theme.typography.fontWeightMedium ?? 500,
          },
        },
      },

      // Grid lines
      grid: {
        line: {
          stroke: theme.palette.divider,
          strokeWidth: 1,
          strokeDasharray: "3 3",
          opacity: 0.5,
        },
      },

      // Legends styling
      legends: {
        text: {
          fill: theme.palette.text.primary,
          fontSize:
            typeof theme.typography.fontSize === "number"
              ? theme.typography.fontSize
              : 12,
          fontFamily: theme.typography.fontFamily,
        },
        title: {
          text: {
            fill: theme.palette.text.primary,
            fontSize:
              (typeof theme.typography.fontSize === "number"
                ? theme.typography.fontSize
                : 12) + 2,
            fontFamily: theme.typography.fontFamily,
            fontWeight: theme.typography.fontWeightMedium ?? 500,
          },
        },
      },

      // Labels styling (for pie charts, etc.)
      labels: {
        text: {
          fill: theme.palette.text.primary,
          fontSize:
            typeof theme.typography.fontSize === "number"
              ? theme.typography.fontSize
              : 12,
          fontFamily: theme.typography.fontFamily,
        },
      },

      // Tooltip styling
      tooltip: {
        container: {
          background: theme.palette.background.paper,
          color: theme.palette.text.primary,
          fontSize:
            typeof theme.typography.fontSize === "number"
              ? theme.typography.fontSize
              : 12,
          fontFamily: theme.typography.fontFamily,
          padding: "8px 12px",
          borderRadius: borderRadius,
          boxShadow: theme.shadows?.[4] || "0px 2px 8px rgba(0,0,0,0.15)",
          border: `1px solid ${theme.palette.divider}`,
        },
      },

      // Annotations (for future use)
      annotations: {
        text: {
          fill: theme.palette.text.primary,
          fontSize:
            typeof theme.typography.fontSize === "number"
              ? theme.typography.fontSize
              : 12,
          fontFamily: theme.typography.fontFamily,
          outlineWidth: 2,
          outlineColor: theme.palette.background.paper,
        },
        link: {
          stroke: theme.palette.divider,
          strokeWidth: 1,
          outlineWidth: 2,
          outlineColor: theme.palette.background.paper,
        },
        outline: {
          stroke: theme.palette.divider,
          strokeWidth: 2,
          outlineWidth: 2,
          outlineColor: theme.palette.background.paper,
        },
        symbol: {
          fill: theme.palette.background.paper,
          outlineWidth: 2,
          outlineColor: theme.palette.background.paper,
        },
      },
    };
  }, [theme, borderRadius]);

  // Generate color palette from theme for charts
  // Creates a color scale based on the theme's primary/secondary colors
  const chartColors = useMemo(() => {
    // Create a color scale that harmonizes with the app theme
    // For multi-series charts, we'll use variations of the primary color
    const primary = theme.palette.primary.main;
    const secondary = theme.palette.secondary?.main || primary;
    const info = theme.palette.info?.main || primary;
    const success = theme.palette.success?.main || primary;
    const warning = theme.palette.warning?.main || primary;
    const error = theme.palette.error?.main || primary;

    // Return an array of colors for multi-series charts
    // Nivo will cycle through these colors
    return [primary, secondary, info, success, warning, error];
  }, [theme.palette]);

  return { chartTheme, chartColors, borderRadius, theme };
}

/** Layout for the box a chart renders into. */
export const chartContainerSx = {
  width: "100%",
  height: "100%",
  overflow: "visible" as const,
  position: "relative" as const,
};
