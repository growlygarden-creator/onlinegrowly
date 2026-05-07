import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchLatestSample,
  fetchMetricHistory,
  fetchPlants,
  fetchPlantHistory,
  fetchPlantCatalog,
  createPlant,
  updatePlant,
  archivePlant as archivePlantApi,
  type AuthSession,
  type GrowlyPlant,
  type HistoryPoint,
  type LatestSample,
  type PlantCatalogItem,
} from "../lib/api";
import { bundledPlantCatalog } from "../data/plantCatalog";
import { PlantAvatar } from "../components/PlantAvatar";
import { plantCareGuide } from "../lib/plantCare";

type GreenhousePageProps = {
  session: AuthSession | null;
  selectedHubId?: string;
};

type SoilMetricKey =
  | "humidity"
  | "temperature"
  | "ph"
  | "conductivity"
  | "nitrogen"
  | "phosphorus"
  | "potassium"
  | "salinity"
  | "tds";

type ClimateKey = "airTemperature" | "airHumidity" | "soilHumidity" | "soilTemperature" | "ph" | "lux";
type DetailTrendMetric = ClimateKey;

type PlantProfile = {
  id: string;
  name: string;
  family: string;
  icon: string;
  tone: "tomato" | "cucumber" | "basil" | "leafy" | "berry" | "pepper";
  ranges: Record<ClimateKey, { optimal: [number, number]; caution: [number, number] }>;
  notes?: string;
  watering?: string;
};

type GreenhousePlant = GrowlyPlant;

const fallbackPlantProfiles: PlantProfile[] = [
  {
    id: "tomato",
    name: "Tomat",
    family: "Varmeelskende",
    icon: "T",
    tone: "tomato",
    ranges: {
      airTemperature: { optimal: [20, 26], caution: [16, 30] },
      airHumidity: { optimal: [45, 65], caution: [35, 78] },
      soilHumidity: { optimal: [55, 75], caution: [45, 85] },
      soilTemperature: { optimal: [20, 26], caution: [16, 30] },
      ph: { optimal: [6.0, 6.8], caution: [5.5, 7.2] },
      lux: { optimal: [5000, 25000], caution: [2000, 40000] },
    },
  },
  {
    id: "cucumber",
    name: "Agurk",
    family: "Varmeelskende",
    icon: "A",
    tone: "cucumber",
    ranges: {
      airTemperature: { optimal: [22, 28], caution: [18, 31] },
      airHumidity: { optimal: [60, 80], caution: [48, 90] },
      soilHumidity: { optimal: [60, 80], caution: [50, 90] },
      soilTemperature: { optimal: [22, 28], caution: [18, 31] },
      ph: { optimal: [6.0, 7.0], caution: [5.5, 7.5] },
      lux: { optimal: [6000, 30000], caution: [2500, 45000] },
    },
  },
  {
    id: "basil",
    name: "Basilikum",
    family: "Urter",
    icon: "B",
    tone: "basil",
    ranges: {
      airTemperature: { optimal: [20, 26], caution: [18, 30] },
      airHumidity: { optimal: [45, 65], caution: [35, 78] },
      soilHumidity: { optimal: [50, 70], caution: [40, 80] },
      soilTemperature: { optimal: [20, 26], caution: [18, 30] },
      ph: { optimal: [6.0, 7.0], caution: [5.5, 7.5] },
      lux: { optimal: [5000, 22000], caution: [2500, 35000] },
    },
  },
  {
    id: "pepper",
    name: "Paprika",
    family: "Varmeelskende",
    icon: "P",
    tone: "pepper",
    ranges: {
      airTemperature: { optimal: [21, 28], caution: [18, 31] },
      airHumidity: { optimal: [45, 65], caution: [35, 78] },
      soilHumidity: { optimal: [55, 72], caution: [45, 82] },
      soilTemperature: { optimal: [22, 29], caution: [18, 32] },
      ph: { optimal: [6.0, 6.8], caution: [5.5, 7.2] },
      lux: { optimal: [6000, 26000], caution: [3000, 42000] },
    },
  },
  {
    id: "lettuce",
    name: "Salat",
    family: "Kjølig start",
    icon: "S",
    tone: "leafy",
    ranges: {
      airTemperature: { optimal: [10, 18], caution: [6, 24] },
      airHumidity: { optimal: [50, 75], caution: [40, 85] },
      soilHumidity: { optimal: [55, 75], caution: [45, 85] },
      soilTemperature: { optimal: [10, 18], caution: [6, 22] },
      ph: { optimal: [6.0, 7.0], caution: [5.5, 7.5] },
      lux: { optimal: [3000, 18000], caution: [1500, 30000] },
    },
  },
  {
    id: "strawberry",
    name: "Jordbær",
    family: "Bær",
    icon: "J",
    tone: "berry",
    ranges: {
      airTemperature: { optimal: [16, 22], caution: [12, 28] },
      airHumidity: { optimal: [55, 75], caution: [45, 85] },
      soilHumidity: { optimal: [58, 74], caution: [48, 84] },
      soilTemperature: { optimal: [16, 22], caution: [12, 26] },
      ph: { optimal: [5.5, 6.5], caution: [5.2, 6.9] },
      lux: { optimal: [4000, 20000], caution: [1800, 32000] },
    },
  },
];

const soilMetricConfigs: Array<{ key: SoilMetricKey; label: string; unit: string; digits: number }> = [
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

const detailTrendMetrics: Array<{ key: DetailTrendMetric; label: string; unit: string; apiMetrics: string[] }> = [
  { key: "airTemperature", label: "Lufttemp", unit: "°C", apiMetrics: ["air_temperature", "temperature"] },
  { key: "airHumidity", label: "Luftfukt", unit: "%", apiMetrics: ["air_humidity"] },
  { key: "soilTemperature", label: "Jordtemp", unit: "°C", apiMetrics: ["temperature", "air_temperature"] },
  { key: "soilHumidity", label: "Jordfukt", unit: "%", apiMetrics: ["humidity"] },
  { key: "ph", label: "pH", unit: "", apiMetrics: ["ph"] },
  { key: "lux", label: "Lys", unit: "lx", apiMetrics: ["lux"] },
];

function metricText(value: number | null | undefined, suffix: string, digits = 0): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return `${value.toFixed(digits)}${suffix}`;
}

