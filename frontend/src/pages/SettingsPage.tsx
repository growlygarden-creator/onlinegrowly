import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createPairing,
  createSoilSensorPairing,
  fetchActivePairing,
  fetchMemoryDebug,
  fetchPlants,
  fetchSoilSensors,
  logout,
  saveHubSettings,
  searchWeatherAddress,
  updatePlant,
  updateProfile,
  updateSoilSensor,
  type AuthSession,
  type GrowlyPlant,
  type MemoryDebugReport,
  type PairingInfo,
  type SoilSensor,
  type SoilSensorPairing,
  type WeatherAddressMatch,
} from "../lib/api";
import {
  growlyNotificationPreferences,
  saveGrowlyNotificationPreferences,
  type GrowlyNotificationPreferences,
  type GrowlyNotificationStatus,
} from "../lib/notifications";
import { useI18n, type LanguageMode } from "../lib/i18n";

type SettingsPageProps = {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
  theme: "light" | "dark";
  themeMode: ThemeMode;
  onThemeModeChange: (themeMode: ThemeMode) => void;
  notificationStatus: GrowlyNotificationStatus;
  onEnableNotifications: () => Promise<GrowlyNotificationStatus>;
  onRefreshNotifications: () => Promise<GrowlyNotificationStatus>;
  onDisableNotifications: () => Promise<void>;
};

type ThemeMode = "light" | "dark" | "auto";

