import { lazy, StrictMode, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import MapExplorer from "./map-explorer";
import "./globals.css";

// The routes besides the site itself, each kept out of the main bundle (rewrites in vercel.json):
// /equipo (agents), /panel (accounts of owners and team) and /r/<id> (review link on a business's NFC tag).
const TeamPanel = lazy(() => import("./team-panel"));
const Panel = lazy(() => import("./panel"));
const ReviewLink = lazy(() => import("./review-link"));

const path = window.location.pathname;
const reviewId = /^\/r\/(\d{1,9})\/?$/.exec(path)?.[1];
const page: ReactNode = /^\/equipo\/?$/.test(path) ? <TeamPanel />
  : /^\/panel\/?$/.test(path) ? <Panel />
  : reviewId ? <ReviewLink businessId={Number(reviewId)} />
  : null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {page ? <Suspense fallback={null}>{page}</Suspense> : <MapExplorer />}
  </StrictMode>,
);
