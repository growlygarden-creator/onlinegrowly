import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { fetchSession, type AuthSession } from "./lib/api";
import { BottomNav } from "./components/BottomNav";
import { DashboardPage } from "./pages/DashboardPage";
import { CalendarPage } from "./pages/CalendarPage";
import { GreenhousePage } from "./pages/GreenhousePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SettingsPage } from "./pages/SettingsPage";

export function App() {
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);

  useEffect(() => {
    fetchSession().then((result) => {
      setSession(result);
    });
  }, []);

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

  const authenticatedSession: AuthSession | null = session?.authenticated ? session : null;
  const isAuthenticated = !!authenticatedSession;

  return (
    <div className="app-shell">
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? <DashboardPage session={authenticatedSession} /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/drivhus"
          element={isAuthenticated ? <GreenhousePage session={authenticatedSession} /> : <Navigate to="/login" replace />}
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

      {isAuthenticated ? <BottomNav /> : null}
    </div>
  );
}
