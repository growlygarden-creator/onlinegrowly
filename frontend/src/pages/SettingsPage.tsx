import { useEffect, useState } from "react";
import {
  createPairing,
  fetchActivePairing,
  logout,
  saveHubSettings,
  searchWeatherAddress,
  updateProfile,
  type AuthSession,
  type PairingInfo,
  type WeatherAddressMatch,
} from "../lib/api";

type SettingsPageProps = {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
};

function initialsFromName(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SettingsPage({ session, setSession }: SettingsPageProps) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [pairing, setPairing] = useState<PairingInfo | null>(null);
  const [weatherAddress, setWeatherAddress] = useState(session?.hub?.weather_address || session?.hub?.location_label || "");
  const [weatherLatitude, setWeatherLatitude] = useState(session?.hub?.weather_latitude?.toString() || "");
  const [weatherLongitude, setWeatherLongitude] = useState(session?.hub?.weather_longitude?.toString() || "");
  const [addressMatches, setAddressMatches] = useState<WeatherAddressMatch[]>([]);
  const [addressLookupBusy, setAddressLookupBusy] = useState(false);
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const [hubPanelOpen, setHubPanelOpen] = useState(false);
  const [weatherPanelOpen, setWeatherPanelOpen] = useState(false);
  const [profileFullName, setProfileFullName] = useState(session?.user?.full_name || "");
  const [profilePhone, setProfilePhone] = useState(session?.user?.phone || "");
  const [profileEmail, setProfileEmail] = useState(session?.user?.email || "");
  const [profilePassword, setProfilePassword] = useState("");

  useEffect(() => {
    fetchActivePairing().then((activePairing) => {
      setPairing(activePairing);
    });
  }, []);

  useEffect(() => {
    setWeatherAddress(session?.hub?.weather_address || session?.hub?.location_label || "");
    setWeatherLatitude(session?.hub?.weather_latitude?.toString() || "");
    setWeatherLongitude(session?.hub?.weather_longitude?.toString() || "");
  }, [session?.hub?.hub_id, session?.hub?.weather_address, session?.hub?.weather_latitude, session?.hub?.weather_longitude, session?.hub?.location_label]);

  useEffect(() => {
    setProfileFullName(session?.user?.full_name || "");
    setProfilePhone(session?.user?.phone || "");
    setProfileEmail(session?.user?.email || "");
    setProfilePassword("");
  }, [session?.user?.username, session?.user?.full_name, session?.user?.phone, session?.user?.email]);

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
    if (session?.hub && weatherAddress.trim()) {
      const updatedHub = await saveHubSettings({
        location_label: weatherAddress,
        weather_address: weatherAddress,
      });
      if (updatedHub) {
        const updatedHubs = (nextSession.hubs ?? []).map((hub) => (
          hub.hub_id === updatedHub.hub_id ? { ...hub, ...updatedHub } : hub
        ));
        nextSession = {
          ...nextSession,
          hub: nextSession.hub?.hub_id === updatedHub.hub_id ? { ...nextSession.hub, ...updatedHub } : nextSession.hub,
          hubs: updatedHubs.length ? updatedHubs : nextSession.hubs,
        };
      }
    }

    setSession(nextSession);
    setProfilePassword("");
    setStatus("Kontoen er oppdatert.");
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

  const displayName = session?.user?.full_name || session?.username || "Growly Garden";
  const displayEmail = session?.user?.email || "geirij@example.com";
  const hubName = session?.hub?.hub_name || "Ingen hub paret ennå";
  const hubLocation = session?.hub?.location_label || "";
  const hubId = session?.hub?.hub_id || "Venter på paring";
  const hubCount = session?.hubs?.length ?? (session?.hub ? 1 : 0);
  const hubActive = !!session?.hub?.is_active;
  const weatherConfigured = !!weatherLatitude && !!weatherLongitude;

  return (
    <main className="page-shell app-page">
      <section className="screen-header">
        <div>
          <h1>Innstillinger <span className="leaf-mark">🌿</span></h1>
          <p>Konto, drivhus og tilkoblinger</p>
        </div>
        <button className="icon-button" type="button" aria-label="Varsler">
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
                    placeholder="Adresse eller dyrkested"
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
              <strong>{hubName}</strong>
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
              <strong>{weatherConfigured ? "Værprognose aktiv" : "Værprognose uten hub"}</strong>
              <span>{weatherConfigured ? "Lokalt vær brukes til dyrkeråd." : "Legg inn dyrkested for lokale råd uten hub."}</span>
              <small>{weatherConfigured ? "Dyrkested er satt" : "Ikke satt opp"}</small>
            </div>
            <span className={`chevron${weatherPanelOpen ? " chevron--open" : ""}`}>›</span>
          </button>

          {weatherPanelOpen ? (
            <div className="weather-settings-panel">
              <div className="settings-divider" />
              <div className="settings-row__content">
                <strong>Værprognose uten hub</strong>
                <span>Growly bruker dyrkestedet ditt til værbaserte råd når huben ikke er aktiv.</span>
              </div>
              <label className="settings-field">
                <span>Adresse eller sted</span>
                <input
                  value={weatherAddress}
                  onChange={(event) => {
                    setWeatherAddress(event.target.value);
                    setAddressMatches([]);
                  }}
                  placeholder="F.eks. Grenaderveien 7 Halden"
                />
              </label>
              <button className="secondary-action" type="button" onClick={handleSearchAddress} disabled={addressLookupBusy}>
                {addressLookupBusy ? "Søker..." : "Finn adresse"}
              </button>
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
                  <span>{weatherAddress || "Adresse valgt"}</span>
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
