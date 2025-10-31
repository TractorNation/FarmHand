import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import TractorLightTheme from "./UI/themes/TractorLightTheme";
// import TractorDarkTheme from "./UI/themes/TractorDarkTheme";
import App from "./app";
import { CssBaseline } from "@mui/material";
import SchemaProvider from "./context/SchemaContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={TractorLightTheme}>
      <CssBaseline />
      <SchemaProvider>
        <App />
      </SchemaProvider>
    </ThemeProvider>
  </React.StrictMode>
);
