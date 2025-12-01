import { useMemo } from "react";
import {
  indexToCoordinate,
  parseGridData,
  parseGridToNumber,
  parseTime,
} from "../utils/GeneralUtils";

// Process data based on chart configuration
export default function useProcessedData(
  chart: Chart,
  data: any[],
  schema?: Schema
) {
  return useMemo(() => {
    if (!schema || !data.length) return [];

    // Parse field identifiers (format: "Section Name|Field Name")
    let xSectionName = "";
    let xFieldName = "";
    let ySectionName = "";
    let yFieldName = "";

    if (chart.xAxis) {
      const xParts = chart.xAxis.split(" - ");
      if (xParts.length === 2) {
        xSectionName = xParts[0];
        xFieldName = xParts[1];
      } else {
        // Backwards compatibility: if no - separator, assume it's just field name
        xFieldName = chart.xAxis;
      }
    }

    if (chart.yAxis) {
      const yParts = chart.yAxis.split(" - ");
      if (yParts.length === 2) {
        ySectionName = yParts[0];
        yFieldName = yParts[1];
      } else {
        // Backwards compatibility: if no - separator, assume it's just field name
        yFieldName = chart.yAxis;
      }
    }

    // Find field indices by section and field name, and track field types
    // Build flat array with section tracking for absolute indices
    let xFieldIndex = -1;
    let yFieldIndex = -1;
    let xFieldType: ComponentType | null = null;
    let yFieldType: ComponentType | null = null;
    let absoluteIndex = 0;

    for (
      let sectionIdx = 0;
      sectionIdx < schema.sections.length;
      sectionIdx++
    ) {
      const section = schema.sections[sectionIdx];

      for (let fieldIdx = 0; fieldIdx < section.fields.length; fieldIdx++) {
        const field = section.fields[fieldIdx];

        // Check X-axis field
        if (xFieldIndex === -1 && field.name === xFieldName) {
          // If section name was specified, only match if it's the right section
          if (!xSectionName || section.title === xSectionName) {
            xFieldIndex = absoluteIndex;
            xFieldType = field.type;
          }
        }

        // Check Y-axis field
        if (yFieldIndex === -1 && yFieldName && field.name === yFieldName) {
          // If section name was specified, only match if it's the right section
          if (!ySectionName || section.title === ySectionName) {
            yFieldIndex = absoluteIndex;
            yFieldType = field.type;
          }
        }

        absoluteIndex++;
      }
    }

    if (xFieldIndex === -1) return [];

    // Check if Y-axis field is a range slider early (needed for proper data handling)
    let isRangeSliderField = false;
    if (schema && yFieldIndex !== -1 && yFieldType === "slider") {
      let absoluteIndex = 0;
      for (const section of schema.sections) {
        for (const field of section.fields) {
          if (absoluteIndex === yFieldIndex && field.type === "slider") {
            isRangeSliderField = field.props?.selectsRange === true;
            break;
          }
          absoluteIndex++;
        }
        if (isRangeSliderField) break;
      }
    }

    // For line charts, we need to determine what field to group by for multiple lines
    // Typically: X-axis = Match Number, group by Team Number to create one line per team
    let groupByFieldIndex = -1;
    let groupByFieldName = "";

    if ((chart.type === "line" || chart.type === "scatter") && chart.groupBy) {
      // Use explicit groupBy field if specified
      const groupByParts = chart.groupBy.split(" - ");
      if (groupByParts.length === 2) {
        groupByFieldName = groupByParts[1];
        // Find the field index for groupBy
        absoluteIndex = 0;
        for (
          let sectionIdx = 0;
          sectionIdx < schema.sections.length;
          sectionIdx++
        ) {
          const section = schema.sections[sectionIdx];
          for (let fieldIdx = 0; fieldIdx < section.fields.length; fieldIdx++) {
            const field = section.fields[fieldIdx];
            if (
              field.name === groupByFieldName &&
              (section.title === groupByParts[0] || !groupByParts[0])
            ) {
              groupByFieldIndex = absoluteIndex;
              break;
            }
            absoluteIndex++;
          }
          if (groupByFieldIndex !== -1) break;
        }
      }
    } else if (
      chart.type === "line" ||
      (chart.type === "scatter" && xFieldName === "Match Number")
    ) {
      // Auto-detect: if X-axis is Match Number, group by Team Number
      absoluteIndex = 0;
      for (
        let sectionIdx = 0;
        sectionIdx < schema.sections.length;
        sectionIdx++
      ) {
        const section = schema.sections[sectionIdx];
        for (let fieldIdx = 0; fieldIdx < section.fields.length; fieldIdx++) {
          const field = section.fields[fieldIdx];
          if (field.name === "Team Number") {
            groupByFieldIndex = absoluteIndex;
            groupByFieldName = "Team Number";
            break;
          }
          absoluteIndex++;
        }
        if (groupByFieldIndex !== -1) break;
      }
    }

    // Group data - for line charts with grouping, use nested map; otherwise simple map
    // Note: arrays can contain strings for text/dropdown fields, numbers, or arrays (for range sliders)
    let groupedByLine: Map<
      string,
      Map<string, (number | string | number[])[]>
    > | null = null;
    let groupedSimple: Map<string, (number | string | number[])[]> | null =
      null;

    if (
      (chart.type === "line" || chart.type === "scatter") &&
      groupByFieldIndex !== -1
    ) {
      groupedByLine = new Map<string, Map<string, (number | string)[]>>();
    } else {
      groupedSimple = new Map<string, (number | string)[]>();
    }

    data.forEach((item) => {
      if (!item || !item.decoded || !item.decoded.data) return;

      const xValue = item.decoded.data[xFieldIndex];
      if (xValue === undefined || xValue === null) return;

      // Convert X value to string key (handle different data types)
      let xKey = String(xValue);
      if (xFieldType === "checkbox") {
        xKey = String(Boolean(xValue));
      }

      // Convert Y value based on field type
      let yValue: number | string | number[] = 1; // Default for count when no y-axis
      if (yFieldIndex !== -1) {
        const rawYValue = item.decoded.data[yFieldIndex];
        if (rawYValue !== undefined && rawYValue !== null) {
          // Handle range slider arrays first - preserve the array structure
          if (isRangeSliderField) {
            // Preserve array structure for range sliders
            if (Array.isArray(rawYValue)) {
              // Already an array, use as-is
              yValue = rawYValue;
            } else if (typeof rawYValue === "string") {
              // Try parsing string representation
              try {
                const parsed = JSON.parse(rawYValue);
                if (Array.isArray(parsed) && parsed.length === 2) {
                  yValue = [Number(parsed[0]), Number(parsed[1])];
                }
              } catch {
                // Try comma-separated format
                const parts = rawYValue.split(",").map((s) => s.trim());
                if (parts.length === 2) {
                  const min = Number(parts[0]);
                  const max = Number(parts[1]);
                  if (!isNaN(min) && !isNaN(max)) {
                    yValue = [min, max];
                  }
                }
              }
            }
          } else if (yFieldType === "timer") {
            // Convert timer string to seconds
            const seconds = parseTime(String(rawYValue));
            if (seconds !== null) {
              yValue = seconds;
            }
          } else if (yFieldType === "grid") {
            // Extract count of active cells from grid
            const cellCount = parseGridToNumber(String(rawYValue));
            if (cellCount !== null) {
              yValue = cellCount;
            }
          } else if (yFieldType === "checkbox") {
            // Convert boolean to number (0 or 1) for numeric charts
            yValue = Boolean(rawYValue) ? 1 : 0;
          } else if (yFieldType === "text" || yFieldType === "dropdown") {
            // For categorical fields, use the string value as-is
            // They'll be counted/aggregated in the grouping logic
            yValue = String(rawYValue);
          } else {
            // Try to convert to number for numeric fields
            const numValue = Number(rawYValue);
            if (!isNaN(numValue)) {
              yValue = numValue;
            }
          }
        }
      }

      if (
        (chart.type === "line" || chart.type === "scatter") &&
        groupByFieldIndex !== -1 &&
        groupedByLine
      ) {
        // For line charts with grouping: group by team/groupBy, then by X-axis value
        const groupValue = item.decoded.data[groupByFieldIndex];
        if (groupValue === undefined || groupValue === null) return;
        const groupKey = String(groupValue);

        if (!groupedByLine.has(groupKey)) {
          groupedByLine.set(groupKey, new Map<string, number[]>());
        }
        const groupMap = groupedByLine.get(groupKey)!;

        if (!groupMap.has(xKey)) {
          groupMap.set(xKey, []);
        }
        groupMap.get(xKey)!.push(yValue as number | string);
      } else if (groupedSimple) {
        // For other chart types or line charts without grouping: group by X-axis value
        if (!groupedSimple.has(xKey)) {
          groupedSimple.set(xKey, []);
        }
        groupedSimple.get(xKey)!.push(yValue as number | string);
      }
    });

    // Handle heatmap charts - special processing for grid data
    // Format: [{ id: "Team1", data: [{ x: "0,0", y: 5 }, { x: "0,1", y: 3 }, ...] }]
    if (chart.type === "heatmap") {
      // For heatmap, we need X-axis for grouping and Y-axis should be a grid field
      // If Y-axis is not a grid field, return empty data (will show "No data available")
      if (yFieldType !== "grid" || xFieldIndex === -1 || yFieldIndex === -1) {
        return [];
      }

      // First, determine grid dimensions from the data or schema
      let gridRows = 3; // default
      let gridCols = 3; // default

      // Try to get dimensions from the first grid data item
      for (const item of data) {
        if (!item || !item.decoded || !item.decoded.data) continue;
        const gridValue = item.decoded.data[yFieldIndex];
        if (gridValue === undefined || gridValue === null) continue;

        const gridData = parseGridData(String(gridValue));
        if (gridData) {
          gridRows = gridData.rows;
          gridCols = gridData.cols;
          break; // Use dimensions from first valid grid
        }
      }

      // If we couldn't get dimensions from data, try to get from schema field props
      if (gridRows === 3 && gridCols === 3 && schema) {
        const yParts = chart.yAxis?.split(" - ");
        if (yParts && yParts.length === 2) {
          for (const section of schema.sections) {
            if (section.title === yParts[0]) {
              const field = section.fields.find((f) => f.name === yParts[1]);
              if (field && field.type === "grid" && field.props) {
                gridRows = field.props.rows || 3;
                gridCols = field.props.cols || 3;
                break;
              }
            }
          }
        }
      }

      // Generate all possible cell positions for the full grid
      const allCellPositions: string[] = [];
      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          allCellPositions.push(`${row},${col}`);
        }
      }

      // Sort cell positions (already sorted by row then column)
      const sortedCellPositions = allCellPositions.sort((a, b) => {
        const [aRow, aCol] = a.split(",").map(Number);
        const [bRow, bCol] = b.split(",").map(Number);
        if (aRow !== bRow) return aRow - bRow;
        return aCol - bCol;
      });

      // For heatmaps with grid data, we need to parse grid cells and group by X-axis
      const heatmapData = new Map<string, Map<string, number>>(); // groupKey -> cellPosition -> count

      data.forEach((item) => {
        if (!item || !item.decoded || !item.decoded.data) return;

        // Get X-axis value (grouping key, e.g., team number)
        const xValue = item.decoded.data[xFieldIndex];
        if (xValue === undefined || xValue === null) return;
        const groupKey = String(xValue);

        // Get grid data
        if (yFieldIndex === -1) return;
        const gridValue = item.decoded.data[yFieldIndex];
        if (gridValue === undefined || gridValue === null) return;

        const gridData = parseGridData(String(gridValue));
        if (!gridData) return;

        // Initialize group if needed
        if (!heatmapData.has(groupKey)) {
          heatmapData.set(groupKey, new Map<string, number>());
        }
        const groupMap = heatmapData.get(groupKey)!;

        // Count checked cells by position
        gridData.checkedIndices.forEach((cellIndex) => {
          const cellPos = indexToCoordinate(cellIndex, gridData.cols);

          const currentCount = groupMap.get(cellPos) || 0;
          groupMap.set(cellPos, currentCount + 1);
        });
      });

      // Convert to heatmap format - include ALL cells
      const result: Array<{
        id: string;
        data: Array<{ x: string; y: number }>;
      }> = [];

      heatmapData.forEach((cellCounts, groupKey) => {
        // Include all cell positions, with 0 for unchecked cells
        const cellData = sortedCellPositions.map((cellPos) => ({
          x: cellPos,
          y: cellCounts.get(cellPos) || 0, // 0 for unchecked, count for checked
        }));

        result.push({
          id: groupKey,
          data: cellData,
        });
      });

      return result;
    }

    // Handle line charts - create one line per group (team)
    // Format: [{ id: "123", data: [{x: 1, y: 10}, {x: 2, y: 15}] }, { id: "456", data: [...] }]
    if (
      (chart.type === "line" || chart.type === "scatter") &&
      groupByFieldIndex !== -1 &&
      groupedByLine
    ) {
      const result: Array<{
        id: string;
        data: Array<{ x: string | number; y: number }>;
      }> = [];

      groupedByLine.forEach((xValueMap, groupKey) => {
        const lineData: Array<{ x: string | number; y: number }> = [];

        // For each X-axis value (e.g., match number), aggregate the Y-values
        xValueMap.forEach((yValues, xKey) => {
          let aggregatedValue = 0;

          // Handle string/categorical values (text, dropdown)
          if (yFieldType === "text" || yFieldType === "dropdown") {
            // For categorical data, count is the most meaningful aggregation
            aggregatedValue = yValues.length;
          } else {
            // For numeric values, use specified aggregation
            const numericValues = yValues
              .map((v) => (typeof v === "number" ? v : Number(v)))
              .filter((v) => !isNaN(v));

            if (numericValues.length === 0) {
              aggregatedValue = 0;
            } else {
              switch (chart.aggregation || "average") {
                case "sum":
                  aggregatedValue = numericValues.reduce((a, b) => a + b, 0);
                  break;
                case "average":
                  aggregatedValue =
                    numericValues.reduce((a, b) => a + b, 0) /
                    numericValues.length;
                  break;
                case "count":
                  aggregatedValue = yValues.length;
                  break;
                case "min":
                  aggregatedValue = Math.min(...numericValues);
                  break;
                case "max":
                  aggregatedValue = Math.max(...numericValues);
                  break;
              }
            }
          }

          // Try to convert X-key to number if possible (for proper sorting)
          const xNum = Number(xKey);
          const xValue = !isNaN(xNum) && isFinite(xNum) ? xNum : xKey;

          lineData.push({
            x: xValue,
            y: aggregatedValue,
          });
        });

        // Sort line data by X value
        lineData.sort((a, b) => {
          const aNum = typeof a.x === "number" ? a.x : Number(a.x);
          const bNum = typeof b.x === "number" ? b.x : Number(b.x);
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
          }
          return String(a.x).localeCompare(String(b.x));
        });

        if (lineData.length > 0) {
          result.push({
            id: groupKey,
            data: lineData,
          });
        }
      });

      // Sort lines if sortMode is specified
      if (chart.sortMode && result.length > 0) {
        if (chart.sortMode === "ascending") {
          result.sort((a, b) => {
            const aAvg =
              a.data.reduce((sum, d) => sum + d.y, 0) / a.data.length;
            const bAvg =
              b.data.reduce((sum, d) => sum + d.y, 0) / b.data.length;
            return aAvg - bAvg;
          });
        } else if (chart.sortMode === "descending") {
          result.sort((a, b) => {
            const aAvg =
              a.data.reduce((sum, d) => sum + d.y, 0) / a.data.length;
            const bAvg =
              b.data.reduce((sum, d) => sum + d.y, 0) / b.data.length;
            return bAvg - aAvg;
          });
        }
      }

      return result;
    }

    // Handle boxplot - always uses flat format: [{ group: "123", value: 1 }, { group: "123", value: 2 }, ...]
    // For range sliders, expand [min, max] into individual data points
    if (chart.type === "boxplot") {
      if (!groupedSimple) return [];

      // Check if Y-axis field is a range slider and get step value if available
      let isRangeSlider = false;
      let sliderStep = 1; // Default step
      if (schema && yFieldIndex !== -1) {
        let absoluteIndex = 0;
        for (const section of schema.sections) {
          for (const field of section.fields) {
            if (absoluteIndex === yFieldIndex && field.type === "slider") {
              isRangeSlider = field.props?.selectsRange === true;
              sliderStep = field.props?.step || 1;
              break;
            }
            absoluteIndex++;
          }
          if (isRangeSlider) break;
        }
      }

      const result: Array<{ group: string; value: number }> = [];
      let allValues: number[] = []; // Collect all values for min/max calculation

      groupedSimple.forEach(
        (values: (number | string | number[])[], key: string) => {
          values.forEach((v: number | string | number[]) => {
            if (isRangeSlider) {
              // Parse range slider value: could be array [min, max] or string representation
              let rangeArray: [number, number] | null = null;

              if (Array.isArray(v)) {
                // Already an array
                if (
                  v.length === 2 &&
                  typeof v[0] === "number" &&
                  typeof v[1] === "number"
                ) {
                  rangeArray = [v[0], v[1]];
                }
              } else if (typeof v === "string") {
                // Try parsing string like "[5,10]" or "5,10"
                try {
                  const parsed = JSON.parse(v);
                  if (Array.isArray(parsed) && parsed.length === 2) {
                    rangeArray = [Number(parsed[0]), Number(parsed[1])];
                  }
                } catch {
                  // Try comma-separated format
                  const parts = v.split(",").map((s) => s.trim());
                  if (parts.length === 2) {
                    const min = Number(parts[0]);
                    const max = Number(parts[1]);
                    if (!isNaN(min) && !isNaN(max)) {
                      rangeArray = [min, max];
                    }
                  }
                }
              }

              if (rangeArray) {
                const [minVal, maxVal] = rangeArray;
                // Ensure min <= max
                const actualMin = Math.min(minVal, maxVal);
                const actualMax = Math.max(minVal, maxVal);

                // Expand range into individual data points
                // Include both min and max, and all values in between based on step
                for (
                  let currentValue = actualMin;
                  currentValue <= actualMax;
                  currentValue += sliderStep
                ) {
                  result.push({
                    group: String(key),
                    value: currentValue,
                  });
                  allValues.push(currentValue);
                }
              }
            } else {
              // Normal numeric field handling
              let num: number;

              // Convert based on field type
              if (yFieldType === "timer") {
                const seconds = parseTime(String(v));
                if (seconds === null) return;
                num = seconds;
              } else if (yFieldType === "grid") {
                const cellCount = parseGridToNumber(String(v));
                if (cellCount === null) return;
                num = cellCount;
              } else if (yFieldType === "checkbox") {
                num = Boolean(v) ? 1 : 0;
              } else {
                num = typeof v === "number" ? v : Number(v);
              }

              if (
                !isNaN(num) &&
                isFinite(num) &&
                num !== null &&
                num !== undefined
              ) {
                result.push({
                  group: String(key),
                  value: num,
                });
                allValues.push(num);
              }
            }
          });
        }
      );

      // Sort by median value if sortMode is specified
      // For flat array format, we need to group by group first, calculate median, then sort
      if (chart.sortMode && result.length > 0) {
        // Group data points by group to calculate medians
        const groupMedians = new Map<string, number[]>();
        result.forEach((item) => {
          if (!groupMedians.has(item.group)) {
            groupMedians.set(item.group, []);
          }
          groupMedians.get(item.group)!.push(item.value);
        });

        const getMedian = (arr: number[]) => {
          const sorted = [...arr].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
        };

        // Calculate median for each group
        const groupMedianMap = new Map<string, number>();
        groupMedians.forEach((values, group) => {
          groupMedianMap.set(group, getMedian(values));
        });

        // Sort the flat array by group median
        if (chart.sortMode === "ascending") {
          result.sort((a, b) => {
            const medianA = groupMedianMap.get(a.group) || 0;
            const medianB = groupMedianMap.get(b.group) || 0;
            return medianA - medianB;
          });
        } else if (chart.sortMode === "descending") {
          result.sort((a, b) => {
            const medianA = groupMedianMap.get(a.group) || 0;
            const medianB = groupMedianMap.get(b.group) || 0;
            return medianB - medianA;
          });
        }
      }

      // Store min/max in result metadata for use in rendering
      if (allValues.length > 0) {
        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);
        // Add padding of 5% to the range
        const range = maxValue - minValue;
        const padding = range * 0.05 || 1;
        (result as any).__minValue = minValue - padding;
        (result as any).__maxValue = maxValue + padding;
      }

      return result;
    }

    // For line charts without grouping, create a single line
    if (
      (chart.type === "line" || chart.type === "scatter") &&
      groupByFieldIndex === -1 &&
      groupedSimple
    ) {
      const result: Array<{
        id: string;
        data: Array<{ x: string | number; y: number }>;
      }> = [];
      const lineData: Array<{ x: string | number; y: number }> = [];

      groupedSimple.forEach((values, xKey) => {
        let aggregatedValue = 0;

        // Handle string/categorical values (text, dropdown)
        if (yFieldType === "text" || yFieldType === "dropdown") {
          // For categorical data, count is the most meaningful aggregation
          aggregatedValue = values.length;
        } else {
          // For numeric values, use specified aggregation
          const numericValues = values
            .map((v) => (typeof v === "number" ? v : Number(v)))
            .filter((v) => !isNaN(v));

          if (numericValues.length === 0) {
            aggregatedValue = 0;
          } else {
            switch (chart.aggregation || "average") {
              case "sum":
                aggregatedValue = numericValues.reduce((a, b) => a + b, 0);
                break;
              case "average":
                aggregatedValue =
                  numericValues.reduce((a, b) => a + b, 0) /
                  numericValues.length;
                break;
              case "count":
                aggregatedValue = values.length;
                break;
              case "min":
                aggregatedValue = Math.min(...numericValues);
                break;
              case "max":
                aggregatedValue = Math.max(...numericValues);
                break;
            }
          }
        }

        const xNum = Number(xKey);
        const xValue = !isNaN(xNum) && isFinite(xNum) ? xNum : xKey;

        lineData.push({
          x: xValue,
          y: aggregatedValue,
        });
      });

      // Sort by X value
      lineData.sort((a, b) => {
        const aNum = typeof a.x === "number" ? a.x : Number(a.x);
        const bNum = typeof b.x === "number" ? b.x : Number(b.x);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return String(a.x).localeCompare(String(b.x));
      });

      if (lineData.length > 0) {
        result.push({
          id: chart.name || "data",
          data: lineData,
        });
      }

      return result;
    }

    // For other chart types (bar, pie, scatter), aggregate the values
    if (!groupedSimple) return [];
    const result: any[] = [];

    // Special handling for bar charts with text/dropdown Y-axis: group by text values, subgroup by team number
    if (
      chart.type === "bar" &&
      (yFieldType === "text" || yFieldType === "dropdown")
    ) {
      // Find Team Number field index for subgrouping
      let teamNumberIndex = -1;
      absoluteIndex = 0;
      for (
        let sectionIdx = 0;
        sectionIdx < schema.sections.length;
        sectionIdx++
      ) {
        const section = schema.sections[sectionIdx];
        for (let fieldIdx = 0; fieldIdx < section.fields.length; fieldIdx++) {
          const field = section.fields[fieldIdx];
          if (field.name === "Team Number") {
            teamNumberIndex = absoluteIndex;
            break;
          }
          absoluteIndex++;
        }
        if (teamNumberIndex !== -1) break;
      }

      // Group by text/dropdown values, with counts per team number
      // Structure: Map<textValue, Map<teamNumber, count>>
      const textValueTeamCounts = new Map<string, Map<string, number>>();
      const allTeamNumbers = new Set<string>();

      // Process all data items to build grouped structure
      data.forEach((item) => {
        if (!item || !item.decoded || !item.decoded.data) return;

        // Get Y-axis text/dropdown value
        if (yFieldIndex === -1) return;
        const yValue = item.decoded.data[yFieldIndex];
        if (yValue === undefined || yValue === null) return;
        const textValue = String(yValue);

        // Get team number for subgrouping
        let teamNumber = "Unknown";
        if (teamNumberIndex !== -1) {
          const teamValue = item.decoded.data[teamNumberIndex];
          if (teamValue !== undefined && teamValue !== null) {
            teamNumber = String(teamValue);
            allTeamNumbers.add(teamNumber);
          }
        }

        // Initialize nested map structure
        if (!textValueTeamCounts.has(textValue)) {
          textValueTeamCounts.set(textValue, new Map<string, number>());
        }
        const teamCounts = textValueTeamCounts.get(textValue)!;

        // Increment count for this team number within this text value
        const currentCount = teamCounts.get(teamNumber) || 0;
        teamCounts.set(teamNumber, currentCount + 1);
      });

      // Convert to grouped bar chart format
      // Format: [{ category: "Success", "123": 3, "456": 2 }, { category: "Failed", "123": 1, "456": 2 }]
      const sortedTeamNumbers = Array.from(allTeamNumbers).sort((a, b) => {
        const aNum = Number(a);
        const bNum = Number(b);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return a.localeCompare(b);
      });

      textValueTeamCounts.forEach((teamCounts, textValue) => {
        const rowData: any = {
          category: textValue,
          id: textValue,
        };

        // Add count for each team number (0 if not present)
        sortedTeamNumbers.forEach((teamNumber) => {
          rowData[teamNumber] = teamCounts.get(teamNumber) || 0;
        });

        result.push(rowData);
      });

      // Store team numbers in result metadata for chart rendering
      (result as any).__teamKeys = sortedTeamNumbers;
    } else {
      // Standard processing for numeric Y-axis or other chart types
      groupedSimple.forEach(
        (values: (number | string | number[])[], key: string) => {
          let aggregatedValue = 0;

          // Handle string/categorical values (text, dropdown)
          if (yFieldType === "text" || yFieldType === "dropdown") {
            // For categorical data, count is the most meaningful aggregation
            aggregatedValue = values.length;
          } else {
            // For numeric values, use specified aggregation
            const numericValues = values
              .map((v) => (typeof v === "number" ? v : Number(v)))
              .filter((v) => !isNaN(v));

            if (numericValues.length === 0) {
              aggregatedValue = 0;
            } else {
              switch (chart.aggregation) {
                case "sum":
                  aggregatedValue = numericValues.reduce((a, b) => a + b, 0);
                  break;
                case "average":
                  aggregatedValue =
                    numericValues.reduce((a, b) => a + b, 0) /
                    numericValues.length;
                  break;
                case "count":
                  aggregatedValue = values.length;
                  break;
                case "min":
                  aggregatedValue = Math.min(...numericValues);
                  break;
                case "max":
                  aggregatedValue = Math.max(...numericValues);
                  break;
              }
            }
          }

          result.push({
            id: key,
            label: key,
            value: aggregatedValue,
            x: key,
            y: aggregatedValue,
          });
        }
      );
    }

    // Special handling for pie charts with text/dropdown Y-axis: create slices with team subgroups
    if (
      chart.type === "pie" &&
      (yFieldType === "text" || yFieldType === "dropdown")
    ) {
      // Find Team Number field index for subgrouping
      let teamNumberIndex = -1;
      absoluteIndex = 0;
      for (
        let sectionIdx = 0;
        sectionIdx < schema.sections.length;
        sectionIdx++
      ) {
        const section = schema.sections[sectionIdx];
        for (let fieldIdx = 0; fieldIdx < section.fields.length; fieldIdx++) {
          const field = section.fields[fieldIdx];
          if (field.name === "Team Number") {
            teamNumberIndex = absoluteIndex;
            break;
          }
          absoluteIndex++;
        }
        if (teamNumberIndex !== -1) break;
      }

      // Group by text/dropdown values, with counts per team number
      const textValueTeamCounts = new Map<string, Map<string, number>>();

      // Process all data items to build grouped structure
      data.forEach((item) => {
        if (!item || !item.decoded || !item.decoded.data) return;

        // Get Y-axis text/dropdown value
        if (yFieldIndex === -1) return;
        const yValue = item.decoded.data[yFieldIndex];
        if (yValue === undefined || yValue === null) return;
        const textValue = String(yValue);

        // Get team number for subgrouping
        let teamNumber = "Unknown";
        if (teamNumberIndex !== -1) {
          const teamValue = item.decoded.data[teamNumberIndex];
          if (teamValue !== undefined && teamValue !== null) {
            teamNumber = String(teamValue);
          }
        }

        // Initialize nested map structure
        if (!textValueTeamCounts.has(textValue)) {
          textValueTeamCounts.set(textValue, new Map<string, number>());
        }
        const teamCounts = textValueTeamCounts.get(textValue)!;

        // Increment count for this team number within this text value
        const currentCount = teamCounts.get(teamNumber) || 0;
        teamCounts.set(teamNumber, currentCount + 1);
      });

      // Convert to pie chart format with combined labels
      // Format: [{ id: "Success - Team 123", label: "Success - Team 123", value: 3 }, ...]
      const pieResult: any[] = [];
      textValueTeamCounts.forEach((teamCounts, textValue) => {
        teamCounts.forEach((count, teamNumber) => {
          const combinedLabel = `${textValue} - Team ${teamNumber}`;
          pieResult.push({
            id: combinedLabel,
            label: combinedLabel,
            value: count,
          });
        });
      });

      // Replace result with pie chart data
      return pieResult;
    }

    // Sort result if sortMode is specified (for bar charts)
    if (chart.sortMode && chart.type === "bar") {
      if (chart.sortMode === "ascending") {
        result.sort((a, b) => a.value - b.value);
      } else if (chart.sortMode === "descending") {
        result.sort((a, b) => b.value - a.value);
      }
      // "none" or undefined means no sorting
    }

    return result;
  }, [chart, data, schema]);
}
