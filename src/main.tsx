import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import { CssBaseline } from "@mui/material";
import SettingsProvider from "./context/SettingsContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </React.StrictMode>
);
