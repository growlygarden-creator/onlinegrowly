import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchDailyWeatherReport,
  fetchLatestSample,
  fetchMetricHistory,
  fetchPlants,
  fetchWeatherForecast,
  type AuthSession,
  type DailyWeatherReport,
  type GrowlyPlant,
  type HistoryPoint,
  type LatestSample,
  type WeatherForecast,
  type WeatherHour,
} from "../lib/api";
import { PlantAvatar } from "../components/PlantAvatar";
import greenhouseDay from "../assets/greenhouse-assets/greenhouse-day.png";
import greenhouseEvening from "../assets/greenhouse-assets/greenhouse-evening.png";
import humidityDot from "../assets/greenhouse-assets/humidity-dot.png";
import soilDot from "../assets/greenhouse-assets/soil-dot.png";
import tempDot from "../assets/greenhouse-assets/temp-dot.png";

type DashboardPageProps = {
  session: AuthSession | null;
  selectedHubId?: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

type SoilMetricKey = "humidity" | "temperature" | "ph" | "conductivity" | "nitrogen" | "phosphorus" | "potassium" | "salinity" | "tds";
type TrendMetricKey = SoilMetricKey | "air_temperature" | "air_humidity" | "lux";
type TrendRange = "24h" | "3d" | "7d" | "all";
type ClimateReportMetric = "temperature" | "humidity" | "lux";
type TrendMetricConfig = {
  key: TrendMetricKey;
  label: string;
  unit: string;
  digits: number;
  optimal?: [number, number];
  acceptable?: [number, number];
  referenceNote?: string;
};

type DashboardPlant = Pick<GrowlyPlant, "instanceId" | "nickname" | "profileId" | "catalogItemId" | "sowedAt">;
type HomeTask = {
  title: string;
  detail: string;
  badge: string;
  tone: "good" | "watch" | "bad";
};

const currentMonthName = new Date().toLocaleDateString("nb-NO", { month: "long" });

const dashboardPlantProfiles: Record<
  string,
  {
    name: string;
    tone: "tomato" | "cucumber" | "basil" | "leafy" | "berry" | "pepper";
    maturityDays: number;
    ranges: Record<ClimateReportMetric, { optimal: [number, number]; caution: [number, number] }>;
  }
> = {
  tomato: {
    name: "Tomat",
    tone: "tomato",
    maturityDays: 90,
    ranges: {
      temperature: { optimal: [20, 26], caution: [16, 30] },
      humidity: { optimal: [45, 65], caution: [35, 78] },
      lux: { optimal: [5000, 25000], caution: [2000, 40000] },
    },
  },
  cucumber: {
    name: "Agurk",
    tone: "cucumber",
    maturityDays: 70,
    ranges: {
      temperature: { optimal: [22, 28], caution: [18, 31] },
      humidity: { optimal: [60, 80], caution: [48, 90] },
      lux: { optimal: [6000, 30000], caution: [2500, 45000] },
    },
  },
  basil: {
    name: "Basilikum",
    tone: "basil",
    maturityDays: 55,
    ranges: {
      temperature: { optimal: [20, 26], caution: [18, 30] },
      humidity: { optimal: [45, 65], caution: [35, 78] },
      lux: { optimal: [5000, 22000], caution: [2500, 35000] },
    },
  },
  pepper: {
    name: "Paprika",
    tone: "pepper",
    maturityDays: 85,
    ranges: {
      temperature: { optimal: [21, 28], caution: [18, 31] },
      humidity: { optimal: [45, 65], caution: [35, 78] },
      lux: { optimal: [6000, 26000], caution: [3000, 42000] },
    },
  },
  lettuce: {
    name: "Salat",
    tone: "leafy",
    maturityDays: 45,
    ranges: {
      temperature: { optimal: [10, 18], caution: [6, 24] },
      humidity: { optimal: [50, 75], caution: [40, 85] },
      lux: { optimal: [3000, 18000], caution: [1500, 30000] },
    },
  },
  strawberry: {
    name: "Jordbær",
    tone: "berry",
    maturityDays: 110,
    ranges: {
      temperature: { optimal: [16, 22], caution: [12, 28] },
      humidity: { optimal: [55, 75], caution: [45, 85] },
      lux: { optimal: [4000, 20000], caution: [1800, 32000] },
    },
  },
};

const trendMetricConfigs: TrendMetricConfig[] = [
  {
    key: "air_temperature",
    label: "Lufttemperatur",
    unit: "°C",
    digits: 1,
    optimal: [18, 26],
    acceptable: [8, 32],
    referenceNote: "Felles drivhustemperatur. Plantekortene vurderer dette per plante.",
  },
  {
    key: "air_humidity",
    label: "Luftfuktighet",
    unit: "%",
    digits: 0,
    optimal: [50, 75],
    acceptable: [35, 90],
    referenceNote: "God balanse gir vekst uten å gjøre klimaet for soppvennlig.",
  },
  {
    key: "lux",
    label: "Lys",
    unit: "lx",
    digits: 0,
    optimal: [5000, 25000],
    acceptable: [1500, 45000],
    referenceNote: "Lys vurderes best over tid, siden enkelttimer kan svinge kraftig.",
  },
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

const soilMetricConfigs = trendMetricConfigs.filter((metric): metric is TrendMetricConfig & { key: SoilMetricKey } =>
  !["air_temperature", "air_humidity", "lux"].includes(metric.key),
);

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

function sampleValue(sample: LatestSample | null, key: TrendMetricKey): number | null | undefined {
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
  config: TrendMetricConfig | undefined,
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
  const yTicks = [0, 0.33, 0.66, 1].map((ratio) => {
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

function trendReferenceStatus(value: number | null, config: TrendMetricConfig | undefined) {
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

function buildWeeklyTasks(sample: LatestSample | null, hasWeather: boolean, plantCount: number): HomeTask[] {
  const tasks: HomeTask[] = [];

  if (!sample) {
    if (hasWeather) {
      tasks.push({
        title: "Følg værvinduet",
        detail: "Bruk prognosen til å planlegge lufting, skygge og vanning de neste dagene.",
        badge: "Vær",
        tone: "watch",
      });
    } else {
      tasks.push({
        title: "Legg inn dyrkested",
        detail: "Da kan Growly bruke lokal værprognose til dyrkeråd, også uten hub.",
        badge: "Vær",
        tone: "watch",
      });
    }

    if (plantCount === 0) {
      tasks.push({
        title: "Legg inn plantene dine",
        detail: "Da kan startskjermen vurdere klimaet mot riktige plantekrav.",
        badge: "Oppsett",
        tone: "good",
      });
    }

    return tasks;
  }

  if (typeof sample.humidity === "number" && sample.humidity < 45) {
    tasks.push({
      title: "Vann sonen med tørr jord",
      detail: `Jordfukt ligger på ${sample.humidity.toFixed(0)} %. Sjekk potter før solen står høyt.`,
      badge: "I dag",
      tone: "bad",
    });
  } else {
    tasks.push({
      title: "Hold jevn fukt",
      detail: "Jordfukten ser rolig ut. Følg trend før du vanner mer.",
      badge: "Denne uken",
      tone: "good",
    });
  }

  const airHumidity = sample.air_humidity;
  if (typeof airHumidity === "number" && airHumidity > 78) {
    tasks.push({
      title: "Luft drivhuset",
      detail: `Luftfuktigheten er ${airHumidity.toFixed(0)} %. Lufting senker risiko for sopp og svakt bladverk.`,
      badge: "Nå",
      tone: "watch",
    });
  } else {
    tasks.push({
      title: "Sjekk bladverk",
      detail: "Se raskt over underside av blader og nye skudd mens forholdene er stabile.",
      badge: "2 min",
      tone: "good",
    });
  }

  const temperatureValue = sample.air_temperature ?? sample.temperature;
  if (typeof temperatureValue === "number" && temperatureValue < 10) {
    tasks.push({
      title: "Beskytt varme planter",
      detail: `Temperaturen er ${temperatureValue.toFixed(0)}°C. Vent med agurk, tomat og paprika ute i kald jord.`,
      badge: "Kaldt",
      tone: "bad",
    });
  } else {
    tasks.push({
      title: "Planlegg ompotting",
      detail: `${currentMonthName} er riktig tid for flere varme planter når nettene holder seg stabile.`,
      badge: "Plan",
      tone: "good",
    });
  }

  return tasks.slice(0, 3);
}

function dateFromInput(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function daysBetween(startDate: Date, endDate = new Date()): number {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
  return Math.max(0, Math.floor((end - start) / 86400000));
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("nb-NO", { day: "numeric", month: "short" }).replace(".", "");
}

function plantProgress(profileId: string, index: number, sample: LatestSample | null, sowedAt?: string): number {
  const profile = dashboardPlantProfiles[profileId] ?? dashboardPlantProfiles.tomato;
  const sowedDate = dateFromInput(sowedAt);
  if (sowedDate) {
    return Math.max(4, Math.min(100, Math.round((daysBetween(sowedDate) / profile.maturityDays) * 100)));
  }

  const base = profileId === "tomato" ? 68 : profileId === "cucumber" ? 54 : profileId === "basil" ? 72 : 48;
  const moistureBoost = typeof sample?.humidity === "number" ? Math.max(-12, Math.min(12, (sample.humidity - 50) / 2)) : 0;
  const lightBoost = typeof sample?.lux === "number" ? Math.max(-8, Math.min(10, sample.lux / 2500)) : 0;
  return Math.max(12, Math.min(100, Math.round(base + moistureBoost + lightBoost - index * 5)));
}

function plantStage(profileId: string, progress: number): string {
  if (progress > 78) return profileId === "basil" ? "Høsteklar" : "Sterk vekst";
  if (progress > 58) return "Vokser";
  if (progress > 36) return "Etablerer seg";
  return "Følg opp";
}

function plantTimeline(profileId: string, progress: number, sowedAt?: string, index = 0) {
  const profile = dashboardPlantProfiles[profileId] ?? dashboardPlantProfiles.tomato;
  const fallbackSowedDate = addDays(new Date(), -Math.round((progress / 100) * profile.maturityDays) - index * 2);
  const sowedDate = dateFromInput(sowedAt) ?? fallbackSowedDate;
  const daysSince = daysBetween(sowedDate);
  const harvestDate = addDays(sowedDate, profile.maturityDays);
  const daysLeft = Math.max(0, profile.maturityDays - daysSince);
  const activeStep = progress >= 85 ? 3 : progress >= 55 ? 2 : progress >= 22 ? 1 : 0;

  return {
    sowedLabel: `Sådd ${formatShortDate(sowedDate)}`,
    ageLabel: `${daysSince} ${daysSince === 1 ? "dag" : "dager"} siden`,
    dayLabel: `Dag ${daysSince}`,
    harvestLabel: `Høsting: ~${formatShortDate(harvestDate)}`,
    daysLeftLabel: daysLeft === 0 ? "klar" : `${daysLeft}d igjen`,
    activeStep,
  };
}

function plantSensorSignal(sample: LatestSample | null): { label: string; tone: "good" | "watch" | "bad" } {
  const soilHumidity = sample?.humidity;
  const airTemperature = sample?.air_temperature ?? sample?.temperature;
  const airHumidity = sample?.air_humidity;

  if (typeof soilHumidity === "number" && soilHumidity < 42) {
    return { label: "Tørr sone", tone: "bad" };
  }
  if (typeof airTemperature === "number" && airTemperature > 29) {
    return { label: "Varmt klima", tone: "watch" };
  }
  if (typeof airHumidity === "number" && airHumidity > 78) {
    return { label: "Lufting", tone: "watch" };
  }
  return { label: "I balanse", tone: "good" };
}

function plantNextAction(profileId: string, progress: number, sample: LatestSample | null): string {
  const soilHumidity = sample?.humidity;
  if (typeof soilHumidity === "number" && soilHumidity < 42) {
    return "Vann rolig og sjekk jorda igjen senere.";
  }
  if (progress >= 88) {
    return profileId === "basil" ? "Klipp litt og la planten buske seg." : "Sjekk modning og høst det som er klart.";
  }
  if (progress >= 58) {
    return "Hold jevn fukt og følg med på varme dager.";
  }
  if (progress >= 24) {
    return "Gi lys, jevn fukt og rolig videre vekst.";
  }
  return "La spirene etablere seg før store endringer.";
}

function greenhouseScene(theme: "light" | "dark"): { image: string; mode: "day" | "evening" } {
  if (theme === "dark") {
    return { image: greenhouseEvening, mode: "evening" };
  }
  return { image: greenhouseDay, mode: "day" };
}

type WeatherGlyphKind = "sun" | "partly" | "cloud" | "rain" | "snow";

function weatherGlyphKind(symbolCode: string | undefined): WeatherGlyphKind {
  const code = (symbolCode || "").toLowerCase();
  if (code.includes("rain") || code.includes("sleet")) {
    return "rain";
  }
  if (code.includes("snow")) {
    return "snow";
  }
  if (code.includes("cloud")) {
    return "cloud";
  }
  if (code.includes("fair") || code.includes("partly")) {
    return "partly";
  }
  return "sun";
}

function weatherIconLabel(symbolCode: string | undefined): string {
  const code = (symbolCode || "").toLowerCase();
  if (code.includes("rain") && (code.includes("day") || code.includes("fair") || code.includes("partly"))) {
    return "Sol og regn";
  }
  const kind = weatherGlyphKind(symbolCode);
  return {
    sun: "Sol",
    partly: "Sol og skyer",
    cloud: "Skyet",
    rain: "Regn",
    snow: "Snø",
  }[kind];
}

function WeatherGlyph({ symbolCode, compact = false, className = "" }: { symbolCode?: string; compact?: boolean; className?: string }) {
  const code = (symbolCode || "").toLowerCase();
  const kind = weatherGlyphKind(symbolCode);
  const isCloudy = kind === "cloud" || kind === "rain" || kind === "snow" || kind === "partly";
  const hasSun = kind === "sun" || kind === "partly" || ((kind === "rain" || kind === "snow") && (code.includes("day") || code.includes("fair") || code.includes("partly")));

  return (
    <span className={`${className} weather-glyph weather-glyph--${kind}${compact ? " weather-glyph--compact" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 64 64" focusable="false">
        {hasSun ? (
          <g className="weather-glyph__sun">
            <circle cx={kind === "sun" ? 32 : 25} cy={kind === "sun" ? 30 : 24} r={kind === "sun" ? 13 : 10} />
            <path d={kind === "sun"
              ? "M32 8v8M32 44v8M10 30h8M46 30h8M16.5 14.5l5.8 5.8M41.7 39.7l5.8 5.8M16.5 45.5l5.8-5.8M41.7 20.3l5.8-5.8"
              : "M25 6v7M25 35v7M7 24h7M36 24h7M12.5 11.5l5 5M32.5 31.5l5 5M12.5 36.5l5-5M32.5 16.5l5-5"} />
          </g>
        ) : null}
        {isCloudy ? (
          <g className="weather-glyph__cloud">
            <path
              fill="#fbfff7"
              stroke="#bfd5ca"
              d="M19.5 43.5h25.8c6.4 0 10.7-3.8 10.7-9.2 0-5.1-3.8-8.9-9.2-9.2C44.9 18.7 39.5 14 32.7 14c-7.1 0-12.8 5-14.2 11.6-6 .5-10.5 4.2-10.5 9 0 5.4 4.5 8.9 11.5 8.9Z"
            />
          </g>
        ) : null}
        {kind === "rain" ? (
          <g className="weather-glyph__rain">
            <path d="M24 49l-3 6M34 49l-3 6M44 49l-3 6" />
          </g>
        ) : null}
        {kind === "snow" ? (
          <g className="weather-glyph__snow">
            <path d="M26 51h.1M34 54h.1M43 51h.1" />
          </g>
        ) : null}
      </svg>
    </span>
  );
}

function formatWeatherHour(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("nb-NO", { hour: "2-digit" });
}

function formatWeatherDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("nb-NO", { weekday: "short", day: "numeric" }).replace(".", "");
}

function weatherWindArrowRotation(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return value + 180;
}

function weatherHourlyChart(hours: WeatherHour[]) {
  const points = hours
    .slice(0, 49)
    .filter((hour) => typeof hour.air_temperature === "number")
    .map((hour) => ({
      ...hour,
      air_temperature: Number(hour.air_temperature),
      wind_speed: typeof hour.wind_speed === "number" ? Number(hour.wind_speed) : 0,
      precipitation_amount: typeof hour.precipitation_amount === "number" ? Number(hour.precipitation_amount) : 0,
    }));

  if (points.length < 2) {
    return null;
  }

  const left = 46;
  const right = 748;
  const top = 34;
  const tempBottom = 184;
  const rainBottom = 222;
  const windTop = 250;
  const windBottom = 306;
  const temperatures = points.map((point) => point.air_temperature);
  const minTemperature = Math.min(...temperatures);
  const maxTemperature = Math.max(...temperatures);
  const tempSpread = Math.max(4, maxTemperature - minTemperature);
  const tempMin = minTemperature - tempSpread * 0.2;
  const tempMax = maxTemperature + tempSpread * 0.22;
  const maxRain = Math.max(1, ...points.map((point) => point.precipitation_amount));
  const maxWind = Math.max(1, ...points.map((point) => point.wind_speed));
  const xForIndex = (index: number) => left + (index / (points.length - 1)) * (right - left);
  const yForTemp = (value: number) => tempBottom - ((value - tempMin) / (tempMax - tempMin || 1)) * (tempBottom - top);
  const yForWind = (value: number) => windBottom - (value / maxWind) * (windBottom - windTop);
  const tempCoords = points.map((point, index) => ({ x: xForIndex(index), y: yForTemp(point.air_temperature), point }));
  const windCoords = points.map((point, index) => ({ x: xForIndex(index), y: yForWind(point.wind_speed), point }));
  const tempLine = tempCoords.map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`).join(" ");
  const tempArea = `${tempLine} L ${right} ${tempBottom} L ${left} ${tempBottom} Z`;
  const windLine = windCoords.map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`).join(" ");
  const yTicks = [tempMax, (tempMax + tempMin) / 2, tempMin].map((value) => ({
    value,
    y: yForTemp(value),
    label: `${value.toFixed(0)}°`,
  }));
  const tickIndexes = points
    .map((_, index) => index)
    .filter((index) => index === 0 || index === points.length - 1 || index % 6 === 0);
  const iconIndexes = points
    .map((_, index) => index)
    .filter((index) => index === 0 || index === points.length - 1 || index % 6 === 0);
  const dayMarkers = points.reduce<Array<{ label: string; x: number }>>((markers, point, index) => {
    const label = formatWeatherDay(point.time);
    if (label && markers[markers.length - 1]?.label !== label) {
      markers.push({ label, x: xForIndex(index) });
    }
    return markers;
  }, []);

  return {
    points,
    tempCoords,
    windCoords,
    tempLine,
    tempArea,
    windLine,
    yTicks,
    tickIndexes,
    iconIndexes,
    dayMarkers,
    maxRain,
    rainBottom,
    rainTop: 194,
    left,
    right,
  };
}

function WeatherHourlyCard({ weather }: { weather: WeatherForecast }) {
  const chart = weatherHourlyChart(weather.forecast.hours ?? []);

  return (
    <section className="weather-inline-card weather-sheet__panel soft-card" aria-label="Timesvis værgraf">
        {chart ? (
          <div className="weather-hourly-card">
            <svg className="weather-hourly-chart" viewBox="0 0 800 326" role="img" aria-label="Graf for temperatur, nedbør og vind de neste timene">
              <defs>
                <linearGradient id="weather-temp-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#d95f42" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#d95f42" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="weather-rain-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#3d8be8" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#85bdf6" stopOpacity="0.36" />
                </linearGradient>
              </defs>
              {[34, 72, 110, 148, 184, 222, 250, 306].map((y) => (
                <line key={y} x1="46" x2="748" y1={y} y2={y} className="weather-hourly-grid" />
              ))}
              {chart.tickIndexes.map((index) => {
                const x = chart.tempCoords[index].x;
                return <line key={`v-${index}`} x1={x} x2={x} y1="34" y2="306" className="weather-hourly-grid weather-hourly-grid--vertical" />;
              })}
              {chart.dayMarkers.map((marker) => (
                <text key={marker.label} x={marker.x} y="22" className="weather-hourly-day">{marker.label}</text>
              ))}
              {chart.yTicks.map((tick) => (
                <text key={tick.label} x="10" y={tick.y + 4} className="weather-hourly-axis">{tick.label}</text>
              ))}
              <path d={chart.tempArea} className="weather-hourly-temp-area" />
              <path d={chart.tempLine} className="weather-hourly-temp-line" />
              {chart.points.map((point, index) => {
                const x = chart.tempCoords[index].x;
                const amount = point.precipitation_amount;
                const height = amount > 0 ? Math.max(3, (amount / chart.maxRain) * 28) : 0;
                return amount > 0 ? (
                  <rect
                    key={`rain-${point.time}`}
                    x={x - 4}
                    y={chart.rainBottom - height}
                    width="8"
                    height={height}
                    rx="3"
                    className="weather-hourly-rain-bar"
                  />
                ) : null;
              })}
              <path d={chart.windLine} className="weather-hourly-wind-line" />
              {chart.iconIndexes.map((index) => {
                const point = chart.points[index];
                const x = chart.tempCoords[index].x;
                return (
                  <foreignObject key={`icon-${point.time}`} x={x - 17} y={chart.tempCoords[index].y - 44} width="34" height="34">
                    <WeatherGlyph symbolCode={point.symbol_code} compact />
                  </foreignObject>
                );
              })}
              {chart.tickIndexes.map((index) => {
                const point = chart.points[index];
                const x = chart.tempCoords[index].x;
                return (
                  <g key={`tick-${point.time}`}>
                    <text x={x} y="242" className="weather-hourly-hour">{formatWeatherHour(point.time)}</text>
                    <text
                      x={x}
                      y="322"
                      className="weather-hourly-wind-arrow"
                      style={{ transform: `rotate(${weatherWindArrowRotation(point.wind_from_direction)}deg)`, transformOrigin: `${x}px 316px` }}
                    >
                      ↑
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="weather-hourly-legend">
              <span><i className="legend-temp" /> Temperatur</span>
              <span><i className="legend-rain" /> Nedbør</span>
              <span><i className="legend-wind" /> Vind</span>
              <span><i className="legend-icon" /> Værtype</span>
            </div>
            <p className="weather-hourly-updated">{formatUpdatedAt(weather.forecast.updated_at)}</p>
          </div>
        ) : (
          <div className="weather-hourly-empty">
            <strong>Timesgrafen mangler data akkurat nå</strong>
            <span>Prøv å oppdatere værprognosen litt senere.</span>
          </div>
        )}
    </section>
  );
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

function normalizeDashboardPlants(plants: GrowlyPlant[]): DashboardPlant[] {
  return plants
    .filter((plant) => plant?.profileId && plant?.nickname)
    .map((plant) => ({
      instanceId: plant.instanceId,
      profileId: plant.profileId,
      catalogItemId: plant.catalogItemId,
      nickname: plant.nickname,
      sowedAt: plant.sowedAt,
    }));
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

function climateTrendMetric(metric: ClimateReportMetric): TrendMetricKey {
  if (metric === "temperature") {
    return "air_temperature";
  }
  if (metric === "humidity") {
    return "air_humidity";
  }
  return "lux";
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

export function DashboardPage({ session, selectedHubId = "", theme, onToggleTheme }: DashboardPageProps) {
  const [sample, setSample] = useState<LatestSample | null>(null);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [dailyWeatherReport, setDailyWeatherReport] = useState<DailyWeatherReport | null>(null);
  const [soilPanelOpen, setSoilPanelOpen] = useState(false);
  const [reportMetric, setReportMetric] = useState<ClimateReportMetric | null>(null);
  const [trendMetric, setTrendMetric] = useState<TrendMetricKey | null>(null);
  const [trendRange, setTrendRange] = useState<TrendRange>("7d");
  const [trendPoints, setTrendPoints] = useState<HistoryPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [dashboardPlants, setDashboardPlants] = useState<DashboardPlant[]>([]);
  const [weatherSheetOpen, setWeatherSheetOpen] = useState(false);

  useEffect(() => {
    fetchLatestSample(selectedHubId).then((result) => {
      setSample(result);
    });
  }, [selectedHubId]);

  useEffect(() => {
    fetchWeatherForecast(selectedHubId).then((result) => {
      setWeather(result);
    });
  }, [selectedHubId]);

  useEffect(() => {
    if (!weather) {
      setWeatherSheetOpen(false);
    }
  }, [weather]);

  useEffect(() => {
    let cancelled = false;
    if (!weather) {
      setDailyWeatherReport(null);
      return () => {
        cancelled = true;
      };
    }

    fetchDailyWeatherReport(selectedHubId).then((result) => {
      if (!cancelled) {
        setDailyWeatherReport(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedHubId, weather?.forecast.updated_at]);

  useEffect(() => {
    let cancelled = false;
    fetchPlants(selectedHubId).then((plants) => {
      if (!cancelled) {
        setDashboardPlants(normalizeDashboardPlants(plants));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session?.username, selectedHubId]);

  useEffect(() => {
    if (!soilPanelOpen && !trendMetric && !reportMetric && !weatherSheetOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSoilPanelOpen(false);
        setTrendMetric(null);
        setReportMetric(null);
        setWeatherSheetOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [soilPanelOpen, trendMetric, reportMetric, weatherSheetOpen]);

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
      hubId: selectedHubId,
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
  }, [trendMetric, trendRange, selectedHubId]);

  const firstName = session?.user?.full_name?.split(" ")[0] || session?.username || "Growly";
  const status = growthStatus(sample);
  const scene = greenhouseScene(theme);
  const hubOnline = !!session?.hub?.is_active;
  const weatherNow = weather?.forecast.now;
  const hasLiveSensorData = !!sample;
  const hasPairedHub = !!session?.hub?.is_active;
  const temperature = metricText(sample?.air_temperature ?? sample?.temperature, "°C", 0);
  const humidity = metricText(sample?.air_humidity, "%", 0);
  const lux = metricText(sample?.lux, " lx", 0);
  const weatherTemperature = metricText(weatherNow?.air_temperature, "°C", 0);
  const weatherHumidity = metricText(weatherNow?.relative_humidity, "%", 0);
  const weatherWind = metricText(weatherNow?.wind_speed, " m/s", 1);
  const weatherDays = weather?.forecast.days.slice(0, 4) ?? [];
  const currentWeatherSymbol = weatherNow?.symbol_code || weatherDays[0]?.symbol_code;
  const climateTitle = weather ? "Lokalt dyrkevær" : hasLiveSensorData ? "Vekstforhold" : hasPairedHub ? "Klar for første måling" : "Dyrkested";
  const climateNote = hasPairedHub
    ? (hasLiveSensorData ? status.note : weather ? "Værprognosen brukes sammen med huben når Growly gir råd." : "Koble dyrkested eller vent på første sensorpakke før Growly konkluderer.")
    : weather
      ? "Growly bruker værprognosen til dyrkeråd uten hub."
      : "Legg inn dyrkested for lokale råd uten sensor.";
  const climatePill = hasLiveSensorData ? "Målinger aktive" : weather ? "Værdata aktiv" : hubOnline ? "Venter på data" : "Uten hub";
  const commandTitle = hasLiveSensorData
    ? "Neste beste steg"
    : weather
      ? "Sesongen kan planlegges"
      : dashboardPlants.length
        ? "Koble klima til plantene"
        : "Bygg opp drivhuset";
  const commandBody = hasLiveSensorData
    ? "Growly har målinger og kan begynne å prioritere tiltak for plantene dine."
    : weather
      ? "Dyrkestedet er på plass. Legg inn planter for å få rådene tettere på hverdagen i drivhuset."
      : dashboardPlants.length
        ? "Plantene er registrert. Legg til dyrkested eller hubdata for en mer presis opplevelse."
        : "Start med noen få planter og et dyrkested. Da får appen en ekte sesong å følge.";
  const commandActions = [
    {
      label: dashboardPlants.length ? `${dashboardPlants.length} planter` : "Første plante",
      value: dashboardPlants.length ? "Aktive i Growly" : "Tomat, agurk eller basilikum",
      to: "/drivhus",
    },
    {
      label: weather ? "Dyrkested klart" : "Dyrkested",
      value: weather ? "Lokal prognose aktiv" : "Gir bedre ukeplan",
      to: "/settings",
    },
    {
      label: hasLiveSensorData ? "Sensorer" : hasPairedHub ? "Sensorgrunnlag" : "Hub",
      value: hasLiveSensorData ? "Målinger klare" : hasPairedHub ? "Venter på første pakke" : "Kan kobles senere",
      to: "/settings",
    },
  ];
  const updatedAt = formatUpdatedAt(sample?.recorded_at);
  const weeklyTasks = buildWeeklyTasks(sample, !!weather, dashboardPlants.length);
  const activeReportLabel = reportMetric ? climateLabel(reportMetric) : null;
  const activeReportValue = reportMetric ? climateValue(sample, reportMetric) : null;
  const soilMetrics = soilMetricConfigs.map((metric) => ({
    ...metric,
    value: formatTrendValue(sampleValue(sample, metric.key), metric.unit, metric.digits),
  }));
  const activeTrendConfig = trendMetricConfigs.find((metric) => metric.key === trendMetric);
  const trendValues = trendPoints.map((point) => Number(point.value)).filter((value) => Number.isFinite(value));
  const latestTrendValue = trendValues.length ? trendValues[trendValues.length - 1] : null;
  const previousTrendValue = trendValues.length > 1 ? trendValues[trendValues.length - 2] : latestTrendValue;
  const trendDelta = latestTrendValue !== null && previousTrendValue !== null ? latestTrendValue - previousTrendValue : null;
  const trendMin = trendValues.length ? Math.min(...trendValues) : null;
  const trendMax = trendValues.length ? Math.max(...trendValues) : null;
  const trendChart = chartPath(trendPoints, activeTrendConfig, trendRange);
  const trendStatus = trendReferenceStatus(latestTrendValue, activeTrendConfig);
  const hoverPoint = hoverIndex !== null ? trendChart.coords[hoverIndex] : null;
  function openTrend(metric: TrendMetricKey) {
    setSoilPanelOpen(false);
    setReportMetric(null);
    setTrendMetric(metric);
  }

  return (
    <main className="page-shell app-page">
      <section className="screen-header">
        <div>
          <h1>Ditt drivhus <span className="leaf-mark">🌿</span></h1>
          <p>God morgen, {firstName}. Her er det viktigste akkurat nå.</p>
        </div>
        <button
          className="icon-button theme-toggle-button"
          type="button"
          aria-label={theme === "dark" ? "Bytt til lys modus" : "Bytt til mørk modus"}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M20 14.4A7.8 7.8 0 0 1 9.6 4a8 8 0 1 0 10.4 10.4Z"
                fill="none"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          ) : (
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
          )}
        </button>
      </section>

      <section className="home-command-card soft-card" aria-label="Neste steg">
        <div>
          <p className="section-kicker">Sesongflyt</p>
          <h2>{commandTitle}</h2>
          <span>{commandBody}</span>
        </div>
        <div className="home-command-actions">
          {commandActions.map((action) => (
            <Link className="home-command-action" to={action.to} key={action.label}>
              <small>{action.label}</small>
              <strong>{action.value}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <p className="section-kicker">Vekstforhold</p>
        <article className="soft-card premium-hero premium-hero--climate">
          <div className="climate-hero-grid">
            <div className="premium-hero__head">
              <div>
                <strong>{climateTitle}</strong>
                <span>{climateNote}</span>
              </div>
              <span className="status-pill status-pill--live">
                <span className="online-dot" aria-hidden="true" />
                {climatePill}
              </span>
            </div>

            <div className="climate-visual-stack">
              <div
                className={`weather-overview-panel${weather ? " weather-overview-panel--interactive" : ""}`}
                role={weather ? "button" : undefined}
                tabIndex={weather ? 0 : undefined}
                onClick={weather ? () => setWeatherSheetOpen((open) => !open) : undefined}
                onKeyDown={weather ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setWeatherSheetOpen((open) => !open);
                  }
                } : undefined}
              >
                <div className="weather-overview-main">
                  <WeatherGlyph className="weather-overview-icon" symbolCode={currentWeatherSymbol} />
                  <div>
                    <span>{weather ? "Vær ved dyrkested" : "Værbaserte råd"}</span>
                    <strong>{weather ? weatherTemperature : "Legg inn dyrkested"}</strong>
                    <p>{weather ? `Fukt ${weatherHumidity} · vind ${weatherWind}` : "Skriv inn adresse i Innstillinger for lokal prognose."}</p>
                  </div>
                </div>
                {weatherDays.length ? (
                  <div className="weather-overview-days">
                    {weatherDays.map((day) => (
                      <span key={day.date}>
                        <em aria-hidden="true"><WeatherGlyph symbolCode={day.symbol_code} compact /></em>
                        <small>{new Date(`${day.date}T12:00:00`).toLocaleDateString("nb-NO", { weekday: "short" })}</small>
                        <strong>{typeof day.temperature_max === "number" ? `${day.temperature_max.toFixed(0)}°` : "–"}</strong>
                      </span>
                    ))}
                  </div>
                ) : (
                  <Link className="weather-settings-link" to="/settings">Sett opp</Link>
                )}
              </div>

              {weather && weatherSheetOpen ? (
                <WeatherHourlyCard weather={weather} />
              ) : null}

              {dailyWeatherReport ? (
                <article className="daily-weather-report">
                  <div>
                    <span>Dagens rapport</span>
                    <strong>{dailyWeatherReport.title}</strong>
                    <p>{dailyWeatherReport.body}</p>
                  </div>
                  <small>{dailyWeatherReport.tip}</small>
                </article>
              ) : null}

              <div className={`overview-image-banner overview-image-banner--${scene.mode}`}>
                <img className="overview-image-banner__image" src={scene.image} alt="" aria-hidden="true" />
              </div>
            </div>
          </div>

          {hasPairedHub ? (
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
          ) : null}
        </article>
      </section>

      <section className="settings-section">
        <div className="home-section-head">
          <div>
            <p className="section-kicker">Denne uken</p>
            <h2>{hasLiveSensorData ? "Målebaserte gjøremål" : "Værbaserte gjøremål"}</h2>
          </div>
          <Link to="/kalender">Kalender</Link>
        </div>
        <div className="weekly-task-list">
          {weeklyTasks.map((task) => (
            <article className={`weekly-task-card weekly-task-card--${task.tone} soft-card`} key={task.title}>
              <span>{task.badge}</span>
              <div>
                <strong>{task.title}</strong>
                <p>{task.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <div className="home-section-head">
          <div>
            <p className="section-kicker">Vekstoversikt</p>
            <h2>{dashboardPlants.length === 1 ? "1 aktiv plante" : `${dashboardPlants.length} aktive planter`}</h2>
          </div>
          <Link to="/drivhus">Mine planter</Link>
        </div>
        <div className="growth-list">
          {dashboardPlants.length ? dashboardPlants.slice(0, 4).map((plant, index) => {
            const profile = dashboardPlantProfiles[plant.profileId] ?? dashboardPlantProfiles.tomato;
            const sowedAt = plant.sowedAt ?? undefined;
            const progress = plantProgress(plant.profileId, index, sample, sowedAt);
            const timeline = plantTimeline(plant.profileId, progress, sowedAt, index);
            const stage = plantStage(plant.profileId, progress);
            const sensorSignal = plantSensorSignal(sample);
            const nextAction = plantNextAction(plant.profileId, progress, sample);
            return (
              <article className="growth-row growth-story-card soft-card" key={plant.instanceId ?? `${plant.profileId}-${plant.nickname}`}>
                <PlantAvatar
                  tone={profile.tone}
                  plantId={plant.catalogItemId ?? plant.profileId}
                  name={plant.nickname || profile.name}
                  className="growth-row__avatar"
                />
                <div className="growth-row__body">
                  <div className="growth-row__head">
                    <span>
                      <strong>{plant.nickname || profile.name}</strong>
                      <em>{stage}</em>
                    </span>
                    <b>{timeline.dayLabel}</b>
                  </div>

                  <div className="growth-journey" aria-label={`Dyrkereise for ${plant.nickname || profile.name}`}>
                    {["Sådd", "Spirer", "Vekst", "Høst"].map((label, stepIndex) => (
                      <span
                        className={stepIndex <= timeline.activeStep ? "is-active" : ""}
                        key={label}
                      >
                        <i />
                        <small>{label}</small>
                      </span>
                    ))}
                  </div>

                  <div className="growth-story-meta">
                    <span>
                      <small>{timeline.sowedLabel}</small>
                      <strong>{timeline.ageLabel}</strong>
                    </span>
                    <span>
                      <small>{timeline.harvestLabel}</small>
                      <strong>{timeline.daysLeftLabel}</strong>
                    </span>
                  </div>

                  <div className="growth-story-action">
                    <span className={`growth-sensor-pill growth-sensor-pill--${sensorSignal.tone}`}>
                      {sensorSignal.label}
                    </span>
                    <p>{nextAction}</p>
                  </div>
                </div>
              </article>
            );
          }) : (
            <article className="soft-card empty-state-card">
              <strong>Ingen planter enda</strong>
              <p>Legg til den første planten din for å starte din egen dyrkeoversikt.</p>
              <Link to="/drivhus">Legg til plante</Link>
            </article>
          )}
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

            <button className="trend-launch-row" type="button" onClick={() => openTrend(climateTrendMetric(reportMetric))}>
              <span>
                <small>Historikk</small>
                <strong>Se trend for {activeReportLabel.title.toLowerCase()}</strong>
              </span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 16.5l4.6-4.6 3 3L19 8.5M15 8.5h4v4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>

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
                    <text className="dashboard-trend-value-label" x={Math.max(104, Math.min(696, hoverPoint.x))} y={Math.max(34, hoverPoint.y - 16)} textAnchor="middle">
                      {formatTrendValue(Number(hoverPoint.point.value), activeTrendConfig.unit, activeTrendConfig.digits)}
                    </text>
                  </>
                ) : trendChart.coords.length ? (
                  <circle
                    className="dashboard-trend-point"
                    cx={trendChart.coords[trendChart.coords.length - 1].x}
                    cy={trendChart.coords[trendChart.coords.length - 1].y}
                    r="5"
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
