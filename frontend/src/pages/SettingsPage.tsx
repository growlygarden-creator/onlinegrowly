import { useEffect, useState } from "react";
import {
  createPairing,
  fetchActivePairing,
  fetchPlants,
  logout,
  saveHubSettings,
  searchWeatherAddress,
  updatePlant,
  updateProfile,
  type AuthSession,
  type GrowlyPlant,
  type PairingInfo,
  type WeatherAddressMatch,
} from "../lib/api";
import type { GrowlyNotificationStatus } from "../lib/notifications";

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

const themeModeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: "light", label: "Dag" },
  { value: "dark", label: "Natt" },
  { value: "auto", label: "Auto" },
];

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

function plantDisplayName(plant: GrowlyPlant): string {
  return plant.nickname || plant.display_name || plant.profileId || plant.profile_id || "Plante";
}

function plantUsesSevenInOne(plant: GrowlyPlant): boolean {
  return Boolean(plant.hasSevenInOne ?? plant.has_seven_in_one);
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
  const [sensorPlants, setSensorPlants] = useState<GrowlyPlant[]>([]);
  const [sensorPlantsLoading, setSensorPlantsLoading] = useState(false);
  const [sensorAssigning, setSensorAssigning] = useState(false);

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
    let cancelled = false;
    setSensorPlants([]);

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

    return () => {
      cancelled = true;
    };
  }, [activeHubId]);

  async function handleAssignSevenInOne(nextPlantId: string) {
    if (!hasPairedHub) {
      setStatus("Par en hub før du kobler 7-i-1-sensoren til en plante.");
      return;
    }
    if (sensorAssigning) {
      return;
    }

    const currentPlant = sensorAssignedPlant;
    const nextPlant = nextPlantId ? sensorPlants.find((plant) => plantInstanceId(plant) === nextPlantId) ?? null : null;
    if (nextPlantId && !nextPlant) {
      setStatus("Fant ikke planten på denne huben.");
      return;
    }
    if ((currentPlant ? plantInstanceId(currentPlant) : "") === nextPlantId) {
      return;
    }
    if (currentPlant && nextPlant && sensorPlants.length > 1) {
      const confirmed = window.confirm(
        `7-i-1-sensoren er koblet til ${plantDisplayName(currentPlant)}. Flytte den til ${plantDisplayName(nextPlant)}?`,
      );
      if (!confirmed) {
        return;
      }
    }

    setSensorAssigning(true);
    setStatus(nextPlant ? "Flytter 7-i-1-sensor..." : "Fjerner 7-i-1-kobling...");
    try {
      if (nextPlant) {
        const updated = await updatePlant(nextPlantId, { hasSevenInOne: true }, activeHubId);
        if (!updated) {
          setStatus("Kunne ikke lagre sensorvalg akkurat nå.");
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
        setStatus(`7-i-1-sensoren måler ${plantDisplayName(updated)}.`);
        return;
      }

      if (currentPlant) {
        const currentPlantId = plantInstanceId(currentPlant);
        const updated = await updatePlant(currentPlantId, { hasSevenInOne: false }, activeHubId);
        if (!updated) {
          setStatus("Kunne ikke fjerne sensorvalg akkurat nå.");
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
      setStatus("7-i-1-sensoren er ikke koblet til en plante.");
    } finally {
      setSensorAssigning(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setStatus("Logger ut...");
    try {
      await logout();
      setSession(null);
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePairing() {
    setStatus("Lager pairing-kode...");
    const result = await createPairing();
    if (!result) {
      setStatus("Kunne ikke lage kode akkurat nå.");
      return;
    }

    setPairing(result);
    setStatus("Pairing-koden er klar.");
  }

  async function handleSaveWeatherLocation() {
    setStatus("Lagrer dyrkested...");
    const settings = await saveHubSettings({
      location_label: weatherAddress,
      weather_address: weatherAddress,
      weather_latitude: weatherLatitude,
      weather_longitude: weatherLongitude,
    });
    if (!settings) {
      setStatus("Kunne ikke lagre dyrkested akkurat nå.");
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
    setStatus("Dyrkested er lagret.");
    if (notificationStatus === "granted") {
      await onRefreshNotifications();
    }
  }

  async function handleToggleHubActive(nextActive: boolean, event?: React.MouseEvent<HTMLButtonElement>) {
    event?.stopPropagation();
    if (!session?.hub) {
      setStatus("Ingen hub er paret ennå.");
      return;
    }
    setStatus(nextActive ? "Aktiverer hub..." : "Deaktiverer hub...");
    const settings = await saveHubSettings({ is_active: nextActive });
    if (!settings) {
      setStatus("Kunne ikke lagre hub-status akkurat nå.");
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
    setStatus(nextActive ? "Hub er aktiv." : "Hub er slått av. Growly bruker vær og manuelle data.");
  }

  async function handleSaveProfile() {
    setStatus("Lagrer konto...");
    const updatedSession = await updateProfile({
      full_name: profileFullName,
      phone: profilePhone,
      email: profileEmail,
      password: profilePassword,
    });
    if (!updatedSession) {
      setStatus("Kunne ikke lagre konto. Sjekk feltene og prøv igjen.");
      return;
    }

    let nextSession = updatedSession;
    setSession(nextSession);
    setProfilePassword("");
    setStatus("Kontoen er oppdatert.");
  }

  async function handleEnableNotifications() {
    setNotificationBusy(true);
    setStatus("Klargjør varsler...");
    try {
      const result = await onEnableNotifications();
      if (result === "granted") {
        setStatus("Varsler er aktivert for vanning, kalender, vær og plantesjekk.");
      } else if (result === "denied") {
        setStatus("Varsler er avslått i iOS. Åpne Innstillinger på telefonen for å tillate Growly-varsler.");
      } else if (result === "unsupported") {
        setStatus("Varsler virker først i iOS-appen, ikke i nettleseren.");
      } else {
        setStatus("Varsler ble ikke aktivert ennå.");
      }
    } finally {
      setNotificationBusy(false);
    }
  }

  async function handleDisableNotifications() {
    setNotificationBusy(true);
    setStatus("Slår av Growly-varsler...");
    try {
      await onDisableNotifications();
      setStatus("Growly-varsler er slått av.");
    } finally {
      setNotificationBusy(false);
    }
  }

  async function handleSearchAddress() {
    const query = weatherAddress.trim();
    if (query.length < 3) {
      setStatus("Skriv inn adresse eller sted først.");
      return;
    }
    setAddressLookupBusy(true);
    setStatus("Søker etter dyrkested...");
    const matches = await searchWeatherAddress(query);
    setAddressMatches(matches);
    setAddressLookupBusy(false);
    setStatus(matches.length ? "Velg riktig adresse under." : "Fant ingen treff. Prøv gate, nummer og kommune.");
  }

  function handleSelectAddress(match: WeatherAddressMatch) {
    setWeatherAddress(match.label);
    setWeatherLatitude(match.latitude.toString());
    setWeatherLongitude(match.longitude.toString());
    setAddressMatches([]);
    setStatus("Adresse funnet. Husk å lagre dyrkested.");
  }

  function handleUseDeviceLocation() {
    if (!navigator.geolocation) {
      setStatus("Nettleseren støtter ikke posisjonshenting.");
      return;
    }

    setLocationLookupBusy(true);
    setStatus("Henter posisjon...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setWeatherLatitude(position.coords.latitude.toFixed(6));
        setWeatherLongitude(position.coords.longitude.toFixed(6));
        setAddressMatches([]);
        setLocationLookupBusy(false);
        setStatus("Posisjon hentet. Husk å lagre dyrkested.");
      },
      (error) => {
        setLocationLookupBusy(false);
        if (error.code === error.PERMISSION_DENIED) {
          setStatus("Posisjon ble ikke tillatt. Gi tilgang i nettleseren eller skriv inn adresse.");
          return;
        }
        setStatus("Kunne ikke hente posisjon akkurat nå. Prøv adressefeltet i stedet.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 300000,
        timeout: 12000,
      },
    );
  }

  const displayName = session?.user?.full_name || session?.username || "Growly Garden";
  const displayEmail = session?.user?.email || "kunde@example.com";
  const hubLocation = session?.hub?.location_label || "";
  const hubId = activeHubId || "Venter på paring";
  const hubCount = session?.hubs?.length ?? (session?.hub ? 1 : 0);
  const hubActive = isHubActive(session?.hub?.is_active);
  const weatherConfigured = !!weatherLatitude && !!weatherLongitude;
  const themeSummary =
    themeMode === "auto"
      ? `Auto følger mobilen (${theme === "dark" ? "nattmodus" : "dagmodus"} nå).`
      : themeMode === "dark"
        ? "Growly står fast i nattmodus."
        : "Growly står fast i dagmodus.";
  const notificationSummary =
    notificationStatus === "granted"
      ? "Aktivert for vanning, kalender, vær og plantesjekk."
      : notificationStatus === "denied"
        ? "Avslått i iOS-innstillingene."
        : notificationStatus === "unsupported"
          ? "Tilgjengelig i iOS-appen."
          : "Ikke aktivert ennå.";

  return (
    <main className="page-shell app-page">
      <section className="screen-header">
        <div>
          <h1>Innstillinger <span className="leaf-mark">🌿</span></h1>
          <p>Konto, drivhus og tilkoblinger</p>
        </div>
        <button className="icon-button" type="button" aria-label="Aktiver varsler" onClick={handleEnableNotifications} disabled={notificationBusy}>
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
        <p className="section-kicker">Konto</p>
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
                  <span>Fullt navn</span>
                  <input value={profileFullName} onChange={(event) => setProfileFullName(event.target.value)} autoComplete="name" />
                </label>
                <label className="settings-field">
                  <span>Telefon</span>
                  <input value={profilePhone} onChange={(event) => setProfilePhone(event.target.value)} autoComplete="tel" />
                </label>
              </div>
              <div className="settings-field-grid">
                <label className="settings-field">
                  <span>E-post</span>
                  <input value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} autoComplete="email" />
                </label>
                <label className="settings-field">
                  <span>Adresse</span>
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
                <span>Nytt passord</span>
                <input
                  type="password"
                  value={profilePassword}
                  onChange={(event) => setProfilePassword(event.target.value)}
                  placeholder="La stå tomt hvis uendret"
                  autoComplete="new-password"
                />
              </label>
              <button className="primary-action" type="button" onClick={handleSaveProfile}>
                Lagre konto
              </button>
            </div>
          ) : null}
          <div className="settings-divider" />
          <button className="danger-link" type="button" onClick={handleLogout} disabled={busy}>
            <span className="danger-link__icon">↪</span>
            {busy ? "Logger ut" : "Logg ut"}
          </button>
        </article>
      </section>

      <section className="settings-section">
        <p className="section-kicker">Drivhus</p>
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
                {session?.hub ? (hubActive ? "Hub på" : "Hub av") : "Ikke paret"}
              </span>
              {hubLocation ? <small>Lokasjon: {hubLocation}</small> : null}
              <small>Hub-ID: {hubId}</small>
              <small>{hubCount} {hubCount === 1 ? "hub" : "hubber"} på kontoen</small>
            </div>
            <span className={`chevron${hubPanelOpen ? " chevron--open" : ""}`}>›</span>
          </button>

          {hubPanelOpen ? (
            <div className="hub-settings-panel">
              <div className="settings-divider" />
              <div className="hub-toggle-row">
                <div>
                  <strong>Hub</strong>
                  <span>{hubActive ? "Sensorer og hub-data er aktivert." : "Growly bruker vær og manuelle data uten hub."}</span>
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
                  <strong>Sensor</strong>
                  <span>
                    {hasPairedHub
                      ? sensorAssignedPlant
                        ? `7-i-1 måler ${plantDisplayName(sensorAssignedPlant)}.`
                        : "Velg hvilken plante 7-i-1-sensoren måler."
                      : "Par hub før sensor kan kobles til plante."}
                  </span>
                </div>
                <label className="settings-field sensor-select-field">
                  <span>7-i-1-sensor</span>
                  <select
                    value={sensorAssignedPlantId}
                    onChange={(event) => handleAssignSevenInOne(event.target.value)}
                    disabled={!hasPairedHub || sensorPlantsLoading || sensorAssigning || !sensorPlants.length}
                  >
                    <option value="">
                      {sensorPlantsLoading
                        ? "Henter planter..."
                        : sensorPlants.length
                          ? "Ikke koblet til plante"
                          : "Ingen planter på huben"}
                    </option>
                    {sensorPlants.map((plant) => {
                      const instanceId = plantInstanceId(plant);
                      return (
                        <option key={instanceId} value={instanceId}>
                          {plantDisplayName(plant)}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>

              <div className="settings-divider" />
              <div className="pairing-panel pairing-panel--compact">
                <div>
                  <h2>Koble til hub</h2>
                  <p>Generer en kode når en Growly Hub skal kobles til denne kontoen.</p>
                </div>
                <button className="secondary-action" type="button" onClick={handleCreatePairing}>
                  Generer pairing-kode
                </button>
                <div className="pairing-footer">
                  <div>
                    <strong>{pairing ? pairing.token : "Ingen aktiv kode"}</strong>
                    <span>{pairing ? `Gyldig til ${pairing.expires_at}` : "Koden vises her når den er klar."}</span>
                  </div>
                  <span className={`pairing-state${pairing ? " is-ready" : ""}`} aria-hidden="true" />
                </div>
              </div>
            </div>
          ) : null}
        </article>
      </section>

      <section className="settings-section">
        <p className="section-kicker">Dyrkested og vær</p>
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
              <strong>{weatherConfigured ? "Værprognose aktiv" : "Sett dyrkested"}</strong>
              <span>{weatherConfigured ? "Lokalt vær brukes til dyrkeråd." : "Bruk telefonens posisjon eller skriv inn adresse."}</span>
              <small>{weatherConfigured ? "Dyrkested er satt" : "Ikke satt opp"}</small>
            </div>
            <span className={`chevron${weatherPanelOpen ? " chevron--open" : ""}`}>›</span>
          </button>

          {weatherPanelOpen ? (
            <div className="weather-settings-panel">
              <div className="settings-divider" />
              <div className="settings-row__content">
                <strong>Dyrkested for vær</strong>
                <span>Growly lagrer posisjonen på huben og bruker den til lokal værprognose.</span>
              </div>
              <label className="settings-field">
                <span>Adresse eller sted</span>
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
                  {addressLookupBusy ? "Søker..." : "Finn adresse"}
                </button>
                <button className="secondary-action" type="button" onClick={handleUseDeviceLocation} disabled={locationLookupBusy}>
                  {locationLookupBusy ? "Henter..." : "Bruk min posisjon"}
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
                  <strong>Dyrkested funnet</strong>
                  <span>{weatherAddress || "Posisjon valgt"}</span>
                </div>
              ) : null}
              <details className="advanced-location">
                <summary>Avansert plassering</summary>
                <div className="settings-field-grid">
                  <label className="settings-field">
                    <span>Breddegrad</span>
                    <input
                      value={weatherLatitude}
                      onChange={(event) => setWeatherLatitude(event.target.value)}
                      inputMode="decimal"
                      placeholder="59.112163"
                    />
                  </label>
                  <label className="settings-field">
                    <span>Lengdegrad</span>
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
                Lagre dyrkested
              </button>
            </div>
          ) : null}
        </article>
      </section>

      {status ? <p className="helper-text helper-text--settings">{status}</p> : null}

      <section className="settings-section settings-section--compact">
        <p className="section-kicker">Varsler</p>
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
              <strong>Push-varsler</strong>
              <span>{notificationSummary}</span>
              <small>Siste varsel vises på dashbordet.</small>
            </div>
          </div>
          <div className="notification-action-row">
            <button className="secondary-action" type="button" onClick={handleEnableNotifications} disabled={notificationBusy}>
              {notificationStatus === "granted" ? "Oppdater varsler" : "Aktiver varsler"}
            </button>
            {notificationStatus === "granted" ? (
              <button className="text-action" type="button" onClick={handleDisableNotifications} disabled={notificationBusy}>
                Slå av
              </button>
            ) : null}
          </div>
        </article>
      </section>

      <section className="settings-section settings-section--compact">
        <p className="section-kicker">Tema</p>
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
              <strong>Utseende</strong>
              <span>{themeSummary}</span>
            </div>
          </div>
          <div className="theme-mode-toggle" role="radiogroup" aria-label="Velg tema">
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

      <section className="settings-section">
        <p className="section-kicker">Om appen</p>
        <article className="soft-card version-card premium-section-card">
          <span>Versjon</span>
          <div className="version-card__value">
            <strong>1.0.0</strong>
            <span className="chevron">›</span>
          </div>
        </article>
      </section>
    </main>
  );
}
