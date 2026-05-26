import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  fetchDailyWeatherReport,
  fetchLatestSample,
  fetchMetricHistory,
  fetchPlants,
  fetchSoilSensors,
  fetchWeatherForecast,
  type AuthSession,
  type DailyWeatherReport,
  type GrowlyPlant,
  type HistoryPoint,
  type LatestSample,
  type SoilSensor,
  type WeatherForecast,
  type WeatherHour,
} from "../lib/api";
import {
  growlyNotificationHistory,
  syncGrowlyNotificationHistory,
  type GrowlyNotificationHistoryItem,
} from "../lib/notifications";
import { useI18n, type AppLanguage } from "../lib/i18n";
import { soilSensorDisplayName } from "../lib/soilSensors";
import greenhouseDay from "../assets/greenhouse-assets/greenhouse-day.png";
import greenhouseEvening from "../assets/greenhouse-assets/greenhouse-evening.png";
import humidityDot from "../assets/greenhouse-assets/humidity-dot.png";
import soilDot from "../assets/greenhouse-assets/soil-dot.png";
import tempDot from "../assets/greenhouse-assets/temp-dot.png";

type DashboardPageProps = {
  session: AuthSession | null;
  selectedHubId?: string;
  theme: "light" | "dark";
};

type TrendMetricKey = "humidity" | "temperature" | "ph" | "conductivity" | "nitrogen" | "phosphorus" | "potassium" | "salinity" | "tds" | "air_temperature" | "air_humidity" | "air_pressure" | "lux";
type TrendRange = "24h" | "3d" | "7d" | "all";
type ClimateReportMetric = "temperature" | "humidity" | "lux";
type DashboardSensorSource = "hub" | `soil:${string}`;
type TrendMetricConfig = {
  key: TrendMetricKey;
  label: string;
  unit: string;
  digits: number;
  optimal?: [number, number];
  acceptable?: [number, number];
  referenceNote?: string;
};

type DashboardPlant = Pick<GrowlyPlant, "instanceId" | "nickname" | "profileId" | "catalogItemId" | "sowedAt" | "location">;
type HomeTask = {
  title: string;
  detail: string;
  badge: string;
  tone: "good" | "watch" | "bad";
};
type DailyAdvice = {
  badge: string;
  title: string;
  detail: string;
  tip: string;
};

function localeForLanguage(language: AppLanguage): string {
  return language === "no" ? "nb-NO" : "en-US";
}

function currentMonthName(language: AppLanguage): string {
  return new Date().toLocaleDateString(localeForLanguage(language), { month: "long" });
}

