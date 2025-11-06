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
} from "@mui/material";
import useDrawer from "./hooks/useDrawer";
import MenuIcon from "@mui/icons-material/MenuRounded";
import HomeIcon from "@mui/icons-material/HomeRounded";
import AddChartIcon from "@mui/icons-material/AddchartRounded";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";
import React, { useEffect } from "react";
import { HashRouter, Route, Routes, useNavigate } from "react-router";
import Home from "./pages/Home";
import Settings from "./pages/Settings";
import Scout from "./pages/Scout";
import { useTheme } from "@mui/material/styles";
import QRPage from "./pages/QR";

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

  return (
    <>
      <AppBar
        position="static"
        sx={{ backgroundColor: theme.palette.primary.main }}
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
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        sx={{ backdropFilter: "blur(2px)" }}
      >
        <Box
          sx={{
            width: "25vw",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={toggleDrawer(false)}
        >
          <List>
            {pages
              .filter((item) => item.title !== "Settings")
              .map((item) => (
                <ListItem key={item.title} disablePadding>
                  <ListItemButton onClick={() => navigate(item.path)}>
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
          <Box sx={{ marginTop: "auto" }}>
            <Divider />
            <List>
              <ListItem disablePadding>
                <ListItemButton onClick={() => navigate("/settings")}>
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
      {children}
    </>
  );
}

export default function App() {
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

  return (
    <HashRouter>
      <Routes>
        {pages.map((page) => (
          <Route
            key={page.title}
            path={page.path}
            element={<Layout>{page.component}</Layout>}
          />
        ))}
      </Routes>
    </HashRouter>
  );
}
