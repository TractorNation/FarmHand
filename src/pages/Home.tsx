import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { readChangelog } from "../utils/GeneralUtils";
import {
  Typography,
  Card,
  CardContent,
  useTheme,
  Box,
  Button,
  Stack,
  Grid,
  Paper,
} from "@mui/material";
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
          borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.info.main}15 0%, ${theme.palette.info.main}05 100%)`,
          border: `1px solid ${theme.palette.info.main}40`,
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
            onClick={() => {}}
            sx={{
              borderRadius: 2,
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
          borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.secondary.main}15 0%, ${theme.palette.secondary.main}05 100%)`,
          border: `1px solid ${theme.palette.secondary.main}40`,
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
            onClick={() => {}}
            sx={{
              borderRadius: 2,
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
                  borderRadius: 3,
                  border: `2px solid ${theme.palette.divider}`,
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  opacity: 1,
                  "&:hover": {
                    transform: "translateY(-4px)",
                    borderColor: action.color,
                    boxShadow: `0 8px 24px ${action.color}30`,
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
                        backgroundColor: `${action.color}20`,
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
            borderColor: theme.palette.divider,
            borderWidth: 2,
            borderRadius: 3,
            backgroundColor: theme.palette.background.paper,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.success.main}20 0%, ${theme.palette.success.main}05 100%)`,
              borderBottom: `2px solid ${theme.palette.divider}`,
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
