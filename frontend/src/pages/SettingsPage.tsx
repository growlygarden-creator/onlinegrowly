import { useState } from "react";
import { logout, type AuthSession } from "../lib/api";

type SettingsPageProps = {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
};

export function SettingsPage({ session, setSession }: SettingsPageProps) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

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

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Settings</p>
        <h1>Innstillinger</h1>
        <p className="lead">Konto, hub og appvalg.</p>
      </section>

      <section className="content-grid">
        <article className="panel-card">
          <p className="eyebrow">Konto</p>
          <h2>{session?.user?.full_name || session?.username || "Growly Garden"}</h2>
          <ul className="check-list">
            <li>Bruker: {session?.user?.username ?? session?.username ?? "-"}</li>
            <li>E-post: {session?.user?.email ?? "-"}</li>
            <li>Admin: {session?.is_admin ? "Ja" : "Nei"}</li>
          </ul>
          <div className="button-row">
            <button className="button secondary-button" type="button" onClick={handleLogout} disabled={busy}>
              {busy ? "Logger ut..." : "Logg ut"}
            </button>
          </div>
          {status ? <p className="helper-text">{status}</p> : null}
        </article>

        <article className="panel-card">
          <p className="eyebrow">Hub</p>
          <h2>{session?.hub?.hub_name || "Ingen hub"}</h2>
          <ul className="check-list">
            <li>Hub-ID: {session?.hub?.hub_id ?? "-"}</li>
            <li>Eier: {session?.hub?.owner_username ?? "-"}</li>
          </ul>
          <p className="helper-text">Vi kan legge inn pairing/hub-innstillinger her etterpå.</p>
        </article>
      </section>
    </main>
  );
}

