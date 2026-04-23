import type { AuthSession } from "../lib/api";

type CalendarPageProps = {
  session: AuthSession | null;
};

export function CalendarPage({ session }: CalendarPageProps) {
  const name = session?.user?.full_name || session?.username || "bruker";

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Kalender</p>
        <h1>Plan og oppgaver</h1>
        <p className="lead">Legg inn påminnelser for vanning, gjødsling, såing og høsting.</p>
      </section>

      <section className="content-grid">
        <article className="panel-card">
          <p className="eyebrow">I dag</p>
          <h2>Hei, {name}</h2>
          <ul className="check-list">
            <li>Ingen oppgaver registrert ennå.</li>
            <li>Vi kan koble dette til hub-data senere.</li>
          </ul>
        </article>

        <article className="panel-card">
          <p className="eyebrow">Neste steg</p>
          <h2>Kommer snart</h2>
          <ul className="check-list">
            <li>Ukentlig sjekkliste</li>
            <li>Varsler</li>
            <li>Sesongplan</li>
          </ul>
        </article>
      </section>
    </main>
  );
}

