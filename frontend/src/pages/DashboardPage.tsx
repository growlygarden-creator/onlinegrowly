import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { askGrowlyAssistant, fetchLatestSample, fetchMetricHistory, type AuthSession, type GrowlyAssistantImage, type HistoryPoint, type LatestSample } from "../lib/api";
import { PlantAvatar } from "../components/PlantAvatar";
import greenhouseDay from "../assets/greenhouse-assets/greenhouse-day.png";
import greenhouseEvening from "../assets/greenhouse-assets/greenhouse-evening.png";
import humidityDot from "../assets/greenhouse-assets/humidity-dot.png";
import soilDot from "../assets/greenhouse-assets/soil-dot.png";
import tempDot from "../assets/greenhouse-assets/temp-dot.png";

type DashboardPageProps = {
  session: AuthSession | null;
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

type DashboardPlant = {
  instanceId?: string;
  nickname: string;
  profileId: string;
  catalogItemId?: string;
  sowedAt?: string;
};
type HomeTask = {
  title: string;
  detail: string;
  badge: string;
  tone: "good" | "watch" | "bad";
};
type AssistantPrompt = { label: string; question: string };
type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  isError?: boolean;
  imageName?: string;
};

const GREENHOUSE_PLANTS_STORAGE_KEY = "growly.greenhousePlants";
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

const defaultDashboardPlants: DashboardPlant[] = [
  { nickname: "Cherry tomat", profileId: "tomato", sowedAt: "2026-04-10" },
  { nickname: "Agurk", profileId: "cucumber", sowedAt: "2026-04-18" },
  { nickname: "Basilikum", profileId: "basil", sowedAt: "2026-04-14" },
];

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

const assistantPrompts: AssistantPrompt[] = [
  { label: "Hva bør jeg gjøre nå?", question: "Hva bør jeg gjøre i drivhuset akkurat nå basert på sensorene?" },
  { label: "Hvem trenger vann?", question: "Hvilke planter eller forhold tyder på at jeg bør vanne nå?" },
  { label: "Tolk sensorene", question: "Tolk siste sensordata og si hva som er bra, hva jeg bør følge med på, og neste tiltak." },
  { label: "Hva kan sås?", question: "Hva kan jeg så eller plante denne måneden i drivhuset?" },
];

const initialAssistantMessages: AssistantMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "Hei! Spør meg om vanning, sensorene eller hva du bør gjøre nå.",
  },
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

