import { useEffect, useState } from "react";
import { createPairing, fetchActivePairing, fetchSession, logout, type AuthSession, type PairingInfo } from "../lib/api";

export function DashboardPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [pairing, setPairing] = useState<PairingInfo | null>(null);
  const [status, setStatus] = useState("Laster session...");

  useEffect(() => {
    fetchSession().then((result) => {
      setSession(result);
      if (!result?.authenticated) {
        setStatus("Logg inn for å hente pairing-kode og se hub-status.");
        return;
      }

      fetchActivePairing().then((activePairing) => {
        if (activePairing) {
          setPairing(activePairing);
          setStatus("Fant aktiv pairing-kode.");
          return;
        }
        setStatus("Ingen aktiv pairing-kode ennå.");
      });
    });
  }, []);

  async function handleCreatePairing() {
    if (!session?.authenticated) {
      setStatus("Du må være logget inn før du kan lage pairing-kode.");
      return;
    }
    setStatus("Lager pairing-kode...");
    const result = await createPairing();
    if (!result) {
      setStatus("Kunne ikke lage pairing-kode.");
      return;
    }
    setPairing(result);
    setStatus("Pairing-koden er klar.");
  }

  async function handleLogout() {
    await logout();
    setSession(null);
    setPairing(null);
    setStatus("Du er logget ut.");
  }

  return (
    <main className="page-shell">
      <section className="hero-card hero-card-primary">
        <p className="eyebrow">Ny frontend-retning</p>
        <h1>Growly Garden for web og iPhone.</h1>
        <p className="lead">
          Denne frontend-basen er laget for å kunne kjøres i nettleser nå og i Capacitor/Xcode senere,
          mens FastAPI fortsetter som backend.
        </p>
      </section>

      <section className="content-grid">
        <article className="panel-card">
          <p className="eyebrow">Konto</p>
          <h2>{session?.authenticated ? `Hei, ${session.user?.full_name || session.username}` : "Ikke logget inn ennå"}</h2>
          <ul className="check-list">
            <li>Bruker: {session?.user?.username ?? "-"}</li>
            <li>E-post: {session?.user?.email ?? "-"}</li>
            <li>Hub: {session?.hub?.hub_id ?? "Ingen hub koblet ennå"}</li>
          </ul>
          {session?.authenticated ? (
            <div className="button-row">
              <button className="button secondary-button" onClick={handleLogout} type="button">
                Logg ut
              </button>
            </div>
          ) : null}
        </article>

        <article className="panel-card">
          <p className="eyebrow">Pairing</p>
          <h2>Hub-oppsett</h2>
          <div className="pairing-code-card">
            <span>Aktiv kode</span>
            <strong>{pairing?.token ?? "------"}</strong>
            <small>{pairing ? `Utløper ${pairing.expires_at}` : "Ingen aktiv kode hentet ennå."}</small>
          </div>
          <div className="button-row">
            <button className="button" onClick={handleCreatePairing} type="button">
              Generer pairing-kode
            </button>
          </div>
          <p className="helper-text">{status}</p>
        </article>
      </section>
    </main>
  );
}
