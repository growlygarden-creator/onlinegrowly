import { useEffect, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { fetchSession, fetchSoilSensors, type AuthSession, type SoilSensor } from "./lib/api";
import { useI18n } from "./lib/i18n";
import { BottomNav } from "./components/BottomNav";
import { GrowlyAssistantDock } from "./components/GrowlyAssistantDock";
import { HubSwitcher } from "./components/HubSwitcher";
import { persistSelectedHubId, selectedHubIdForSession, sessionWithSelectedHub } from "./lib/hubSelection";
import { DashboardPage } from "./pages/DashboardPage";
import { CalendarPage } from "./pages/CalendarPage";
import { GreenhousePage } from "./pages/GreenhousePage";
import { LoginPage } from "./pages/LoginPage";
import { MyGardenTestPage } from "./pages/MyGardenTestPage";
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
const SOIL_BATTERY_ALERT_STORAGE_KEY = "growly.soilBatteryAlerts.v1";
type AppTheme = "light" | "dark";
type ThemeMode = AppTheme | "auto";

function notificationIdForSoilBattery(sensorId: string, level: "warning" | "critical"): number {
  const seed = `${sensorId}:${level}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }
  return 15000 + Math.abs(hash % 3000);
}

function readSoilBatteryAlertTimes(): Record<string, number> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SOIL_BATTERY_ALERT_STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed as Record<string, number> : {};
  } catch {
    return {};
  }
}

function writeSoilBatteryAlertTimes(alerts: Record<string, number>): void {
  try {
    window.localStorage.setItem(SOIL_BATTERY_ALERT_STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // Local notification throttling should never block the app.
  }
}

function soilSensorDisplayName(sensor: SoilSensor): string {
  return sensor.sensor_name || sensor.sensor_id || "jordsensor";
}

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
  const { t } = useI18n();
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
      if (growlyNotificationsEnabled()) {
        scheduleGrowlyNotifications(selectedHubId, false)
          .then(setNotificationStatus)
          .catch(() => undefined);
      }
    }).then(keepHandle).catch(() => undefined);
    LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      recordGrowlyNotificationDelivery(action.notification, "opened");
      if (growlyNotificationsEnabled()) {
        scheduleGrowlyNotifications(selectedHubId, false)
          .then(setNotificationStatus)
          .catch(() => undefined);
      }
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
  }, [isAuthenticated, navigate, selectedHubId]);

  useEffect(() => {
    if (!isAuthenticated || !selectedHubId || notificationStatus !== "granted" || !growlyNotificationsEnabled() || !Capacitor.isNativePlatform()) {
      return;
    }

    let cancelled = false;
    const warningThreshold = Number(authenticatedSession?.hub?.soil_sensor_battery_warning_percent ?? 30);
    const criticalThreshold = Number(authenticatedSession?.hub?.soil_sensor_battery_critical_percent ?? 15);

    const checkSoilBattery = async () => {
      const result = await fetchSoilSensors(selectedHubId);
      if (cancelled || !result?.sensors?.length) {
        return;
      }

      const now = Date.now();
      const alertTimes = readSoilBatteryAlertTimes();
      let changed = false;
      const notifications = result.sensors.flatMap((sensor) => {
        if (typeof sensor.battery_percent !== "number") {
          return [];
        }
        const level = sensor.battery_percent <= criticalThreshold ? "critical" : sensor.battery_percent <= warningThreshold ? "warning" : null;
        if (!level) {
          return [];
        }
        const throttleMs = level === "critical" ? 6 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const alertKey = `${sensor.sensor_id}:${level}`;
        if (now - (alertTimes[alertKey] ?? 0) < throttleMs) {
          return [];
        }

        alertTimes[alertKey] = now;
        changed = true;
        const notification = {
          id: notificationIdForSoilBattery(sensor.sensor_id, level),
          title: t(level === "critical" ? "notifications.generated.soilBatteryCriticalTitle" : "notifications.generated.soilBatteryWarningTitle"),
          body: t(level === "critical" ? "notifications.generated.soilBatteryCriticalBody" : "notifications.generated.soilBatteryWarningBody", {
            sensor: soilSensorDisplayName(sensor),
            percent: Math.round(sensor.battery_percent).toString(),
          }),
          schedule: { at: new Date(now + 1000) },
          extra: { type: "soil-battery", route: "/settings" },
        };
        recordGrowlyNotificationDelivery(notification, "scheduled");
        return [notification];
      });

      if (changed) {
        writeSoilBatteryAlertTimes(alertTimes);
      }
      if (notifications.length) {
        await LocalNotifications.schedule({ notifications });
      }
    };

    checkSoilBattery().catch(() => undefined);
    const intervalId = window.setInterval(() => {
      checkSoilBattery().catch(() => undefined);
    }, 15 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    authenticatedSession?.hub?.soil_sensor_battery_critical_percent,
    authenticatedSession?.hub?.soil_sensor_battery_warning_percent,
    isAuthenticated,
    notificationStatus,
    selectedHubId,
    t,
  ]);

  if (session === undefined) {
    return (
      <main className="page-shell auth-shell">
        <section className="auth-card">
          <p className="eyebrow">Growly Garden</p>
          <h1>{t("app.loading.title")}</h1>
          <p className="lead">{t("app.loading.body")}</p>
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
          path="/min-hage-test"
          element={<MyGardenTestPage />}
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
