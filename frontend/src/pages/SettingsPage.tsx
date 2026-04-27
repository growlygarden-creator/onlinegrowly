import { useEffect, useState } from "react";
import { createPairing, fetchActivePairing, logout, type AuthSession, type PairingInfo } from "../lib/api";

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

  useEffect(() => {
    fetchActivePairing().then((activePairing) => {
      setPairing(activePairing);
    });
  }, []);

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

  const displayName = session?.user?.full_name || session?.username || "Growly Garden";
  const displayEmail = session?.user?.email || "geirij@example.com";
  const hubName = session?.hub?.hub_name || "Growly Hub";
  const hubId = session?.hub?.hub_id || "growly-hub-001";

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
          <div className="settings-row">
            <div className="avatar-badge">{initialsFromName(displayName) || "GG"}</div>
            <div className="settings-row__content">
              <strong>{displayName}</strong>
              <span>{displayEmail}</span>
            </div>
            <span className="chevron">›</span>
          </div>
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
          <div className="settings-row">
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
              <span className="online-line"><span className="online-dot" aria-hidden="true" />Tilkoblet</span>
              <small>Hub-ID: {hubId}</small>
            </div>
            <span className="chevron">›</span>
          </div>
        </article>
      </section>

      <section className="settings-section">
        <p className="section-kicker">Tilkobling</p>
        <article className="soft-card pairing-panel premium-section-card">
          <h2>Koble til hub</h2>
          <p>Koble appen til din Growly Hub for å hente sensor-data og få full oversikt.</p>
          <button className="primary-action" type="button" onClick={handleCreatePairing}>
            <span className="primary-action__icon">❦</span>
            Generer pairing-kode
          </button>
          <div className="settings-divider" />
          <div className="pairing-footer">
            <div>
              <strong>{pairing ? pairing.token : "Ingen aktiv kode"}</strong>
              <span>{pairing ? `Gyldig til ${pairing.expires_at}` : "Generer en kode for å koble til huben din."}</span>
            </div>
            <span className={`pairing-state${pairing ? " is-ready" : ""}`} aria-hidden="true" />
          </div>
          {status ? <p className="helper-text">{status}</p> : null}
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
