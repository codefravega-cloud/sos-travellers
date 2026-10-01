import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import MapExplorer from "./map-explorer";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MapExplorer />
  </StrictMode>,
);
