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
  LinearProgress,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/DashboardRounded";
import ExpandIcon from "@mui/icons-material/ExpandMoreRounded";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import DevicesIcon from "@mui/icons-material/DevicesRounded";
import { useMemo } from "react";
import { receivedMatches } from "../utils/SavedMatches_TEMP";
import PageHeader from "../ui/PageHeader";

export default function LeadScoutDashboard() {
  const theme = useTheme();

  // Define the expected number of devices
  const EXPECTED_DEVICES_COUNT = 6;

  // Calculate the maximum match number to iterate through
  const maxMatchNumber = useMemo(() => {
    const matchNumbers = Object.keys(receivedMatches).map(Number);
    return matchNumbers.length > 0 ? Math.max(...matchNumbers) : 0;
  }, [receivedMatches]);

  const allMatchNumbers = Array.from(
    { length: maxMatchNumber },
    (_, i) => i + 1
  );

  // Calculate overall statistics
  const stats = useMemo(() => {
    const complete = allMatchNumbers.filter((matchNum) => {
      const devices =
        receivedMatches[matchNum as unknown as keyof typeof receivedMatches];
      return devices && devices.length === EXPECTED_DEVICES_COUNT;
    }).length;
    const incomplete = allMatchNumbers.length - complete;
    const completionRate =
      allMatchNumbers.length > 0
        ? (complete / allMatchNumbers.length) * 100
        : 0;

    return { complete, incomplete, completionRate };
  }, [allMatchNumbers, EXPECTED_DEVICES_COUNT]);

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
                <ErrorOutlineIcon sx={{ fontSize: 28 }} />
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

          {/* Completion Rate */}
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              p: 3,
              borderRadius: 3,
              border: `2px solid ${theme.palette.info.main}40`,
              background: `linear-gradient(135deg, ${theme.palette.info.main}10 0%, ${theme.palette.info.main}05 100%)`,
            }}
          >
            <Stack spacing={1}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: `${theme.palette.info.main}20`,
                    color: theme.palette.info.main,
                  }}
                >
                  <DevicesIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: 600, color: theme.palette.info.main }}
                  >
                    {Math.round(stats.completionRate)}%
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Completion Rate
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={stats.completionRate}
                sx={{
                  height: 8,
                  borderRadius: 1,
                  backgroundColor: `${theme.palette.info.main}20`,
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: theme.palette.info.main,
                    borderRadius: 1,
                  },
                }}
              />
            </Stack>
          </Paper>
        </Stack>
      </Box>

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
                const devices =
                  receivedMatches[
                    matchNum as unknown as keyof typeof receivedMatches
                  ];
                const scoutCount = devices ? devices.length : 0;
                const isComplete = scoutCount === EXPECTED_DEVICES_COUNT;
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
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Match {matchNum}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${scoutCount} / ${EXPECTED_DEVICES_COUNT} Scouts`}
                          color={isComplete ? "success" : "warning"}
                          sx={{ fontWeight: 600 }}
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
