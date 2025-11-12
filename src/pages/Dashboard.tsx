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
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/DashboardRounded";
import ExpandIcon from "@mui/icons-material/ExpandMoreRounded";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import { useMemo } from "react";
import { receivedMatches } from "../utils/SavedMatches_TEMP";

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

  return (
    <Box sx={{ p: 3 }}>
      {/* Main header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.main}05 100%)`,
          border: `1px solid ${theme.palette.primary.main}40`,
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
              backgroundColor: `${theme.palette.primary.main}20`,
              color: theme.palette.primary.main,
            }}
          >
            <DashboardIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Lead Scouter's Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Helpful information for lead scouters
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Received Matches List */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
          Received Matches
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.secondary.main}15 0%, ${theme.palette.secondary.main}05 100%)`,
            border: `1px solid ${theme.palette.secondary.main}40`,
            maxHeight: 450,
            overflowY: "auto",
          }}
        >
          {allMatchNumbers.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              No matches received yet.
            </Typography>
          ) : (
            allMatchNumbers.map((matchNum) => {
              const devices =
                receivedMatches[
                  matchNum as unknown as keyof typeof receivedMatches
                ];
              const scoutCount = devices ? devices.length : 0;
              const isComplete = scoutCount === EXPECTED_DEVICES_COUNT;
              const isError = !isComplete;
              const receivedDeviceIDs = devices
                ? devices.map((d) => d.deviceID)
                : [];
              const missingDeviceIDs = Array.from(
                { length: EXPECTED_DEVICES_COUNT },
                (_, i) => i + 1
              ).filter((id) => !receivedDeviceIDs.includes(id));

              return (
                <Box key={matchNum} sx={{ mb: 1 }}>
                  <Accordion
                    sx={{
                      backgroundColor: "transparent",
                      boxShadow: "none",
                      border: `1px solid ${
                        isError
                          ? theme.palette.error.main
                          : theme.palette.divider
                      }`,
                      borderRadius: 2,
                      "&:before": {
                        display: "none", // Remove default Accordion border
                      },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandIcon />}
                      sx={{
                        backgroundColor: isError
                          ? `${theme.palette.error.main}10`
                          : `${theme.palette.secondary.main}10`,
                        borderRadius: 2,
                        "&.Mui-expanded": {
                          borderBottomLeftRadius: 0,
                          borderBottomRightRadius: 0,
                        },
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ flexGrow: 1 }}
                      >
                        {isError ? (
                          <ErrorOutlineIcon color="error" />
                        ) : (
                          <CheckCircleIcon color="success" />
                        )}
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: isError
                              ? theme.palette.error.main
                              : "inherit",
                          }}
                        >
                          Match {matchNum}
                        </Typography>
                        <Chip
                          label={`${scoutCount} / ${EXPECTED_DEVICES_COUNT} Scouts`}
                          color={isError ? "error" : "success"}
                          size="small"
                          sx={{ ml: 2 }}
                        />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails
                      sx={{
                        borderTop: `1px solid ${
                          isError
                            ? theme.palette.error.main
                            : theme.palette.divider
                        }`,
                        backgroundColor: theme.palette.background.default,
                        borderBottomLeftRadius: 2,
                        borderBottomRightRadius: 2,
                        p: 2,
                      }}
                    >
                      {scoutCount === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No scouts received for this match.
                        </Typography>
                      ) : (
                        <Stack spacing={1}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600 }}
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
                                  size="small"
                                />
                              ))}
                          </Stack>
                          {missingDeviceIDs.length > 0 && (
                            <>
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 600, mt: 2 }}
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
                                      size="small"
                                    />
                                  ))}
                              </Stack>
                            </>
                          )}
                        </Stack>
                      )}
                    </AccordionDetails>
                  </Accordion>
                </Box>
              );
            })
          )}
        </Paper>
      </Box>
    </Box>
  );
}
