import { useEffect, useState } from "react";
import { fetchLatestSample, fetchMetricHistory, type AuthSession, type HistoryPoint, type LatestSample } from "../lib/api";
import greenhouseDay from "../assets/greenhouse-assets/greenhouse-day.png";
import humidityDot from "../assets/greenhouse-assets/humidity-dot.png";
import soilDot from "../assets/greenhouse-assets/soil-dot.png";
import tempDot from "../assets/greenhouse-assets/temp-dot.png";

type DashboardPageProps = {
  session: AuthSession | null;
};

type SoilMetricKey = "humidity" | "temperature" | "ph" | "conductivity" | "nitrogen" | "phosphorus" | "potassium" | "salinity" | "tds";
type TrendRange = "24h" | "3d" | "7d" | "all";

const soilMetricConfigs: Array<{
  key: SoilMetricKey;
  label: string;
  unit: string;
  digits: number;
}> = [
  { key: "humidity", label: "Jordfuktighet", unit: "%", digits: 0 },
  { key: "temperature", label: "Jordtemperatur", unit: "°C", digits: 1 },
  { key: "ph", label: "pH", unit: "", digits: 1 },
  { key: "conductivity", label: "Ledningsevne", unit: "", digits: 0 },
  { key: "nitrogen", label: "Nitrogen (N)", unit: "", digits: 0 },
  { key: "phosphorus", label: "Fosfor (P)", unit: "", digits: 0 },
  { key: "potassium", label: "Kalium (K)", unit: "", digits: 0 },
  { key: "salinity", label: "Saltinnhold", unit: "", digits: 0 },
  { key: "tds", label: "TDS", unit: "", digits: 0 },
];

const trendRangeOptions: Array<{ key: TrendRange; label: string }> = [
  { key: "24h", label: "24t" },
  { key: "3d", label: "3 dager" },
  { key: "7d", label: "7 dager" },
  { key: "all", label: "Alt" },
];

function metricText(value: number | null | undefined, suffix: string, digits = 0): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${value.toFixed(digits)}${suffix}`;
}

function sampleValue(sample: LatestSample | null, key: SoilMetricKey): number | null | undefined {
  return sample?.[key];
}

function formatTrendValue(value: number | null | undefined, unit: string, digits: number): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${value.toFixed(digits)}${unit ? ` ${unit}` : ""}`;
}

function trendWindow(range: TrendRange): { span: "minutes" | "hours" | "days"; limit: number; dateFrom?: string; dateTo?: string } {
  if (range === "all") {
    return { span: "days", limit: 2000 };
  }

  const now = new Date();
  const hours = range === "24h" ? 24 : range === "3d" ? 72 : 168;
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

  return {
    span: range === "24h" ? "minutes" : "hours",
    limit: range === "24h" ? 1500 : 2000,
    dateFrom: start.toISOString(),
    dateTo: now.toISOString(),
  };
}

