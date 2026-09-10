import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Rechargement automatique si un chunk Vite est introuvable (cache obsolète après déploiement)
window.addEventListener("unhandledrejection", (e) => {
  const msg = e.reason?.message ?? "";
  if (msg.includes("dynamically imported module") || msg.includes("Failed to fetch")) {
    window.location.reload();
  }
});
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "@/hooks/useAuth";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