function buildWeeklyTasks(sample: LatestSample | null): HomeTask[] {
  const tasks: HomeTask[] = [];

  if (!sample) {
    return [
      {
        title: "Koble til hub",
        detail: "Når første måling kommer inn, lager Growly konkrete tiltak for plantene dine.",
        badge: "Venter",
        tone: "watch",
      },
      {
        title: "Legg inn plantene dine",
        detail: "Da kan startskjermen vurdere klimaet mot riktige plantekrav.",
        badge: "Oppsett",
        tone: "good",
      },
    ];
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

function assistantAnswerItems(answer: string): string[] {
  const cleanedAnswer = answer.replace(/\r/g, "").replace(/\*\*/g, "").trim();
  const lines = cleanedAnswer
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
  const candidates = lines.length > 1 ? lines : (cleanedAnswer.match(/[^.!?]+[.!?]?/g) ?? [cleanedAnswer]);

  return candidates
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((line) => (line.length > 120 ? `${line.slice(0, 117).trim()}...` : line));
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
      .map((plant) => ({
        instanceId: plant.instanceId,
        profileId: plant.profileId,
        catalogItemId: plant.catalogItemId,
        nickname: plant.nickname,
        sowedAt: plant.sowedAt,
      }));
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

export function DashboardPage({ session, theme, onToggleTheme }: DashboardPageProps) {
  const [sample, setSample] = useState<LatestSample | null>(null);
  const [soilPanelOpen, setSoilPanelOpen] = useState(false);
  const [reportMetric, setReportMetric] = useState<ClimateReportMetric | null>(null);
  const [trendMetric, setTrendMetric] = useState<TrendMetricKey | null>(null);
  const [trendRange, setTrendRange] = useState<TrendRange>("7d");
  const [trendPoints, setTrendPoints] = useState<HistoryPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>(initialAssistantMessages);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantImage, setAssistantImage] = useState<GrowlyAssistantImage | null>(null);
  const [assistantImageError, setAssistantImageError] = useState("");
  const assistantLogRef = useRef<HTMLDivElement | null>(null);
  const assistantFileInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    assistantLogRef.current?.scrollTo({
      top: assistantLogRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [assistantMessages, assistantLoading]);

  const firstName = session?.user?.full_name?.split(" ")[0] || session?.username || "Geirij";
  const status = growthStatus(sample);
  const scene = greenhouseScene(theme);
  const temperature = metricText(sample?.air_temperature ?? sample?.temperature, "°C", 0);
  const humidity = metricText(sample?.air_humidity, "%", 0);
  const lux = metricText(sample?.lux, " lx", 0);
  const updatedAt = formatUpdatedAt(sample?.recorded_at);
  const dashboardPlants = loadDashboardPlants();
  const weeklyTasks = buildWeeklyTasks(sample);
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

  function handleAssistantImage(file: File | undefined) {
    setAssistantImageError("");
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setAssistantImageError("Velg et bilde.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAssistantImageError("Bildet er for stort. Velg et under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAssistantImage({ dataUrl: reader.result, name: file.name });
      }
    };
    reader.onerror = () => setAssistantImageError("Kunne ikke lese bildet.");
    reader.readAsDataURL(file);
  }

  async function askAssistant(question: string, image: GrowlyAssistantImage | null = assistantImage) {
    const trimmedQuestion = question.trim() || (image ? "Se på plantebildet og gi korte, trygge råd." : "");
    if ((!trimmedQuestion && !image) || assistantLoading) {
      return;
    }
    setAssistantOpen(true);
    setAssistantQuestion("");
    setAssistantImage(null);
    setAssistantImageError("");
    setAssistantMessages((messages) => [
      ...messages,
      { id: `user-${Date.now()}`, role: "user", text: trimmedQuestion, imageName: image?.name },
    ]);
    setAssistantLoading(true);
    try {
      const result = await askGrowlyAssistant(trimmedQuestion, image);
      if (!result) {
        setAssistantMessages((messages) => [
          ...messages,
          {
            id: `assistant-error-${Date.now()}`,
            role: "assistant",
            text: "Jeg fikk ikke kontakt med Growly AI akkurat nå. Prøv igjen om litt.",
            isError: true,
          },
        ]);
        return;
      }
      setAssistantMessages((messages) => [
        ...messages,
        { id: `assistant-${Date.now()}`, role: "assistant", text: result.answer },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ai_unavailable";
      const friendlyMessage =
        message === "openai_key_missing"
          ? "AI-nøkkelen mangler på serveren. Legg OPENAI_API_KEY inn i Render og deploy på nytt."
          : message === "ai_http_404"
            ? "AI-endepunktet finnes ikke på serveren ennå. Deploy siste versjon til Render."
            : "Jeg fikk ikke kontakt med Growly AI akkurat nå. Prøv igjen om litt.";
      setAssistantMessages((messages) => [
        ...messages,
        { id: `assistant-error-${Date.now()}`, role: "assistant", text: friendlyMessage, isError: true },
      ]);
    } finally {
      setAssistantLoading(false);
    }
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

      <section className="settings-section">
        <p className="section-kicker">Vekstforhold</p>
        <article className="soft-card premium-hero premium-hero--climate">
          <div className="climate-hero-grid">
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

            <div className={`overview-image-banner overview-image-banner--${scene.mode}`}>
              <img className="overview-image-banner__image" src={scene.image} alt="" aria-hidden="true" />
            </div>
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
        <div className="home-section-head">
          <div>
            <p className="section-kicker">Denne uken</p>
            <h2>Sensorstyrte gjøremål</h2>
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
            <h2>{dashboardPlants.length} aktive planter</h2>
          </div>
          <Link to="/drivhus">Mine planter</Link>
        </div>
        <div className="growth-list">
          {dashboardPlants.slice(0, 4).map((plant, index) => {
            const profile = dashboardPlantProfiles[plant.profileId] ?? dashboardPlantProfiles.tomato;
            const progress = plantProgress(plant.profileId, index, sample, plant.sowedAt);
            const timeline = plantTimeline(plant.profileId, progress, plant.sowedAt, index);
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
          })}
        </div>
      </section>

      <div className={`assistant-dock${assistantOpen ? " is-open" : ""}`}>
        {assistantOpen ? (
          <section className="assistant-card assistant-chat-card soft-card" aria-label="Chat med Growly">
            <div className="assistant-chat-head">
              <div className="assistant-card__avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 20c4.4-2.2 7-5.5 7-9.2C19 6.5 16 3 12 3S5 6.5 5 10.8C5 14.5 7.6 17.8 12 20Z" fill="currentColor" opacity="0.16" />
                  <path d="M12 17c2.7-1.6 4.4-3.7 4.4-6.1A4.4 4.4 0 0 0 12 6.5a4.4 4.4 0 0 0-4.4 4.4c0 2.4 1.7 4.5 4.4 6.1Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M9.6 10.8h.1M14.3 10.8h.1M10 13.3c1.2.8 2.8.8 4 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
                </svg>
              </div>
              <div>
                <p className="section-kicker">Dyrkeassistent</p>
                <h2>Chat med Growly</h2>
              </div>
              <button className="assistant-close-button" type="button" onClick={() => setAssistantOpen(false)} aria-label="Lukk chat">
                x
              </button>
            </div>

            <div className="assistant-chat-log" aria-live="polite" ref={assistantLogRef}>
              {assistantMessages.map((message) => {
                const items = message.role === "assistant" && !message.isError ? assistantAnswerItems(message.text) : [];
                return (
                  <article
                    className={`assistant-message assistant-message--${message.role}${message.isError ? " assistant-message--error" : ""}`}
                    key={message.id}
                  >
                    {message.imageName ? <span className="assistant-attachment-pill">Bilde: {message.imageName}</span> : null}
                    {items.length > 1 ? (
                      <div className="assistant-answer-list">
                        {items.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    ) : (
                      <p>{items[0] ?? message.text}</p>
                    )}
                  </article>
                );
              })}
              {assistantLoading ? (
                <article className="assistant-message assistant-message--assistant assistant-message--thinking">
                  <span />
                  <span />
                  <span />
                </article>
              ) : null}
            </div>

            <div className="assistant-prompt-row assistant-suggestion-row">
              {assistantPrompts.map((prompt) => (
                <button type="button" key={prompt.label} onClick={() => askAssistant(prompt.question, null)} disabled={assistantLoading}>
                  {prompt.label}
                </button>
              ))}
            </div>

            {assistantImage || assistantImageError ? (
              <div className={`assistant-image-preview${assistantImageError ? " assistant-image-preview--error" : ""}`}>
                <span>{assistantImageError || `Bilde klart: ${assistantImage?.name || "plantebilde"}`}</span>
                {assistantImage ? (
                  <button type="button" onClick={() => setAssistantImage(null)} aria-label="Fjern bilde">
                    Fjern
                  </button>
                ) : null}
              </div>
            ) : null}

            <form
              className="assistant-form assistant-chat-form"
              onSubmit={(event) => {
                event.preventDefault();
                askAssistant(assistantQuestion);
              }}
            >
              <input
                ref={assistantFileInputRef}
                className="assistant-file-input"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  handleAssistantImage(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              <button
                className="assistant-image-button"
                type="button"
                onClick={() => assistantFileInputRef.current?.click()}
                aria-label="Legg ved bilde"
              >
                +
              </button>
              <input
                value={assistantQuestion}
                onChange={(event) => setAssistantQuestion(event.target.value)}
                placeholder="Spør om planten..."
              />
              <button type="submit" disabled={assistantLoading || (!assistantQuestion.trim() && !assistantImage)}>
                Send
              </button>
            </form>
          </section>
        ) : null}
        <button className="assistant-bubble-button" type="button" onClick={() => setAssistantOpen((open) => !open)} aria-label="Åpne Growly-chat">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20c4.4-2.2 7-5.5 7-9.2C19 6.5 16 3 12 3S5 6.5 5 10.8C5 14.5 7.6 17.8 12 20Z" fill="currentColor" opacity="0.18" />
            <path d="M12 17c2.7-1.6 4.4-3.7 4.4-6.1A4.4 4.4 0 0 0 12 6.5a4.4 4.4 0 0 0-4.4 4.4c0 2.4 1.7 4.5 4.4 6.1Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path d="M9.6 10.8h.1M14.3 10.8h.1M10 13.3c1.2.8 2.8.8 4 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
          </svg>
        </button>
      </div>

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
