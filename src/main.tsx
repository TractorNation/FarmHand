import React from "react";
import ReactDOM from "react-dom/client";
import Home from "./pages/Home";
import { HashRouter, Route, Routes } from "react-router";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);
