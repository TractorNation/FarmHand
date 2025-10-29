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
import React from "react";
import { HashRouter, Route, Routes, useNavigate } from "react-router";
import Home from "./pages/Home";
import Settings from "./pages/Settings";
import Scout from "./pages/Scout";

const pages = [
  { text: "Home", icon: <HomeIcon />, component: <Home />, path: "/" },
  {
    text: "Scout",
    icon: <AddChartIcon />,
    component: <Scout />,
    path: "/scout",
  },
  {
    text: "Settings",
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

  return (
    <>
      <AppBar position="sticky" color="primary">
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
      <Drawer open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box
          sx={{
            width: 250,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={toggleDrawer(false)}
        >
          <List>
            {pages
              .filter((item) => item.text !== "Settings")
              .map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton onClick={() => navigate(item.path)}>
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
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
                  <ListItemText primary="Settings" />
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
  return (
    <HashRouter>
      <Routes>
        {pages.map((page) => (
          <Route
            key={page.text}
            path={page.path}
            element={<Layout>{page.component}</Layout>}
          />
        ))}
      </Routes>
    </HashRouter>
  );
}
