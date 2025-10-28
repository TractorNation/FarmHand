import React from "react";
import ReactDOM from "react-dom/client";
import Home from "./pages/Home";
import { HashRouter, Route, Routes } from "react-router";
import TractorLightTheme from "./UI/themes/TractorLightTheme";
import { ThemeProvider } from "@emotion/react";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={TractorLightTheme}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  </React.StrictMode>
);
