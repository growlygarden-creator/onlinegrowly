import { useEffect, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
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
import { NotificationsPage } from "./pages/NotificationsPage";
import {
  cancelGrowlyNotifications,
  growlyNotificationTargetRoute,
  growlyNotificationStatus,
  growlyNotificationsEnabled,
  recordGrowlyNotificationDelivery,
  scheduleGrowlyNotifications,
  syncGrowlyNotificationHistory,
  type GrowlyNotificationStatus,
} from "./lib/notifications";

const THEME_STORAGE_KEY = "growly.theme";
type AppTheme = "light" | "dark";
type ThemeMode = AppTheme | "auto";

function readSystemTheme(): AppTheme {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredThemeMode(): ThemeMode {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "dark" || storedTheme === "light" || storedTheme === "auto" ? storedTheme : "auto";
  } catch {
    return "auto";
  }
}

export function App() {
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  const [themeMode, setThemeMode] = useState<ThemeMode>(readStoredThemeMode);
  const [systemTheme, setSystemTheme] = useState<AppTheme>(readSystemTheme);
  const [notificationStatus, setNotificationStatus] = useState<GrowlyNotificationStatus>("off");
  const theme: AppTheme = themeMode === "auto" ? systemTheme : themeMode;

  useEffect(() => {
    fetchSession().then((result) => {
      setSession(result);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = () => {
      setSystemTheme(themeQuery.matches ? "dark" : "light");
    };
    handleThemeChange();
    themeQuery.addEventListener("change", handleThemeChange);
    return () => {
      themeQuery.removeEventListener("change", handleThemeChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", theme === "dark");
    document.documentElement.dataset.themeMode = themeMode;
    document.documentElement.classList.toggle("capacitor-native", Capacitor.isNativePlatform());

    if (Capacitor.isNativePlatform()) {
      const statusBarBackground = theme === "dark" ? "#0f1711" : "#f8f7f4";
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined);
      StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light }).catch(() => undefined);
      StatusBar.setBackgroundColor({ color: statusBarBackground }).catch(() => undefined);
    }

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // Ignore storage errors in embedded browser contexts.
    }
  }, [theme, themeMode]);

  useEffect(() => {
    growlyNotificationStatus().then(setNotificationStatus).catch(() => setNotificationStatus("off"));
  }, []);

  const baseAuthenticatedSession: AuthSession | null = session?.authenticated ? session : null;
  const selectedHubId = selectedHubIdForSession(baseAuthenticatedSession);
  const authenticatedSession: AuthSession | null =
    baseAuthenticatedSession && selectedHubId
      ? sessionWithSelectedHub(baseAuthenticatedSession, selectedHubId)
      : baseAuthenticatedSession;
  const isAuthenticated = !!authenticatedSession;

  useEffect(() => {
    if (!isAuthenticated || !growlyNotificationsEnabled()) {
      return;
    }
    scheduleGrowlyNotifications(selectedHubId, false)
      .then(setNotificationStatus)
      .catch(() => setNotificationStatus("off"));
  }, [isAuthenticated, selectedHubId]);

  useEffect(() => {
    if (!isAuthenticated || !Capacitor.isNativePlatform()) {
      return;
    }

    let cancelled = false;
    const handles: PluginListenerHandle[] = [];
    const keepHandle = (handle: PluginListenerHandle) => {
      if (cancelled) {
        handle.remove().catch(() => undefined);
        return;
      }
      handles.push(handle);
    };

    syncGrowlyNotificationHistory().catch(() => undefined);
    LocalNotifications.addListener("localNotificationReceived", (notification) => {
      recordGrowlyNotificationDelivery(notification, "received");
    }).then(keepHandle).catch(() => undefined);
    LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      recordGrowlyNotificationDelivery(action.notification, "opened");
      navigate("/varsler", { state: { fromNotification: growlyNotificationTargetRoute(action.notification) } });
    }).then(keepHandle).catch(() => undefined);
    CapacitorApp.addListener("appStateChange", (state) => {
      if (state.isActive) {
        syncGrowlyNotificationHistory().catch(() => undefined);
      }
    }).then(keepHandle).catch(() => undefined);

    return () => {
      cancelled = true;
      handles.forEach((handle) => {
        handle.remove().catch(() => undefined);
      });
    };
  }, [isAuthenticated, navigate]);

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

  function handleSelectHub(hubId: string) {
    if (!baseAuthenticatedSession) {
      return;
    }
    persistSelectedHubId(baseAuthenticatedSession, hubId);
    setSession(sessionWithSelectedHub(baseAuthenticatedSession, hubId));
  }

  async function refreshGrowlyNotifications(requestPermission = false) {
    const status = await scheduleGrowlyNotifications(selectedHubId, requestPermission);
    setNotificationStatus(status);
    return status;
  }

  async function disableGrowlyNotifications() {
    await cancelGrowlyNotifications();
    setNotificationStatus("off");
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
              <DashboardPage session={authenticatedSession} selectedHubId={selectedHubId} theme={theme} />
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
          element={isAuthenticated ? <CalendarPage session={authenticatedSession} selectedHubId={selectedHubId} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/varsler"
          element={isAuthenticated ? <NotificationsPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings"
          element={
            isAuthenticated ? (
              <SettingsPage
                session={authenticatedSession}
                setSession={setSession}
                theme={theme}
                themeMode={themeMode}
                onThemeModeChange={setThemeMode}
                notificationStatus={notificationStatus}
                onEnableNotifications={() => refreshGrowlyNotifications(true)}
                onRefreshNotifications={() => refreshGrowlyNotifications(false)}
                onDisableNotifications={disableGrowlyNotifications}
              />
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
