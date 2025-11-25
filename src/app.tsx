import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
  CircularProgress,
  useMediaQuery,
  Chip,
  Stack,
  Tooltip,
  CssBaseline,
  Slide,
} from "@mui/material";
import useDrawer from "./hooks/useDrawer";
import MenuIcon from "@mui/icons-material/MenuRounded";
import HomeIcon from "@mui/icons-material/HomeRounded";
import HelpIcon from "@mui/icons-material/HelpRounded";
import AddChartIcon from "@mui/icons-material/AddchartRounded";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";
import DashboardIcon from "@mui/icons-material/DashboardRounded";
import UpdateIcon from "@mui/icons-material/SystemUpdateRounded";
import ArchiveIcon from "@mui/icons-material/ArchiveRounded";
import React, { Suspense, useEffect, useRef, useState } from "react";
import {
  HashRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import { ThemeProvider, alpha, useTheme } from "@mui/material/styles";
import SchemaProvider from "./context/SchemaContext";
import Schemas from "./pages/Schemas";
import SchemaEditor from "./pages/SchemaEditor";
import LeadScoutDashboard from "./pages/Dashboard";
import ScoutDataProvider from "./context/ScoutDataContext";
import { useSettings } from "./context/SettingsContext";
import { themeRegistry, type ThemeRegistryKey } from "./config/themes";
import Archive from "./pages/Archive";
import Help from "./pages/Help";

const Home = React.lazy(() => import("./pages/Home"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Scout = React.lazy(() => import("./pages/Scout"));
const QRPage = React.lazy(() => import("./pages/QR"));

const CURRENT_VERSION: string = "0.1.0-beta";

// TODO: make this actually get data somewhere
const checkForUpdates = async (): Promise<{
  available: boolean;
  version: string;
}> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const latestVersion: string = "0.1.0-beta"; // This would come from github releases or something
      resolve({
        available: latestVersion !== CURRENT_VERSION,
        version: latestVersion,
      });
    }, 1000);
  });
};

const pages = [
  { title: "Home", icon: <HomeIcon />, path: "/" },
  {
    title: "Scout",
    icon: <AddChartIcon />,
    path: "/scout",
  },
  {
    title: "QR Codes",
    icon: <QrCodeIcon />,
    path: "/qr",
  },
  {
    title: "Lead Scouter Dashboard",
    icon: <DashboardIcon />,
    path: "/dashboard",
  },
  {
    title: "Archive",
    icon: <ArchiveIcon />,
    path: "/archive",
  },
  {
    title: "Settings",
    icon: <SettingsIcon />,
    path: "/settings",
  },
  {
    title: "Help",
    icon: <HelpIcon />,
    path: "/help",
  },
];