function initialsFromName(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function isHubActive(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function plantInstanceId(plant: GrowlyPlant): string {
  return plant.instanceId || plant.plant_id || "";
}

function plantDisplayName(plant: GrowlyPlant, fallback: string): string {
  return plant.nickname || plant.display_name || plant.profileId || plant.profile_id || fallback;
}

function plantUsesSevenInOne(plant: GrowlyPlant): boolean {
  return Boolean(plant.hasSevenInOne ?? plant.has_seven_in_one);
}

function minutesToMs(minutes: string): number {
  const value = Number(minutes);
  return Math.max(5, Math.min(120, Number.isFinite(value) ? value : 30)) * 60_000;
}

function msToMinutes(value: unknown, fallback: number): string {
  const numeric = typeof value === "number" ? value : fallback;
  return Math.round(numeric / 60_000).toString();
}

export function SettingsPage({
  session,
  setSession,
  theme,
  themeMode,
  onThemeModeChange,
  notificationStatus,
  onEnableNotifications,
  onRefreshNotifications,
  onDisableNotifications,
}: SettingsPageProps) {
  const { language, languageMode, setLanguageMode, t } = useI18n();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [pairing, setPairing] = useState<PairingInfo | null>(null);
  const [weatherAddress, setWeatherAddress] = useState("");
  const [weatherLatitude, setWeatherLatitude] = useState(session?.hub?.weather_latitude?.toString() || "");
  const [weatherLongitude, setWeatherLongitude] = useState(session?.hub?.weather_longitude?.toString() || "");
  const [addressMatches, setAddressMatches] = useState<WeatherAddressMatch[]>([]);
  const [addressLookupBusy, setAddressLookupBusy] = useState(false);
  const [locationLookupBusy, setLocationLookupBusy] = useState(false);
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const [hubPanelOpen, setHubPanelOpen] = useState(false);
  const [weatherPanelOpen, setWeatherPanelOpen] = useState(false);
  const [profileFullName, setProfileFullName] = useState(session?.user?.full_name || "");
  const [profilePhone, setProfilePhone] = useState(session?.user?.phone || "");
  const [profileEmail, setProfileEmail] = useState(session?.user?.email || "");
  const [profilePassword, setProfilePassword] = useState("");
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState<GrowlyNotificationPreferences>(growlyNotificationPreferences);
  const [sensorPlants, setSensorPlants] = useState<GrowlyPlant[]>([]);
  const [sensorPlantsLoading, setSensorPlantsLoading] = useState(false);
  const [sensorAssigning, setSensorAssigning] = useState(false);
  const [soilSensors, setSoilSensors] = useState<SoilSensor[]>([]);
  const [soilPairing, setSoilPairing] = useState<SoilSensorPairing | null>(null);
  const [soilSensorLimit, setSoilSensorLimit] = useState(10);
  const [soilSensorSlotsRemaining, setSoilSensorSlotsRemaining] = useState(10);
  const [soilPairingBusy, setSoilPairingBusy] = useState(false);
  const [soilAssigningId, setSoilAssigningId] = useState("");
  const [soilDayIntervalMinutes, setSoilDayIntervalMinutes] = useState(() => msToMinutes(session?.hub?.soil_sensor_day_interval_ms, 1_800_000));
  const [soilNightIntervalMinutes, setSoilNightIntervalMinutes] = useState(() => msToMinutes(session?.hub?.soil_sensor_night_interval_ms, 3_600_000));
  const [soilDayStart, setSoilDayStart] = useState(session?.hub?.soil_sensor_day_start || "07:00");
  const [soilNightStart, setSoilNightStart] = useState(session?.hub?.soil_sensor_night_start || "22:00");
  const [soilBatteryWarning, setSoilBatteryWarning] = useState(String(session?.hub?.soil_sensor_battery_warning_percent ?? 30));
  const [soilBatteryCritical, setSoilBatteryCritical] = useState(String(session?.hub?.soil_sensor_battery_critical_percent ?? 15));
  const [soilScheduleSaving, setSoilScheduleSaving] = useState(false);
  const [memoryDebug, setMemoryDebug] = useState<MemoryDebugReport | null>(null);
  const [memoryDebugBusy, setMemoryDebugBusy] = useState(false);

  const themeModeOptions: Array<{ value: ThemeMode; label: string }> = [
    { value: "light", label: t("settings.themeLight") },
    { value: "dark", label: t("settings.themeDark") },
    { value: "auto", label: t("settings.auto") },
  ];
  const languageModeOptions: Array<{ value: LanguageMode; label: string }> = [
    { value: "auto", label: t("settings.auto") },
    { value: "no", label: t("settings.languageNorwegian") },
    { value: "en", label: t("settings.languageEnglish") },
  ];

  const activeHubId = session?.hub?.hub_id || "";
  const hasPairedHub = Boolean(activeHubId);
  const sensorAssignedPlant = sensorPlants.find(plantUsesSevenInOne) ?? null;
  const sensorAssignedPlantId = sensorAssignedPlant ? plantInstanceId(sensorAssignedPlant) : "";

  useEffect(() => {
    fetchActivePairing().then((activePairing) => {
      setPairing(activePairing);
    });
  }, []);

  useEffect(() => {
    setWeatherAddress("");
    setWeatherLatitude(session?.hub?.weather_latitude?.toString() || "");
    setWeatherLongitude(session?.hub?.weather_longitude?.toString() || "");
  }, [session?.hub?.hub_id, session?.hub?.weather_latitude, session?.hub?.weather_longitude]);

  useEffect(() => {
    setProfileFullName(session?.user?.full_name || "");
    setProfilePhone(session?.user?.phone || "");
    setProfileEmail(session?.user?.email || "");
    setProfilePassword("");
  }, [session?.user?.username, session?.user?.full_name, session?.user?.phone, session?.user?.email]);

  useEffect(() => {
    setSoilDayIntervalMinutes(msToMinutes(session?.hub?.soil_sensor_day_interval_ms, 1_800_000));
    setSoilNightIntervalMinutes(msToMinutes(session?.hub?.soil_sensor_night_interval_ms, 3_600_000));
    setSoilDayStart(session?.hub?.soil_sensor_day_start || "07:00");
    setSoilNightStart(session?.hub?.soil_sensor_night_start || "22:00");
    setSoilBatteryWarning(String(session?.hub?.soil_sensor_battery_warning_percent ?? 30));
    setSoilBatteryCritical(String(session?.hub?.soil_sensor_battery_critical_percent ?? 15));
  }, [
    session?.hub?.hub_id,
    session?.hub?.soil_sensor_day_interval_ms,
    session?.hub?.soil_sensor_night_interval_ms,
    session?.hub?.soil_sensor_day_start,
    session?.hub?.soil_sensor_night_start,
    session?.hub?.soil_sensor_battery_warning_percent,
    session?.hub?.soil_sensor_battery_critical_percent,
  ]);

  useEffect(() => {
    let cancelled = false;
    setSensorPlants([]);
    setSoilSensors([]);
    setSoilPairing(null);
    setSoilSensorLimit(10);
    setSoilSensorSlotsRemaining(10);

    if (!activeHubId) {
      setSensorPlantsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setSensorPlantsLoading(true);
    fetchPlants(activeHubId).then((items) => {
      if (cancelled) {
        return;
      }
      setSensorPlants(items);
      setSensorPlantsLoading(false);
    });
    fetchSoilSensors(activeHubId).then((result) => {
      if (cancelled || !result) {
        return;
      }
      setSoilSensors(result.sensors);
      setSoilPairing(result.pairing);
      setSoilSensorLimit(result.max_sensors);
      setSoilSensorSlotsRemaining(result.slots_remaining);
    });

    return () => {
      cancelled = true;
    };
  }, [activeHubId]);

  async function handleAssignSevenInOne(nextPlantId: string) {
    if (!hasPairedHub) {
      setStatus(t("settings.status.pairHubBeforeSensor"));
      return;
    }
    if (sensorAssigning) {
      return;
    }

    const currentPlant = sensorAssignedPlant;
    const nextPlant = nextPlantId ? sensorPlants.find((plant) => plantInstanceId(plant) === nextPlantId) ?? null : null;
    if (nextPlantId && !nextPlant) {
      setStatus(t("settings.status.plantNotFound"));
      return;
    }
    if ((currentPlant ? plantInstanceId(currentPlant) : "") === nextPlantId) {
      return;
    }
    if (currentPlant && nextPlant && sensorPlants.length > 1) {
      const confirmed = window.confirm(
        t("settings.status.confirmMoveSensor", {
          current: plantDisplayName(currentPlant, t("settings.defaultPlant")),
          next: plantDisplayName(nextPlant, t("settings.defaultPlant")),
        }),
      );
      if (!confirmed) {
        return;
      }
    }

    setSensorAssigning(true);
    setStatus(nextPlant ? t("settings.status.movingSensor") : t("settings.status.removingSensor"));
    try {
      if (nextPlant) {
        const updated = await updatePlant(nextPlantId, { hasSevenInOne: true }, activeHubId);
        if (!updated) {
          setStatus(t("settings.status.sensorSaveFailed"));
          return;
        }
        setSensorPlants((current) =>
          current.map((plant) => {
            const isTarget = plantInstanceId(plant) === nextPlantId;
            return {
              ...plant,
              ...(isTarget ? updated : {}),
              hasSevenInOne: isTarget,
              has_seven_in_one: isTarget,
            };
          }),
        );
        setStatus(t("settings.status.sensorMeasures", { plant: plantDisplayName(updated, t("settings.defaultPlant")) }));
        return;
      }

      if (currentPlant) {
        const currentPlantId = plantInstanceId(currentPlant);
        const updated = await updatePlant(currentPlantId, { hasSevenInOne: false }, activeHubId);
        if (!updated) {
          setStatus(t("settings.status.sensorRemoveFailed"));
          return;
        }
        setSensorPlants((current) =>
          current.map((plant) =>
            plantInstanceId(plant) === currentPlantId
              ? { ...plant, ...updated, hasSevenInOne: false, has_seven_in_one: false }
              : plant,
          ),
        );
      }
      setStatus(t("settings.status.sensorUnassigned"));
    } finally {
      setSensorAssigning(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setStatus(t("settings.status.loggingOut"));
    try {
      await logout();
      setSession(null);
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePairing() {
    setStatus(t("settings.status.creatingPairing"));
    const result = await createPairing();
    if (!result) {
      setStatus(t("settings.status.pairingFailed"));
      return;
    }

    setPairing(result);
    setStatus(t("settings.status.pairingReady"));
  }

  async function handleCreateSoilPairing() {
    if (!hasPairedHub) {
      setStatus(t("settings.status.pairHubBeforeSoilSensor"));
      return;
    }
    if (soilPairingBusy) {
      return;
    }
    if (soilSensors.length >= soilSensorLimit) {
      setStatus(t("settings.status.soilSensorLimitReached", { count: soilSensorLimit.toString() }));
      return;
    }

    setSoilPairingBusy(true);
    setStatus(t("settings.status.creatingSoilPairing"));
    try {
      const result = await createSoilSensorPairing(activeHubId);
      if (!result) {
        setStatus(t("settings.status.soilPairingFailed"));
        return;
      }
      setSoilPairing(result);
      setStatus(t("settings.status.soilPairingReady"));
    } finally {
      setSoilPairingBusy(false);
    }
  }

  async function handleAssignSoilSensor(sensor: SoilSensor, nextPlantId: string) {
    if (!hasPairedHub) {
      setStatus(t("settings.status.pairHubBeforeSoilSensor"));
      return;
    }
    if (soilAssigningId) {
      return;
    }
    if ((sensor.plant_id || "") === nextPlantId) {
      return;
    }
    if (nextPlantId && !sensorPlants.some((plant) => plantInstanceId(plant) === nextPlantId)) {
      setStatus(t("settings.status.plantNotFound"));
      return;
    }

    setSoilAssigningId(sensor.sensor_id);
    setStatus(nextPlantId ? t("settings.status.assigningSoilSensor") : t("settings.status.removingSoilSensor"));
    try {
      const updated = await updateSoilSensor(sensor.sensor_id, { plant_id: nextPlantId }, activeHubId);
      if (!updated) {
        setStatus(t("settings.status.soilSensorAssignFailed"));
        return;
      }
      setSoilSensors((current) => current.map((item) => (item.sensor_id === updated.sensor_id ? updated : item)));
      const plant = nextPlantId ? sensorPlants.find((item) => plantInstanceId(item) === nextPlantId) : null;
      setStatus(
        plant
          ? t("settings.status.soilSensorAssigned", { plant: plantDisplayName(plant, t("settings.defaultPlant")) })
          : t("settings.status.soilSensorUnassigned"),
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      setStatus(`${t("settings.status.soilSensorAssignFailed")} (${detail})`);
    } finally {
      setSoilAssigningId("");
    }
  }

  async function handleSaveSoilSchedule() {
    if (!hasPairedHub) {
      setStatus(t("settings.status.pairHubBeforeSoilSensor"));
      return;
    }
    setSoilScheduleSaving(true);
    setStatus(t("settings.status.savingSoilSchedule"));
    const warning = Math.max(1, Math.min(100, Number(soilBatteryWarning) || 30));
    const critical = Math.max(1, Math.min(warning - 1, Number(soilBatteryCritical) || 15));
    try {
      const settings = await saveHubSettings({
        soil_sensor_day_interval_ms: minutesToMs(soilDayIntervalMinutes),
        soil_sensor_night_interval_ms: minutesToMs(soilNightIntervalMinutes),
        soil_sensor_day_start: soilDayStart,
        soil_sensor_night_start: soilNightStart,
        soil_sensor_battery_warning_percent: warning,
        soil_sensor_battery_critical_percent: critical,
      });
      if (!settings) {
        setStatus(t("settings.status.soilScheduleFailed"));
        return;
      }
      if (session) {
        const updatedHubs = (session.hubs ?? []).map((hub) => (
          hub.hub_id === settings.hub_id ? { ...hub, ...settings } : hub
        ));
        setSession({
          ...session,
          hub: session.hub?.hub_id === settings.hub_id ? { ...session.hub, ...settings } : session.hub,
          hubs: updatedHubs.length ? updatedHubs : session.hubs,
        });
      }
      setStatus(t("settings.status.soilScheduleSaved"));
    } finally {
      setSoilScheduleSaving(false);
    }
  }

  async function handleSaveWeatherLocation() {
    setStatus(t("settings.status.savingGrowingLocation"));
    const settings = await saveHubSettings({
      location_label: weatherAddress,
      weather_address: weatherAddress,
      weather_latitude: weatherLatitude,
      weather_longitude: weatherLongitude,
    });
    if (!settings) {
      setStatus(t("settings.status.growingLocationFailed"));
      return;
    }
    if (session) {
      const updatedHubs = (session.hubs ?? []).map((hub) => (
        hub.hub_id === settings.hub_id ? { ...hub, ...settings } : hub
      ));
      setSession({
        ...session,
        hub: session.hub?.hub_id === settings.hub_id ? { ...session.hub, ...settings } : session.hub,
        hubs: updatedHubs.length ? updatedHubs : session.hubs,
      });
    }
    setStatus(t("settings.status.growingLocationSaved"));
    if (notificationStatus === "granted") {
      await onRefreshNotifications();
    }
  }

  async function handleToggleHubActive(nextActive: boolean, event?: React.MouseEvent<HTMLButtonElement>) {
    event?.stopPropagation();
    if (!session?.hub) {
      setStatus(t("settings.status.noHubPaired"));
      return;
    }
    setStatus(nextActive ? t("settings.status.activatingHub") : t("settings.status.deactivatingHub"));
    const settings = await saveHubSettings({ is_active: nextActive });
    if (!settings) {
      setStatus(t("settings.status.hubSaveFailed"));
      return;
    }
    const updatedHubs = (session.hubs ?? []).map((hub) => (
      hub.hub_id === settings.hub_id ? { ...hub, ...settings } : hub
    ));
    setSession({
      ...session,
      hub: session.hub?.hub_id === settings.hub_id ? { ...session.hub, ...settings } : session.hub,
      hubs: updatedHubs.length ? updatedHubs : session.hubs,
    });
    setStatus(nextActive ? t("settings.status.hubActive") : t("settings.status.hubInactive"));
  }

  async function handleSaveProfile() {
    setStatus(t("settings.status.savingAccount"));
    const updatedSession = await updateProfile({
      full_name: profileFullName,
      phone: profilePhone,
      email: profileEmail,
      password: profilePassword,
    });
    if (!updatedSession) {
      setStatus(t("settings.status.accountFailed"));
      return;
    }

    let nextSession = updatedSession;
    setSession(nextSession);
    setProfilePassword("");
    setStatus(t("settings.status.accountSaved"));
  }

  async function handleEnableNotifications() {
    setNotificationBusy(true);
    setStatus(t("settings.status.preparingNotifications"));
    try {
      const result = await onEnableNotifications();
      if (result === "granted") {
        setStatus(t("settings.status.notificationsEnabled"));
      } else if (result === "denied") {
        setStatus(t("settings.status.notificationsDenied"));
      } else if (result === "unsupported") {
        setStatus(t("settings.status.notificationsUnsupported"));
      } else {
        setStatus(t("settings.status.notificationsNotEnabled"));
      }
    } finally {
      setNotificationBusy(false);
    }
  }

  async function handleDisableNotifications() {
    setNotificationBusy(true);
    setStatus(t("settings.status.disablingNotifications"));
    try {
      await onDisableNotifications();
      setStatus(t("settings.status.notificationsDisabled"));
    } finally {
      setNotificationBusy(false);
    }
  }

  async function handleSaveNotificationPreferences() {
    const savedPreferences = saveGrowlyNotificationPreferences(notificationPreferences);
    setNotificationPreferences(savedPreferences);
    setNotificationBusy(true);
    setStatus(t("settings.status.savingNotificationTimes"));
    try {
      if (notificationStatus === "granted") {
        await onRefreshNotifications();
        setStatus(t("settings.status.notificationTimesSavedUpdated"));
        return;
      }
      setStatus(t("settings.status.notificationTimesSaved"));
    } finally {
      setNotificationBusy(false);
    }
  }

  async function handleFetchMemoryDebug(resetBaseline: boolean) {
    setMemoryDebugBusy(true);
    setStatus(resetBaseline ? "Tar memory baseline..." : "Sjekker memory vekst...");
    try {
      const report = await fetchMemoryDebug(resetBaseline);
      if (!report) {
        setStatus("Kunne ikke hente memory debug. Sjekk at settings er låst opp.");
        return;
      }
      setMemoryDebug(report);
      setStatus(resetBaseline ? "Memory baseline er satt." : "Memory vekst er hentet.");
    } finally {
      setMemoryDebugBusy(false);
    }
  }

  function updateNotificationPreference(key: keyof GrowlyNotificationPreferences, value: string | boolean) {
    setNotificationPreferences((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSearchAddress() {
    const query = weatherAddress.trim();
    if (query.length < 3) {
      setStatus(t("settings.status.enterAddress"));
      return;
    }
    setAddressLookupBusy(true);
    setStatus(t("settings.status.searchingAddress"));
    const matches = await searchWeatherAddress(query);
    setAddressMatches(matches);
    setAddressLookupBusy(false);
    setStatus(matches.length ? t("settings.status.chooseAddress") : t("settings.status.noAddressMatches"));
  }

  function handleSelectAddress(match: WeatherAddressMatch) {
    setWeatherAddress(match.label);
    setWeatherLatitude(match.latitude.toString());
    setWeatherLongitude(match.longitude.toString());
    setAddressMatches([]);
    setStatus(t("settings.status.addressFound"));
  }

  function handleUseDeviceLocation() {
    if (!navigator.geolocation) {
      setStatus(t("settings.status.geolocationUnsupported"));
      return;
    }

    setLocationLookupBusy(true);
    setStatus(t("settings.status.fetchingPosition"));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setWeatherLatitude(position.coords.latitude.toFixed(6));
        setWeatherLongitude(position.coords.longitude.toFixed(6));
        setAddressMatches([]);
        setLocationLookupBusy(false);
        setStatus(t("settings.status.positionFetched"));
      },
      (error) => {
        setLocationLookupBusy(false);
        if (error.code === error.PERMISSION_DENIED) {
          setStatus(t("settings.status.positionDenied"));
          return;
        }
        setStatus(t("settings.status.positionFailed"));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 300000,
        timeout: 12000,
      },
    );
  }

  const displayName = session?.user?.full_name || session?.username || t("settings.growlyGarden");
  const displayEmail = session?.user?.email || t("settings.defaultEmail");
  const hubLocation = session?.hub?.location_label || "";
  const hubId = activeHubId || t("settings.pendingPairing");
  const hubCount = session?.hubs?.length ?? (session?.hub ? 1 : 0);
  const hubActive = isHubActive(session?.hub?.is_active);
  const weatherConfigured = !!weatherLatitude && !!weatherLongitude;
  const themeSummary =
    themeMode === "auto"
      ? t("settings.themeAutoSummary", { mode: theme === "dark" ? t("settings.nightMode") : t("settings.dayMode") })
      : themeMode === "dark"
        ? t("settings.themeDarkSummary")
        : t("settings.themeLightSummary");
  const languageSummary =
    languageMode === "auto"
      ? t("settings.languageSummaryAuto", { language: language === "no" ? t("settings.languageNorwegian") : t("settings.languageEnglish") })
      : languageMode === "no"
        ? t("settings.languageSummaryNo")
        : t("settings.languageSummaryEn");
  const notificationSummary =
    notificationStatus === "granted"
      ? t("settings.notificationSummary.granted")
      : notificationStatus === "denied"
        ? t("settings.notificationSummary.denied")
        : notificationStatus === "unsupported"
          ? t("settings.notificationSummary.unsupported")
          : t("settings.notificationSummary.off");

  return (
    <main className="page-shell app-page">
      <section className="screen-header">
        <div>
          <h1>{t("settings.title")} <span className="leaf-mark">🌿</span></h1>
          <p>{t("settings.subtitle")}</p>
        </div>
        <button className="icon-button" type="button" aria-label={t("settings.enableNotificationsAria")} onClick={handleEnableNotifications} disabled={notificationBusy}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M12 4a4 4 0 0 0-4 4v2.2c0 .7-.2 1.4-.6 2L6 14.5h12l-1.4-2.3c-.4-.6-.6-1.3-.6-2V8a4 4 0 0 0-4-4Zm-1.2 14a1.8 1.8 0 0 0 2.4 0"
            />
          </svg>
        </button>
      </section>

      <section className="settings-section">
        <p className="section-kicker">{t("settings.account")}</p>
        <article className="soft-card settings-card premium-section-card">
          <button className="settings-row settings-row-button" type="button" onClick={() => setAccountPanelOpen((open) => !open)}>
            <div className="avatar-badge">{initialsFromName(displayName) || "GG"}</div>
            <div className="settings-row__content">
              <strong>{displayName}</strong>
              <span>{displayEmail}</span>
            </div>
            <span className={`chevron${accountPanelOpen ? " chevron--open" : ""}`}>›</span>
          </button>
          {accountPanelOpen ? (
            <div className="account-settings-panel">
              <div className="settings-divider" />
              <div className="settings-field-grid">
                <label className="settings-field">
                  <span>{t("settings.fullName")}</span>
                  <input value={profileFullName} onChange={(event) => setProfileFullName(event.target.value)} autoComplete="name" />
                </label>
                <label className="settings-field">
                  <span>{t("settings.phone")}</span>
                  <input value={profilePhone} onChange={(event) => setProfilePhone(event.target.value)} autoComplete="tel" />
                </label>
              </div>
              <div className="settings-field-grid">
                <label className="settings-field">
                  <span>{t("settings.email")}</span>
                  <input value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} autoComplete="email" />
                </label>
                <label className="settings-field">
                  <span>{t("settings.address")}</span>
                  <input
                    value={weatherAddress}
                    onChange={(event) => {
                      setWeatherAddress(event.target.value);
                      setAddressMatches([]);
                    }}
                    placeholder=""
                    autoComplete="street-address"
                  />
                </label>
              </div>
              <label className="settings-field">
                <span>{t("settings.newPassword")}</span>
                <input
                  type="password"
                  value={profilePassword}
                  onChange={(event) => setProfilePassword(event.target.value)}
                  placeholder={t("settings.passwordUnchanged")}
                  autoComplete="new-password"
                />
              </label>
              <button className="primary-action" type="button" onClick={handleSaveProfile}>
                {t("settings.saveAccount")}
              </button>
            </div>
          ) : null}
          <div className="settings-divider" />
          <button className="danger-link" type="button" onClick={handleLogout} disabled={busy}>
            <span className="danger-link__icon">↪</span>
            {busy ? t("settings.loggingOut") : t("settings.logout")}
          </button>
        </article>
      </section>

      <section className="settings-section">
        <p className="section-kicker">{t("settings.greenhouse")}</p>
        <article className="soft-card settings-card premium-section-card">
          <button className="settings-row settings-row-button" type="button" onClick={() => setHubPanelOpen((open) => !open)}>
            <div className="icon-badge icon-badge--mint">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M5 20V11.5L12 6l7 5.5V20M9 20v-5h6v5M3.5 20h17"
                />
              </svg>
            </div>
            <div className="settings-row__content">
              <span className="online-line">
                <span className={`online-dot${hubActive ? "" : " online-dot--muted"}`} aria-hidden="true" />
                {session?.hub ? (hubActive ? t("settings.hubOn") : t("settings.hubOff")) : t("settings.notPaired")}
              </span>
              {hubLocation ? <small>{t("settings.location", { location: hubLocation })}</small> : null}
              <small>{t("settings.hubId", { hubId })}</small>
              <small>{t("settings.hubCount", { count: hubCount, label: hubCount === 1 ? t("settings.hubSingular") : t("settings.hubPlural") })}</small>
            </div>
            <span className={`chevron${hubPanelOpen ? " chevron--open" : ""}`}>›</span>
          </button>

          {hubPanelOpen ? (
            <div className="hub-settings-panel">
              <div className="settings-divider" />
              <div className="hub-toggle-row">
                <div>
                  <strong>{t("settings.hub")}</strong>
                  <span>{hubActive ? t("settings.hubActiveBody") : t("settings.hubInactiveBody")}</span>
                </div>
                <button
                  className={`hub-switch${hubActive ? " is-on" : ""}`}
                  type="button"
                  role="switch"
                  aria-checked={hubActive}
                  onClick={(event) => handleToggleHubActive(!hubActive, event)}
                  disabled={!session?.hub}
                >
                  <span>{hubActive ? "On" : "Off"}</span>
                </button>
              </div>

              <div className="settings-divider" />
              <div className="sensor-settings-panel">
                <div className="settings-row__content">
                  <strong>{t("settings.sensor")}</strong>
                  <span>
                    {hasPairedHub
                      ? sensorAssignedPlant
                        ? t("settings.sensorAssigned", { plant: plantDisplayName(sensorAssignedPlant, t("settings.defaultPlant")) })
                        : t("settings.sensorChoose")
                      : t("settings.sensorPairHub")}
                  </span>
                </div>
                <label className="settings-field sensor-select-field">
                  <span>{t("settings.sevenInOneSensor")}</span>
                  <select
                    value={sensorAssignedPlantId}
                    onChange={(event) => handleAssignSevenInOne(event.target.value)}
                    disabled={!hasPairedHub || sensorPlantsLoading || sensorAssigning || !sensorPlants.length}
                  >
                    <option value="">
                      {sensorPlantsLoading
                        ? t("settings.fetchingPlants")
                        : sensorPlants.length
                          ? t("settings.sensorUnassigned")
                          : t("settings.noPlantsOnHub")}
                    </option>
                    {sensorPlants.map((plant) => {
                      const instanceId = plantInstanceId(plant);
                      return (
                        <option key={instanceId} value={instanceId}>
                          {plantDisplayName(plant, t("settings.defaultPlant"))}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <div className="settings-field">
                  <span>{t("settings.soilSensors")}</span>
                  <div className="sensor-detail-list">
                    <div className="sensor-detail-row">
                      <span>{t("settings.pairedSoilSensors")}</span>
                      <strong>{soilSensors.length}/{soilSensorLimit}</strong>
                    </div>
                    <div className="sensor-detail-row">
                      <span>{t("settings.soilSensorSlotsRemaining")}</span>
                      <strong>{soilSensorSlotsRemaining}</strong>
                    </div>
                    {soilPairing && soilPairing.status === "active" ? (
                      <div className="sensor-detail-row">
                        <span>{t("settings.soilPairingActive")}</span>
                        <strong>{soilPairing.expires_at}</strong>
                      </div>
                    ) : null}
                    {soilSensors.map((sensor) => {
                      const assignedPlant = sensor.plant_id
                        ? sensorPlants.find((plant) => plantInstanceId(plant) === sensor.plant_id)
                        : null;
                      return (
                        <div className="sensor-detail-row sensor-detail-row--stacked" key={sensor.sensor_id}>
                          <div className="sensor-detail-heading">
                            <span>{sensor.sensor_name || t("settings.soilSensor")}</span>
                            <strong>{assignedPlant ? plantDisplayName(assignedPlant, t("settings.defaultPlant")) : t("settings.sensorUnassigned")}</strong>
                          </div>
                          <small>{sensor.mac_address || sensor.sensor_id}</small>
                          <label className="settings-field sensor-select-field sensor-inline-select">
                            <span>{t("settings.soilSensorPlant")}</span>
                            <select
                              value={sensor.plant_id || ""}
                              onChange={(event) => handleAssignSoilSensor(sensor, event.target.value)}
                              disabled={sensorPlantsLoading || soilAssigningId === sensor.sensor_id || !sensorPlants.length}
                            >
                              <option value="">
                                {sensorPlantsLoading
                                  ? t("settings.fetchingPlants")
                                  : sensorPlants.length
                                    ? t("settings.sensorUnassigned")
                                    : t("settings.noPlantsOnHub")}
                              </option>
                              {sensorPlants.map((plant) => {
                                const instanceId = plantInstanceId(plant);
                                return (
                                  <option key={instanceId} value={instanceId}>
                                    {plantDisplayName(plant, t("settings.defaultPlant"))}
                                  </option>
                                );
                              })}
                            </select>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={handleCreateSoilPairing}
                    disabled={!hasPairedHub || soilPairingBusy || soilSensors.length >= soilSensorLimit}
                  >
                    {soilPairingBusy ? t("settings.pairingSoilSensor") : t("settings.pairSoilSensor")}
                  </button>
                </div>
                <div className="settings-field soil-schedule-panel">
                  <span>{t("settings.soilSensorSchedule")}</span>
                  <div className="settings-field-grid">
                    <label className="settings-field">
                      <span>{t("settings.soilDayStart")}</span>
                      <input type="time" value={soilDayStart} onChange={(event) => setSoilDayStart(event.target.value)} />
                    </label>
                    <label className="settings-field">
                      <span>{t("settings.soilNightStart")}</span>
                      <input type="time" value={soilNightStart} onChange={(event) => setSoilNightStart(event.target.value)} />
                    </label>
                  </div>
                  <div className="settings-field-grid">
                    <label className="settings-field">
                      <span>{t("settings.soilDayInterval")}</span>
                      <input inputMode="numeric" value={soilDayIntervalMinutes} onChange={(event) => setSoilDayIntervalMinutes(event.target.value)} />
                    </label>
                    <label className="settings-field">
                      <span>{t("settings.soilNightInterval")}</span>
                      <input inputMode="numeric" value={soilNightIntervalMinutes} onChange={(event) => setSoilNightIntervalMinutes(event.target.value)} />
                    </label>
                  </div>
                  <div className="settings-field-grid">
                    <label className="settings-field">
                      <span>{t("settings.soilBatteryWarning")}</span>
                      <input inputMode="numeric" value={soilBatteryWarning} onChange={(event) => setSoilBatteryWarning(event.target.value)} />
                    </label>
                    <label className="settings-field">
                      <span>{t("settings.soilBatteryCritical")}</span>
                      <input inputMode="numeric" value={soilBatteryCritical} onChange={(event) => setSoilBatteryCritical(event.target.value)} />
                    </label>
                  </div>
                  <button className="secondary-action" type="button" onClick={handleSaveSoilSchedule} disabled={!hasPairedHub || soilScheduleSaving}>
                    {soilScheduleSaving ? t("settings.saving") : t("settings.saveSoilSchedule")}
                  </button>
                </div>
              </div>

              <div className="settings-divider" />
              <div className="pairing-panel pairing-panel--compact">
                <div>
                  <h2>{t("settings.connectHub")}</h2>
                  <p>{t("settings.connectHubBody")}</p>
                </div>
                <button className="secondary-action" type="button" onClick={handleCreatePairing}>
                  {t("settings.generatePairingCode")}
                </button>
                <div className="pairing-footer">
                  <div>
                    <strong>{pairing ? pairing.token : t("settings.noActiveCode")}</strong>
                    <span>{pairing ? t("settings.validUntil", { date: pairing.expires_at }) : t("settings.codeReadyHint")}</span>
                  </div>
                  <span className={`pairing-state${pairing ? " is-ready" : ""}`} aria-hidden="true" />
                </div>
              </div>
            </div>
          ) : null}
        </article>
      </section>

      <section className="settings-section">
        <p className="section-kicker">{t("settings.weatherSection")}</p>
        <article className="soft-card settings-card premium-section-card">
          <button className="settings-row settings-row-button" type="button" onClick={() => setWeatherPanelOpen((open) => !open)}>
            <div className="icon-badge icon-badge--mint">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M12 3v2.1M12 18.9V21M4.6 4.6l1.5 1.5M17.9 17.9l1.5 1.5M3 12h2.1M18.9 12H21M4.6 19.4l1.5-1.5M17.9 6.1l1.5-1.5M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8Z"
                />
              </svg>
            </div>
            <div className="settings-row__content">
              <strong>{weatherConfigured ? t("settings.weatherActive") : t("settings.setGrowingLocation")}</strong>
              <span>{weatherConfigured ? t("settings.weatherActiveBody") : t("settings.weatherInactiveBody")}</span>
              <small>{weatherConfigured ? t("settings.locationConfigured") : t("settings.locationNotConfigured")}</small>
            </div>
            <span className={`chevron${weatherPanelOpen ? " chevron--open" : ""}`}>›</span>
          </button>

          {weatherPanelOpen ? (
            <div className="weather-settings-panel">
              <div className="settings-divider" />
              <div className="settings-row__content">
                <strong>{t("settings.weatherLocation")}</strong>
                <span>{t("settings.weatherLocationBody")}</span>
              </div>
              <label className="settings-field">
                <span>{t("settings.addressOrPlace")}</span>
                <input
                  value={weatherAddress}
                  onChange={(event) => {
                    setWeatherAddress(event.target.value);
                    setAddressMatches([]);
                  }}
                  placeholder=""
                />
              </label>
              <div className="settings-field-grid">
                <button className="secondary-action" type="button" onClick={handleSearchAddress} disabled={addressLookupBusy}>
                  {addressLookupBusy ? t("settings.searching") : t("settings.findAddress")}
                </button>
                <button className="secondary-action" type="button" onClick={handleUseDeviceLocation} disabled={locationLookupBusy}>
                  {locationLookupBusy ? t("settings.fetching") : t("settings.useMyLocation")}
                </button>
              </div>
              {addressMatches.length ? (
                <div className="address-match-list">
                  {addressMatches.map((match) => (
                    <button
                      className="address-match-item"
                      key={`${match.label}-${match.latitude}-${match.longitude}`}
                      type="button"
                      onClick={() => handleSelectAddress(match)}
                    >
                      <strong>{match.label}</strong>
                      <span>{match.latitude}, {match.longitude}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {weatherLatitude && weatherLongitude ? (
                <div className="location-confirmation">
                  <strong>{t("settings.locationFound")}</strong>
                  <span>{weatherAddress || t("settings.positionSelected")}</span>
                </div>
              ) : null}
              <details className="advanced-location">
                <summary>{t("settings.advancedLocation")}</summary>
                <div className="settings-field-grid">
                  <label className="settings-field">
                    <span>{t("settings.latitude")}</span>
                    <input
                      value={weatherLatitude}
                      onChange={(event) => setWeatherLatitude(event.target.value)}
                      inputMode="decimal"
                      placeholder="59.112163"
                    />
                  </label>
                  <label className="settings-field">
                    <span>{t("settings.longitude")}</span>
                    <input
                      value={weatherLongitude}
                      onChange={(event) => setWeatherLongitude(event.target.value)}
                      inputMode="decimal"
                      placeholder="11.400913"
                    />
                  </label>
                </div>
              </details>
              <button className="primary-action" type="button" onClick={handleSaveWeatherLocation}>
                {t("settings.saveGrowingLocation")}
              </button>
            </div>
          ) : null}
        </article>
      </section>

      {status ? <p className="helper-text helper-text--settings">{status}</p> : null}

      <section className="settings-section settings-section--compact">
        <p className="section-kicker">{t("settings.notifications")}</p>
        <article className="soft-card settings-card premium-section-card notifications-settings-card">
          <div className="settings-row">
            <div className="icon-badge icon-badge--mint theme-icon-badge">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M12 4a4 4 0 0 0-4 4v2.2c0 .7-.2 1.4-.6 2L6 14.5h12l-1.4-2.3c-.4-.6-.6-1.3-.6-2V8a4 4 0 0 0-4-4Zm-1.2 14a1.8 1.8 0 0 0 2.4 0"
                />
              </svg>
            </div>
            <div className="settings-row__content">
              <strong>{t("settings.pushNotifications")}</strong>
              <span>{notificationSummary}</span>
              <small>{t("settings.lastNotificationHint")}</small>
            </div>
          </div>
          <div className="notification-action-row">
            <button className="secondary-action" type="button" onClick={handleEnableNotifications} disabled={notificationBusy}>
              {notificationStatus === "granted" ? t("settings.updateNotifications") : t("settings.activateNotifications")}
            </button>
            {notificationStatus === "granted" ? (
              <button className="text-action" type="button" onClick={handleDisableNotifications} disabled={notificationBusy}>
                {t("settings.disable")}
              </button>
            ) : null}
          </div>
          <div className="settings-divider" />
          <div className="notification-time-panel">
            <div className="settings-row__content">
              <strong>{t("settings.notificationTime")}</strong>
              <span>{t("settings.notificationTimeBody")}</span>
            </div>
            <div className="settings-field-grid">
              <label className="settings-field">
                <span>{t("settings.earliest")}</span>
                <input
                  type="time"
                  min="10:00"
                  value={notificationPreferences.earliestTime}
                  onChange={(event) => updateNotificationPreference("earliestTime", event.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>{t("settings.watering")}</span>
                <input
                  type="time"
                  min="10:00"
                  value={notificationPreferences.wateringTime}
                  onChange={(event) => updateNotificationPreference("wateringTime", event.target.value)}
                />
              </label>
            </div>
            <div className="settings-field-grid">
              <label className="settings-field">
                <span>{t("settings.calendar")}</span>
                <input
                  type="time"
                  min="10:00"
                  value={notificationPreferences.calendarTime}
                  onChange={(event) => updateNotificationPreference("calendarTime", event.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>{t("settings.plantCheck")}</span>
                <input
                  type="time"
                  min="10:00"
                  value={notificationPreferences.plantCheckTime}
                  onChange={(event) => updateNotificationPreference("plantCheckTime", event.target.value)}
                />
              </label>
            </div>
            <p className="notification-safe-window">{t("settings.notificationSafeWindow")}</p>
            <button className="secondary-action" type="button" onClick={handleSaveNotificationPreferences} disabled={notificationBusy}>
              {t("settings.saveTimes")}
            </button>
          </div>
        </article>
      </section>

      <section className="settings-section settings-section--compact">
        <p className="section-kicker">{t("settings.theme")}</p>
        <article className="soft-card settings-card premium-section-card theme-settings-card">
          <div className="settings-row theme-settings-row">
            <div className="icon-badge icon-badge--mint theme-icon-badge">
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M20 14.4A7.8 7.8 0 0 1 9.6 4a8 8 0 1 0 10.4 10.4Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="M12 2.5v2.3M12 19.2v2.3M21.5 12h-2.3M4.8 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.6"
                  />
                </svg>
              )}
            </div>
            <div className="settings-row__content">
              <strong>{t("settings.appearance")}</strong>
              <span>{themeSummary}</span>
            </div>
          </div>
          <div className="theme-mode-toggle" role="radiogroup" aria-label={t("settings.chooseTheme")}>
            {themeModeOptions.map((option) => (
              <button
                key={option.value}
                className={themeMode === option.value ? "is-selected" : ""}
                type="button"
                role="radio"
                aria-checked={themeMode === option.value}
                onClick={() => onThemeModeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="settings-section settings-section--compact">
        <p className="section-kicker">{t("settings.language")}</p>
        <article className="soft-card settings-card premium-section-card theme-settings-card">
          <div className="settings-row theme-settings-row">
            <div className="icon-badge icon-badge--mint theme-icon-badge">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4.5 5.5h8M8.5 5.5v13M5.5 18.5h6M14 8.5h5.5M16.8 8.5c-.2 3.7-1.7 6.8-4.6 9.2M14.6 12.3c1.2 2.1 2.9 3.9 5.1 5.4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.7"
                />
              </svg>
            </div>
            <div className="settings-row__content">
              <strong>{t("settings.languageTitle")}</strong>
              <span>{languageSummary}</span>
            </div>
          </div>
          <div className="theme-mode-toggle" role="radiogroup" aria-label={t("settings.chooseLanguage")}>
            {languageModeOptions.map((option) => (
              <button
                key={option.value}
                className={languageMode === option.value ? "is-selected" : ""}
                type="button"
                role="radio"
                aria-checked={languageMode === option.value}
                onClick={() => setLanguageMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="settings-section settings-section--compact">
        <p className="section-kicker">Eksperiment</p>
        <Link className="soft-card version-card premium-section-card" to="/min-hage-test">
          <span>Min hage testside</span>
          <div className="version-card__value">
            <strong>Åpne</strong>
            <span className="chevron">›</span>
          </div>
        </Link>
      </section>

      {session?.is_admin ? (
        <section className="settings-section settings-section--compact">
          <p className="section-kicker">Debug</p>
          <article className="soft-card settings-card premium-section-card memory-debug-card">
            <div className="settings-row">
              <div className="icon-badge icon-badge--mint theme-icon-badge">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M7 4v16M17 4v16M4 8h16M4 16h16M9 8v8M15 8v8"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                  />
                </svg>
              </div>
              <div className="settings-row__content">
                <strong>Memory debug</strong>
                <span>
                  {memoryDebug
                    ? `RSS ${memoryDebug.rss_mb ?? "-"} MB · Python ${memoryDebug.python_traced_current_mb} MB`
                    : "Ta baseline først, sjekk vekst etter at appen har kjørt litt."}
                </span>
              </div>
            </div>
            <div className="memory-debug-actions">
              <button className="secondary-action" type="button" onClick={() => handleFetchMemoryDebug(true)} disabled={memoryDebugBusy}>
                Ta baseline
              </button>
              <button className="secondary-action" type="button" onClick={() => handleFetchMemoryDebug(false)} disabled={memoryDebugBusy}>
                Sjekk vekst
              </button>
            </div>
            {memoryDebug ? (
              <div className="memory-debug-result">
                <div className="memory-debug-metrics">
                  <span>RSS: <strong>{memoryDebug.rss_mb ?? "-"} MB</strong></span>
                  <span>Python: <strong>{memoryDebug.python_traced_current_mb} MB</strong></span>
                  <span>Peak: <strong>{memoryDebug.python_traced_peak_mb} MB</strong></span>
                  <span>Samples: <strong>{memoryDebug.sensor_sample_writes}</strong></span>
                </div>
                <div className="memory-debug-list">
                  {(memoryDebug.top_growth_since_last_report.length ? memoryDebug.top_growth_since_last_report : memoryDebug.top_current)
                    .slice(0, 5)
                    .map((item, index) => (
                      <div className="memory-debug-line" key={`${item.file}-${item.line}-${index}`}>
                        <strong>{item.size_diff_kb !== undefined ? `${item.size_diff_kb} KB` : `${item.size_kb} KB`}</strong>
                        <span>{item.file.split("/").slice(-2).join("/")}:{item.line}</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </article>
        </section>
      ) : null}

      <section className="settings-section">
        <p className="section-kicker">{t("settings.about")}</p>
        <article className="soft-card version-card premium-section-card">
          <span>{t("settings.version")}</span>
          <div className="version-card__value">
            <strong>1.0.0</strong>
            <span className="chevron">›</span>
          </div>
        </article>
      </section>
    </main>
  );
}
