import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { fetchSession, type AuthSession } from "./lib/api";
import { BottomNav } from "./components/BottomNav";
import { GrowlyAssistantDock } from "./components/GrowlyAssistantDock";
import { HubSwitcher } from "./components/HubSwitcher";
import { persistSelectedHubId, selectedHubIdForSession, sessionWithSelectedHub } from "./lib/hubSelection";
import { DashboardPage } from "./pages/DashboardPage";
import { CalendarPage } from "./pages/CalendarPage";
import { GreenhousePage } from "./pages/GreenhousePage";
import { LoginPage } from "./pages/LoginPage";
import { PlantCatalogPage } from "./pages/PlantCatalogPage";
import { PlantHistoryPage } from "./pages/PlantHistoryPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SettingsPage } from "./pages/SettingsPage";

const THEME_STORAGE_KEY = "growly.theme";
type AppTheme = "light" | "dark";

export function App() {
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    fetchSession().then((result) => {
      setSession(result);
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", theme === "dark");
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors in embedded browser contexts.
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  if (session === undefined) {
    return (
      <main className="page-shell auth-shell">
        <section className="auth-card">
          <p className="eyebrow">Growly Garden</p>
          <h1>Laster inn...</h1>
          <p className="lead">Sjekker innloggingen din. Hvis backend ikke svarer, fortsetter appen straks til innlogging.</p>
        </section>
      </main>
    );
  }

  const baseAuthenticatedSession: AuthSession | null = session?.authenticated ? session : null;
  const selectedHubId = selectedHubIdForSession(baseAuthenticatedSession);
  const authenticatedSession: AuthSession | null =
    baseAuthenticatedSession && selectedHubId
      ? sessionWithSelectedHub(baseAuthenticatedSession, selectedHubId)
      : baseAuthenticatedSession;
  const isAuthenticated = !!authenticatedSession;

  function handleSelectHub(hubId: string) {
    if (!baseAuthenticatedSession) {
      return;
    }
    persistSelectedHubId(baseAuthenticatedSession, hubId);
    setSession(sessionWithSelectedHub(baseAuthenticatedSession, hubId));
  }

  return (
    <div className="app-shell">
      {isAuthenticated ? (
        <HubSwitcher session={authenticatedSession} selectedHubId={selectedHubId} onSelectHub={handleSelectHub} />
      ) : null}
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <DashboardPage session={authenticatedSession} selectedHubId={selectedHubId} theme={theme} onToggleTheme={toggleTheme} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/drivhus"
          element={isAuthenticated ? <GreenhousePage session={authenticatedSession} selectedHubId={selectedHubId} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/kartotek"
          element={isAuthenticated ? <PlantCatalogPage session={authenticatedSession} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/historikk"
          element={isAuthenticated ? <PlantHistoryPage session={authenticatedSession} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/kalender"
          element={isAuthenticated ? <CalendarPage session={authenticatedSession} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings"
          element={
            isAuthenticated ? (
              <SettingsPage session={authenticatedSession} setSession={setSession} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage setSession={setSession} />} />
        <Route path="/register" element={<RegisterPage setSession={setSession} />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>

      {isAuthenticated ? (
        <>
          <GrowlyAssistantDock selectedHubId={selectedHubId} />
          <BottomNav />
        </>
      ) : null}
    </div>
  );
}
