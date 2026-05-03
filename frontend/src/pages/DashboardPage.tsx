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
type ClimateReportMetric = "temperature" | "humidity" | "lux";

type DashboardPlant = {
  nickname: string;
  profileId: string;
};

const GREENHOUSE_PLANTS_STORAGE_KEY = "growly.greenhousePlants";

const dashboardPlantProfiles: Record<
  string,
  {
    name: string;
    ranges: Record<ClimateReportMetric, { optimal: [number, number]; caution: [number, number] }>;
  }
> = {
  tomato: {
    name: "Tomat",
    ranges: {
      temperature: { optimal: [20, 26], caution: [16, 30] },
      humidity: { optimal: [45, 65], caution: [35, 78] },
      lux: { optimal: [5000, 25000], caution: [2000, 40000] },
    },
  },
  cucumber: {
    name: "Agurk",
    ranges: {
      temperature: { optimal: [22, 28], caution: [18, 31] },
      humidity: { optimal: [60, 80], caution: [48, 90] },
      lux: { optimal: [6000, 30000], caution: [2500, 45000] },
    },
  },
  basil: {
    name: "Basilikum",
    ranges: {
      temperature: { optimal: [20, 26], caution: [18, 30] },
      humidity: { optimal: [45, 65], caution: [35, 78] },
      lux: { optimal: [5000, 22000], caution: [2500, 35000] },
    },
  },
  pepper: {
    name: "Paprika",
    ranges: {
      temperature: { optimal: [21, 28], caution: [18, 31] },
      humidity: { optimal: [45, 65], caution: [35, 78] },
      lux: { optimal: [6000, 26000], caution: [3000, 42000] },
    },
  },
  lettuce: {
    name: "Salat",
    ranges: {
      temperature: { optimal: [10, 18], caution: [6, 24] },
      humidity: { optimal: [50, 75], caution: [40, 85] },
      lux: { optimal: [3000, 18000], caution: [1500, 30000] },
    },
  },
  strawberry: {
    name: "Jordbær",
    ranges: {
      temperature: { optimal: [16, 22], caution: [12, 28] },
      humidity: { optimal: [55, 75], caution: [45, 85] },
      lux: { optimal: [4000, 20000], caution: [1800, 32000] },
    },
  },
};

const defaultDashboardPlants: DashboardPlant[] = [
  { nickname: "Cherry tomat", profileId: "tomato" },
  { nickname: "Agurk", profileId: "cucumber" },
  { nickname: "Basilikum", profileId: "basil" },
];

