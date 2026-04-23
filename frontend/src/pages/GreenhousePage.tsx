import type { AuthSession } from "../lib/api";

type GreenhousePageProps = {
  session: AuthSession | null;
};

export function GreenhousePage({ session }: GreenhousePageProps) {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Drivhus</p>
        <h1>Drivhus og sensorer</h1>
        <p className="lead">Her samler vi status fra huben din og sensorer i drivhuset.</p>
      </section>

      <section className="content-grid">
        <article className="panel-card">
          <p className="eyebrow">Hub</p>
          <h2>{session?.hub?.hub_name || session?.hub?.hub_id || "Ingen hub koblet"}</h2>
          <ul className="check-list">
            <li>Hub-ID: {session?.hub?.hub_id ?? "-"}</li>
            <li>Lokal IP: {session?.hub?.local_ip ?? "-"}</li>
            <li>Sensor-URL: {session?.hub?.sensor_url ?? "-"}</li>
          </ul>
        </article>

        <article className="panel-card">
          <p className="eyebrow">Kommer</p>
          <h2>Snarveier</h2>
          <ul className="check-list">
            <li>Fukt / temperatur / lys</li>
            <li>Vanningsstatus</li>
            <li>Varsler og feilmeldinger</li>
          </ul>
        </article>
      </section>
    </main>
  );
}