function formatDashboardNotificationTime(value: string, language: AppLanguage): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return language === "no" ? "Nylig" : "Recently";
  }
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const time = date.toLocaleTimeString(localeForLanguage(language), { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === today.toDateString()) {
    return language === "no" ? `I dag ${time}` : `Today ${time}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return language === "no" ? `I går ${time}` : `Yesterday ${time}`;
  }
  return date.toLocaleDateString(localeForLanguage(language), { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function isHubActive(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function isDiagnosticSensorEnabled(value: unknown): boolean {
  return value !== false && value !== 0 && value !== "0";
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

const fallbackDashboardPlantProfile = {
  name: "Egen plante",
  tone: "leafy" as const,
  maturityDays: 75,
  ranges: {
    temperature: { optimal: [16, 24], caution: [8, 30] },
    humidity: { optimal: [45, 75], caution: [30, 90] },
    lux: { optimal: [3000, 20000], caution: [1000, 40000] },
  },
};

function dashboardProfile(profileId: string) {
  return dashboardPlantProfiles[profileId] ?? fallbackDashboardPlantProfile;
}

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

const diySoilSensorMetricKeys: TrendMetricKey[] = ["humidity", "air_temperature", "air_humidity"];
const diySoilSensorMetricConfigs = trendMetricConfigs.filter((metric) => diySoilSensorMetricKeys.includes(metric.key));

const trendRangeOptions: Array<{ key: TrendRange; label: string }> = [
  { key: "24h", label: "24t" },
  { key: "3d", label: "3 dager" },
  { key: "7d", label: "7 dager" },
  { key: "all", label: "Alt" },
];
const HUB_SENSOR_FILTER = "__hub__";
const dashboardSourceStoragePrefix = "growly.dashboardSensorSource";

function dashboardSourceStorageKey(hubId: string): string {
  return `${dashboardSourceStoragePrefix}.${hubId || "default"}`;
}

function loadDashboardSensorSource(hubId: string): DashboardSensorSource {
  try {
    const value = window.localStorage.getItem(dashboardSourceStorageKey(hubId));
    if (value === "hub" || value?.startsWith("soil:")) {
      return value as DashboardSensorSource;
    }
  } catch {
    // Keep the dashboard usable when storage is unavailable.
  }
  return "hub";
}

function saveDashboardSensorSource(hubId: string, source: DashboardSensorSource): void {
  try {
    window.localStorage.setItem(dashboardSourceStorageKey(hubId), source);
  } catch {
    // Non-critical preference.
  }
}

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
    return { span: "days", limit: 730 };
  }

  const now = new Date();
  const hours = range === "24h" ? 24 : range === "3d" ? 72 : 168;
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

  return {
    span: range === "24h" ? "minutes" : "hours",
    limit: range === "24h" ? 288 : range === "3d" ? 216 : 336,
    dateFrom: start.toISOString(),
    dateTo: now.toISOString(),
  };
}

function formatTrendTime(value: string, language: AppLanguage): string {
  return new Date(value).toLocaleString(localeForLanguage(language), {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTrendTick(value: string, range: TrendRange, language: AppLanguage): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  if (range === "24h") {
    return date.toLocaleTimeString(localeForLanguage(language), { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString(localeForLanguage(language), { day: "2-digit", month: "2-digit" });
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
  language: AppLanguage,
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
    label: formatTrendTick(points[index].recorded_at, range, language),
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

function buildWeeklyTasks(sample: LatestSample | null, hasWeather: boolean, plantCount: number, language: AppLanguage): HomeTask[] {
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
      title: language === "no" ? "Planlegg ompotting" : "Plan repotting",
      detail: language === "no"
        ? `${currentMonthName(language)} er riktig tid for flere varme planter når nettene holder seg stabile.`
        : `${currentMonthName(language)} is the right time for more warmth-loving plants when nights stay stable.`,
      badge: "Plan",
      tone: "good",
    });
  }

  return tasks.slice(0, 3);
}

function buildDailyAdvice(
  weather: WeatherForecast | null,
  dailyWeatherReport: DailyWeatherReport | null,
  primaryTask: HomeTask | null,
  plantCount: number,
): DailyAdvice {
  if (dailyWeatherReport) {
    return {
      badge: "Dagens vær",
      title: dailyWeatherReport.title,
      detail: dailyWeatherReport.body,
      tip: dailyWeatherReport.tip,
    };
  }

  const todayWeather = weather?.forecast.days?.[0];
  const nowWeather = weather?.forecast.now;
  if (todayWeather && typeof todayWeather.temperature_max === "number" && todayWeather.temperature_max >= 26) {
    return {
      badge: "Dagens tips",
      title: "Luft før varmen topper seg",
      detail: "Drivhuset bygger varme raskere enn ute-temperaturen viser.",
      tip: "Åpne litt tidlig, vann helst ved jord og bruk lett skygge på småplanter.",
    };
  }
  if (todayWeather && typeof todayWeather.temperature_min === "number" && todayWeather.temperature_min <= 4) {
    return {
      badge: "Dagens tips",
      title: "Beskytt mot kald natt",
      detail: "Varme planter kan stoppe opp selv om dagene er fine.",
      tip: "Flytt små potter inn mot vegg, bruk fiberduk og vent med utplanting.",
    };
  }
  if (nowWeather && typeof nowWeather.wind_speed === "number" && nowWeather.wind_speed >= 7) {
    return {
      badge: "Dagens tips",
      title: "Sikre luftingen",
      detail: "Vind kan rive i dører, luker og lette potter.",
      tip: "Luft på lesiden, fest lette planter og sjekk at lokk og brett står stødig.",
    };
  }

  if (primaryTask) {
    return {
      badge: "Dagens tips",
      title: primaryTask.title,
      detail: primaryTask.detail,
      tip: primaryTask.tone === "bad" ? "Ta dette først, og sjekk plantene igjen senere i dag." : "Bruk to minutter på en rolig sjekk før du gjør større tiltak.",
    };
  }

  const greenhouseTips = [
    {
      title: "Se under bladene",
      detail: "Små skadedyr og stress vises ofte før planten ser syk ut ovenfra.",
      tip: "Sjekk nye skudd, undersiden av bladene og jordoverflaten med godt lys.",
    },
    {
      title: "Vann rolig, ikke ofte",
      detail: "Jevn fukt er bedre enn små skvetter som bare treffer toppen.",
      tip: "Kjenn med fingeren først, og vann langsomt til rotsonen får tid til å trekke.",
    },
    {
      title: "Rydd litt luft rundt plantene",
      detail: "God luft mellom blader senker risikoen for sopp og svakt bladverk.",
      tip: "Fjern visne blader og la varme planter få rom rundt stammen.",
    },
  ];
  const fallbackTip = greenhouseTips[new Date().getDay() % greenhouseTips.length];
  return {
    badge: plantCount ? "Dagens tips" : "Kom i gang",
    title: plantCount ? fallbackTip.title : "Legg inn første plante",
    detail: plantCount ? fallbackTip.detail : "Da kan Growly gi råd som passer plantene du faktisk dyrker.",
    tip: plantCount ? fallbackTip.tip : "Start med én plante, så blir tips, kalender og oppfølging mer treffsikkert.",
  };
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

function formatWeatherHour(value: string, language: AppLanguage): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString(localeForLanguage(language), { hour: "2-digit" });
}

function formatWeatherDay(value: string, language: AppLanguage): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString(localeForLanguage(language), { weekday: "short", day: "numeric" }).replace(".", "");
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

function weatherHourlyChart(hours: WeatherHour[], language: AppLanguage) {
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
  const height = 348;
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
  const dayMarkers = points.reduce<Array<{ label: string; start: number; end: number; x: number }>>((markers, point, index) => {
    const label = formatWeatherDay(point.time, language);
    if (!label) {
      return markers;
    }
    const x = xForIndex(index);
    const latest = markers[markers.length - 1];
    if (latest?.label === label) {
      latest.end = x;
      latest.x = (latest.start + latest.end) / 2;
    } else {
      markers.push({ label, start: x, end: x, x });
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

function WeatherHourlyCard({ weather, language }: { weather: WeatherForecast; language: AppLanguage }) {
  const chart = weatherHourlyChart(weather.forecast.hours ?? [], language);

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
                return <line key={`v-${index}`} x1={x} x2={x} y1="34" y2={chart.windBottom} className="weather-hourly-grid weather-hourly-grid--vertical" />;
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
                    <text x={x} y="270" className="weather-hourly-rain-label">
                      {point.precipitation_amount > 0 ? `${point.precipitation_amount.toFixed(1)} mm` : ""}
                    </text>
                    <text
                      x={x}
                      y="338"
                      className="weather-hourly-wind-arrow"
                      style={{ transform: `rotate(${weatherWindArrowRotation(point.wind_from_direction)}deg)`, transformOrigin: `${x}px 332px` }}
                    >
                      ↑
                    </text>
                  </g>
                );
              })}
            </svg>
            <div
              className="weather-hourly-time-row"
              aria-label="Tidspunkter i grafen"
              style={{
                "--weather-time-left": `${(chart.left / chart.width) * 100}%`,
                "--weather-time-right": `${((chart.width - chart.right) / chart.width) * 100}%`,
              } as CSSProperties}
            >
              <div className="weather-hourly-time-key" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 7.8v4.7l3.2 1.9" />
                </svg>
                <span>Tid</span>
              </div>
              <div className="weather-hourly-time-track">
                {chart.tickIndexes.map((index) => {
                  const point = chart.points[index];
                  const x = chart.tempCoords[index].x;
                  const offset = ((x - chart.left) / (chart.right - chart.left || 1)) * 100;
                  return (
                    <span key={`hour-${point.time}`} style={{ left: `${offset}%` }}>
                      {formatWeatherHour(point.time, language)}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="weather-hourly-legend">
              <span><i className="legend-temp" /> Temperatur</span>
              <span><i className="legend-rain" /> Nedbør</span>
              <span><i className="legend-wind" /> Vind</span>
              <span><i className="legend-icon" /> Værtype</span>
            </div>
            <p className="weather-hourly-updated">{formatUpdatedAt(weather.forecast.updated_at, language)}</p>
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

function formatUpdatedAt(value: string | null | undefined, language: AppLanguage): string {
  if (!value) {
    return language === "no" ? "Venter på første oppdatering" : "Waiting for the first update";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return language === "no" ? "Oppdatert nylig" : "Updated recently";
  }

  const updatedAt = date.toLocaleTimeString(localeForLanguage(language), {
    hour: "2-digit",
    minute: "2-digit",
  });
  return language === "no" ? `Oppdatert ${updatedAt}` : `Updated ${updatedAt}`;
}

function normalizeDashboardPlants(plants: GrowlyPlant[]): DashboardPlant[] {
  return plants
    .map((plant) => {
      const instanceId = plant.instanceId || plant.plant_id || "";
      const profileId = plant.profileId || plant.profile_id || "unknown";
      const catalogItemId = plant.catalogItemId || plant.catalog_item_id || profileId;
      const nickname = plant.nickname || plant.display_name || "";
      return {
        instanceId,
        profileId,
        catalogItemId,
        nickname,
        sowedAt: plant.sowedAt ?? plant.sowed_at ?? null,
        location: plant.location ?? plant.location_label ?? "greenhouse",
      };
    })
    .filter((plant) => plant.instanceId.trim() && plant.nickname.trim());
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

export function DashboardPage({ session, selectedHubId = "", theme }: DashboardPageProps) {
  const { language } = useI18n();
  const [sample, setSample] = useState<LatestSample | null>(null);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [dailyWeatherReport, setDailyWeatherReport] = useState<DailyWeatherReport | null>(null);
  const [soilPanelOpen, setSoilPanelOpen] = useState(false);
  const [reportMetric, setReportMetric] = useState<ClimateReportMetric | null>(null);
  const [trendMetric, setTrendMetric] = useState<TrendMetricKey | null>(null);
  const [trendRange, setTrendRange] = useState<TrendRange>("24h");
  const [trendPoints, setTrendPoints] = useState<HistoryPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [dashboardPlants, setDashboardPlants] = useState<DashboardPlant[]>([]);
  const [weatherSheetOpen, setWeatherSheetOpen] = useState(false);
  const [weatherHourlyOpen, setWeatherHourlyOpen] = useState(false);
  const [sensorDetailsOpen, setSensorDetailsOpen] = useState(false);
  const [latestNotification, setLatestNotification] = useState<GrowlyNotificationHistoryItem | null>(null);
  const [soilSensors, setSoilSensors] = useState<SoilSensor[]>([]);
  const [sensorSource, setSensorSource] = useState<DashboardSensorSource>(() => loadDashboardSensorSource(selectedHubId));
  const weatherGraphRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSensorSource(loadDashboardSensorSource(selectedHubId));
  }, [selectedHubId]);

  useEffect(() => {
    const sensorFilter = sensorSource === "hub" ? HUB_SENSOR_FILTER : sensorSource.replace("soil:", "");
    let cancelled = false;
    const refreshLatestSample = () => {
      fetchLatestSample(selectedHubId, sensorFilter).then((result) => {
        if (!cancelled) {
          setSample(result);
        }
      });
    };
    refreshLatestSample();
    const refreshTimer = window.setInterval(refreshLatestSample, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [selectedHubId, sensorSource]);

  useEffect(() => {
    let cancelled = false;
    const refreshSoilSensors = () => {
      fetchSoilSensors(selectedHubId).then((result) => {
        if (cancelled) {
          return;
        }
        setSoilSensors(result?.sensors ?? []);
      });
    };
    refreshSoilSensors();
    const refreshTimer = window.setInterval(refreshSoilSensors, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [selectedHubId]);

  useEffect(() => {
    const diagnosticEnabled = isDiagnosticSensorEnabled(session?.hub?.diagnostic_sensor_enabled);
    const firstSoilSource = soilSensors[0] ? `soil:${soilSensors[0].sensor_id}` as DashboardSensorSource : "hub";
    if (sensorSource === "hub" && !diagnosticEnabled && firstSoilSource !== "hub") {
      setSensorSource(firstSoilSource);
      saveDashboardSensorSource(selectedHubId, firstSoilSource);
      return;
    }
    if (sensorSource !== "hub" && !soilSensors.some((sensor) => sensorSource === `soil:${sensor.sensor_id}`)) {
      const fallbackSource = diagnosticEnabled ? "hub" : firstSoilSource;
      setSensorSource(fallbackSource);
      saveDashboardSensorSource(selectedHubId, fallbackSource);
    }
  }, [selectedHubId, sensorSource, soilSensors, session?.hub?.diagnostic_sensor_enabled]);

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

    fetchDailyWeatherReport(selectedHubId, language).then((result) => {
      if (!cancelled) {
        setDailyWeatherReport(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [language, selectedHubId, weather?.forecast.updated_at]);

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
    let cancelled = false;
    async function loadLatestNotification() {
      await syncGrowlyNotificationHistory().catch(() => undefined);
      if (!cancelled) {
        setLatestNotification(growlyNotificationHistory()[0] ?? null);
      }
    }
    loadLatestNotification();
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
      sensorId: sensorSource === "hub" ? HUB_SENSOR_FILTER : sensorSource.replace("soil:", ""),
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
  }, [trendMetric, trendRange, selectedHubId, sensorSource]);

  const firstName = session?.user?.full_name?.split(" ")[0] || session?.username || "Growly";
  const scene = greenhouseScene(theme);
  const weatherNow = weather?.forecast.now;
  const hasActiveHub = isHubActive(session?.hub?.is_active);
  const diagnosticSensorEnabled = isDiagnosticSensorEnabled(session?.hub?.diagnostic_sensor_enabled);
  const activeSample = hasActiveHub && (sensorSource !== "hub" || diagnosticSensorEnabled) ? sample : null;
  const selectedSoilSensor = sensorSource.startsWith("soil:")
    ? soilSensors.find((sensor) => sensorSource === `soil:${sensor.sensor_id}`) ?? null
    : null;
  const isSoilSensorSource = Boolean(selectedSoilSensor);
  const selectedSoilSensorIndex = selectedSoilSensor ? soilSensors.findIndex((sensor) => sensor.sensor_id === selectedSoilSensor.sensor_id) : -1;
  const sensorSourceLabel = selectedSoilSensor ? soilSensorDisplayName(selectedSoilSensor, Math.max(0, selectedSoilSensorIndex)) : "Jordsensor";
  const status = growthStatus(activeSample);
  const temperature = metricText(activeSample?.air_temperature ?? activeSample?.temperature, "°C", 0);
  const humidity = metricText(isSoilSensorSource ? activeSample?.humidity : activeSample?.air_humidity, "%", 0);
  const soilAirHumidity = metricText(activeSample?.air_humidity, "%", 0);
  const pressure = metricText(activeSample?.air_pressure, " hPa", 0);
  const thirdMetric = isSoilSensorSource
    ? soilAirHumidity
    : metricText(activeSample?.lux, " lx", 0);
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
    {
      label: "Varsler",
      value: "Siste beskjeder",
      to: "/varsler",
    },
  ];
  const updatedAt = formatUpdatedAt(activeSample?.recorded_at, language);
  const weeklyTasks = buildWeeklyTasks(activeSample, !!weather, dashboardPlants.length, language);
  const primaryTask = weeklyTasks[0] ?? null;
  const dailyAdvice = buildDailyAdvice(weather, dailyWeatherReport, primaryTask, dashboardPlants.length);
  const activeReportLabel = reportMetric ? climateLabel(reportMetric) : null;
  const activeReportValue = reportMetric ? climateValue(activeSample, reportMetric) : null;
  const soilMetrics = diySoilSensorMetricConfigs.map((metric) => ({
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
  const trendChart = chartPath(trendPoints, activeTrendConfig, trendRange, language);
  const trendStatus = trendReferenceStatus(latestTrendValue, activeTrendConfig);
  const hoverPoint = hoverIndex !== null ? trendChart.coords[hoverIndex] : null;
  function selectSensorSource(nextSource: DashboardSensorSource) {
    setSensorSource(nextSource);
    saveDashboardSensorSource(selectedHubId, nextSource);
    setReportMetric(null);
    setTrendMetric(null);
    setSoilPanelOpen(false);
  }
  function openTrend(metric: TrendMetricKey) {
    setSoilPanelOpen(false);
    setReportMetric(null);
    setTrendRange("24h");
    setTrendMetric(metric);
  }

  return (
    <main className="page-shell app-page">
      <section className="screen-header">
        <div>
          <h1>Ditt drivhus <span className="leaf-mark">🌿</span></h1>
          <p>God morgen, {firstName}. Her er det viktigste akkurat nå.</p>
        </div>
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
                        <small>{formatWeatherDay(day.date, language)}</small>
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
              {weatherHourlyOpen ? <WeatherHourlyCard weather={weather} language={language} /> : null}
            </div>
          ) : null}

          {hasActiveHub ? (
            <>
              <div className="home-sensor-source" role="radiogroup" aria-label="Velg sensorkilde">
                {diagnosticSensorEnabled ? (
                  <button
                    className={sensorSource === "hub" ? "is-selected" : ""}
                    type="button"
                    role="radio"
                    aria-checked={sensorSource === "hub"}
                    onClick={() => selectSensorSource("hub")}
                  >
                    7-i-1 diagnose
                  </button>
                ) : null}
                {soilSensors.map((sensor, sensorIndex) => {
                  const source = `soil:${sensor.sensor_id}` as DashboardSensorSource;
                  return (
                    <button
                      className={sensorSource === source ? "is-selected" : ""}
                      type="button"
                      role="radio"
                      aria-checked={sensorSource === source}
                      onClick={() => selectSensorSource(source)}
                      key={sensor.sensor_id}
                    >
                      {soilSensorDisplayName(sensor, sensorIndex)}
                    </button>
                  );
                })}
              </div>
              <div className="home-sensor-summary" aria-label="Drivhusverdier">
                <button className="home-sensor-tile" type="button" onClick={() => (isSoilSensorSource ? openTrend("air_temperature") : setReportMetric("temperature"))}>
                  <span><img src={tempDot} alt="" aria-hidden="true" /> {isSoilSensorSource ? "Lufttemp" : "Temperatur"}</span>
                  <strong>{temperature}</strong>
                </button>
                <button className="home-sensor-tile" type="button" onClick={() => (isSoilSensorSource ? openTrend("humidity") : setReportMetric("humidity"))}>
                  <span><img src={humidityDot} alt="" aria-hidden="true" /> {isSoilSensorSource ? "Jordfukt" : "Luftfukt"}</span>
                  <strong>{humidity}</strong>
                </button>
                <button className="home-sensor-tile" type="button" onClick={() => (isSoilSensorSource ? openTrend("air_humidity") : setReportMetric("lux"))}>
                  <span><i className="metric-strip__sun-dot" aria-hidden="true" /> {isSoilSensorSource ? "Luftfukt" : "Lys"}</span>
                  <strong>{thirdMetric}</strong>
                </button>
              </div>
              <button className="home-details-toggle" type="button" onClick={() => setSensorDetailsOpen((open) => !open)}>
                {sensorDetailsOpen ? "Skjul detaljer" : "Detaljer"}
              </button>
              {sensorDetailsOpen ? (
                <div className="home-detail-grid">
                  {!isSoilSensorSource ? (
                    <button type="button" onClick={() => openTrend("air_pressure")}>
                      <span className="metric-strip__pressure-dot" aria-hidden="true" />
                      <small>Lufttrykk</small>
                      <strong>{pressure}</strong>
                    </button>
                  ) : null}
                  <button type="button" onClick={() => setSoilPanelOpen(true)}>
                    <img src={soilDot} alt="" aria-hidden="true" />
                    <small>{isSoilSensorSource ? sensorSourceLabel : "Jorddata"}</small>
                    <strong>{status.soil}</strong>
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="home-message-grid">
            <article className="home-today-card home-today-card--advice">
              <span>{dailyAdvice.badge}</span>
              <strong>{dailyAdvice.title}</strong>
              <p>{dailyAdvice.detail}</p>
              <p>{dailyAdvice.tip}</p>
            </article>

            <Link className="home-notification-card" to="/varsler">
              <span className="home-notification-card__kicker">Siste varsel</span>
              {latestNotification ? (
                <>
                  <strong>{latestNotification.title}</strong>
                  <p>{latestNotification.body}</p>
                  <small>{formatDashboardNotificationTime(latestNotification.occurredAt, language)}</small>
                </>
              ) : (
                <>
                  <strong>Ingen varsler ennå</strong>
                  <p>Når Growly sender noe viktig, ligger siste beskjed her på startskjermen.</p>
                  <small>Se varselhistorikk</small>
                </>
              )}
            </Link>
          </div>

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
                const profile = dashboardProfile(plant.profileId);
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
                      ? language === "no"
                        ? `${trendPoints.length} målinger · siste ${formatTrendTime(trendPoints[trendPoints.length - 1].recorded_at, language)}`
                        : `${trendPoints.length} measurements · latest ${formatTrendTime(trendPoints[trendPoints.length - 1].recorded_at, language)}`
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
                  <span>{formatTrendTime(hoverPoint.point.recorded_at, language)}</span>
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
