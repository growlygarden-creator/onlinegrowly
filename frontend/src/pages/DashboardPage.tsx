import { useEffect, useRef, useState } from "react";
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
type TrendMetricKey = SoilMetricKey | "air_temperature" | "air_humidity" | "air_pressure" | "lux";
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

function isHubActive(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

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
    key: "air_pressure",
    label: "Lufttrykk",
    unit: "hPa",
    digits: 0,
    referenceNote: "Atmosfærisk trykk fra BME280. Bruk det som trend sammen med værskifter, lufting og planteadferd.",
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
  !["air_temperature", "air_humidity", "air_pressure", "lux"].includes(metric.key),
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

type WeatherGlyphKind = "sun" | "moon" | "partly" | "cloud" | "rain" | "snow";

function weatherGlyphKind(symbolCode: string | undefined): WeatherGlyphKind {
  const code = (symbolCode || "").toLowerCase();
  if (code.includes("rain") || code.includes("sleet")) {
    return "rain";
  }
  if (code.includes("snow")) {
    return "snow";
  }
  if (code.includes("fair") || code.includes("partly")) {
    return "partly";
  }
  if (code.includes("cloud") || code.includes("fog")) {
    return "cloud";
  }
  if (code.includes("night")) {
    return "moon";
  }
  return "sun";
}

function weatherIconLabel(symbolCode: string | undefined): string {
  const code = (symbolCode || "").toLowerCase();
  if (code.includes("rain") && (code.includes("day") || code.includes("fair") || code.includes("partly"))) {
    return "Byger";
  }
  const kind = weatherGlyphKind(symbolCode);
  return {
    sun: "Sol",
    moon: "Klart",
    partly: "Lettskyet",
    cloud: "Skyet",
    rain: "Regn",
    snow: "Snø",
  }[kind];
}

function WeatherGlyph({ symbolCode, compact = false, className = "" }: { symbolCode?: string; compact?: boolean; className?: string }) {
  const code = (symbolCode || "").toLowerCase();
  const kind = weatherGlyphKind(symbolCode);
  const isCloudy = kind === "cloud" || kind === "rain" || kind === "snow" || kind === "partly";
  const hasSun = kind === "sun" || kind === "partly" || (kind === "rain" && (code.includes("day") || code.includes("fair") || code.includes("partly")));
  const hasMoon = kind === "moon" || ((kind === "rain" || kind === "snow") && code.includes("night"));
  const cloudPath = "M20 45h25.5c6.8 0 11.5-4 11.5-9.9 0-5.4-4.2-9.5-10.1-9.7C44.6 18.4 39 13.5 31.7 13.5c-7.6 0-13.5 5.5-14.6 12.4C11.3 27 7 30.7 7 35.8 7 41.4 11.6 45 20 45Z";

  return (
    <span
      className={`${className} weather-glyph weather-glyph--${kind}${compact ? " weather-glyph--compact" : ""}`}
      aria-hidden="true"
      title={weatherIconLabel(symbolCode)}
    >
      <svg viewBox="0 0 64 64" focusable="false">
        {hasSun ? (
          <g className="weather-glyph__sun">
            <circle cx={kind === "sun" ? 32 : 23} cy={kind === "sun" ? 31 : 22} r={kind === "sun" ? 14 : 11} />
            <path d={kind === "sun"
              ? "M32 6v9M32 47v9M7 31h9M48 31h9M14.4 13.4l6.4 6.4M43.2 42.2l6.4 6.4M14.4 48.6l6.4-6.4M43.2 19.8l6.4-6.4"
              : "M23 5v7M23 32v7M6 22h7M33 22h7M11 10l5 5M31 30l5 5M11 34l5-5M31 15l5-5"} />
          </g>
        ) : null}
        {hasMoon ? (
          <g className="weather-glyph__moon">
            <path d="M42.8 39.6A17.5 17.5 0 0 1 24.4 13.4 17.5 17.5 0 1 0 50.2 34a15.6 15.6 0 0 1-7.4 5.6Z" />
          </g>
        ) : null}
        {isCloudy ? (
          <g className="weather-glyph__cloud">
            <path d={cloudPath} />
          </g>
        ) : null}
        {kind === "rain" ? (
          <g className="weather-glyph__rain">
            <path d="M21 50l-4 8M33 50l-4 8M45 50l-4 8" />
          </g>
        ) : null}
        {kind === "snow" ? (
          <g className="weather-glyph__snow">
            <path d="M24 53h.1M34 57h.1M45 53h.1" />
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

function smoothWeatherPath(coords: Array<{ x: number; y: number }>): string {
  if (!coords.length) {
    return "";
  }
  if (coords.length === 1) {
    return `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  }

  const [first] = coords;
  let path = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  for (let index = 1; index < coords.length - 1; index += 1) {
    const current = coords[index];
    const next = coords[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
  }

  const last = coords[coords.length - 1];
  return `${path} L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
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

  const width = 980;
  const height = 360;
  const left = 66;
  const right = 942;
  const top = 76;
  const skyTop = 32;
  const tempBottom = 212;
  const rainBottom = 242;
  const windTop = 280;
  const windBottom = 326;
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
  const tempLine = smoothWeatherPath(tempCoords);
  const tempArea = `${tempLine} L ${right} ${tempBottom} L ${left} ${tempBottom} Z`;
  const windLine = smoothWeatherPath(windCoords);
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
    rainTop: 224,
    width,
    height,
    left,
    right,
    top,
    skyTop,
    tempBottom,
    windTop,
    windBottom,
  };
}

function WeatherHourlyCard({ weather }: { weather: WeatherForecast }) {
  const chart = weatherHourlyChart(weather.forecast.hours ?? []);

  return (
    <section className="weather-inline-card weather-sheet__panel soft-card" aria-label="Timesvis værgraf">
        {chart ? (
          <div className="weather-hourly-card">
            <svg className="weather-hourly-chart" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label="Graf for temperatur, nedbør og vind de neste timene">
              <defs>
                <linearGradient id="weather-stage-fill" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
                  <stop offset="48%" stopColor="#f7fbf5" stopOpacity="0.96" />
                  <stop offset="100%" stopColor="#eef8f1" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="weather-temp-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#c83624" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#c83624" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="weather-rain-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#2f8df0" stopOpacity="0.88" />
                  <stop offset="100%" stopColor="#7ab9fb" stopOpacity="0.32" />
                </linearGradient>
              </defs>
              <rect className="weather-hourly-stage" x="0" y="0" width={chart.width} height={chart.height} rx="26" />
              {[chart.top, (chart.top + chart.tempBottom) / 2, chart.tempBottom, chart.windTop, chart.windBottom].map((y) => (
                <line key={y} x1={chart.left} x2={chart.right} y1={y} y2={y} className="weather-hourly-grid" />
              ))}
              {chart.tickIndexes.map((index) => {
                const x = chart.tempCoords[index].x;
                return <line key={`v-${index}`} x1={x} x2={x} y1="34" y2="326" className="weather-hourly-grid weather-hourly-grid--vertical" />;
              })}
              {chart.dayMarkers.map((marker) => (
                <text key={marker.label} x={marker.x} y="24" className="weather-hourly-day">{marker.label}</text>
              ))}
              {chart.yTicks.map((tick) => (
                <text key={tick.label} x="54" y={tick.y + 4} textAnchor="end" className="weather-hourly-axis">{tick.label}</text>
              ))}
              <path d={chart.tempArea} className="weather-hourly-temp-area" />
              <path d={chart.tempLine} className="weather-hourly-temp-glow" />
              <path d={chart.tempLine} className="weather-hourly-temp-line" />
              {chart.tickIndexes.map((index) => {
                const point = chart.points[index];
                const coord = chart.tempCoords[index];
                return (
                  <text key={`temp-label-${point.time}`} x={coord.x} y={Math.max(chart.top + 14, coord.y - 12)} className="weather-hourly-temp-label">
                    {point.air_temperature.toFixed(0)}°
                  </text>
                );
              })}
              {chart.points.map((point, index) => {
                const x = chart.tempCoords[index].x;
                const amount = point.precipitation_amount;
                const height = amount > 0 ? Math.max(5, (amount / chart.maxRain) * 30) : 0;
                return amount > 0 ? (
                  <rect
                    key={`rain-${point.time}`}
                    x={x - 6}
                    y={chart.rainBottom - height}
                    width="12"
                    height={height}
                    rx="3"
                    className="weather-hourly-rain-bar"
                  />
                ) : null;
              })}
              <path d={chart.windLine} className="weather-hourly-wind-glow" />
              <path d={chart.windLine} className="weather-hourly-wind-line" />
              {chart.iconIndexes.map((index) => {
                const point = chart.points[index];
                const x = chart.tempCoords[index].x;
                return (
                  <foreignObject key={`icon-${point.time}`} x={x - 25} y={chart.skyTop} width="50" height="48">
                    <WeatherGlyph symbolCode={point.symbol_code} compact />
                  </foreignObject>
                );
              })}
              {chart.tickIndexes.map((index) => {
                const point = chart.points[index];
                const x = chart.tempCoords[index].x;
                return (
                  <g key={`tick-${point.time}`}>
                    <text x={x} y="202" className="weather-hourly-hour">{formatWeatherHour(point.time)}</text>
                    <text x={x} y="270" className="weather-hourly-rain-label">
                      {point.precipitation_amount > 0 ? `${point.precipitation_amount.toFixed(1)} mm` : ""}
                    </text>
                    <text
                      x={x}
                      y="346"
                      className="weather-hourly-wind-arrow"
                      style={{ transform: `rotate(${weatherWindArrowRotation(point.wind_from_direction)}deg)`, transformOrigin: `${x}px 340px` }}
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
  const [weatherHourlyOpen, setWeatherHourlyOpen] = useState(false);
  const [sensorDetailsOpen, setSensorDetailsOpen] = useState(false);
  const weatherGraphRef = useRef<HTMLDivElement | null>(null);

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
      setWeatherHourlyOpen(false);
    }
  }, [weather]);

  useEffect(() => {
    if (!weatherSheetOpen) {
      return;
    }
    window.requestAnimationFrame(() => {
      weatherGraphRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [weatherSheetOpen]);

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
        setWeatherHourlyOpen(false);
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
  const scene = greenhouseScene(theme);
  const weatherNow = weather?.forecast.now;
  const hasActiveHub = isHubActive(session?.hub?.is_active);
  const activeSample = hasActiveHub ? sample : null;
  const status = growthStatus(activeSample);
  const temperature = metricText(activeSample?.air_temperature ?? activeSample?.temperature, "°C", 0);
  const humidity = metricText(activeSample?.air_humidity, "%", 0);
  const pressure = metricText(activeSample?.air_pressure, " hPa", 0);
  const lux = metricText(activeSample?.lux, " lx", 0);
  const weatherTemperature = metricText(weatherNow?.air_temperature, "°C", 0);
  const weatherHumidity = metricText(weatherNow?.relative_humidity, "%", 0);
  const weatherWind = metricText(weatherNow?.wind_speed, " m/s", 1);
  const weatherDays = weather?.forecast.days.slice(0, 5) ?? [];
  const currentWeatherSymbol = weatherNow?.symbol_code || weatherDays[0]?.symbol_code;
  const shortcutActions = [
    {
      label: "Mine planter",
      value: dashboardPlants.length ? `${dashboardPlants.length} aktive` : "Legg til første",
      to: "/drivhus",
    },
    {
      label: "Kalender",
      value: "Fra mai og videre",
      to: "/kalender",
    },
    {
      label: "Kartotek",
      value: "Finn plante",
      to: "/kartotek",
    },
  ];
  const updatedAt = formatUpdatedAt(activeSample?.recorded_at);
  const weeklyTasks = buildWeeklyTasks(activeSample, !!weather, dashboardPlants.length);
  const primaryTask = weeklyTasks[0] ?? null;
  const activeReportLabel = reportMetric ? climateLabel(reportMetric) : null;
  const activeReportValue = reportMetric ? climateValue(activeSample, reportMetric) : null;
  const soilMetrics = soilMetricConfigs.map((metric) => ({
    ...metric,
    value: formatTrendValue(sampleValue(activeSample, metric.key), metric.unit, metric.digits),
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

      <section className="settings-section home-hero-section">
        <article className="soft-card premium-hero premium-hero--climate home-start-card">
          {weather ? (
            <button
              className="home-weather-chip"
              type="button"
              onClick={() => setWeatherSheetOpen((open) => !open)}
              aria-expanded={weatherSheetOpen}
            >
              <WeatherGlyph symbolCode={currentWeatherSymbol} compact />
              <span>
                <small>Vær ved dyrkested</small>
                <strong>{weatherTemperature}</strong>
                <em>Fukt {weatherHumidity} · vind {weatherWind}</em>
              </span>
            </button>
          ) : (
            <Link className="home-weather-chip" to="/settings">
              <WeatherGlyph symbolCode={currentWeatherSymbol} compact />
              <span>
                <small>Dyrkested</small>
                <strong>Sett opp vær</strong>
                <em>Gir bedre råd</em>
              </span>
            </Link>
          )}
          <div className={`overview-image-banner home-greenhouse-hero overview-image-banner--${scene.mode}`}>
            <img className="overview-image-banner__image" src={scene.image} alt="" aria-hidden="true" />
          </div>

          {weather && weatherSheetOpen ? (
            <div className="home-forecast-card soft-card" ref={weatherGraphRef}>
              <div className="home-forecast-card__head">
                <div>
                  <p className="section-kicker">Neste dager</p>
                  <strong>Værvindu for drivhuset</strong>
                </div>
                <button className="text-action" type="button" onClick={() => setWeatherHourlyOpen((open) => !open)}>
                  {weatherHourlyOpen ? "Skjul timer" : "Timesvisning"}
                </button>
              </div>
              <div className="home-forecast-days">
                {weatherDays.map((day) => {
                  const minTemp = typeof day.temperature_min === "number" ? day.temperature_min : null;
                  const maxTemp = typeof day.temperature_max === "number" ? day.temperature_max : null;
                  const railLeft = minTemp === null ? 18 : Math.max(4, Math.min(72, (minTemp + 6) * 2.6));
                  const railWidth = minTemp === null || maxTemp === null ? 28 : Math.max(18, Math.min(72, (maxTemp - minTemp) * 4 + 24));
                  return (
                    <span className="home-forecast-day" key={day.date}>
                      <WeatherGlyph symbolCode={day.symbol_code} compact />
                      <span className="home-forecast-day__main">
                        <small>{formatWeatherDay(day.date)}</small>
                        <strong>{weatherIconLabel(day.symbol_code)}</strong>
                        <em>
                          {typeof day.humidity_avg === "number" ? `Fukt ${day.humidity_avg.toFixed(0)}%` : "Fukt —"}
                          {" · "}
                          {typeof day.wind_max === "number" ? `vind ${day.wind_max.toFixed(1)} m/s` : "vind —"}
                        </em>
                        <span className="home-forecast-day__rail" aria-hidden="true">
                          <i style={{ left: `${railLeft}%`, width: `${railWidth}%` }} />
                        </span>
                      </span>
                      <span className="home-forecast-day__temp">
                        <strong>{maxTemp === null ? "–" : `${maxTemp.toFixed(0)}°`}</strong>
                        <small>{minTemp === null ? "–" : `${minTemp.toFixed(0)}°`}</small>
                      </span>
                    </span>
                  );
                })}
              </div>
              <div className="home-forecast-legend" aria-label="Forklaring av farger">
                <strong>Temperaturspenn</strong>
                <span><i className="home-forecast-legend__cool" aria-hidden="true" /> Kjøligere</span>
                <span><i className="home-forecast-legend__warm" aria-hidden="true" /> Varmere</span>
              </div>
              {weatherHourlyOpen ? <WeatherHourlyCard weather={weather} /> : null}
            </div>
          ) : null}

          {hasActiveHub ? (
            <>
              <div className="home-sensor-summary" aria-label="Drivhusverdier">
                <button className="home-sensor-tile" type="button" onClick={() => setReportMetric("temperature")}>
                  <span><img src={tempDot} alt="" aria-hidden="true" /> Temperatur</span>
                  <strong>{temperature}</strong>
                </button>
                <button className="home-sensor-tile" type="button" onClick={() => setReportMetric("humidity")}>
                  <span><img src={humidityDot} alt="" aria-hidden="true" /> Luftfukt</span>
                  <strong>{humidity}</strong>
                </button>
                <button className="home-sensor-tile" type="button" onClick={() => setReportMetric("lux")}>
                  <span><i className="metric-strip__sun-dot" aria-hidden="true" /> Lys</span>
                  <strong>{lux}</strong>
                </button>
              </div>
              <button className="home-details-toggle" type="button" onClick={() => setSensorDetailsOpen((open) => !open)}>
                {sensorDetailsOpen ? "Skjul detaljer" : "Detaljer"}
              </button>
              {sensorDetailsOpen ? (
                <div className="home-detail-grid">
                  <button type="button" onClick={() => openTrend("air_pressure")}>
                    <span className="metric-strip__pressure-dot" aria-hidden="true" />
                    <small>Lufttrykk</small>
                    <strong>{pressure}</strong>
                  </button>
                  <button type="button" onClick={() => setSoilPanelOpen(true)}>
                    <img src={soilDot} alt="" aria-hidden="true" />
                    <small>Jorddata</small>
                    <strong>{status.soil}</strong>
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {primaryTask || dailyWeatherReport ? (
            <article className="home-today-card">
              <span>{primaryTask?.badge ?? "I dag"}</span>
              <strong>{primaryTask?.title ?? dailyWeatherReport?.title}</strong>
              <p>{primaryTask?.detail ?? dailyWeatherReport?.body}</p>
            </article>
          ) : null}

          <div className="home-shortcuts" aria-label="Snarveier">
            {shortcutActions.map((action) => (
              <Link className="home-shortcut" to={action.to} key={action.label}>
                <small>{action.label}</small>
                <strong>{action.value}</strong>
              </Link>
            ))}
          </div>
        </article>
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
            const progress = plantProgress(plant.profileId, index, activeSample, sowedAt);
            const timeline = plantTimeline(plant.profileId, progress, sowedAt, index);
            const stage = plantStage(plant.profileId, progress);
            const nextAction = plantNextAction(plant.profileId, progress, activeSample);
            return (
              <article className="home-plant-row soft-card" key={plant.instanceId ?? `${plant.profileId}-${plant.nickname}`}>
                <PlantAvatar
                  tone={profile.tone}
                  plantId={plant.catalogItemId ?? plant.profileId}
                  name={plant.nickname || profile.name}
                  className="home-plant-row__avatar"
                />
                <div>
                  <strong>{plant.nickname || profile.name}</strong>
                  <span>{stage} · {timeline.dayLabel}</span>
                  <p>{nextAction}</p>
                </div>
                <b>{timeline.daysLeftLabel}</b>
              </article>
            );
          }) : (
            <article className="soft-card empty-state-card">
              <strong>Ingen planter enda</strong>
              <p>Legg til den første planten din for å starte din egen dyrkeoversikt.</p>
              <Link to="/drivhus">Legg til plante</Link>
            </article>
          )}
          {dashboardPlants.length > 4 ? (
            <Link className="home-plant-more" to="/drivhus">
              Se {dashboardPlants.length - 4} flere planter
            </Link>
          ) : null}
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