function rangeText(range: { optimal: [number, number] } | undefined, suffix: string, digits = 0): string {
  if (!range) {
    return "-";
  }

  return `${range.optimal[0].toFixed(digits)}-${range.optimal[1].toFixed(digits)}${suffix}`;
}

function luxRangeText(range: { optimal: [number, number] } | undefined): string {
  if (!range) {
    return "-";
  }

  const compact = (value: number) => (value >= 1000 ? `${Math.round(value / 1000)}k` : value.toFixed(0));
  return `${compact(range.optimal[0])}-${compact(range.optimal[1])} lx`;
}

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatSowedAt(value: string | null | undefined): string {
  if (!value) {
    return "Sådato ikke satt";
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "Sådato ikke satt";
  }

  return `Sådd ${date.toLocaleDateString("nb-NO", { day: "2-digit", month: "short", year: "numeric" })}`;
}

function formatMovedAt(value: string | null | undefined): string {
  if (!value) {
    return "Står i drivhus";
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "Står i drivhus";
  }

  return `Flyttet inn ${date.toLocaleDateString("nb-NO", { day: "2-digit", month: "short" })}`;
}

function dateInputToDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSinceDate(value: string | null | undefined): number | null {
  const date = dateInputToDate(value);
  if (!date) {
    return null;
  }

  const today = new Date();
  const todayAtNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  return Math.max(0, Math.floor((todayAtNoon.getTime() - date.getTime()) / 86_400_000));
}

function maturityEstimateDays(profileId: string): number {
  if (profileId === "pepper" || profileId === "chili") return 110;
  if (profileId === "tomato") return 90;
  if (profileId === "cucumber") return 65;
  if (profileId === "basil") return 45;
  if (profileId === "lettuce") return 50;
  if (profileId === "strawberry") return 95;
  return 75;
}

function plantTimelineSummary(plant: GreenhousePlant, profile: PlantProfile, status: ReturnType<typeof plantStatus>) {
  const ageDays = daysSinceDate(plant.sowedAt);
  const estimate = maturityEstimateDays(profile.id);
  const progress = ageDays === null ? (plantLocation(plant) === "greenhouse" ? 34 : 12) : Math.min(100, Math.max(4, Math.round((ageDays / estimate) * 100)));
  const remainingDays = ageDays === null ? null : Math.max(0, estimate - ageDays);
  const phase =
    ageDays === null
      ? "Planlagt"
      : ageDays < 14
        ? "Spiring"
        : ageDays < 35
          ? "Etablering"
          : progress < 82
            ? "Vekst"
            : "Modning";

  const sowedLabel = ageDays === null ? "Sådato mangler" : `Sådd for ${ageDays} d siden`;
  const dayLabel = ageDays === null ? "Sett dato" : `Dag ${ageDays + 1}`;
  const harvestLabel = remainingDays === null ? "Ukjent innhøsting" : remainingDays === 0 ? "Klar snart" : `ca. ${remainingDays} d igjen`;
  const nextAction =
    plantLocation(plant) === "outside"
      ? "Neste: følg rot og lys før flytting"
      : status.level === "good"
        ? "Neste: hold jevn rytme"
        : status.note;

  return { dayLabel, harvestLabel, nextAction, phase, progress, sowedLabel };
}

function plantLocation(plant: GreenhousePlant): "greenhouse" | "outside" {
  return plant.location === "outside" ? "outside" : "greenhouse";
}

function sampleValue(sample: LatestSample | null, key: SoilMetricKey): number | null | undefined {
  return sample?.[key];
}

