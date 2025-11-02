import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import TractorLightTheme from "./config/themes/TractorLightTheme";
import TractorDarkTheme from "./config/themes/TractorDarkTheme";
import App from "./app";
import { CssBaseline } from "@mui/material";
import SchemaProvider from "./context/SchemaContext";
import ScoutDataProvider from "./context/ScoutDataContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={TractorLightTheme}>
      <CssBaseline />
      <SchemaProvider>
        <ScoutDataProvider>
          <App />
        </ScoutDataProvider>
      </SchemaProvider>
    </ThemeProvider>
  </React.StrictMode>
);
