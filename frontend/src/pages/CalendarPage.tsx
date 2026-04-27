import type { AuthSession } from "../lib/api";

type CalendarPageProps = {
  session: AuthSession | null;
};

export function CalendarPage({ session }: CalendarPageProps) {
  const name = session?.user?.full_name || session?.username || "bruker";

  return (
    <main className="page-shell app-page">
      <section className="screen-header">
        <div>
          <h1>Dyrkelogg <span className="leaf-mark">🌿</span></h1>
          <p>Her samler vi alt som skjer i drivhuset ditt over tid.</p>
        </div>
        <button className="icon-button" type="button" aria-label="Logg">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M7 4.5V2.8M17 4.5V2.8M4.5 8.5h15M6 21h12a1.5 1.5 0 0 0 1.5-1.5V6.5A1.5 1.5 0 0 0 18 5H6A1.5 1.5 0 0 0 4.5 6.5v13A1.5 1.5 0 0 0 6 21Z"
            />
          </svg>
        </button>
      </section>

      <section className="settings-section">
        <p className="section-kicker">Oversikt</p>
        <article className="soft-card log-hero premium-section-card">
          <span className="log-hero__eyebrow">Hei, {name}</span>
          <h2>Ingen aktiviteter registrert enda</h2>
          <p>Så snart du begynner å bruke loggen, får du en ryddig historikk over vanning, målinger og vekst.</p>
        </article>
      </section>

      <section className="settings-section">
        <p className="section-kicker">Status</p>
        <article className="soft-card info-card premium-section-card">
          <div className="info-row">
            <span>Dagens nivå</span>
            <strong>Tom akkurat nå</strong>
          </div>
          <div className="settings-divider" />
          <div className="info-row info-row--muted">
            <span>Neste steg</span>
            <span>Fylles automatisk når loggen er i bruk</span>
          </div>
        </article>
      </section>
    </main>
  );
}
