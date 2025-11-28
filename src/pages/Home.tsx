import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { readChangelog } from "../utils/GeneralUtils";
import {
  Typography,
  Card,
  CardContent,
  Box,
  Button,
  Stack,
  Grid,
  Paper,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import Markdown from "react-markdown";
import AddChartIcon from "@mui/icons-material/AddchartRounded";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";
import DashboardIcon from "@mui/icons-material/DashboardRounded";
import HelpIcon from "@mui/icons-material/HelpOutlineRounded";
import HomeIcon from "@mui/icons-material/HomeRounded";
import NewReleasesIcon from "@mui/icons-material/NewReleasesRounded";
import InfoIcon from "@mui/icons-material/InfoRounded";
import PageHeader from "../ui/PageHeader";

export default function Home() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [latestEntry, setLatestEntry] = useState<string>("");

  const components = {
    h1: ({ ...props }) => <Typography variant="h3" gutterBottom {...props} />,
    h2: ({ ...props }) => <Typography variant="h4" gutterBottom {...props} />,
    h3: ({ ...props }) => <Typography variant="h5" gutterBottom {...props} />,
    h4: ({ ...props }) => <Typography variant="h6" gutterBottom {...props} />,
    h5: ({ ...props }) => (
      <Typography variant="subtitle1" gutterBottom {...props} />
    ),
    h6: ({ ...props }) => (
      <Typography variant="subtitle2" gutterBottom {...props} />
    ),
    p: ({ ...props }) => <Typography variant="body1" {...props} />,
  };

  useEffect(() => {
    const fetchChangelog = async () => {
      try {
        const changelog = await readChangelog();
        setLatestEntry(changelog);
      } catch (error) {
        console.error("Failed to fetch changelog:", error);
        setLatestEntry("Error reading changelog.");
      }
    };
    fetchChangelog();
  }, []);

  const quickActions = [
    {
      title: "Scout a Match",
      description: "Start recording match data",
      icon: <AddChartIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.primary.main,
      path: "/scout",
    },
    {
      title: "View QR Codes",
      description: "Manage your collected data",
      icon: <QrCodeIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.secondary.main,
      path: "/qr",
    },
    {
      title: "Dashboard",
      description: "Quickly analyze your scouting data",
      icon: <DashboardIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.info.main,
      path: "/dashboard",
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Header */}
      <PageHeader
        icon={<HomeIcon sx={{ fontSize: 28 }} />}
        title="Welcome to FarmHand!"
        subtitle="Your scouting companion for FIRST Robotics Competitions"
      />

      {/* New User Help Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: theme.shape.borderRadius,
          backgroundColor: alpha(
            theme.palette.info.main,
            theme.palette.mode === "light" ? 0.08 : 0.22
          ),
          border: `1px solid ${alpha(theme.palette.info.main, 0.35)}`,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <HelpIcon sx={{ fontSize: 32, color: theme.palette.info.main }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" gutterBottom>
              New here? Let's get you started!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Learn how to use FarmHand effectively for your scouting needs
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="info"
            startIcon={<HelpIcon />}
            onClick={() => {
              navigate("/help");
            }}
            sx={{
              borderRadius: theme.shape.borderRadius,
              px: 3,
            }}
          >
            Help
          </Button>
        </Stack>
      </Paper>

      {/* About Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: theme.shape.borderRadius,
          backgroundColor: alpha(
            theme.palette.secondary.main,
            theme.palette.mode === "light" ? 0.08 : 0.2
          ),
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.35)}`,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <InfoIcon
            sx={{ fontSize: 32, color: theme.palette.secondary.main }}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" gutterBottom>
              Want to learn more about FarmHand?
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Learn about our team and our mission
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<InfoIcon />}
            href="https://tractornation.org/home"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              borderRadius: theme.shape.borderRadius,
              px: 3,
            }}
          >
            About Us
          </Button>
        </Stack>
      </Paper>

      {/* Quick Actions Grid */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          {quickActions.map((action, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: theme.shape.borderRadius,
                  border: `1px solid ${theme.palette.surface.outline}`,
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  opacity: 1,
                  "&:hover": {
                    transform: "translateY(-4px)",
                    borderColor: alpha(action.color, 0.65),
                    boxShadow: theme.customShadows.card,
                  },
                }}
                onClick={() => navigate(action.path)}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: alpha(
                          action.color,
                          theme.palette.mode === "light" ? 0.12 : 0.32
                        ),
                        color: action.color,
                      }}
                    >
                      {action.icon}
                    </Box>
                  </Box>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ fontWeight: 600 }}
                  >
                    {action.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {action.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* What's New Section */}
      <Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 2,
          }}
        >
          <NewReleasesIcon
            sx={{ color: theme.palette.success.main, fontSize: 28 }}
          />
          <Typography variant="h5" sx={{ fontWeight: 500 }}>
            What's New
          </Typography>
        </Box>
        <Card
          variant="outlined"
          elevation={0}
          sx={{
            borderColor: theme.palette.surface.outline,
            borderWidth: 1,
            borderRadius: theme.shape.borderRadius,
            backgroundColor: theme.palette.surface.elevated,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              backgroundColor: alpha(
                theme.palette.success.main,
                theme.palette.mode === "light" ? 0.1 : 0.25
              ),
              borderBottom: `1px solid ${theme.palette.surface.outline}`,
              p: 2,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                color: theme.palette.success.main,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Latest Updates
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            {latestEntry.split("\n").map((line, index) => (
              <Markdown key={index} components={components}>
                {line}
              </Markdown>
            ))}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
