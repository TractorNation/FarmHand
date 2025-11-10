import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import TractorLightTheme from "./config/themes/TractorLightTheme";
import TractorDarkTheme from "./config/themes/TractorDarkTheme";
import App from "./app";
import { CssBaseline } from "@mui/material";
import ScoutDataProvider from "./context/ScoutDataContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={TractorDarkTheme}>
      <CssBaseline />
      <ScoutDataProvider>
        <App />
      </ScoutDataProvider>
    </ThemeProvider>
  </React.StrictMode>
);
