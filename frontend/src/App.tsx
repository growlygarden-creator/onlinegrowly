import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { fetchSession, type AuthSession } from "./lib/api";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

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
          <p className="lead">Sjekker innloggingen din.</p>
        </section>
      </main>
    );
  }

  const isAuthenticated = !!session?.authenticated;

  return (
    <div className="app-shell">
      {isAuthenticated ? (
        <header className="site-header">
          <NavLink className="brand" to="/">
            <img className="brand-logo" src="/logo.png" alt="Growly Garden logo" />
            <div className="brand-copy">
              <strong>Growly Garden</strong>
              <small>Capacitor-klar frontend</small>
            </div>
          </NavLink>

          <nav className="site-nav">
            <NavLink to="/">Oversikt</NavLink>
          </nav>
        </header>
      ) : null}

      <Routes>
        <Route path="/" element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>
    </div>
  );
}
