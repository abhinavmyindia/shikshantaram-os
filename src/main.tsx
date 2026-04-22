import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyReducedMotion, getReducedMotion } from "./hooks/useUserPrefs";

// Apply reduced motion preference before React mounts so the very first paint respects it.
applyReducedMotion(getReducedMotion());

createRoot(document.getElementById("root")!).render(<App />);