function formatTrendTime(value: string): string {
  return new Date(value).toLocaleString("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function chartPath(points: HistoryPoint[]): {
  area: string;
  line: string;
  coords: Array<{ x: number; y: number; point: HistoryPoint }>;
} {
  if (!points.length) {
    return { area: "", line: "", coords: [] };
  }

  const width = 800;
  const top = 20;
  const bottom = 226;
  const left = 22;
  const right = 760;
  const times = points.map((point) => new Date(point.recorded_at).getTime());
  const values = points.map((point) => Number(point.value));
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueSpread = maxValue - minValue || 1;
  const timeSpread = maxTime - minTime || 1;

  const coords = points.map((point) => {
    const x = left + ((new Date(point.recorded_at).getTime() - minTime) / timeSpread) * (right - left);
    const y = bottom - ((Number(point.value) - minValue) / valueSpread) * (bottom - top);
    return { x, y, point };
  });

  const line = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L ${right} ${bottom} L ${left} ${bottom} Z`;

  return { area, line, coords };
}

function growthStatus(sample: LatestSample | null): { title: string; note: string; soil: string } {
  if (!sample) {
    return {
      title: "Venter",
      note: "Vi venter på første måling.",
      soil: "Venter",
    };
  }

  if (typeof sample.humidity === "number" && sample.humidity < 45) {
    return {
      title: "Trenger vann",
      note: "Jorden virker litt tørr akkurat nå.",
      soil: "Litt tørr",
    };
  }

  return {
    title: "Optimal",
    note: "Alt ser fint ut for plantene dine i dag.",
    soil: "Fin balanse",
  };
}

function formatUpdatedAt(value: string | null | undefined): string {
  if (!value) {
    return "Venter på første oppdatering";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Oppdatert nylig";
  }

  return `Oppdatert ${date.toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function DashboardPage({ session }: DashboardPageProps) {
  const [sample, setSample] = useState<LatestSample | null>(null);
  const [soilPanelOpen, setSoilPanelOpen] = useState(false);
  const [trendMetric, setTrendMetric] = useState<SoilMetricKey | null>(null);
  const [trendRange, setTrendRange] = useState<TrendRange>("7d");
  const [trendPoints, setTrendPoints] = useState<HistoryPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchLatestSample().then((result) => {
      setSample(result);
    });
  }, []);

  useEffect(() => {
    if (!soilPanelOpen && !trendMetric) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSoilPanelOpen(false);
        setTrendMetric(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [soilPanelOpen, trendMetric]);

  useEffect(() => {
    if (!trendMetric) {
      return;
    }

    const windowConfig = trendWindow(trendRange);
    setTrendLoading(true);
    setTrendError("");
    setHoverIndex(null);

    fetchMetricHistory({
      metric: trendMetric,
      span: windowConfig.span,
      limit: windowConfig.limit,
      dateFrom: windowConfig.dateFrom,
      dateTo: windowConfig.dateTo,
    }).then((result) => {
      if (!result) {
        setTrendPoints([]);
        setTrendError("Kunne ikke hente historikk.");
        setTrendLoading(false);
        return;
      }

      setTrendPoints(result.points);
      setTrendLoading(false);
    });
  }, [trendMetric, trendRange]);

  const firstName = session?.user?.full_name?.split(" ")[0] || session?.username || "Geirij";
  const status = growthStatus(sample);
  const temperature = metricText(sample?.air_temperature ?? sample?.temperature, "°C", 0);
  const humidity = metricText(sample?.air_humidity, "%", 0);
  const updatedAt = formatUpdatedAt(sample?.recorded_at);
  const soilMetrics = soilMetricConfigs.map((metric) => ({
    ...metric,
    value: formatTrendValue(sampleValue(sample, metric.key), metric.unit, metric.digits),
  }));
  const activeTrendConfig = soilMetricConfigs.find((metric) => metric.key === trendMetric);
  const trendValues = trendPoints.map((point) => Number(point.value)).filter((value) => Number.isFinite(value));
  const latestTrendValue = trendValues.length ? trendValues[trendValues.length - 1] : null;
  const previousTrendValue = trendValues.length > 1 ? trendValues[trendValues.length - 2] : latestTrendValue;
  const trendDelta = latestTrendValue !== null && previousTrendValue !== null ? latestTrendValue - previousTrendValue : null;
  const trendMin = trendValues.length ? Math.min(...trendValues) : null;
  const trendMax = trendValues.length ? Math.max(...trendValues) : null;
  const trendChart = chartPath(trendPoints);
  const hoverPoint = hoverIndex !== null ? trendChart.coords[hoverIndex] : null;

  function openTrend(metric: SoilMetricKey) {
    setSoilPanelOpen(false);
    setTrendMetric(metric);
  }

  return (
    <main className="page-shell app-page">
      <section className="screen-header">
        <div>
          <h1>Ditt drivhus <span className="leaf-mark">🌿</span></h1>
          <p>God morgen, {firstName}. Her er det viktigste akkurat nå.</p>
        </div>
        <button className="icon-button" type="button" aria-label="Status">
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
        </button>
      </section>

      <section className="settings-section">
        <p className="section-kicker">Vekstforhold</p>
        <article className="soft-card premium-hero premium-hero--climate">
          <div className="premium-hero__head">
            <div>
              <strong>{status.title}</strong>
              <span>{status.note}</span>
            </div>
            <span className="status-pill status-pill--live">
              <span className="online-dot" aria-hidden="true" />
              {session?.hub ? "Hub online" : "Hub offline"}
            </span>
          </div>

          <div className="overview-image-banner">
            <img className="overview-image-banner__image" src={greenhouseDay} alt="" aria-hidden="true" />
          </div>

          <div className="metric-strip">
            <div className="metric-strip__item">
              <span className="metric-strip__label">
                <img className="metric-strip__dot" src={tempDot} alt="" aria-hidden="true" />
                Temperatur
              </span>
              <strong>{temperature}</strong>
            </div>
            <div className="metric-strip__item">
              <span className="metric-strip__label">
                <img className="metric-strip__dot" src={humidityDot} alt="" aria-hidden="true" />
                Luftfuktighet
              </span>
              <strong>{humidity}</strong>
            </div>
            <button className="metric-strip__item metric-strip__button" type="button" onClick={() => setSoilPanelOpen(true)}>
              <span className="metric-strip__label">
                <img className="metric-strip__dot" src={soilDot} alt="" aria-hidden="true" />
                Jordfuktighet
              </span>
              <strong>{status.soil}</strong>
            </button>
          </div>

          <div className="hero-meta-row">
            <span>{updatedAt}</span>
            <span>{session?.hub?.hub_name || "Growly Hub"}</span>
          </div>
        </article>
      </section>

      <section className="settings-section">
        <p className="section-kicker">Oversikt</p>
        <div className="insight-grid insight-grid--compact">
          <article className="soft-card insight-card insight-card--compact">
            <span className="insight-card__label">Klima</span>
            <strong>{status.title}</strong>
            <p>{status.note}</p>
          </article>
        </div>
      </section>

      {soilPanelOpen ? (
        <div className="soil-modal" role="dialog" aria-modal="true" aria-labelledby="soil-modal-title">
          <button
            className="soil-modal__backdrop"
            type="button"
            aria-label="Lukk jordverdier"
            onClick={() => setSoilPanelOpen(false)}
          />
          <section className="soil-modal__panel soft-card">
            <div className="soil-modal__header">
              <div>
                <p className="section-kicker">Jord</p>
                <h2 id="soil-modal-title">Jordverdier</h2>
                <span>{updatedAt}</span>
              </div>
              <button className="soil-modal__close" type="button" aria-label="Lukk" onClick={() => setSoilPanelOpen(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6L18 18M18 6L6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </div>
            <div className="soil-value-grid">
              {soilMetrics.map((metric) => (
                <button className="soil-value-card" type="button" key={metric.label} onClick={() => openTrend(metric.key)}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {trendMetric && activeTrendConfig ? (
        <div className="trend-sheet" role="dialog" aria-modal="true" aria-labelledby="dashboard-trend-title">
          <button
            className="trend-sheet__backdrop"
            type="button"
            aria-label="Lukk trend"
            onClick={() => setTrendMetric(null)}
          />
          <section className="trend-sheet__panel soft-card">
            <div className="trend-sheet__header">
              <div>
                <p className="section-kicker">Trend</p>
                <h2 id="dashboard-trend-title">{activeTrendConfig.label}</h2>
                <span>
                  {trendLoading
                    ? "Henter historikk"
                    : trendPoints.length
                      ? `${trendPoints.length} målinger · siste ${formatTrendTime(trendPoints[trendPoints.length - 1].recorded_at)}`
                      : trendError || "Ingen historikk ennå"}
                </span>
              </div>
              <button className="soil-modal__close" type="button" aria-label="Lukk" onClick={() => setTrendMetric(null)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6L18 18M18 6L6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </div>

            <div className="trend-range-tabs">
              {trendRangeOptions.map((range) => (
                <button
                  className={range.key === trendRange ? "active" : ""}
                  type="button"
                  key={range.key}
                  onClick={() => setTrendRange(range.key)}
                >
                  {range.label}
                </button>
              ))}
            </div>

            <div className="trend-stat-grid">
              <span><small>Nå</small><strong>{formatTrendValue(latestTrendValue, activeTrendConfig.unit, activeTrendConfig.digits)}</strong></span>
              <span><small>Lavest</small><strong>{formatTrendValue(trendMin, activeTrendConfig.unit, activeTrendConfig.digits)}</strong></span>
              <span><small>Høyest</small><strong>{formatTrendValue(trendMax, activeTrendConfig.unit, activeTrendConfig.digits)}</strong></span>
              <span>
                <small>Endring</small>
                <strong>
                  {trendDelta === null
                    ? "—"
                    : `${trendDelta >= 0 ? "+" : ""}${formatTrendValue(trendDelta, activeTrendConfig.unit, activeTrendConfig.digits)}`}
                </strong>
              </span>
            </div>

            <div className="trend-chart-card">
              <svg className="dashboard-trend-chart" viewBox="0 0 800 260" preserveAspectRatio="none" aria-label={`${activeTrendConfig.label} trend`}>
                <defs>
                  <linearGradient id="dashboard-trend-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(47, 138, 84, 0.26)" />
                    <stop offset="100%" stopColor="rgba(47, 138, 84, 0.02)" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((tick) => (
                  <line key={tick} x1="22" x2="760" y1={38 + tick * 54} y2={38 + tick * 54} />
                ))}
                <path className="dashboard-trend-area" d={trendChart.area} />
                <path className="dashboard-trend-line" d={trendChart.line} />
                {trendChart.coords.map((coord, index) => (
                  <circle
                    key={`${coord.point.recorded_at}-${index}`}
                    className="dashboard-trend-hit"
                    cx={coord.x}
                    cy={coord.y}
                    r="16"
                    onMouseEnter={() => setHoverIndex(index)}
                    onFocus={() => setHoverIndex(index)}
                  />
                ))}
                {hoverPoint ? (
                  <>
                    <line className="dashboard-trend-hover-line" x1={hoverPoint.x} x2={hoverPoint.x} y1="20" y2="226" />
                    <circle className="dashboard-trend-point" cx={hoverPoint.x} cy={hoverPoint.y} r="6" />
                  </>
                ) : trendChart.coords.length ? (
                  <circle
                    className="dashboard-trend-point"
                    cx={trendChart.coords[trendChart.coords.length - 1].x}
                    cy={trendChart.coords[trendChart.coords.length - 1].y}
                    r="6"
                  />
                ) : null}
              </svg>
              {hoverPoint ? (
                <div className="trend-tooltip-lite">
                  <strong>{formatTrendValue(Number(hoverPoint.point.value), activeTrendConfig.unit, activeTrendConfig.digits)}</strong>
                  <span>{formatTrendTime(hoverPoint.point.recorded_at)}</span>
                </div>
              ) : null}
              {!trendLoading && !trendPoints.length ? (
                <div className="trend-empty-state">
                  <strong>Ingen historikk i valgt periode</strong>
                  <span>Prøv en annen periode, eller vent til huben har sendt flere målinger.</span>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