const soilMetricConfigs: Array<{
  key: SoilMetricKey;
  label: string;
  unit: string;
  digits: number;
  optimal?: [number, number];
  acceptable?: [number, number];
  referenceNote?: string;
}> = [
  {
    key: "humidity",
    label: "Jordfuktighet",
    unit: "%",
    digits: 0,
    optimal: [55, 75],
    acceptable: [40, 85],
    referenceNote: "Generell drivhusreferanse. Plantekortet kan ha strammere krav.",
  },
  {
    key: "temperature",
    label: "Jordtemperatur",
    unit: "°C",
    digits: 1,
    optimal: [18, 22],
    acceptable: [10, 26],
    referenceNote: "God rotaktivitet for mange drivhusplanter ligger ofte i dette området.",
  },
  {
    key: "ph",
    label: "pH",
    unit: "",
    digits: 1,
    optimal: [5.8, 6.8],
    acceptable: [5.5, 7.5],
    referenceNote: "De fleste grønnsaker liker svakt sur til nær nøytral jord.",
  },
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

function formatTrendTick(value: string, range: TrendRange): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  if (range === "24h") {
    return date.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString("nb-NO", { day: "2-digit", month: "2-digit" });
}

function formatAxisValue(value: number, unit: string, digits: number): string {
  const formatted = value.toFixed(digits);
  if (unit === "°C") {
    return `${formatted}°`;
  }
  if (unit === "%") {
    return `${formatted}%`;
  }
  return formatted;
}

function chartPath(
  points: HistoryPoint[],
  config: (typeof soilMetricConfigs)[number] | undefined,
  range: TrendRange,
): {
  area: string;
  line: string;
  coords: Array<{ x: number; y: number; point: HistoryPoint }>;
  yTicks: Array<{ value: number; label: string; y: number }>;
  xTicks: Array<{ label: string; x: number }>;
  optimalBand: { y: number; height: number; label: string } | null;
  acceptableBand: { y: number; height: number; label: string } | null;
} {
  if (!points.length) {
    return { area: "", line: "", coords: [], yTicks: [], xTicks: [], optimalBand: null, acceptableBand: null };
  }

  const top = 20;
  const bottom = 226;
  const left = 72;
  const right = 750;
  const times = points.map((point) => new Date(point.recorded_at).getTime());
  const values = points.map((point) => Number(point.value));
  const referenceValues = [
    ...(config?.acceptable ?? []),
    ...(config?.optimal ?? []),
  ];
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const rawMinValue = Math.min(...values, ...referenceValues);
  const rawMaxValue = Math.max(...values, ...referenceValues);
  const rawSpread = rawMaxValue - rawMinValue || Math.max(Math.abs(rawMaxValue), 1);
  const padding = rawSpread * 0.12;
  const minValue = rawMinValue - padding;
  const maxValue = rawMaxValue + padding;
  const valueSpread = maxValue - minValue || 1;
  const timeSpread = maxTime - minTime || 1;

  const yForValue = (value: number) => bottom - ((value - minValue) / valueSpread) * (bottom - top);

  const coords = points.map((point) => {
    const x = left + ((new Date(point.recorded_at).getTime() - minTime) / timeSpread) * (right - left);
    const y = yForValue(Number(point.value));
    return { x, y, point };
  });

  const line = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L ${right} ${bottom} L ${left} ${bottom} Z`;
  const digits = config?.digits ?? 0;
  const unit = config?.unit ?? "";
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = minValue + valueSpread * ratio;
    return {
      value,
      y: bottom - ratio * (bottom - top),
      label: formatAxisValue(value, unit, digits),
    };
  }).reverse();

  const tickIndexes = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]));
  const xTicks = tickIndexes.map((index) => ({
    label: formatTrendTick(points[index].recorded_at, range),
    x: coords[index].x,
  }));

  const bandForRange = (band: [number, number] | undefined, label: string) => {
    if (!band) {
      return null;
    }
    const topY = yForValue(band[1]);
    const bottomY = yForValue(band[0]);
    return {
      y: topY,
      height: Math.max(bottomY - topY, 2),
      label,
    };
  };

  return {
    area,
    line,
    coords,
    yTicks,
    xTicks,
    optimalBand: bandForRange(config?.optimal, "Optimal"),
    acceptableBand: bandForRange(config?.acceptable, "Akseptabel"),
  };
}

function trendReferenceStatus(value: number | null, config: (typeof soilMetricConfigs)[number] | undefined) {
  if (value === null || !config) {
    return { level: "missing" as const, label: "Venter", text: "Mangler måling for valgt periode." };
  }

  if (config.optimal && value >= config.optimal[0] && value <= config.optimal[1]) {
    return { level: "good" as const, label: "Innenfor optimal sone", text: config.referenceNote ?? "Verdien ligger der vi ønsker den." };
  }

  if (config.acceptable && value >= config.acceptable[0] && value <= config.acceptable[1]) {
    const direction = config.optimal && value < config.optimal[0] ? "litt lav" : "litt høy";
    return {
      level: "watch" as const,
      label: "Akseptabelt",
      text: `Verdien er ${direction}, men fortsatt innenfor akseptabel sone.`,
    };
  }

  if (config.acceptable) {
    return {
      level: "bad" as const,
      label: value < config.acceptable[0] ? "For lavt" : "For høyt",
      text: "Verdien er utenfor referansen og bør vurderes mot planten som står i potten.",
    };
  }

  return {
    level: "neutral" as const,
    label: "Trend uten fast sone",
    text: "Denne verdien vurderes best sammen med plante, jordtype og gjødslingsplan.",
  };
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

function loadDashboardPlants(): DashboardPlant[] {
  try {
    const raw = window.localStorage.getItem(GREENHOUSE_PLANTS_STORAGE_KEY);
    if (!raw) {
      return defaultDashboardPlants;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return defaultDashboardPlants;
    }

    return parsed
      .filter((plant) => plant?.profileId && plant?.nickname)
      .map((plant) => ({ profileId: plant.profileId, nickname: plant.nickname }));
  } catch {
    return defaultDashboardPlants;
  }
}

function climateValue(sample: LatestSample | null, metric: ClimateReportMetric): number | null | undefined {
  if (metric === "temperature") {
    return sample?.air_temperature ?? sample?.temperature;
  }
  if (metric === "humidity") {
    return sample?.air_humidity;
  }
  return sample?.lux;
}

function climateLabel(metric: ClimateReportMetric): { title: string; unit: string; digits: number } {
  if (metric === "temperature") {
    return { title: "Temperatur", unit: "°C", digits: 1 };
  }
  if (metric === "humidity") {
    return { title: "Luftfuktighet", unit: "%", digits: 0 };
  }
  return { title: "Lys", unit: "lx", digits: 0 };
}

function scoreClimate(value: number | null | undefined, range: { optimal: [number, number]; caution: [number, number] }) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return { label: "Venter", level: "missing" as const, text: "Mangler måling." };
  }
  if (value >= range.optimal[0] && value <= range.optimal[1]) {
    return { label: "Optimal", level: "good" as const, text: "Forholdet er innenfor ønsket område." };
  }
  if (value >= range.caution[0] && value <= range.caution[1]) {
    return {
      label: value < range.optimal[0] ? "Litt lavt" : "Litt høyt",
      level: "watch" as const,
      text: "Dette er greit, men bør følges med.",
    };
  }
  return {
    label: value < range.caution[0] ? "For lavt" : "For høyt",
    level: "bad" as const,
    text: "Dette kan påvirke planten og bør vurderes.",
  };
}

export function DashboardPage({ session }: DashboardPageProps) {
  const [sample, setSample] = useState<LatestSample | null>(null);
  const [soilPanelOpen, setSoilPanelOpen] = useState(false);
  const [reportMetric, setReportMetric] = useState<ClimateReportMetric | null>(null);
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
    if (!soilPanelOpen && !trendMetric && !reportMetric) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSoilPanelOpen(false);
        setTrendMetric(null);
        setReportMetric(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [soilPanelOpen, trendMetric, reportMetric]);

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
  const lux = metricText(sample?.lux, " lx", 0);
  const updatedAt = formatUpdatedAt(sample?.recorded_at);
  const dashboardPlants = loadDashboardPlants();
  const activeReportLabel = reportMetric ? climateLabel(reportMetric) : null;
  const activeReportValue = reportMetric ? climateValue(sample, reportMetric) : null;
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
  const trendChart = chartPath(trendPoints, activeTrendConfig, trendRange);
  const trendStatus = trendReferenceStatus(latestTrendValue, activeTrendConfig);
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
            <button className="metric-strip__item metric-strip__button" type="button" onClick={() => setReportMetric("temperature")}>
              <span className="metric-strip__label">
                <img className="metric-strip__dot" src={tempDot} alt="" aria-hidden="true" />
                Temperatur
              </span>
              <strong>{temperature}</strong>
            </button>
            <button className="metric-strip__item metric-strip__button" type="button" onClick={() => setReportMetric("humidity")}>
              <span className="metric-strip__label">
                <img className="metric-strip__dot" src={humidityDot} alt="" aria-hidden="true" />
                Luftfuktighet
              </span>
              <strong>{humidity}</strong>
            </button>
            <button className="metric-strip__item metric-strip__button" type="button" onClick={() => setSoilPanelOpen(true)}>
              <span className="metric-strip__label">
                <img className="metric-strip__dot" src={soilDot} alt="" aria-hidden="true" />
                Jordfuktighet
              </span>
              <strong>{status.soil}</strong>
            </button>
            <button className="metric-strip__item metric-strip__button" type="button" onClick={() => setReportMetric("lux")}>
              <span className="metric-strip__label">
                <span className="metric-strip__sun-dot" aria-hidden="true" />
                Lys
              </span>
              <strong>{lux}</strong>
            </button>
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

      {reportMetric && activeReportLabel ? (
        <div className="soil-modal" role="dialog" aria-modal="true" aria-labelledby="climate-report-title">
          <button
            className="soil-modal__backdrop"
            type="button"
            aria-label="Lukk rapport"
            onClick={() => setReportMetric(null)}
          />
          <section className="soil-modal__panel soft-card climate-report-panel">
            <div className="soil-modal__header">
              <div>
                <p className="section-kicker">Rapport</p>
                <h2 id="climate-report-title">{activeReportLabel.title}</h2>
                <span>
                  Nå: {formatTrendValue(activeReportValue, activeReportLabel.unit, activeReportLabel.digits)}
                </span>
              </div>
              <button className="soil-modal__close" type="button" aria-label="Lukk" onClick={() => setReportMetric(null)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6L18 18M18 6L6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </div>

            <div className="climate-report-list">
              {dashboardPlants.map((plant) => {
                const profile = dashboardPlantProfiles[plant.profileId] ?? dashboardPlantProfiles.tomato;
                const range = profile.ranges[reportMetric];
                const score = scoreClimate(activeReportValue, range);
                return (
                  <article className="climate-report-row" key={`${plant.profileId}-${plant.nickname}`}>
                    <div>
                      <strong>{plant.nickname || profile.name}</strong>
                      <span>Optimal: {range.optimal[0]}-{range.optimal[1]} {activeReportLabel.unit}</span>
                      <small>{score.text}</small>
                    </div>
                    <span className={`condition-badge condition-badge--${score.level}`}>{score.label}</span>
                  </article>
                );
              })}
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

            <div className={`trend-reference trend-reference--${trendStatus.level}`}>
              <strong>{trendStatus.label}</strong>
              <span>{trendStatus.text}</span>
              {activeTrendConfig.optimal ? (
                <small>
                  Optimal {formatTrendValue(activeTrendConfig.optimal[0], activeTrendConfig.unit, activeTrendConfig.digits)}
                  {"-"}
                  {formatTrendValue(activeTrendConfig.optimal[1], activeTrendConfig.unit, activeTrendConfig.digits)}
                </small>
              ) : null}
            </div>

            <div className="trend-chart-card">
              {activeTrendConfig.optimal || activeTrendConfig.acceptable ? (
                <div className="trend-chart-legend" aria-hidden="true">
                  {activeTrendConfig.optimal ? (
                    <span>
                      <i className="trend-chart-legend__dot trend-chart-legend__dot--optimal" />
                      Optimal
                    </span>
                  ) : null}
                  {activeTrendConfig.acceptable ? (
                    <span>
                      <i className="trend-chart-legend__dot trend-chart-legend__dot--acceptable" />
                      Akseptabel
                    </span>
                  ) : null}
                </div>
              ) : null}
              <svg className="dashboard-trend-chart" viewBox="0 0 800 260" preserveAspectRatio="none" aria-label={`${activeTrendConfig.label} trend`}>
                <defs>
                  <linearGradient id="dashboard-trend-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(47, 138, 84, 0.26)" />
                    <stop offset="100%" stopColor="rgba(47, 138, 84, 0.02)" />
                  </linearGradient>
                </defs>
                {trendChart.acceptableBand ? (
                  <rect
                    className="dashboard-trend-band dashboard-trend-band--acceptable"
                    x="72"
                    y={trendChart.acceptableBand.y}
                    width="678"
                    height={trendChart.acceptableBand.height}
                    rx="10"
                  />
                ) : null}
                {trendChart.optimalBand ? (
                  <rect
                    className="dashboard-trend-band dashboard-trend-band--optimal"
                    x="72"
                    y={trendChart.optimalBand.y}
                    width="678"
                    height={trendChart.optimalBand.height}
                    rx="10"
                  />
                ) : null}
                {trendChart.yTicks.map((tick) => (
                  <g key={`${tick.label}-${tick.y}`}>
                    <line x1="72" x2="750" y1={tick.y} y2={tick.y} />
                    <text className="dashboard-trend-axis-label dashboard-trend-axis-label--y" x="58" y={tick.y + 5} textAnchor="end">
                      {tick.label}
                    </text>
                  </g>
                ))}
                <path className="dashboard-trend-area" d={trendChart.area} />
                <path className="dashboard-trend-line" d={trendChart.line} />
                {trendChart.xTicks.map((tick) => (
                  <text className="dashboard-trend-axis-label dashboard-trend-axis-label--x" key={`${tick.label}-${tick.x}`} x={tick.x} y="250" textAnchor="middle">
                    {tick.label}
                  </text>
                ))}
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
                    <text className="dashboard-trend-value-label" x={Math.max(96, Math.min(704, hoverPoint.x))} y={Math.max(34, hoverPoint.y - 16)} textAnchor="middle">
                      {formatTrendValue(Number(hoverPoint.point.value), activeTrendConfig.unit, activeTrendConfig.digits)}
                    </text>
                  </>
                ) : trendChart.coords.length ? (
                  <>
                    <circle
                      className="dashboard-trend-point"
                      cx={trendChart.coords[trendChart.coords.length - 1].x}
                      cy={trendChart.coords[trendChart.coords.length - 1].y}
                      r="6"
                    />
                    <text
                      className="dashboard-trend-value-label"
                      x={Math.max(96, Math.min(704, trendChart.coords[trendChart.coords.length - 1].x))}
                      y={Math.max(34, trendChart.coords[trendChart.coords.length - 1].y - 16)}
                      textAnchor="middle"
                    >
                      {formatTrendValue(latestTrendValue, activeTrendConfig.unit, activeTrendConfig.digits)}
                    </text>
                  </>
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
