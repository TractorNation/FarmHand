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
} from "@mui/material";
import useDrawer from "./hooks/useDrawer";
import MenuIcon from "@mui/icons-material/MenuRounded";
import HomeIcon from "@mui/icons-material/HomeRounded";
import AddChartIcon from "@mui/icons-material/AddchartRounded";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";
import React, { Suspense, useEffect, useState } from "react";
import {
  HashRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import { useTheme } from "@mui/material/styles";
import SchemaProvider from "./context/SchemaContext";
import { defaultSchemas } from "./utils/DefaultSchemas";
import StoreManager from "./utils/StoreManager";

const Home = React.lazy(() => import("./pages/Home"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Scout = React.lazy(() => import("./pages/Scout"));
const QRPage = React.lazy(() => import("./pages/QR"));

const pages = [
  { title: "Home", icon: <HomeIcon />, component: <Home />, path: "/" },
  {
    title: "Scout",
    icon: <AddChartIcon />,
    component: <Scout />,
    path: "/scout",
  },
  {
    title: "QR Codes",
    icon: <QrCodeIcon />,
    component: <QRPage />,
    path: "/qr",
  },
  {
    title: "Settings",
    icon: <SettingsIcon />,
    component: <Settings />,
    path: "/settings",
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

  const selectedItemSx = {
    "&.Mui-selected": {
      backgroundColor: "transparent",
      borderLeft: `4px solid ${theme.palette.secondary.main}`,
      paddingLeft: "12px",
      "&:hover": {
        backgroundColor: theme.palette.action.hover,
      },
      "& .MuiListItemIcon-root, & .MuiTypography-root": {
        color: theme.palette.secondary.main,
      },
    },
  };

  return (
    <>
      <Box
        sx={{
          width: "100%",
          backgroundColor: theme.palette.primary.dark,
          height: "env(safe-area-inset-top, 0px)",
        }}
      />
      <AppBar
        position="static"
        elevation={4}
        sx={{
          backgroundColor: theme.palette.primary.main,
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
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
          <Typography variant="h3" sx={{ flexGrow: 1 }}>
            FarmHand
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        elevation={16}
        slotProps={{
          paper: {
            sx: {
              width: isMobile ? "75vw" : 300,
              backgroundColor: theme.palette.background.default,
              display: "flex",
              flexDirection: "column",
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              boxSizing: "border-box",
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
          <List>
            {pages
              .filter((item) => item.title !== "Settings")
              .map((item) => (
                <ListItem key={item.title} disablePadding>
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    selected={location.pathname === item.path}
                    sx={selectedItemSx}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText
                      disableTypography
                      primary={
                        <Typography variant="h6">{item.title}</Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
          </List>

          {/* Bottom section */}
          <Box sx={{ mt: "auto" }}>
            <Divider />
            <List>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => navigate("/settings")}
                  selected={location.pathname === "/settings"}
                  sx={selectedItemSx}
                >
                  <ListItemIcon>
                    <SettingsIcon />
                  </ListItemIcon>
                  <Typography variant="h6">Settings</Typography>
                </ListItemButton>
              </ListItem>
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
  const [selectedSchemaName, setSelectedSchemaName] = useState<string | null>(
    null
  );

  useEffect(() => {
    const initSchema = async () => {
      const lastSchema = await StoreManager.getLastSchema();
      if (lastSchema && defaultSchemas.find((s) => s.name === lastSchema)) {
        setSelectedSchemaName(lastSchema);
      } else if (defaultSchemas.length > 0) {
        setSelectedSchemaName(defaultSchemas[1].name); // "2025 Reefscape"
      }
    };
    initSchema();
  }, []);

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

  if (!selectedSchemaName) {
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
    <SchemaProvider
      schema={selectedSchemaName}
      onSchemaChange={setSelectedSchemaName}
    >
      <HashRouter>
        <Routes>
          {pages.map(({ path, component }) => (
            <Route
              key={path}
              path={path}
              element={
                <Layout>
                  <Suspense
                    fallback={
                      <Typography sx={{ p: 3 }}>Loading page...</Typography>
                    }
                  >
                    {component}
                  </Suspense>
                </Layout>
              }
            />
          ))}
        </Routes>
      </HashRouter>
    </SchemaProvider>
  );
}
