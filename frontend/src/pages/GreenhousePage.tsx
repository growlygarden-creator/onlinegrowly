import { useEffect, useState } from "react";
import { fetchLatestSample, type AuthSession, type LatestSample } from "../lib/api";

type GreenhousePageProps = {
  session: AuthSession | null;
};

function metricValue(value: number | null | undefined, suffix: string, digits = 0): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${value.toFixed(digits)} ${suffix}`.trim();
}

export function GreenhousePage({ session }: GreenhousePageProps) {
  const [sample, setSample] = useState<LatestSample | null>(null);

  useEffect(() => {
    fetchLatestSample().then((result) => {
      setSample(result);
    });
  }, []);

  const hubName = session?.hub?.hub_name || "Growly Hub";
  const hubId = session?.hub?.hub_id || "growly-hub-001";
  const soilText = typeof sample?.humidity === "number" ? (sample.humidity < 45 ? "Litt tørr" : "Fin balanse") : "Venter";

  return (
    <main className="page-shell app-page">
      <section className="screen-header">
        <div>
          <h1>Planter <span className="leaf-mark">🌿</span></h1>
          <p>Plantene dine samlet i et rolig og tydelig overblikk.</p>
        </div>
        <button className="icon-button" type="button" aria-label="Drivhusstatus">
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
        </button>
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
        <p className="section-kicker">Drivhusklima</p>
        <article className="soft-card info-card premium-section-card">
          <div className="info-row">
            <span>Temperatur</span>
            <strong>{metricValue(sample?.air_temperature ?? sample?.temperature, "°C", 1)}</strong>
          </div>
          <div className="settings-divider" />
          <div className="info-row">
            <span>Luftfuktighet</span>
            <strong>{metricValue(sample?.air_humidity, "%")}</strong>
          </div>
          <div className="settings-divider" />
          <div className="info-row">
            <span>Jordfuktighet</span>
            <strong>{soilText}</strong>
          </div>
          <div className="settings-divider" />
          <div className="info-row info-row--muted">
            <span>Siste status</span>
            <span>{sample?.recorded_at ? "Oppdatert nylig" : "Venter på første måling"}</span>
          </div>
        </article>
      </section>

      <section className="settings-section">
        <p className="section-kicker">Planter</p>
        <article className="soft-card list-card premium-section-card">
          <div className="list-row">
            <div className="plant-thumb plant-thumb--tomato" aria-hidden="true" />
            <div className="list-row__content">
              <strong>Tomat (Cherry)</strong>
              <span>Dag 12</span>
              <small>Ser frisk ut og vokser jevnt.</small>
            </div>
            <div className="list-row__meta">
              <span className="chevron">›</span>
            </div>
          </div>
          <div className="settings-divider" />
          <div className="list-row">
            <div className="plant-thumb plant-thumb--basil" aria-hidden="true" />
            <div className="list-row__content">
              <strong>Basilikum</strong>
              <span>Dag 7</span>
              <small>Trives godt og får nye blader.</small>
            </div>
            <div className="list-row__meta">
              <span className="chevron">›</span>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
