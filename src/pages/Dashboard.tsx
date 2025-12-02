import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Box,
  Paper,
  Stack,
  Typography,
  useTheme,
  Grid,
  Card,
  CardContent,
  Button,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/DashboardRounded";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerRounded";
import ExpandIcon from "@mui/icons-material/ExpandMoreRounded";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import WarningIcon from "@mui/icons-material/WarningRounded";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import PageHeader from "../ui/PageHeader";
import { useSettings, defaultSettings } from "../context/SettingsContext";
import { useAsyncFetch } from "../hooks/useAsyncFetch";
import { useSchema } from "../context/SchemaContext";
import {
  fetchQrCodes,
  validateQR,
  decodeQR,
  getDataFromQrName,
  DecodedQr,
} from "../utils/QrUtils";
import StoreManager, { StoreKeys } from "../utils/StoreManager";
import { useAnalysis } from "../context/AnalysisContext";
import ChartRenderer from "../ui/ChartRenderer";
import { getSchemaFromHash } from "../utils/SchemaUtils";

interface PinnedChart {
  chartId: string;
  chart: Chart;
  analysis: Analysis;
  filteredData: any[];
  schema: Schema | null;
}

export default function LeadScoutDashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { availableSchemas, schema, hash: currentSchemaHash } = useSchema();
  const { analyses } = useAnalysis();
  const [qrCodes] = useAsyncFetch(fetchQrCodes);
  const [receivedMatches, setReceivedMatches] = useState<
    Map<
      number,
      Array<{
        deviceID: number;
        qr: QrCode;
        decoded: DecodedQr;
        teamNumber: number | null;
        timestamp: number | null;
      }>
    >
  >(new Map());
  const [deviceHistory, setDeviceHistory] = useState<
    Map<
      number,
      {
        deviceID: number;
        teamNumber: number | null;
        matchNumber: number;
        timestamp: number | null;
      }
    >
  >(new Map());
  const [pinnedCharts, setPinnedCharts] = useState<PinnedChart[]>([]);

  useEffect(() => {
    const processQrCodes = async () => {
      // Only process if we have a current schema
      if (!qrCodes || !schema || !currentSchemaHash) {
        setReceivedMatches(new Map());
        return;
      }

      const nonArchivedQrCodes = qrCodes.filter((qr) => !qr.archived);

      const matchesMap = new Map<
        number,
        Array<{
          deviceID: number;
          qr: QrCode;
          decoded: DecodedQr;
          teamNumber: number | null;
          timestamp: number | null;
        }>
      >();
      const deviceHistoryMap = new Map<
        number,
        {
          deviceID: number;
          teamNumber: number | null;
          matchNumber: number;
          timestamp: number | null;
        }
      >();

      // Get all fields from the current schema
      const allFields = schema.sections.flatMap((section) => section.fields);

      const matchNumberIndex = allFields.findIndex(
        (field) => field.name === "Match Number"
      );
      const teamNumberIndex = allFields.findIndex(
        (field) => field.name === "Team Number"
      );

      // If current schema doesn't have a match number field, return empty
      if (matchNumberIndex === -1) {
        setReceivedMatches(new Map());
        return;
      }

      for (const qr of nonArchivedQrCodes) {
        try {
          if (!validateQR(qr.data)) continue;
          const decoded = await decodeQR(qr.data);
          if (decoded && decoded.schemaHash) {
            // Only process QR codes that match the current schema
            if (decoded.schemaHash !== currentSchemaHash) continue;

            // Exclude data from the host device (ID 0)
            if (decoded.deviceId === 0) continue;

            const matchNumberValue = decoded.data[matchNumberIndex];
            if (matchNumberValue === null || matchNumberValue === undefined)
              continue;
            const matchNumber = Number(matchNumberValue);
            if (isNaN(matchNumber) || matchNumber === 0) continue;

            // Extract team number
            let teamNumber: number | null = null;
            if (teamNumberIndex !== -1) {
              const teamNumberValue = decoded.data[teamNumberIndex];
              if (teamNumberValue !== null && teamNumberValue !== undefined) {
                const teamNum = Number(teamNumberValue);
                if (!isNaN(teamNum)) {
                  teamNumber = teamNum;
                }
              }
            }

            // Extract timestamp from QR code name
            let timestamp: number | null = null;
            try {
              const qrNameData = getDataFromQrName(qr.name);
              if (qrNameData.Timestamp) {
                timestamp = parseInt(qrNameData.Timestamp) * 1000; // Convert to milliseconds
              }
            } catch {
              // If timestamp extraction fails, use current time as fallback
              timestamp = Date.now();
            }

            if (matchNumber) {
              if (!matchesMap.has(matchNumber)) {
                matchesMap.set(matchNumber, []);
              }
              const devices = matchesMap.get(matchNumber)!;
              // Update or add device entry (keep the most recent one)
              const existingIndex = devices.findIndex(
                (d) => d.deviceID === decoded.deviceId
              );
              const deviceEntry = {
                deviceID: decoded.deviceId!,
                qr,
                decoded,
                teamNumber,
                timestamp,
              };

              if (existingIndex !== -1) {
                // Replace if this QR code is newer
                if (
                  timestamp &&
                  (!devices[existingIndex].timestamp ||
                    timestamp > devices[existingIndex].timestamp!)
                ) {
                  devices[existingIndex] = deviceEntry;
                }
              } else {
                devices.push(deviceEntry);
              }

              // Track device history across all matches (keep the most recent)
              const existingHistory = deviceHistoryMap.get(decoded.deviceId);
              if (
                !existingHistory ||
                (timestamp &&
                  (!existingHistory.timestamp ||
                    timestamp > existingHistory.timestamp))
              ) {
                deviceHistoryMap.set(decoded.deviceId, {
                  deviceID: decoded.deviceId,
                  teamNumber,
                  matchNumber,
                  timestamp,
                });
              }
            }
          }
        } catch (e) {
          console.error(`Failed to decode QR code ${qr.name}:`, e);
        }
      }
      setReceivedMatches(matchesMap);
      setDeviceHistory(deviceHistoryMap);
    };

    processQrCodes();
  }, [qrCodes, schema, currentSchemaHash]);

  // Define the expected number of devices
  const EXPECTED_DEVICES_COUNT =
    settings.EXPECTED_DEVICES_COUNT || defaultSettings.EXPECTED_DEVICES_COUNT;

  // Helper function to format time difference
  const formatTimeAgo = (timestamp: number | null): string => {
    if (!timestamp) return "Unknown time";
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  };

  // Calculate the maximum match number to iterate through
  const maxMatchNumber = useMemo(() => {
    const matchNumbers = Array.from(receivedMatches.keys());
    return matchNumbers.length > 0 ? Math.max(...matchNumbers) : 0;
  }, [receivedMatches]);

  const allMatchNumbers = Array.from(
    { length: maxMatchNumber },
    (_, i) => i + 1
  );

  // Calculate overall statistics
  const stats = useMemo(() => {
    const complete = allMatchNumbers.filter((matchNum) => {
      const devices = receivedMatches.get(matchNum);
      return devices && devices.length === EXPECTED_DEVICES_COUNT;
    }).length;
    const incomplete = allMatchNumbers.length - complete;

    const missing = allMatchNumbers.filter((matchNum) => {
      const devices = receivedMatches.get(matchNum);
      return !devices || devices.length === 0;
    }).length;

    return { complete, incomplete, missing };
  }, [allMatchNumbers, receivedMatches, EXPECTED_DEVICES_COUNT]);

  // Load and process pinned charts from store
  useEffect(() => {
    const loadPinnedCharts = async () => {
      if (!qrCodes || availableSchemas.length === 0 || analyses.length === 0) {
        setPinnedCharts([]);
        return;
      }

      const pinned: PinnedChart[] = [];

      // Get all pinned chart IDs from store
      for (const analysis of analyses) {
        for (const chart of analysis.charts || []) {
          try {
            const pinnedData = await StoreManager.get(
              StoreKeys.analysis.pinned(chart.id)
            );
            if (pinnedData) {
              const parsed = JSON.parse(pinnedData);
              if (
                parsed.pinned &&
                parsed.chartId === chart.id &&
                parsed.analysisId === analysis.id
              ) {
                // Get schema for this analysis
                const schema = await getSchemaFromHash(
                  analysis.schemaHash,
                  availableSchemas
                );

                if (!schema) continue;

                // Process QR codes data the same way AnalysisViewer does
                const allFields = schema.sections.flatMap(
                  (section) => section.fields
                );
                const matchNumberIndex = allFields.findIndex(
                  (field) => field.name === "Match Number"
                );
                const teamNumberIndex = allFields.findIndex(
                  (field) => field.name === "Team Number"
                );

                const decoded = await Promise.all(
                  qrCodes
                    .filter((qr) => !qr.archived)
                    .map(async (qr) => {
                      try {
                        const decoded = await decodeQR(qr.data);
                        // Only include QR codes that match the analysis schema
                        if (decoded.schemaHash !== analysis.schemaHash) {
                          return null;
                        }
                        return { qr, decoded };
                      } catch {
                        return null;
                      }
                    })
                );

                const filtered = decoded.filter((item) => {
                  if (!item || !item.decoded || !item.decoded.data)
                    return false;

                  // Apply team filter (only if teams are explicitly selected)
                  if (analysis.selectedTeams.length > 0) {
                    if (teamNumberIndex === -1) {
                      return false;
                    }
                    const teamField = item.decoded.data[teamNumberIndex];
                    if (teamField === undefined || teamField === null)
                      return false;
                    const teamNum = Number(teamField);
                    if (
                      isNaN(teamNum) ||
                      !analysis.selectedTeams.includes(teamNum)
                    ) {
                      return false;
                    }
                  }

                  // Apply match filter (only if matches are explicitly selected)
                  if (analysis.selectedMatches.length > 0) {
                    if (matchNumberIndex === -1) {
                      return false;
                    }
                    const matchField = item.decoded.data[matchNumberIndex];
                    if (matchField === undefined || matchField === null)
                      return false;
                    const matchNum = Number(matchField);
                    if (
                      isNaN(matchNum) ||
                      !analysis.selectedMatches.includes(matchNum)
                    ) {
                      return false;
                    }
                  }

                  return true;
                });

                pinned.push({
                  chartId: chart.id,
                  chart,
                  analysis,
                  filteredData: filtered,
                  schema,
                });
              }
            }
          } catch (error) {
            console.error(`Failed to load pinned chart ${chart.id}:`, error);
          }
        }
      }

      setPinnedCharts(pinned);
    };

    loadPinnedCharts();
  }, [analyses, qrCodes, availableSchemas]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Main header */}
      <PageHeader
        icon={<DashboardIcon sx={{ fontSize: 28 }} />}
        title="Lead Scouter's Dashboard"
        subtitle="Track match data collection across all devices"
      />

      {/* Statistics Cards */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
          Overview
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          {/* Complete Matches */}
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              p: 3,
              borderRadius: 3,
              border: `2px solid ${theme.palette.success.main}40`,
              background: `linear-gradient(135deg, ${theme.palette.success.main}10 0%, ${theme.palette.success.main}05 100%)`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: `${theme.palette.success.main}20`,
                  color: theme.palette.success.main,
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography
                  variant="h3"
                  sx={{ fontWeight: 600, color: theme.palette.success.main }}
                >
                  {stats.complete}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Complete Matches
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Incomplete Matches */}
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              p: 3,
              borderRadius: 3,
              border: `2px solid ${theme.palette.warning.main}40`,
              background: `linear-gradient(135deg, ${theme.palette.warning.main}10 0%, ${theme.palette.warning.main}05 100%)`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: `${theme.palette.warning.main}20`,
                  color: theme.palette.warning.main,
                }}
              >
                <WarningIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography
                  variant="h3"
                  sx={{ fontWeight: 600, color: theme.palette.warning.main }}
                >
                  {stats.incomplete}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Incomplete Matches
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Missing Matches */}
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              p: 3,
              borderRadius: 3,
              border: `2px solid ${theme.palette.error.main}40`,
              background: `linear-gradient(135deg, ${theme.palette.error.main}10 0%, ${theme.palette.error.main}05 100%)`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: `${theme.palette.error.main}20`,
                  color: theme.palette.error.main,
                }}
              >
                <ErrorOutlineIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography
                  variant="h3"
                  sx={{ fontWeight: 600, color: theme.palette.error.main }}
                >
                  {stats.missing}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Missing Matches
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </Box>

      {/* Pinned Charts Section */}
      {pinnedCharts.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
            s Pinned Charts
          </Typography>
          <Grid container>
            {pinnedCharts.map((pinnedChart) => (
              <Grid size={{ xs: 12, sm: 12, md: 6, lg: 6 }} spacing={2}>
                <Card
                  elevation={0}
                  sx={{
                    border: `2px solid ${theme.palette.divider}`,
                    borderRadius: 3,
                    overflow: "visible",
                    m: 1,
                  }}
                >
                  <CardContent sx={{ overflow: "visible" }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ mb: 1, fontWeight: 600 }}
                    >
                      {pinnedChart.chart.name} - {pinnedChart.schema?.name}
                    </Typography>
                    <Box
                      sx={{
                        width: "100%",
                        height: 350,
                        overflow: "visible",
                        position: "relative",
                      }}
                    >
                      {pinnedChart.schema && (
                        <ChartRenderer
                          chart={pinnedChart.chart}
                          data={pinnedChart.filteredData}
                          schema={pinnedChart.schema}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Received Matches List */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
          Match Details
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            border: `2px solid ${theme.palette.divider}`,
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {allMatchNumbers.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <DashboardIcon
                sx={{
                  fontSize: 64,
                  color: theme.palette.text.disabled,
                  mb: 2,
                }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No matches received yet
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Match data will appear here as scouts submit their forms
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {allMatchNumbers
                .slice(0)
                .reverse()
                .map((matchNum) => {
                  const devices = receivedMatches.get(matchNum);
                  console.log("Devices for match", matchNum, devices);
                  const scoutCount = devices ? devices.length : 0;
                  const isComplete = scoutCount >= EXPECTED_DEVICES_COUNT;
                  const isMissing = scoutCount === 0;
                  const receivedDeviceIDs = devices
                    ? devices.map((d) => d.deviceID)
                    : [];
                  const missingDeviceIDs = Array.from(
                    { length: EXPECTED_DEVICES_COUNT },
                    (_, i) => i + 1
                  ).filter((id) => !receivedDeviceIDs.includes(id));

                  // Create a map of device data for easy lookup
                  const deviceDataMap = new Map<
                    number,
                    {
                      deviceID: number;
                      qr: QrCode;
                      decoded: DecodedQr;
                      teamNumber: number | null;
                      timestamp: number | null;
                    }
                  >();
                  if (devices) {
                    devices.forEach((d) => {
                      deviceDataMap.set(d.deviceID, d);
                    });
                  }

                  // Determine color based on match status
                  const borderColor = isComplete
                    ? theme.palette.success.main
                    : isMissing
                    ? theme.palette.error.main
                    : theme.palette.warning.main;
                  const backgroundColor = isComplete
                    ? `${theme.palette.success.main}10`
                    : isMissing
                    ? `${theme.palette.error.main}10`
                    : `${theme.palette.warning.main}10`;
                  const iconBackgroundColor = isComplete
                    ? `${theme.palette.success.main}20`
                    : isMissing
                    ? `${theme.palette.error.main}20`
                    : `${theme.palette.warning.main}20`;
                  const iconColor = isComplete
                    ? theme.palette.success.main
                    : isMissing
                    ? theme.palette.error.main
                    : theme.palette.warning.main;
                  const chipColor = isComplete
                    ? "success"
                    : isMissing
                    ? "error"
                    : "warning";

                  return (
                    <Accordion
                      key={matchNum}
                      elevation={0}
                      sx={{
                        backgroundColor: "transparent",
                        border: `2px solid ${borderColor}`,
                        borderRadius: 3,
                        "&:before": {
                          display: "none",
                        },
                        "&.Mui-expanded": {
                          margin: 0,
                        },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={
                          <ExpandIcon
                            sx={{ color: theme.typography.body1.color }}
                          />
                        }
                        sx={{
                          backgroundColor: backgroundColor,
                          borderRadius: 3,
                          "&.Mui-expanded": {
                            borderBottomLeftRadius: 0,
                            borderBottomRightRadius: 0,
                          },
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={2}
                          sx={{ flexGrow: 1 }}
                        >
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 2,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: iconBackgroundColor,
                              color: iconColor,
                            }}
                          >
                            {isComplete ? (
                              <CheckCircleIcon />
                            ) : (
                              <ErrorOutlineIcon />
                            )}
                          </Box>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6">
                              Match {matchNum}
                            </Typography>
                            {missingDeviceIDs.length > 0 && (
                              <Stack
                                direction="row"
                                spacing={0.5}
                                sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}
                              >
                                {missingDeviceIDs
                                  .sort((a, b) => a - b)
                                  .slice(0, 6)
                                  .map((id) => (
                                    <Chip
                                      key={id}
                                      label={`D${id}`}
                                      size="small"
                                      color="error"
                                      variant="outlined"
                                      sx={{
                                        height: 20,
                                        fontSize: "0.7rem",
                                        borderWidth: 1.5,
                                        fontWeight: 600,
                                      }}
                                    />
                                  ))}
                                {missingDeviceIDs.length > 6 && (
                                  <Chip
                                    label={`+${missingDeviceIDs.length - 6}`}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.7rem",
                                      borderWidth: 1.5,
                                      fontWeight: 600,
                                    }}
                                  />
                                )}
                              </Stack>
                            )}
                          </Box>
                          <Chip
                            label={`${scoutCount} / ${EXPECTED_DEVICES_COUNT} Scouts`}
                            color={chipColor}
                            sx={{
                              fontWeight: 600,
                              fontFamily: theme.typography.body1,
                            }}
                          />
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails
                        sx={{
                          borderTop: `2px solid ${borderColor}`,
                          backgroundColor: theme.palette.background.paper,
                          borderBottomLeftRadius: 3,
                          borderBottomRightRadius: 3,
                          p: 3,
                        }}
                      >
                        <Stack spacing={1.5}>
                          {Array.from(
                            { length: EXPECTED_DEVICES_COUNT },
                            (_, i) => i + 1
                          )
                            .sort((a, b) => a - b)
                            .map((deviceId) => {
                              const deviceData = deviceDataMap.get(deviceId);
                              const isReceived = !!deviceData;

                              return (
                                <Paper
                                  key={deviceId}
                                  elevation={0}
                                  sx={{
                                    p: 2,
                                    border: `1.5px solid ${
                                      isReceived
                                        ? theme.palette.success.main
                                        : theme.palette.error.main
                                    }`,
                                    borderRadius: 2,
                                    backgroundColor: isReceived
                                      ? `${theme.palette.success.main}05`
                                      : `${theme.palette.error.main}05`,
                                  }}
                                >
                                  <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={2}
                                  >
                                    <Box
                                      sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1.5,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: isReceived
                                          ? `${theme.palette.success.main}20`
                                          : `${theme.palette.error.main}20`,
                                        color: isReceived
                                          ? theme.palette.success.main
                                          : theme.palette.error.main,
                                        fontWeight: 600,
                                        fontSize: "0.875rem",
                                      }}
                                    >
                                      {deviceId}
                                    </Box>
                                    <Box sx={{ flexGrow: 1 }}>
                                      <Typography
                                        variant="subtitle2"
                                        sx={{ fontWeight: 600 }}
                                      >
                                        Device {deviceId}
                                      </Typography>
                                      {(() => {
                                        const history =
                                          deviceHistory.get(deviceId);
                                        if (isReceived && deviceData) {
                                          // Show current match data
                                          return (
                                            <Typography
                                              variant="body2"
                                              color="text.secondary"
                                              sx={{ mt: 0.25 }}
                                            >
                                              {deviceData.teamNumber
                                                ? `Team ${deviceData.teamNumber} • `
                                                : ""}
                                              Match {matchNum} •{" "}
                                              {formatTimeAgo(
                                                deviceData.timestamp
                                              )}
                                            </Typography>
                                          );
                                        } else if (history) {
                                          // Show last received data from history
                                          return (
                                            <Typography
                                              variant="body2"
                                              color="text.secondary"
                                              sx={{ mt: 0.25 }}
                                            >
                                              Last received:{" "}
                                              {history.teamNumber
                                                ? `Team ${history.teamNumber} `
                                                : ""}
                                              Match {history.matchNumber},{" "}
                                              {formatTimeAgo(history.timestamp)}
                                            </Typography>
                                          );
                                        } else {
                                          // No data ever received
                                          return (
                                            <Typography
                                              variant="body2"
                                              color="text.secondary"
                                              sx={{ mt: 0.25 }}
                                            >
                                              No data received
                                            </Typography>
                                          );
                                        }
                                      })()}
                                    </Box>
                                    <Stack direction="row" spacing={1}>
                                      <Chip
                                        label={
                                          isReceived ? "Received" : "Missing"
                                        }
                                        color={isReceived ? "success" : "error"}
                                        size="small"
                                        sx={{ fontWeight: 600 }}
                                      />
                                      {!isReceived && (
                                        <Button
                                          variant="outlined"
                                          size="small"
                                          color="primary"
                                          onClick={() =>
                                            navigate("/qr", {
                                              state: { openScanner: true },
                                            })
                                          }
                                          sx={{
                                            fontWeight: 600,
                                            borderRadius: 1.5,
                                          }}
                                        >
                                          <QrCodeScannerIcon />
                                        </Button>
                                      )}
                                    </Stack>
                                  </Stack>
                                </Paper>
                              );
                            })}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
