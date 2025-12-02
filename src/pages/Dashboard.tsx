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
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/DashboardRounded";
import ExpandIcon from "@mui/icons-material/ExpandMoreRounded";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import WarningIcon from "@mui/icons-material/WarningRounded";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "../ui/PageHeader";
import { useSettings, defaultSettings } from "../context/SettingsContext";
import { useAsyncFetch } from "../hooks/useAsyncFetch";
import { useSchema } from "../context/SchemaContext";
import { createSchemaHash } from "../utils/GeneralUtils";
import { fetchQrCodes, validateQR, decodeQR } from "../utils/QrUtils";
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
  const { settings } = useSettings();
  const { availableSchemas, schema, hash: currentSchemaHash } = useSchema();
  const { analyses } = useAnalysis();
  const [qrCodes] = useAsyncFetch(fetchQrCodes);
  const [receivedMatches, setReceivedMatches] = useState<
    Map<number, Array<{ deviceID: number }>>
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

      const matchesMap = new Map<number, Array<{ deviceID: number }>>();

      // Get all fields from the current schema
      const allFields = schema.sections.flatMap(
        (section) => section.fields
      );

      const matchNumberIndex = allFields.findIndex(
        (field) => field.name === "Match Number"
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

            if (matchNumber) {
              if (!matchesMap.has(matchNumber)) {
                matchesMap.set(matchNumber, []);
              }
              const devices = matchesMap.get(matchNumber)!;
              if (!devices.some((d) => d.deviceID === decoded.deviceId)) {
                devices.push({ deviceID: decoded.deviceId! });
              }
            }
          }
        } catch (e) {
          console.error(`Failed to decode QR code ${qr.name}:`, e);
        }
      }
      setReceivedMatches(matchesMap);
    };

    processQrCodes();
  }, [qrCodes, schema, currentSchemaHash]);

  // Define the expected number of devices
  const EXPECTED_DEVICES_COUNT =
    settings.EXPECTED_DEVICES_COUNT || defaultSettings.EXPECTED_DEVICES_COUNT;

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
      return devices && devices.length === 0;
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
              {allMatchNumbers.map((matchNum) => {
                const devices = receivedMatches.get(matchNum);
                console.log("Devices for match", matchNum, devices);
                const scoutCount = devices ? devices.length : 0;
                const isComplete = scoutCount >= EXPECTED_DEVICES_COUNT;
                const receivedDeviceIDs = devices
                  ? devices.map((d) => d.deviceID)
                  : [];
                const missingDeviceIDs = Array.from(
                  { length: EXPECTED_DEVICES_COUNT },
                  (_, i) => i + 1
                ).filter((id) => !receivedDeviceIDs.includes(id));

                return (
                  <Accordion
                    key={matchNum}
                    elevation={0}
                    sx={{
                      backgroundColor: "transparent",
                      border: `2px solid ${
                        isComplete
                          ? theme.palette.success.main
                          : theme.palette.warning.main
                      }`,
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
                      expandIcon={<ExpandIcon />}
                      sx={{
                        backgroundColor: isComplete
                          ? `${theme.palette.success.main}10`
                          : `${theme.palette.warning.main}10`,
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
                            backgroundColor: isComplete
                              ? `${theme.palette.success.main}20`
                              : `${theme.palette.warning.main}20`,
                            color: isComplete
                              ? theme.palette.success.main
                              : theme.palette.warning.main,
                          }}
                        >
                          {isComplete ? (
                            <CheckCircleIcon />
                          ) : (
                            <ErrorOutlineIcon />
                          )}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6">Match {matchNum}</Typography>
                        </Box>
                        <Chip
                          label={`${scoutCount} / ${EXPECTED_DEVICES_COUNT} Scouts`}
                          color={isComplete ? "success" : "warning"}
                          sx={{
                            fontWeight: 600,
                            fontFamily: theme.typography.body1,
                          }}
                        />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails
                      sx={{
                        borderTop: `2px solid ${
                          isComplete
                            ? theme.palette.success.main
                            : theme.palette.warning.main
                        }`,
                        backgroundColor: theme.palette.background.paper,
                        borderBottomLeftRadius: 3,
                        borderBottomRightRadius: 3,
                        p: 3,
                      }}
                    >
                      {scoutCount === 0 ? (
                        <Typography variant="body1" color="text.secondary">
                          No scouts received for this match.
                        </Typography>
                      ) : (
                        <Stack spacing={2}>
                          {receivedDeviceIDs.length > 0 && (
                            <Box>
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 600, mb: 1 }}
                              >
                                Received from Devices:
                              </Typography>
                              <Stack direction="row" flexWrap="wrap" gap={1}>
                                {receivedDeviceIDs
                                  .sort((a, b) => a - b)
                                  .map((id) => (
                                    <Chip
                                      key={id}
                                      label={`Device ${id}`}
                                      color="success"
                                      variant="outlined"
                                      sx={{
                                        borderWidth: 2,
                                        fontWeight: 600,
                                        fontFamily: theme.typography.body1,
                                      }}
                                    />
                                  ))}
                              </Stack>
                            </Box>
                          )}
                          {missingDeviceIDs.length > 0 && (
                            <Box>
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 600, mb: 1 }}
                              >
                                Missing from Devices:
                              </Typography>
                              <Stack direction="row" flexWrap="wrap" gap={1}>
                                {missingDeviceIDs
                                  .sort((a, b) => a - b)
                                  .map((id) => (
                                    <Chip
                                      key={id}
                                      label={`Device ${id}`}
                                      color="error"
                                      variant="outlined"
                                      sx={{
                                        borderWidth: 2,
                                        fontWeight: 600,
                                        fontFamily: theme.typography.body1,
                                      }}
                                    />
                                  ))}
                              </Stack>
                            </Box>
                          )}
                        </Stack>
                      )}
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