// This component contains the UI and uses router hooks.
// It must be rendered within a router context.
function Layout({ children }: { children: React.ReactNode }) {
  const { drawerOpen, toggleDrawer } = useDrawer();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const location = useLocation();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState("");
  const [hideHeader, setHideHeader] = useState(false);
  const lastScrollTop = useRef(0);
  const accentBackground =
    theme.palette.primary.container ??
    alpha(
      theme.palette.primary.main,
      theme.palette.mode === "light" ? 0.16 : 0.32
    );
  const accentForeground =
    theme.palette.primary.onContainer ?? theme.palette.primary.contrastText;

  useEffect(() => {
    // Check for updates on mount
    checkForUpdates().then((result) => {
      console.log("Update available", result.available);
      setUpdateAvailable(result.available);
      setLatestVersion(result.version);
    });
  }, []);

  useEffect(() => {
    const scrollThreshold = 10;
    const handleScroll = () => {
      const current = window.scrollY || document.documentElement.scrollTop || 0;
      if (current > lastScrollTop.current + scrollThreshold && current > 80) {
        setHideHeader(true);
      } else if (current < lastScrollTop.current - scrollThreshold) {
        setHideHeader(false);
      }
      lastScrollTop.current = Math.max(current, 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const selectedItemSx = {
    transition: theme.transitions.create(["background-color", "box-shadow"], {
      duration: theme.transitions.duration.shortest,
    }),
    "&.Mui-selected": {
      backgroundColor: accentBackground,
      boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}`,
      "& .MuiListItemIcon-root, & .MuiTypography-root": {
        color: accentForeground,
      },
      "&:hover": {
        backgroundColor: alpha(accentBackground, 0.9),
      },
    },
  };

  // Check if current path starts with any of the navigation paths
  const isPathSelected = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <Box
        sx={{
          width: "100%",
          height: "env(safe-area-inset-top, 0px)",
        }}
      />
      <Slide appear={false} direction="down" in={!hideHeader}>
        <AppBar
          position="sticky"
          color="primary"
          enableColorOnDark
          elevation={0}
          sx={{
            backgroundColor: theme.palette.primary.main,
            paddingLeft: "env(safe-area-inset-left, 0px)",
            paddingRight: "env(safe-area-inset-right, 0px)",
            borderTopRightRadius: 0,
            borderTopLeftRadius: 0,
            boxShadow: "none",
            borderBottom: `1px solid ${theme.palette.surface.outline}`,
          }}
        >
          <Toolbar>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
              onClick={toggleDrawer(true)}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h3"
              sx={{ flexGrow: 1, fontWeight: 600, cursor: "pointer" }}
              onClick={() => navigate("/")}
            >
              FarmHand
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {updateAvailable && (
                <Tooltip title={`Update available: v${latestVersion}`}>
                  <Chip
                    icon={<UpdateIcon />}
                    label="Update"
                    color="warning"
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontFamily: theme.typography.body2?.fontFamily,
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: alpha(
                          theme.palette.warning.main,
                          theme.palette.mode === "light" ? 0.18 : 0.32
                        ),
                      },
                    }}
                  />
                </Tooltip>
              )}
              <Chip
                label={`v${CURRENT_VERSION}`}
                size="small"
                sx={{
                  backgroundColor: theme.palette.primary.dark,
                  color: theme.palette.text.secondary,
                  fontWeight: 600,
                  fontFamily: theme.typography.body2?.fontFamily,
                  borderRadius: theme.shape.borderRadius,
                  border: `1px solid ${alpha(
                    theme.palette.text.primary,
                    0.15
                  )}`,
                }}
              />
            </Stack>
          </Toolbar>
        </AppBar>
      </Slide>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        elevation={16}
        slotProps={{
          paper: {
            sx: {
              width: isMobile ? "75vw" : 300,
              backgroundColor: theme.palette.surface.base,
              display: "flex",
              flexDirection: "column",
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              boxSizing: "border-box",
              borderRight: `1px solid ${theme.palette.surface.outline}`,
            },
          },
        }}
      >
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            paddingLeft: "env(safe-area-inset-left, 0px)",
            paddingRight: "env(safe-area-inset-right, 0px)",
          }}
          onClick={toggleDrawer(false)}
        >
          {/* Drawer Header */}
          <Box
            sx={{
              p: 3,
              backgroundColor: theme.palette.surface.variant,
              borderBottom: `1px solid ${theme.palette.surface.outline}`,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
              FarmHand
            </Typography>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="subtitle2" color="text.secondary">
                Version {CURRENT_VERSION}
              </Typography>
              {updateAvailable && (
                <Chip
                  icon={<UpdateIcon sx={{ fontSize: 14 }} />}
                  label="Update"
                  color="warning"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    fontFamily: theme.typography.body1,
                  }}
                />
              )}
            </Stack>
          </Box>

          {/* Navigation Items */}
          <List sx={{ flexGrow: 1, pt: 2 }}>
            {pages
              .filter(
                (item) =>
                  item.title !== "Settings" &&
                  item.title !== "Archive" &&
                  item.title !== "Help"
              )
              .map((item) => (
                <ListItem key={item.title} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    selected={isPathSelected(item.path)}
                    sx={{
                      ...selectedItemSx,
                      borderRadius: 2,
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      mx: 1,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      disableTypography
                      primary={
                        <Typography variant="subtitle1">
                          {item.title}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
          </List>

          {/* Bottom section */}
          <Box>
            <Divider
              sx={{ mb: 1, borderColor: theme.palette.surface.outline }}
            />
            <List>
              {pages
                .filter(
                  (item) =>
                    item.title === "Settings" ||
                    item.title === "Archive" ||
                    item.title === "Help"
                )
                .map((item) => (
                  <ListItem key={item.title} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      onClick={() => navigate(item.path)}
                      selected={isPathSelected(item.path)}
                      sx={{
                        ...selectedItemSx,
                        borderRadius: 2,
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                        mx: 1,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        disableTypography
                        primary={
                          <Typography variant="subtitle1">
                            {item.title}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
            </List>
          </Box>
        </Box>
      </Drawer>

      {/* Page content */}
      <Box
        sx={{
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {children}
      </Box>
    </>
  );
}

export default function App() {
  const { settings, settingsLoading } = useSettings();
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const themeName =
    (settings.COLOR_THEME as ThemeRegistryKey) || "TractorTheme";
  const selectedThemeContainer =
    themeRegistry[themeName] || themeRegistry.TractorTheme;

  const theme =
    settings.THEME === "dark"
      ? selectedThemeContainer.dark
      : settings.THEME === "light"
      ? selectedThemeContainer.light
      : prefersDarkMode
      ? selectedThemeContainer.dark
      : selectedThemeContainer.light;

  const schema = settings.LAST_SCHEMA_NAME;

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Backspace") {
        const target = event.target as HTMLElement;
        const isTyping =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        if (!isTyping) {
          event.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  if (settingsLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ScoutDataProvider>
        <SchemaProvider schema={schema}>
          <HashRouter>
            <Layout>
              <Suspense
                fallback={
                  <Typography sx={{ p: 3 }}>Loading page...</Typography>
                }
              >
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/scout" element={<Scout />} />
                  <Route path="/qr" element={<QRPage />} />
                  <Route path="/schemas" element={<Schemas />} />
                  <Route
                    path="/schemas/:schemaName"
                    element={<SchemaEditor />}
                  />
                  <Route path="/dashboard" element={<LeadScoutDashboard />} />
                  <Route path="/archive" element={<Archive />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/help" element={<Help />} />
                </Routes>
              </Suspense>
            </Layout>
          </HashRouter>
        </SchemaProvider>
      </ScoutDataProvider>
    </ThemeProvider>
  );
}