function formatUpdatedAt(value: string | null | undefined): string {
  if (!value) {
    return "Venter på første måling";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Oppdatert nylig";
  }

  return `Oppdatert ${date.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatTrendTime(value: string): string {
  return new Date(value).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
}

function greenhouseValue(sample: LatestSample | null, key: ClimateKey): number | null | undefined {
  if (key === "airTemperature") return sample?.air_temperature ?? sample?.temperature;
  if (key === "airHumidity") return sample?.air_humidity;
  if (key === "soilHumidity") return sample?.humidity;
  if (key === "soilTemperature") return sample?.temperature;
  if (key === "ph") return sample?.ph;
  return sample?.lux;
}

function latestTrendPoints(sample: LatestSample | null, key: DetailTrendMetric): HistoryPoint[] {
  const value = greenhouseValue(sample, key);
  if (typeof value !== "number" || Number.isNaN(value)) {
    return [];
  }

  const recordedAt = sample?.recorded_at ? new Date(sample.recorded_at) : new Date();
  const end = Number.isNaN(recordedAt.getTime()) ? new Date() : recordedAt;
  const start = new Date(end.getTime() - 10 * 60 * 1000);
  return [
    { recorded_at: start.toISOString(), value },
    { recorded_at: end.toISOString(), value },
  ];
}

function scoreValue(value: number | null | undefined, range: { optimal: [number, number]; caution: [number, number] }) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return { level: "missing" as const, label: "Venter", note: "Mangler måling" };
  }

  if (value >= range.optimal[0] && value <= range.optimal[1]) {
    return { level: "good" as const, label: "Optimal", note: "Innenfor ønsket område" };
  }

  if (value >= range.caution[0] && value <= range.caution[1]) {
    return { level: "watch" as const, label: value < range.optimal[0] ? "Litt lavt" : "Litt høyt", note: "Følges med" };
  }

  return { level: "bad" as const, label: value < range.caution[0] ? "For lavt" : "For høyt", note: "Trenger tilsyn" };
}

function statusPriority(level: ReturnType<typeof scoreValue>["level"]): number {
  if (level === "bad") return 3;
  if (level === "watch") return 2;
  if (level === "missing") return 1;
  return 0;
}

function profileById(profileId: string): PlantProfile {
  return fallbackPlantProfiles.find((profile) => profile.id === profileId) ?? fallbackPlantProfiles[0];
}

function catalogItemToProfile(item: PlantCatalogItem): PlantProfile {
  return {
    id: item.id,
    name: item.display_name,
    family: item.subtitle || item.family,
    icon: item.icon,
    tone: item.tone,
    ranges: item.ranges,
    notes: item.notes,
    watering: item.watering,
  };
}

function catalogItemForPlant(plant: GreenhousePlant, catalogItems: PlantCatalogItem[]): PlantCatalogItem | null {
  return (
    catalogItems.find((item) => plant.cultivarId && item.cultivar_id === plant.cultivarId) ??
    catalogItems.find((item) => plant.variantId && item.variant_id === plant.variantId && !item.cultivar_id) ??
    catalogItems.find((item) => item.id === plant.catalogItemId) ??
    catalogItems.find((item) => item.kind === "base" && item.profile_id === plant.profileId) ??
    null
  );
}

function profileForPlant(plant: GreenhousePlant, catalogItems: PlantCatalogItem[]): PlantProfile {
  const catalogMatch = catalogItemForPlant(plant, catalogItems);

  if (catalogMatch) {
    return catalogItemToProfile(catalogMatch);
  }

  return profileById(plant.profileId);
}

function plantStatus(plant: GreenhousePlant, profile: PlantProfile, sample: LatestSample | null) {
  if (plantLocation(plant) === "outside") {
    return {
      title: "Forkultiveres",
      note: "Ikke koblet til drivhusklima enda.",
      level: "missing" as const,
      checks: [],
    };
  }

  const checks = [
    { key: "airTemperature" as const, label: "Temperatur" },
    { key: "airHumidity" as const, label: "Luftfuktighet" },
    { key: "lux" as const, label: "Lys" },
    ...(plant.hasSevenInOne
      ? [
          { key: "soilHumidity" as const, label: "Jordfuktighet" },
          { key: "ph" as const, label: "pH" },
        ]
      : []),
  ].map((check) => ({
    ...check,
    value: greenhouseValue(sample, check.key),
    result: scoreValue(greenhouseValue(sample, check.key), profile.ranges[check.key]),
  }));

  const worst = checks.reduce((current, next) =>
    statusPriority(next.result.level) > statusPriority(current.result.level) ? next : current,
  );

  const title = worst.result.level === "good" ? "Trives" : worst.result.level === "watch" ? "Følges med" : worst.result.label;
  const note =
    worst.result.level === "good"
      ? "Forholdene er gode akkurat nå."
      : `${worst.label} er ${worst.result.label.toLowerCase()} for ${profile.name.toLowerCase()}.`;

  return { title, note, level: worst.result.level, checks };
}

function normalizePlant(plant: GreenhousePlant): GreenhousePlant {
  const nickname = String(plant.nickname || plant.display_name || "").toLowerCase();
  const profileId = plant.profileId || plant.profile_id || "tomato";
  if (nickname.includes("chili") && profileId === "tomato") {
    return { ...plant, profileId: "chili", catalogItemId: plant.catalogItemId || "chili", location: plant.location ?? "greenhouse" };
  }
  return {
    ...plant,
    instanceId: plant.instanceId || plant.plant_id || `${profileId}-${Date.now()}`,
    profileId,
    catalogItemId: plant.catalogItemId || plant.catalog_item_id || profileId,
    nickname: plant.nickname || plant.display_name || profileId,
    location: plant.location ?? plant.location_label ?? "greenhouse",
    sowedAt: plant.sowedAt ?? plant.sowed_at ?? null,
    movedToGreenhouseAt: plant.movedToGreenhouseAt ?? plant.moved_to_greenhouse_at ?? null,
    hasSevenInOne: Boolean(plant.hasSevenInOne ?? plant.has_seven_in_one),
    wateringEnabled: Boolean(plant.wateringEnabled ?? plant.watering_enabled),
  };
}

function detailTrendPath(points: HistoryPoint[], range: { optimal: [number, number]; caution: [number, number] }) {
  if (!points.length) {
    return { line: "", optimalBand: null, cautionBand: null, minValue: null, maxValue: null, startTime: "", endTime: "" };
  }

  const width = 800;
  const top = 24;
  const bottom = 238;
  const minRange = Math.min(range.caution[0], ...points.map((point) => Number(point.value)));
  const maxRange = Math.max(range.caution[1], ...points.map((point) => Number(point.value)));
  const valueSpread = maxRange - minRange || 1;
  const times = points.map((point) => new Date(point.recorded_at).getTime());
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeSpread = maxTime - minTime || 1;

  const yFor = (value: number) => bottom - ((value - minRange) / valueSpread) * (bottom - top);
  const band = ([low, high]: [number, number]) => ({
    y: Math.min(yFor(low), yFor(high)),
    height: Math.abs(yFor(high) - yFor(low)),
  });

  const coordinates = points.map((point) => ({
    x: ((new Date(point.recorded_at).getTime() - minTime) / timeSpread) * width,
    y: yFor(Number(point.value)),
  }));
  const line =
    coordinates.length === 1
      ? `M ${Math.max(0, coordinates[0].x - 8).toFixed(2)} ${coordinates[0].y.toFixed(2)} L ${Math.min(width, coordinates[0].x + 8).toFixed(2)} ${coordinates[0].y.toFixed(2)}`
      : coordinates
          .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
          .join(" ");

  return {
    line,
    optimalBand: band(range.optimal),
    cautionBand: band(range.caution),
    minValue: minRange,
    maxValue: maxRange,
    startTime: formatTrendTime(points[0].recorded_at),
    endTime: formatTrendTime(points[points.length - 1].recorded_at),
  };
}

export function GreenhousePage({ session, selectedHubId = "" }: GreenhousePageProps) {
  const [sample, setSample] = useState<LatestSample | null>(null);
  const [catalogItems, setCatalogItems] = useState<PlantCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [detailTrendMetric, setDetailTrendMetric] = useState<DetailTrendMetric>("airTemperature");
  const [detailTrendPoints, setDetailTrendPoints] = useState<HistoryPoint[]>([]);
  const [detailTrendLoading, setDetailTrendLoading] = useState(false);
  const [plants, setPlants] = useState<GreenhousePlant[]>([]);
  const [plantHistoryCount, setPlantHistoryCount] = useState(0);
  const [plantsLoading, setPlantsLoading] = useState(false);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [finishPlantId, setFinishPlantId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedCultivarId, setSelectedCultivarId] = useState<string | null>(null);
  const [newPlantQuery, setNewPlantQuery] = useState("");
  const [newSowedAt, setNewSowedAt] = useState(todayDateInputValue);
  const [newLocation, setNewLocation] = useState<"greenhouse" | "outside">("outside");
  const [newHasSevenInOne, setNewHasSevenInOne] = useState(false);

  useEffect(() => {
    fetchLatestSample(selectedHubId).then((result) => {
      setSample(result);
    });
  }, [selectedHubId]);

  useEffect(() => {
    setCatalogLoading(true);
    fetchPlantCatalog().then((items) => {
      setCatalogItems(items);
      setCatalogLoading(false);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPlantsLoading(true);
    setSelectedPlantId(null);
    fetchPlants(selectedHubId).then((items) => {
      if (cancelled) {
        return;
      }
      setPlants(items.map(normalizePlant));
      setPlantsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.username, selectedHubId]);

  useEffect(() => {
    let cancelled = false;
    fetchPlantHistory(selectedHubId).then((items) => {
      if (!cancelled) {
        setPlantHistoryCount(items.length);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session?.username, selectedHubId]);

  useEffect(() => {
    if (!selectedPlantId) {
      setDetailTrendPoints([]);
      setDetailTrendLoading(false);
      return;
    }

    let cancelled = false;
    const metric = detailTrendMetrics.find((item) => item.key === detailTrendMetric) ?? detailTrendMetrics[0];

    setDetailTrendLoading(true);

    async function loadDetailTrend() {
      for (const apiMetric of metric.apiMetrics) {
        const recent = await fetchMetricHistory({
          metric: apiMetric,
          span: "hours",
          limit: 500,
          hubId: selectedHubId,
        });

        if (cancelled) {
          return;
        }

        if (recent?.points.length) {
          setDetailTrendPoints(recent.points);
          setDetailTrendLoading(false);
          return;
        }

        const longer = await fetchMetricHistory({
          metric: apiMetric,
          span: "days",
          limit: 500,
          hubId: selectedHubId,
        });

        if (cancelled) {
          return;
        }

        if (longer?.points.length) {
          setDetailTrendPoints(longer.points);
          setDetailTrendLoading(false);
          return;
        }
      }

      setDetailTrendPoints([]);
      setDetailTrendLoading(false);
    }

    void loadDetailTrend();

    return () => {
      cancelled = true;
    };
  }, [selectedPlantId, detailTrendMetric, selectedHubId]);

  const selectedPlant = plants.find((plant) => plant.instanceId === selectedPlantId) ?? null;
  const searchableCatalogItems = catalogItems.length ? catalogItems : bundledPlantCatalog;
  const selectedCatalogDetail = selectedPlant ? catalogItemForPlant(selectedPlant, searchableCatalogItems) : null;
  const selectedProfile = selectedPlant ? profileForPlant(selectedPlant, searchableCatalogItems) : null;
  const selectedCareGuide = selectedCatalogDetail ? plantCareGuide(selectedCatalogDetail) : null;
  const plantSummaries = plants.map((plant) => {
    const profile = profileForPlant(plant, searchableCatalogItems);
    const catalogItem = catalogItemForPlant(plant, searchableCatalogItems);
    return { plant, profile, catalogItem, status: plantStatus(plant, profile, sample) };
  });
  const activeTrendMetric = detailTrendMetrics.find((metric) => metric.key === detailTrendMetric) ?? detailTrendMetrics[0];
  const activeTrendRange = selectedProfile?.ranges[detailTrendMetric];
  const fallbackTrendPoints = latestTrendPoints(sample, detailTrendMetric);
  const displayTrendPoints = detailTrendPoints.length ? detailTrendPoints : fallbackTrendPoints;
  const trendUsesLatestOnly = !detailTrendPoints.length && fallbackTrendPoints.length > 0;
  const activeTrendChart = activeTrendRange ? detailTrendPath(displayTrendPoints, activeTrendRange) : null;
  const baseCatalogItems = searchableCatalogItems.filter((item) => item.kind === "base");
  const filteredBaseItems = baseCatalogItems.filter((item) => {
    const query = newPlantQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return `${item.display_name} ${item.name} ${item.subtitle} ${item.family} ${item.category} ${item.latin_name}`.toLowerCase().includes(query);
  }).slice(0, 80);
  const selectedBaseItem = selectedBaseId ? baseCatalogItems.find((item) => item.profile_id === selectedBaseId) ?? null : null;
  const variantOptions = selectedBaseId
    ? searchableCatalogItems.filter((item) => item.kind === "variant" && item.profile_id === selectedBaseId)
    : [];
  const cultivarOptions = selectedBaseId && (selectedVariantId || !variantOptions.length)
    ? searchableCatalogItems.filter(
        (item) =>
          item.kind === "cultivar" &&
          item.profile_id === selectedBaseId &&
          (!selectedVariantId || item.variant_id === selectedVariantId),
      )
    : [];
  const selectedVariantItem = selectedVariantId ? variantOptions.find((item) => item.variant_id === selectedVariantId) ?? null : null;
  const selectedCultivarItem = selectedCultivarId ? cultivarOptions.find((item) => item.cultivar_id === selectedCultivarId) ?? null : null;
  const selectedCatalogItem = selectedCultivarItem ?? selectedVariantItem ?? selectedBaseItem;

  const soilMetrics = soilMetricConfigs.map((metric) => ({
    ...metric,
    value: metricText(sampleValue(sample, metric.key), metric.unit, metric.digits),
  }));

  async function addPlant() {
    if (!selectedCatalogItem) {
      return;
    }

    const nextPlant = await createPlant({
      profileId: selectedCatalogItem.profile_id,
      variantId: selectedCatalogItem.variant_id,
      cultivarId: selectedCatalogItem.cultivar_id,
      catalogItemId: selectedCatalogItem.id,
      nickname: selectedCatalogItem.display_name,
      sowedAt: newSowedAt,
      location: newLocation,
      movedToGreenhouseAt: newLocation === "greenhouse" ? todayDateInputValue() : null,
      hasSevenInOne: newLocation === "greenhouse" ? newHasSevenInOne : false,
      wateringEnabled: false,
    }, selectedHubId);

    if (!nextPlant) {
      return;
    }

    const normalizedPlant = normalizePlant(nextPlant);
    setPlants((current) => [normalizedPlant, ...current]);
    setSelectedPlantId(normalizedPlant.instanceId);
    setAddOpen(false);
    setNewPlantQuery("");
    setSelectedBaseId(null);
    setSelectedVariantId(null);
    setSelectedCultivarId(null);
    setNewSowedAt(todayDateInputValue());
    setNewLocation("outside");
    setNewHasSevenInOne(false);
  }

  async function toggleSevenInOne(instanceId: string) {
    const plant = plants.find((item) => item.instanceId === instanceId);
    if (!plant) {
      return;
    }
    const updated = await updatePlant(instanceId, { hasSevenInOne: !plant.hasSevenInOne }, selectedHubId);
    setPlants((current) =>
      current.map((item) => (item.instanceId === instanceId ? normalizePlant(updated ?? { ...item, hasSevenInOne: !item.hasSevenInOne }) : item)),
    );
  }

  async function movePlantToGreenhouse(instanceId: string) {
    const movedAt = todayDateInputValue();
    const updated = await updatePlant(instanceId, { location: "greenhouse", movedToGreenhouseAt: movedAt }, selectedHubId);
    setPlants((current) =>
      current.map((plant) =>
        plant.instanceId === instanceId
          ? normalizePlant(updated ?? { ...plant, location: "greenhouse", movedToGreenhouseAt: movedAt })
          : plant,
      ),
    );
  }

  async function archivePlant() {
    const plant = plants.find((item) => item.instanceId === finishPlantId);
    if (!plant) {
      setFinishPlantId(null);
      return;
    }

    await archivePlantApi(plant.instanceId, selectedHubId);

    setPlants((current) => current.filter((item) => item.instanceId !== plant.instanceId));
    setPlantHistoryCount((current) => current + 1);
    setSelectedPlantId(null);
    setFinishPlantId(null);
  }

  return (
    <main className="page-shell app-page greenhouse-page">
      <section className="screen-header">
        <div>
          <h1>Drivhus <span className="leaf-mark">🌿</span></h1>
          <p>Alt som står inne i drivhuset, med klima vurdert per plante.</p>
        </div>
        <button className="icon-button" type="button" aria-label="Legg til plante" onClick={() => setAddOpen(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        </button>
      </section>

      <section className="settings-section">
        <div className="section-heading-row">
          <p className="section-kicker">Planter</p>
          <button className="text-action" type="button" onClick={() => setAddOpen(true)}>Legg til</button>
        </div>
        <div className="plant-card-grid">
          {plantsLoading ? (
            <article className="soft-card empty-state-card">
              <strong>Henter plantene dine</strong>
              <p>Growly sjekker den valgte huben.</p>
            </article>
          ) : plantSummaries.length ? plantSummaries.map(({ plant, profile, catalogItem, status }) => {
              const timeline = plantTimelineSummary(plant, profile, status);
              return (
                <button className="greenhouse-plant-card soft-card" type="button" key={plant.instanceId} onClick={() => setSelectedPlantId(plant.instanceId)}>
                  <div className="greenhouse-plant-card__top">
                    <PlantAvatar tone={profile.tone} plantId={profile.id} name={plant.nickname || profile.name} family={profile.family} />
                    <span className={`plant-status-pill plant-status-pill--${status.level}`}>{status.title}</span>
                  </div>
                  <div className="plant-card-title-row">
                    <div>
                      <strong>{plant.nickname}</strong>
                      <small>{catalogItem?.subtitle || profile.family}</small>
                    </div>
                    <span className="plant-day-chip">{timeline.dayLabel}</span>
                  </div>
                  <div className="plant-progress-block">
                    <div className="plant-progress-block__head">
                      <span>{timeline.phase}</span>
                      <small>{Math.round(timeline.progress)}%</small>
                    </div>
                    <div className="plant-progress-track" aria-hidden="true">
                      <span style={{ width: `${timeline.progress}%` }} />
                    </div>
                  </div>
                  <div className="plant-card-meta-grid">
                    <span>
                      <small>Sådd</small>
                      <b>{timeline.sowedLabel}</b>
                    </span>
                    <span>
                      <small>Høsting</small>
                      <b>{timeline.harvestLabel}</b>
                    </span>
                  </div>
                  <p className="plant-card-next">{timeline.nextAction}</p>
                  {plantLocation(plant) === "greenhouse" ? (
                    <div className="plant-mini-metrics">
                      <span>{rangeText(profile.ranges.airTemperature, "°C", 0)}</span>
                      <span>{rangeText(profile.ranges.airHumidity, "%", 0)}</span>
                      <span>{luxRangeText(profile.ranges.lux)}</span>
                      <span>{plant.hasSevenInOne ? "7-i-1" : "Klima"}</span>
                    </div>
                  ) : (
                    <div className="plant-mini-metrics plant-mini-metrics--nursery">
                      <span>Utenfor drivhus</span>
                      <span>{catalogItem?.seed_guide?.sow ?? formatSowedAt(plant.sowedAt)}</span>
                    </div>
                  )}
                </button>
              );
          }) : (
            <article className="soft-card empty-state-card">
              <strong>Start med blankt drivhus</strong>
              <p>Denne brukeren har ingen planter enda. Legg til første plante når du er klar.</p>
              <button type="button" onClick={() => setAddOpen(true)}>Legg til plante</button>
            </article>
          )}
        </div>
      </section>

      <section className="settings-section">
        <p className="section-kicker">Historikk</p>
        <Link className="soft-card settings-card premium-section-card settings-row-link" to="/historikk">
          <div className="settings-row">
            <div className="icon-badge icon-badge--mint">☘</div>
            <div className="settings-row__content">
              <strong>Tidligere planteprosjekter</strong>
              <span>{plantHistoryCount ? `${plantHistoryCount} lagret i historikk` : "Ingen avsluttede prosjekter enda"}</span>
            </div>
            <span className="chevron">›</span>
          </div>
        </Link>
      </section>

      {selectedPlant && selectedProfile ? (
        <div className="greenhouse-sheet" role="dialog" aria-modal="true" aria-labelledby="plant-detail-title">
          <button className="greenhouse-sheet__backdrop" type="button" aria-label="Lukk plante" onClick={() => setSelectedPlantId(null)} />
          <section className="greenhouse-sheet__panel soft-card">
            <div className="greenhouse-sheet__header">
              <div className="plant-detail-title">
                <PlantAvatar tone={selectedProfile.tone} plantId={selectedProfile.id} name={selectedPlant.nickname || selectedProfile.name} family={selectedProfile.family} />
                <div>
                  <p className="section-kicker">{selectedProfile.family}</p>
                  <h2 id="plant-detail-title">{selectedPlant.nickname}</h2>
                  <span>
                    {formatSowedAt(selectedPlant.sowedAt)} · {plantLocation(selectedPlant) === "greenhouse" ? formatMovedAt(selectedPlant.movedToGreenhouseAt) : "Utenfor drivhus"}
                  </span>
                </div>
              </div>
              <button className="soil-modal__close" type="button" aria-label="Lukk" onClick={() => setSelectedPlantId(null)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6L18 18M18 6L6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </div>

            {plantLocation(selectedPlant) === "greenhouse" ? (
              <div className="plant-condition-list">
                {plantStatus(selectedPlant, selectedProfile, sample).checks.map((check) => (
                  <article className="plant-condition-row" key={check.key}>
                    <div>
                      <span>{check.label}</span>
                      <strong>
                        {metricText(
                          check.value,
                          check.key === "airHumidity" || check.key === "soilHumidity"
                            ? "%"
                            : check.key === "ph"
                              ? ""
                              : check.key === "lux"
                                ? " lx"
                                : "°C",
                          check.key === "ph" ? 1 : 0,
                        )}
                      </strong>
                    </div>
                    <span className={`condition-badge condition-badge--${check.result.level}`}>{check.result.label}</span>
                  </article>
                ))}
              </div>
            ) : null}

            <article className="plant-info-card">
              <p className="section-kicker">Planteinfo</p>
              <strong>{selectedCatalogDetail?.display_name ?? selectedProfile.name}</strong>
              <span>{selectedCatalogDetail?.notes || selectedProfile.notes || "Denne planten vurderes mot egne optimale soner for temperatur, fuktighet, lys og jord."}</span>
              {(selectedCatalogDetail?.watering || selectedProfile.watering) ? (
                <small>{selectedCatalogDetail?.watering || selectedProfile.watering}</small>
              ) : null}
            </article>

            {selectedCareGuide ? (
              <article className="plant-info-card plant-care-card">
                <p className="section-kicker">Jord og vanning</p>
                <div className="seed-guide-list plant-care-list">
                  <span><strong>Surhet</strong>{selectedCareGuide.soilLabel}</span>
                  <span><strong>Jord</strong>{selectedCareGuide.soilText}</span>
                  <span><strong>Ompotting</strong>{selectedCareGuide.transplantText}</span>
                  <span><strong>Potte/bed</strong>{selectedCareGuide.potSizeText}</span>
                  <span><strong>Vanning</strong>{selectedCareGuide.wateringMethod}</span>
                  <span><strong>Bladverk</strong>{selectedCareGuide.foliageWatering}</span>
                </div>
              </article>
            ) : null}

            {selectedCatalogDetail?.seed_guide ? (
              <article className="plant-info-card plant-seed-card">
                <p className="section-kicker">Såguide</p>
                <div className="seed-guide-list">
                  <span><strong>Så</strong>{selectedCatalogDetail.seed_guide.sow}</span>
                  <span><strong>Start</strong>{selectedCatalogDetail.seed_guide.start}</span>
                  <span><strong>Ompotting</strong>{selectedCatalogDetail.seed_guide.repot}</span>
                  <span><strong>Videre</strong>{selectedCatalogDetail.seed_guide.plant_out}</span>
                  <span><strong>Sesong</strong>{selectedCatalogDetail.seed_guide.harvest}</span>
                </div>
              </article>
            ) : null}

            {plantLocation(selectedPlant) === "greenhouse" ? (
            <article className="plant-zone-card">
              <div className="plant-zone-card__header">
                <div>
                  <p className="section-kicker">Sonesjekk</p>
                  <h3>{activeTrendMetric.label}</h3>
                </div>
                {activeTrendRange ? (
                  <span className="zone-range-pill">
                    Optimal {activeTrendRange.optimal[0]}-{activeTrendRange.optimal[1]} {activeTrendMetric.unit}
                  </span>
                ) : null}
              </div>

              <div className="zone-metric-tabs">
                {detailTrendMetrics.map((metric) => (
                  <button
                    className={metric.key === detailTrendMetric ? "active" : ""}
                    type="button"
                    key={metric.key}
                    onClick={() => setDetailTrendMetric(metric.key)}
                  >
                    {metric.label}
                  </button>
                ))}
              </div>

              <div className="plant-zone-chart">
                {activeTrendChart?.line ? (
                  <>
                    <div className="plant-zone-chart__y-axis" aria-hidden="true">
                      <span>{metricText(activeTrendChart.maxValue, activeTrendMetric.unit ? ` ${activeTrendMetric.unit}` : "", activeTrendMetric.key === "ph" ? 1 : 0)}</span>
                      <span>{metricText(activeTrendRange?.optimal[1], activeTrendMetric.unit ? ` ${activeTrendMetric.unit}` : "", activeTrendMetric.key === "ph" ? 1 : 0)}</span>
                      <span>{metricText(activeTrendRange?.optimal[0], activeTrendMetric.unit ? ` ${activeTrendMetric.unit}` : "", activeTrendMetric.key === "ph" ? 1 : 0)}</span>
                      <span>{metricText(activeTrendChart.minValue, activeTrendMetric.unit ? ` ${activeTrendMetric.unit}` : "", activeTrendMetric.key === "ph" ? 1 : 0)}</span>
                    </div>
                    <svg viewBox="0 0 800 260" preserveAspectRatio="none" aria-label={`${activeTrendMetric.label} trend`}>
                      {activeTrendChart.cautionBand ? (
                        <rect className="plant-zone-chart__caution" x="0" y={activeTrendChart.cautionBand.y} width="800" height={activeTrendChart.cautionBand.height} />
                      ) : null}
                      {activeTrendChart.optimalBand ? (
                        <rect className="plant-zone-chart__optimal" x="0" y={activeTrendChart.optimalBand.y} width="800" height={activeTrendChart.optimalBand.height} />
                      ) : null}
                      <path className="plant-zone-chart__grid" d="M0 64 H800 M0 130 H800 M0 196 H800" />
                      <path className="plant-zone-chart__line" d={activeTrendChart.line} />
                    </svg>
                    <div className="plant-zone-chart__x-axis" aria-hidden="true">
                      <span>{activeTrendChart.startTime}</span>
                      <span>{activeTrendChart.endTime}</span>
                    </div>
                    {trendUsesLatestOnly ? (
                      <div className="plant-zone-chart__notice">Viser siste måling til huben har bygget historikk.</div>
                    ) : null}
                  </>
                ) : (
                  <div className="plant-zone-empty">
                    <strong>{detailTrendLoading ? "Henter historikk" : "Ingen historikk ennå"}</strong>
                    <span>Grafen vises når huben har lagret målinger for valgt verdi.</span>
                  </div>
                )}
              </div>
            </article>
            ) : null}

            {plantLocation(selectedPlant) === "greenhouse" ? (
            <div className="plant-detail-actions">
              <button className="toggle-row" type="button" onClick={() => toggleSevenInOne(selectedPlant.instanceId)}>
                <span>
                  <strong>7-i-1 jord sensor</strong>
                  <small>{selectedPlant.hasSevenInOne ? "Jordverdier vises for denne planten" : "Bruk kun felles drivhusklima"}</small>
                </span>
                <span className={`ios-switch${selectedPlant.hasSevenInOne ? " is-on" : ""}`} aria-hidden="true" />
              </button>
            </div>
            ) : null}

            {plantLocation(selectedPlant) === "greenhouse" && selectedPlant.hasSevenInOne ? (
              <div className="soil-value-grid greenhouse-soil-grid">
                {soilMetrics.map((metric) => (
                  <article className="soil-value-card" key={metric.label}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </article>
                ))}
              </div>
            ) : null}

            {plantLocation(selectedPlant) === "greenhouse" ? (
            <button className="toggle-row toggle-row--disabled" type="button" disabled>
              <span>
                <strong>Automatisk vanning</strong>
                <small>Ikke integrert enda. Senere kan planten vanne etter jordfuktighet med sperre mot overvanning.</small>
              </span>
              <span className="ios-switch" aria-hidden="true" />
            </button>
            ) : null}

            {plantLocation(selectedPlant) !== "greenhouse" ? (
              <article className="plant-info-card plant-nursery-card">
                <p className="section-kicker">Forkultivering</p>
                <strong>Ikke koblet til hub enda</strong>
                <span>Sensorverdier fra drivhuset vises først når planten flyttes inn. Foreløpig følger vi sådato, planteinfo og såguide.</span>
                <button className="primary-action" type="button" onClick={() => movePlantToGreenhouse(selectedPlant.instanceId)}>
                  Flytt til drivhus
                </button>
              </article>
            ) : null}

            <button className="finish-plant-button" type="button" onClick={() => setFinishPlantId(selectedPlant.instanceId)}>
              Avslutt planteprosjekt
            </button>
          </section>
        </div>
      ) : null}

      {finishPlantId ? (
        <div className="greenhouse-sheet" role="dialog" aria-modal="true" aria-labelledby="finish-plant-title">
          <button className="greenhouse-sheet__backdrop" type="button" aria-label="Lukk" onClick={() => setFinishPlantId(null)} />
          <section className="greenhouse-sheet__panel soft-card greenhouse-sheet__panel--compact">
            <div className="greenhouse-sheet__header">
              <div>
                <p className="section-kicker">Historikk</p>
                <h2 id="finish-plant-title">Avslutt prosjekt?</h2>
                <span>Planten fjernes fra Mine planter og lagres i historikk.</span>
              </div>
              <button className="soil-modal__close" type="button" aria-label="Lukk" onClick={() => setFinishPlantId(null)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6L18 18M18 6L6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </div>

            <button className="archive-choice" type="button" onClick={() => archivePlant()}>
              <strong>Sesongen er over</strong>
              <span>Flytt til historikk som fullført sesong.</span>
            </button>
            <button className="archive-choice" type="button" onClick={() => archivePlant()}>
              <strong>Dette gikk ikke helt veien</strong>
              <span>Lagre forsøket og prøv noe nytt.</span>
            </button>
          </section>
        </div>
      ) : null}

      {addOpen ? (
        <div className="greenhouse-sheet" role="dialog" aria-modal="true" aria-labelledby="add-plant-title">
          <button className="greenhouse-sheet__backdrop" type="button" aria-label="Lukk" onClick={() => setAddOpen(false)} />
          <section className="greenhouse-sheet__panel soft-card greenhouse-sheet__panel--compact">
            <div className="greenhouse-sheet__header">
              <div>
                <p className="section-kicker">Ny plante</p>
                <h2 id="add-plant-title">Legg til i drivhuset</h2>
              </div>
              <button className="soil-modal__close" type="button" aria-label="Lukk" onClick={() => setAddOpen(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6L18 18M18 6L6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </div>

            <label className="field">
              <span>Søk etter plante</span>
              <input
                value={newPlantQuery}
                onChange={(event) => {
                  setNewPlantQuery(event.target.value);
                  setSelectedBaseId(null);
                  setSelectedVariantId(null);
                  setSelectedCultivarId(null);
                }}
                placeholder="Tomat, paprika, chili, agurk..."
              />
            </label>

            {!selectedBaseItem ? (
              <div className="plant-search-results">
                {catalogLoading ? (
                  <div className="plant-search-empty">
                    <strong>Henter plantekartotek</strong>
                    <span>Laster baseplanter, varianter og sorter.</span>
                  </div>
                ) : null}
                {filteredBaseItems.map((item) => (
                  <button
                    className="plant-search-result"
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setSelectedBaseId(item.profile_id);
                      setSelectedVariantId(null);
                      setSelectedCultivarId(null);
                    }}
                  >
                    <PlantAvatar tone={item.tone} plantId={item.profile_id} name={item.display_name} family={item.family} />
                    <span>
                      <strong>{item.display_name}</strong>
                      <small>Base · {item.subtitle}</small>
                    </span>
                  </button>
                ))}
                {!catalogLoading && !filteredBaseItems.length ? (
                  <div className="plant-search-empty">
                    <strong>Ingen treff enda</strong>
                    <span>Vi kan legge denne planten inn i profil-databasen senere.</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="plant-step-panel">
                <button
                  className="text-action plant-step-back"
                  type="button"
                  onClick={() => {
                    setSelectedBaseId(null);
                    setSelectedVariantId(null);
                    setSelectedCultivarId(null);
                  }}
                >
                  Bytt plante
                </button>
                <article className="plant-search-preview">
                  <p className="section-kicker">Plante</p>
                  <strong>{selectedBaseItem.display_name}</strong>
                  <span>{selectedBaseItem.notes || selectedBaseItem.subtitle}</span>
                </article>

                {variantOptions.length ? (
                  <div className="plant-choice-group">
                    <p className="section-kicker">Velg type</p>
                    <div className="plant-search-results plant-search-results--compact">
                      {variantOptions.map((item) => (
                        <button
                          className={`plant-search-result${item.variant_id === selectedVariantId ? " is-selected" : ""}`}
                          type="button"
                          key={item.id}
                          onClick={() => {
                            setSelectedVariantId(item.variant_id);
                            setSelectedCultivarId(null);
                          }}
                        >
                          <span>
                            <strong>{item.display_name}</strong>
                            <small>{item.subtitle}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {cultivarOptions.length ? (
                  <div className="plant-choice-group">
                    <p className="section-kicker">Velg sort</p>
                    <div className="plant-search-results plant-search-results--compact">
                      {cultivarOptions.map((item) => (
                        <button
                          className={`plant-search-result${item.cultivar_id === selectedCultivarId ? " is-selected" : ""}`}
                          type="button"
                          key={item.id}
                          onClick={() => setSelectedCultivarId(item.cultivar_id)}
                        >
                          <span>
                            <strong>{item.display_name}</strong>
                            <small>{item.notes || item.subtitle}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {selectedCatalogItem ? (
              <article className="plant-search-preview">
                <p className="section-kicker">Valgt</p>
                <strong>{selectedCatalogItem.display_name}</strong>
                <span>{selectedCatalogItem.notes || selectedCatalogItem.watering || selectedCatalogItem.subtitle}</span>
                {selectedCatalogItem.seed_guide ? <small>{selectedCatalogItem.seed_guide.sow} {selectedCatalogItem.seed_guide.start}</small> : null}
              </article>
            ) : null}

            <label className="field">
              <span>Sådd / plantet</span>
              <input type="date" value={newSowedAt} onChange={(event) => setNewSowedAt(event.target.value)} />
            </label>

            <div className="plant-choice-group">
              <p className="section-kicker">Plassering nå</p>
              <div className="placement-toggle">
                <button
                  className={newLocation === "outside" ? "is-selected" : ""}
                  type="button"
                  onClick={() => {
                    setNewLocation("outside");
                    setNewHasSevenInOne(false);
                  }}
                >
                  Utenfor drivhus
                </button>
                <button
                  className={newLocation === "greenhouse" ? "is-selected" : ""}
                  type="button"
                  onClick={() => setNewLocation("greenhouse")}
                >
                  I drivhus
                </button>
              </div>
              <span className="placement-helper">
                {newLocation === "greenhouse"
                  ? "Kortet kobles til hubens klima og sensorvurdering."
                  : "Kortet viser sådata og planteguide til den flyttes inn."}
              </span>
            </div>

            {newLocation === "greenhouse" ? (
            <button className="toggle-row" type="button" onClick={() => setNewHasSevenInOne((value) => !value)}>
              <span>
                <strong>Har 7-i-1 sensor</strong>
                <small>Vis jordverdier direkte på planten.</small>
              </span>
              <span className={`ios-switch${newHasSevenInOne ? " is-on" : ""}`} aria-hidden="true" />
            </button>
            ) : null}

            <button className="primary-action" type="button" onClick={addPlant} disabled={!selectedCatalogItem}>Legg til plante</button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
