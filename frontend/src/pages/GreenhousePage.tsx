import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchPlants,
  fetchPlantHistory,
  fetchPlantCatalog,
  fetchLatestSample,
  fetchSoilSensors,
  createPlant,
  updatePlant,
  archivePlant as archivePlantApi,
  type AuthSession,
  type GrowlyPlant,
  type LatestSample,
  type PlantCatalogItem,
  type SoilSensor,
} from "../lib/api";
import { bundledPlantCatalog } from "../data/plantCatalog";
import { PlantAvatar } from "../components/PlantAvatar";
import { plantCareGuide } from "../lib/plantCare";
import { localizePlantCatalogItems } from "../lib/plantCatalogLocalization";
import { soilSensorDisplayName } from "../lib/soilSensors";
import {
  listPlantCalendarEntries,
  removePlantCalendarEntriesForPlant,
  saveGeneratedPlantPlan,
  type PlantCalendarEntry,
} from "../lib/plantCalendar";
import { useI18n, type AppLanguage } from "../lib/i18n";

type GreenhousePageProps = {
  session: AuthSession | null;
  selectedHubId?: string;
};

type ClimateKey = "airTemperature" | "airHumidity" | "soilHumidity" | "soilTemperature" | "ph" | "lux";

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
type PlantPlanPrompt = {
  plant: GreenhousePlant;
  catalogItem: PlantCatalogItem | null;
  generatedCount: number;
};

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

const unknownPlantProfile: PlantProfile = {
  id: "unknown",
  name: "Egen plante",
  family: "Plante",
  icon: "P",
  tone: "leafy",
  ranges: {
    airTemperature: { optimal: [16, 24], caution: [8, 30] },
    airHumidity: { optimal: [45, 75], caution: [30, 90] },
    soilHumidity: { optimal: [45, 75], caution: [30, 88] },
    soilTemperature: { optimal: [14, 22], caution: [6, 28] },
    ph: { optimal: [5.8, 7.0], caution: [5.2, 7.8] },
    lux: { optimal: [3000, 20000], caution: [1000, 40000] },
  },
};

const starterPlantProfileIds = ["tomato", "cucumber", "basil", "pepper", "chili", "lettuce", "strawberry"];

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateLocale(language: AppLanguage): string {
  return language === "en" ? "en-US" : "nb-NO";
}

function formatSowedAt(value: string | null | undefined, language: AppLanguage): string {
  if (!value) {
    return language === "en" ? "Sowing date not set" : "Sådato ikke satt";
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return language === "en" ? "Sowing date not set" : "Sådato ikke satt";
  }

  return language === "en"
    ? `Sown ${date.toLocaleDateString(dateLocale(language), { day: "2-digit", month: "short", year: "numeric" })}`
    : `Sådd ${date.toLocaleDateString(dateLocale(language), { day: "2-digit", month: "short", year: "numeric" })}`;
}

function formatMovedAt(value: string | null | undefined, language: AppLanguage): string {
  if (!value) {
    return language === "en" ? "In greenhouse" : "Står i drivhus";
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return language === "en" ? "In greenhouse" : "Står i drivhus";
  }

  return language === "en"
    ? `Moved in ${date.toLocaleDateString(dateLocale(language), { day: "2-digit", month: "short" })}`
    : `Flyttet inn ${date.toLocaleDateString(dateLocale(language), { day: "2-digit", month: "short" })}`;
}

function formatPlanDate(value: string, language: AppLanguage): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return language === "en" ? "Date not set" : "Dato ikke satt";
  }
  const today = new Date();
  const tomorrow = new Date();
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === today.toDateString()) {
    return language === "en" ? "Today" : "I dag";
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return language === "en" ? "Tomorrow" : "I morgen";
  }
  return date.toLocaleDateString(dateLocale(language), { day: "2-digit", month: "short" });
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

function plantAgeDay(value: string | null | undefined): number | null {
  const daysSince = daysSinceDate(value);
  return daysSince === null ? null : daysSince + 1;
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

function moveReadyEstimateDays(profileId: string): number {
  if (profileId === "pepper" || profileId === "chili") return 56;
  if (profileId === "tomato") return 49;
  if (profileId === "cucumber" || profileId === "squash" || profileId === "melon") return 28;
  if (profileId === "basil") return 35;
  if (profileId === "lettuce") return 21;
  if (profileId === "strawberry") return 42;
  return 35;
}

function plantTimelineSummary(plant: GreenhousePlant, profile: PlantProfile, status: ReturnType<typeof plantStatus>, language: AppLanguage) {
  const ageDay = plantAgeDay(plant.sowedAt);
  const location = plantLocation(plant);
  const estimate = location === "greenhouse" ? maturityEstimateDays(profile.id) : moveReadyEstimateDays(profile.id);
  const progress = ageDay === null ? (location === "greenhouse" ? 34 : 12) : Math.min(100, Math.max(4, Math.round((ageDay / estimate) * 100)));
  const remainingDays = ageDay === null ? null : Math.max(0, estimate - ageDay);
  const phase =
    ageDay === null
      ? (language === "en" ? "Planned" : "Planlagt")
      : ageDay < 14
        ? (language === "en" ? "Germination" : "Spiring")
        : ageDay < 35
          ? (language === "en" ? "Establishing" : "Etablering")
          : progress < 82
            ? (language === "en" ? "Growth" : "Vekst")
            : (language === "en" ? "Ripening" : "Modning");

  const sowedLabel = ageDay === null ? (language === "en" ? "Sowing date missing" : "Sådato mangler") : (language === "en" ? `Day ${ageDay} after sowing` : `Dag ${ageDay} etter såing`);
  const dayLabel = ageDay === null ? (language === "en" ? "Set date" : "Sett dato") : (language === "en" ? `Day ${ageDay}` : `Dag ${ageDay}`);
  const harvestLabel = remainingDays === null
    ? (location === "greenhouse"
      ? (language === "en" ? "Unknown harvest" : "Ukjent innhøsting")
      : (language === "en" ? "Unknown move date" : "Ukjent flyttedato"))
    : remainingDays === 0
      ? (location === "greenhouse"
        ? (language === "en" ? "Ready soon" : "Klar snart")
        : (language === "en" ? "Ready to move" : "Klar for flytting"))
      : (language === "en" ? `about ${remainingDays}d left` : `ca. ${remainingDays} d igjen`);
  const nextAction =
    location === "outside"
      ? (remainingDays === 0
        ? (language === "en" ? "Next: ready to move when weather allows" : "Neste: klar for flytting når været passer")
        : (language === "en" ? "Next: follow roots and light before moving" : "Neste: følg rot og lys før flytting"))
      : status.level === "good"
        ? (language === "en" ? "Next: keep a steady rhythm" : "Neste: hold jevn rytme")
        : status.note;

  return { dayLabel, harvestLabel, nextAction, phase, progress, sowedLabel };
}

function plantLocation(plant: GreenhousePlant): "greenhouse" | "outside" {
  return plant.location === "outside" ? "outside" : "greenhouse";
}

const fallbackProfileTextEn: Record<string, { name: string; family: string }> = {
  tomato: { name: "Tomato", family: "Warm-loving" },
  cucumber: { name: "Cucumber", family: "Warm-loving" },
  basil: { name: "Basil", family: "Herbs" },
  pepper: { name: "Sweet pepper", family: "Warm-loving" },
  lettuce: { name: "Lettuce", family: "Cool start" },
  strawberry: { name: "Strawberry", family: "Berries" },
  unknown: { name: "Custom plant", family: "Plant" },
};

function profileById(profileId: string, language: AppLanguage): PlantProfile {
  const profile = fallbackPlantProfiles.find((item) => item.id === profileId) ?? unknownPlantProfile;
  if (language !== "en") {
    return profile;
  }
  const translated = fallbackProfileTextEn[profile.id];
  return translated ? { ...profile, ...translated } : profile;
}

function plantSaveErrorMessage(error: unknown, language: AppLanguage): string {
  const code = error instanceof Error ? error.message : "";
  if (code === "hub_not_assigned" || code === "hub_not_found") {
    return language === "en"
      ? "Could not find a growing space for your account. Log out and in again, then try adding the plant once more."
      : "Fant ikke et dyrkeområde for kontoen din. Logg ut og inn igjen, og prøv å legge til planten på nytt.";
  }
  if (code === "login_required") {
    return language === "en"
      ? "You need to log in again before the plant can be saved."
      : "Du må logge inn på nytt før planten kan lagres.";
  }
  return language === "en"
    ? "Could not save the plant right now. Try again in a moment."
    : "Kunne ikke lagre planten akkurat nå. Prøv igjen om litt.";
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

function profileForPlant(plant: GreenhousePlant, catalogItems: PlantCatalogItem[], language: AppLanguage): PlantProfile {
  const catalogMatch = catalogItemForPlant(plant, catalogItems);

  if (catalogMatch) {
    return catalogItemToProfile(catalogMatch);
  }

  return profileById(plant.profileId, language);
}

function plantStatus(plant: GreenhousePlant, profile: PlantProfile, language: AppLanguage) {
  if (plantLocation(plant) === "outside") {
    return {
      title: language === "en" ? "Started indoors" : "Forkultiveres",
      note: language === "en" ? "Follow light, warmth and root development before moving." : "Følg lys, varme og rotutvikling før flytting.",
      level: "missing" as const,
      checks: [],
    };
  }

  return {
    title: language === "en" ? "In greenhouse" : "I drivhus",
    note: language === "en" ? `${profile.name} is tracked with plant info and growing rhythm.` : `${profile.name} følges med planteinfo og dyrkerytme.`,
    level: "good" as const,
    checks: [],
  };
}

function hasRenderablePlant(plant: GreenhousePlant): boolean {
  const instanceId = plant.instanceId || plant.plant_id || "";
  const name = plant.nickname || plant.display_name || "";
  return Boolean(instanceId.trim() && name.trim());
}

function metricText(value: number | null | undefined, suffix: string, digits = 0): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "–";
  }
  return `${value.toFixed(digits)}${suffix}`;
}

function normalizePlant(plant: GreenhousePlant): GreenhousePlant {
  const nickname = String(plant.nickname || plant.display_name || "").toLowerCase();
  const profileId = plant.profileId || plant.profile_id || "unknown";
  const normalizedProfileId = nickname.includes("chili") && profileId === "tomato" ? "chili" : profileId;
  return {
    ...plant,
    instanceId: plant.instanceId || plant.plant_id || `${normalizedProfileId}-${Date.now()}`,
    profileId: normalizedProfileId,
    catalogItemId: plant.catalogItemId || plant.catalog_item_id || normalizedProfileId,
    nickname: plant.nickname || plant.display_name || (normalizedProfileId === "unknown" ? "Egen plante" : normalizedProfileId),
    location: plant.location ?? plant.location_label ?? "greenhouse",
    sowedAt: plant.sowedAt ?? plant.sowed_at ?? null,
    movedToGreenhouseAt: plant.movedToGreenhouseAt ?? plant.moved_to_greenhouse_at ?? null,
    hasSevenInOne: Boolean(plant.hasSevenInOne ?? plant.has_seven_in_one),
    wateringEnabled: Boolean(plant.wateringEnabled ?? plant.watering_enabled),
  };
}

export function GreenhousePage({ session, selectedHubId = "" }: GreenhousePageProps) {
  const { language } = useI18n();
  const [catalogItems, setCatalogItems] = useState<PlantCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
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
  const [addPlantFeedback, setAddPlantFeedback] = useState("");
  const [addingPlant, setAddingPlant] = useState(false);
  const [plantPlanPrompt, setPlantPlanPrompt] = useState<PlantPlanPrompt | null>(null);
  const [plantPlanNote, setPlantPlanNote] = useState("");
  const [plantCalendarEntries, setPlantCalendarEntries] = useState<PlantCalendarEntry[]>([]);
  const [soilSensors, setSoilSensors] = useState<SoilSensor[]>([]);
  const [selectedSoilSample, setSelectedSoilSample] = useState<LatestSample | null>(null);

  useEffect(() => {
    setCatalogLoading(true);
    fetchPlantCatalog("", language).then((items) => {
      setCatalogItems(items);
      setCatalogLoading(false);
    });
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    setPlantsLoading(true);
    setSelectedPlantId(null);
    fetchPlants(selectedHubId).then((items) => {
      if (cancelled) {
        return;
      }
      setPlants(items.filter(hasRenderablePlant).map(normalizePlant));
      setPlantsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.username, selectedHubId]);

  useEffect(() => {
    function refreshEntries() {
      setPlantCalendarEntries(listPlantCalendarEntries(selectedHubId));
    }
    refreshEntries();
    window.addEventListener("focus", refreshEntries);
    return () => {
      window.removeEventListener("focus", refreshEntries);
    };
  }, [selectedHubId]);

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
    let cancelled = false;
    fetchSoilSensors(selectedHubId).then((result) => {
      if (!cancelled) {
        setSoilSensors(result?.sensors ?? []);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session?.username, selectedHubId]);

  const selectedPlant = plants.find((plant) => plant.instanceId === selectedPlantId) ?? null;
  const selectedPlantKey = selectedPlant?.instanceId || selectedPlant?.plant_id || "";
  const selectedSoilSensor = selectedPlantKey
    ? soilSensors.find((sensor) => sensor.plant_id === selectedPlantKey) ?? null
    : null;
  const selectedSoilSensorIndex = selectedSoilSensor
    ? soilSensors.findIndex((sensor) => sensor.sensor_id === selectedSoilSensor.sensor_id)
    : -1;
  const selectedSoilSensorName = selectedSoilSensor
    ? soilSensorDisplayName(selectedSoilSensor, Math.max(0, selectedSoilSensorIndex))
    : "";
  const fallbackCatalogItems = useMemo(() => localizePlantCatalogItems(bundledPlantCatalog, language), [language]);
  const searchableCatalogItems = catalogItems.length ? catalogItems : fallbackCatalogItems;
  const selectedCatalogDetail = selectedPlant ? catalogItemForPlant(selectedPlant, searchableCatalogItems) : null;
  const selectedProfile = selectedPlant ? profileForPlant(selectedPlant, searchableCatalogItems, language) : null;
  const selectedCareGuide = selectedCatalogDetail ? plantCareGuide(selectedCatalogDetail, language) : null;
  const selectedPlantPlanEntries = selectedPlant
    ? plantCalendarEntries
        .filter((entry) => entry.plantId === selectedPlant.instanceId)
        .sort((first, second) => first.date.localeCompare(second.date))
    : [];
  const todayPlanDate = todayDateInputValue();
  const selectedUpcomingPlanEntries = selectedPlantPlanEntries.filter((entry) => entry.date >= todayPlanDate);
  const selectedVisiblePlanEntries = (selectedUpcomingPlanEntries.length ? selectedUpcomingPlanEntries : selectedPlantPlanEntries).slice(0, 5);

  useEffect(() => {
    let cancelled = false;
    if (!selectedSoilSensor) {
      setSelectedSoilSample(null);
      return () => {
        cancelled = true;
      };
    }

    fetchLatestSample(selectedHubId, selectedSoilSensor.sensor_id).then((sample) => {
      if (!cancelled) {
        setSelectedSoilSample(sample);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedHubId, selectedSoilSensor?.sensor_id]);
  const plantSummaries = plants.map((plant) => {
    const profile = profileForPlant(plant, searchableCatalogItems, language);
    const catalogItem = catalogItemForPlant(plant, searchableCatalogItems);
    return { plant, profile, catalogItem, status: plantStatus(plant, profile, language) };
  });
  const baseCatalogItems = searchableCatalogItems.filter((item) => item.kind === "base");
  const starterBaseItems = starterPlantProfileIds
    .map((profileId) => baseCatalogItems.find((item) => item.profile_id === profileId))
    .filter((item): item is PlantCatalogItem => Boolean(item));
  const trimmedNewPlantQuery = newPlantQuery.trim().toLowerCase();
  const filteredBaseItems = (trimmedNewPlantQuery
    ? baseCatalogItems.filter((item) =>
        `${item.display_name} ${item.name} ${item.subtitle} ${item.family} ${item.category} ${item.latin_name}`.toLowerCase().includes(trimmedNewPlantQuery),
      )
    : starterBaseItems.length
      ? starterBaseItems
      : baseCatalogItems
  ).slice(0, trimmedNewPlantQuery ? 24 : 7);
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

  function openAddPlantSheet() {
    setAddPlantFeedback("");
    setAddOpen(true);
  }

  function selectBasePlant(item: PlantCatalogItem) {
    setSelectedBaseId(item.profile_id);
    setSelectedVariantId(null);
    setSelectedCultivarId(null);
    setNewPlantQuery(item.display_name);
    setAddPlantFeedback("");
  }

  function startWithPlant(item: PlantCatalogItem) {
    selectBasePlant(item);
    setAddOpen(true);
  }

  async function addPlant() {
    if (!selectedCatalogItem || addingPlant) {
      return;
    }

    setAddingPlant(true);
    setAddPlantFeedback("");
    try {
      const nextPlant = await createPlant({
        profileId: selectedCatalogItem.profile_id,
        variantId: selectedCatalogItem.variant_id,
        cultivarId: selectedCatalogItem.cultivar_id,
        catalogItemId: selectedCatalogItem.id,
        nickname: selectedCatalogItem.display_name,
        sowedAt: newSowedAt,
        location: newLocation,
        movedToGreenhouseAt: newLocation === "greenhouse" ? todayDateInputValue() : null,
        hasSevenInOne: false,
        wateringEnabled: false,
      }, selectedHubId);

      if (!nextPlant) {
        setAddPlantFeedback("Kunne ikke lagre planten akkurat nå. Sjekk at plantelagring er aktivert, så prøver vi igjen.");
        return;
      }

      const normalizedPlant = normalizePlant(nextPlant);
      const promptCatalogItem = selectedCatalogItem;
      setPlants((current) => [normalizedPlant, ...current]);
      setSelectedPlantId(null);
      setAddOpen(false);
      setPlantPlanPrompt({ plant: normalizedPlant, catalogItem: promptCatalogItem, generatedCount: 0 });
      setPlantPlanNote("");
      setNewPlantQuery("");
      setSelectedBaseId(null);
      setSelectedVariantId(null);
      setSelectedCultivarId(null);
      setNewSowedAt(todayDateInputValue());
      setNewLocation("outside");
      setAddPlantFeedback("");
    } catch (error) {
      setAddPlantFeedback(plantSaveErrorMessage(error, language));
    } finally {
      setAddingPlant(false);
    }
  }

  function dismissPlantPlanPrompt() {
    setPlantPlanPrompt(null);
    setPlantPlanNote("");
  }

  function generatePlantPlan() {
    if (!plantPlanPrompt) {
      return;
    }
    const entries = saveGeneratedPlantPlan(plantPlanPrompt.plant, plantPlanPrompt.catalogItem, selectedHubId, plantPlanNote);
    setPlantCalendarEntries(listPlantCalendarEntries(selectedHubId));
    setPlantPlanPrompt({ ...plantPlanPrompt, generatedCount: entries.length });
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
    removePlantCalendarEntriesForPlant(selectedHubId, plant.instanceId);
    setPlantCalendarEntries(listPlantCalendarEntries(selectedHubId));

    setPlants((current) => current.filter((item) => item.instanceId !== plant.instanceId));
    setPlantHistoryCount((current) => current + 1);
    setSelectedPlantId(null);
    setFinishPlantId(null);
  }

  return (
    <main className="page-shell app-page greenhouse-page">
      <section className="screen-header">
        <div>
          <h1>Mine planter <span className="leaf-mark">🌿</span></h1>
          <p>Plantene dine, sådatoer og neste steg gjennom sesongen.</p>
        </div>
        <button className="icon-button greenhouse-add-button" type="button" aria-label="Legg til plante" onClick={openAddPlantSheet}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        </button>
      </section>

      <section className="settings-section">
        <div className="section-heading-row">
          <p className="section-kicker">Planter</p>
          <button className="text-action" type="button" onClick={openAddPlantSheet}>Legg til</button>
        </div>
        <div className="plant-card-grid">
          {plantsLoading ? (
            <article className="soft-card empty-state-card">
              <strong>Henter plantene dine</strong>
              <p>Growly sjekker den valgte huben.</p>
            </article>
          ) : plantSummaries.length ? plantSummaries.map(({ plant, profile, catalogItem, status }) => {
              const timeline = plantTimelineSummary(plant, profile, status, language);
              return (
                <button className="greenhouse-plant-card greenhouse-plant-card--compact soft-card" type="button" key={plant.instanceId} onClick={() => setSelectedPlantId(plant.instanceId)}>
                  <div className="greenhouse-plant-card__top">
                    <PlantAvatar tone={profile.tone} plantId={profile.id} name={plant.nickname || profile.name} family={profile.family} />
                    <div>
                      <strong>{plant.nickname}</strong>
                      <small>{catalogItem?.subtitle || profile.family}</small>
                    </div>
                    <span className={`plant-status-pill plant-status-pill--${status.level}`}>{status.title}</span>
                  </div>
                  <p className="plant-card-next">{timeline.nextAction}</p>
                  <div className={`plant-mini-metrics${plantLocation(plant) === "greenhouse" ? "" : " plant-mini-metrics--nursery"}`}>
                    <span>{timeline.dayLabel}</span>
                    <span>{timeline.phase}</span>
                    <span>{timeline.harvestLabel}</span>
                  <span>{plantLocation(plant) === "greenhouse" ? "I drivhus" : "Før flytting"}</span>
                  </div>
                </button>
              );
          }) : (
            <article className="soft-card empty-state-card empty-state-card--rich">
              <strong>Start med blankt drivhus</strong>
              <p>Velg en trygg startplante, så får Growly noe konkret å følge gjennom sesongen.</p>
              <div className="starter-plant-grid">
                {starterBaseItems.slice(0, 3).map((item) => (
                  <button className="starter-plant-button" type="button" key={item.id} onClick={() => startWithPlant(item)}>
                    <PlantAvatar tone={item.tone} plantId={item.profile_id} name={item.display_name} />
                    <span>
                      <strong>{item.display_name}</strong>
                      <small>{item.subtitle || item.family}</small>
                    </span>
                  </button>
                ))}
              </div>
              <button className="empty-state-card__primary" type="button" onClick={openAddPlantSheet}>Søk i kartoteket</button>
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
                    {formatSowedAt(selectedPlant.sowedAt, language)} · {plantLocation(selectedPlant) === "greenhouse" ? formatMovedAt(selectedPlant.movedToGreenhouseAt, language) : (language === "en" ? "Outside greenhouse" : "Utenfor drivhus")}
                  </span>
                </div>
              </div>
              <button className="soil-modal__close" type="button" aria-label="Lukk" onClick={() => setSelectedPlantId(null)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6L18 18M18 6L6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </div>

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

            <article className="plant-info-card plant-calendar-card">
              <div className="plant-calendar-card__head">
                <div>
                  <p className="section-kicker">Planteplan</p>
                  <strong>{selectedPlantPlanEntries.length ? `${selectedPlantPlanEntries.length} punkter i kalenderen` : "Ingen plan laget ennå"}</strong>
                  <span>
                    {selectedPlantPlanEntries.length
                      ? "Planen følger denne planten og ryddes bort når prosjektet avsluttes."
                      : "Lag en smart plan med vanning, rydding og oppfølging for denne planten."}
                  </span>
                </div>
                <Link to="/kalender">Kalender</Link>
              </div>
              {selectedVisiblePlanEntries.length ? (
                <div className="plant-calendar-list">
                  {selectedVisiblePlanEntries.map((entry) => (
                    <span className={`plant-calendar-item plant-calendar-item--${entry.category}`} key={entry.id}>
                      <small>{formatPlanDate(entry.date, language)}</small>
                      <strong>{entry.title}</strong>
                      <em>{entry.note}</em>
                    </span>
                  ))}
                </div>
              ) : (
                <button
                  className="secondary-action plant-calendar-create"
                  type="button"
                  onClick={() => {
                    setPlantPlanPrompt({ plant: selectedPlant, catalogItem: selectedCatalogDetail, generatedCount: 0 });
                    setPlantPlanNote("");
                  }}
                >
                  Lag smart planteplan
                </button>
              )}
            </article>

            {selectedSoilSensor ? (
              <article className="plant-info-card plant-sensor-card">
                <p className="section-kicker">Jordsensor</p>
                <strong className="plant-sensor-card__name">{selectedSoilSensorName}</strong>
                <span className="plant-sensor-card__status">
                  {selectedSoilSample?.recorded_at
                    ? `Følger denne planten · oppdatert ${new Date(selectedSoilSample.recorded_at).toLocaleTimeString(language === "en" ? "en-US" : "nb-NO", { hour: "2-digit", minute: "2-digit" })}`
                    : "Følger denne planten · venter på første måling"}
                </span>
                <div className="plant-sensor-values" aria-label="Jordsensorverdier">
                  <span>
                    <small>Jordfukt</small>
                    <strong>{metricText(selectedSoilSample?.humidity, "%", 0)}</strong>
                  </span>
                  <span>
                    <small>Lufttemp</small>
                    <strong>{metricText(selectedSoilSample?.air_temperature, "°C", 1)}</strong>
                  </span>
                  <span>
                    <small>Luftfukt</small>
                    <strong>{metricText(selectedSoilSample?.air_humidity, "%", 0)}</strong>
                  </span>
                </div>
                {typeof selectedSoilSensor.battery_percent === "number" ? (
                  <small className="plant-sensor-card__battery">Batteri {Math.round(selectedSoilSensor.battery_percent)}%</small>
                ) : null}
              </article>
            ) : null}

            {plantLocation(selectedPlant) !== "greenhouse" ? (
              <article className="plant-info-card plant-nursery-card">
                <p className="section-kicker">Forkultivering</p>
                <strong>Ikke koblet til hub enda</strong>
                <span>Foreløpig følger vi sådato, planteinfo og såguide.</span>
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
          <section className="greenhouse-sheet__panel soft-card greenhouse-sheet__panel--compact add-plant-panel">
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
                  setAddPlantFeedback("");
                }}
                placeholder="Tomat, paprika, chili, agurk..."
              />
            </label>

            {!selectedBaseItem ? (
              <>
                <div className="plant-modal-intro">
                  <strong>{trimmedNewPlantQuery ? "Treff i plantekartoteket" : "Anbefalt start"}</strong>
                  <span>
                    {trimmedNewPlantQuery
                      ? "Velg den profilen som passer planten best."
                      : "Start med en vanlig drivhusplante, eller søk mer presist over."}
                  </span>
                </div>
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
                      onClick={() => selectBasePlant(item)}
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
              </>
            ) : (
              <div className="plant-step-panel">
                <button
                  className="text-action plant-step-back"
                  type="button"
                  onClick={() => {
                    setSelectedBaseId(null);
                    setSelectedVariantId(null);
                    setSelectedCultivarId(null);
                    setAddPlantFeedback("");
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
              <small>Velg faktisk sådato, også hvis den ligger tilbake i tid. Dag 1 regnes fra denne datoen.</small>
            </label>

            <div className="plant-choice-group">
              <p className="section-kicker">Plassering nå</p>
              <div className="placement-toggle">
                <button
                  className={newLocation === "outside" ? "is-selected" : ""}
                  type="button"
                  onClick={() => setNewLocation("outside")}
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
                  ? "Kortet merkes som en plante i drivhuset."
                  : "Kortet viser sådata og planteguide til den flyttes inn."}
              </span>
            </div>

            {addPlantFeedback ? <p className="plant-submit-feedback" role="status">{addPlantFeedback}</p> : null}

            <button className="primary-action add-plant-panel__submit" type="button" onClick={addPlant} disabled={!selectedCatalogItem || addingPlant}>
              {addingPlant ? "Legger til..." : "Legg til plante"}
            </button>
          </section>
        </div>
      ) : null}

      {plantPlanPrompt ? (
        <div className="greenhouse-sheet" role="dialog" aria-modal="true" aria-labelledby="plant-plan-title">
          <button className="greenhouse-sheet__backdrop" type="button" aria-label="Lukk planteplan" onClick={dismissPlantPlanPrompt} />
          <section className="greenhouse-sheet__panel soft-card greenhouse-sheet__panel--compact plant-plan-panel">
            <div className="greenhouse-sheet__header">
              <div>
                <p className="section-kicker">Smart kalender</p>
                <h2 id="plant-plan-title">{plantPlanPrompt.generatedCount ? "Planteplanen er klar" : "Lag plan for planten?"}</h2>
                <span>
                  {plantPlanPrompt.generatedCount
                    ? `${plantPlanPrompt.generatedCount} punkter er lagt i kalenderen for ${plantPlanPrompt.plant.nickname}.`
                    : `Growly kan lage en ryddig oppfølgingsplan for ${plantPlanPrompt.plant.nickname}.`}
                </span>
              </div>
              <button className="soil-modal__close" type="button" aria-label="Lukk" onClick={dismissPlantPlanPrompt}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6L18 18M18 6L6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </div>

            <article className="plant-plan-preview">
              <PlantAvatar
                tone={plantPlanPrompt.catalogItem?.tone ?? profileForPlant(plantPlanPrompt.plant, searchableCatalogItems, language).tone}
                plantId={plantPlanPrompt.plant.profileId}
                name={plantPlanPrompt.plant.nickname}
                family={plantPlanPrompt.catalogItem?.family}
              />
              <div>
                <strong>{plantPlanPrompt.plant.nickname}</strong>
                <span>{plantPlanPrompt.catalogItem?.subtitle || plantPlanPrompt.catalogItem?.family || "Personlig dyrkeplan"}</span>
              </div>
            </article>

            {plantPlanPrompt.generatedCount ? (
              <>
                <div className="plant-plan-success">
                  <strong>Dette ble lagt inn</strong>
                  <span>Vanning, rydding rundt planten, bladkontroll, støtte/næring og en ukessjekk.</span>
                </div>
                <div className="plant-plan-actions">
                  <Link className="primary-action" to="/kalender" onClick={dismissPlantPlanPrompt}>
                    Åpne kalender
                  </Link>
                  <button className="secondary-action" type="button" onClick={dismissPlantPlanPrompt}>
                    Ferdig
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="plant-plan-benefits">
                  <span>Husk vann</span>
                  <span>Rydd rundt planten</span>
                  <span>Sjekk blad og skudd</span>
                  <span>Plantetilpasset oppfølging</span>
                </div>
                <label className="plant-plan-note">
                  <span>Notat til kalenderen, valgfritt</span>
                  <textarea
                    value={plantPlanNote}
                    onChange={(event) => setPlantPlanNote(event.target.value)}
                    placeholder="F.eks. står i stor potte ved venstre dør, må sjekkes etter varme dager."
                    rows={4}
                  />
                </label>
                <div className="plant-plan-actions">
                  <button className="secondary-action" type="button" onClick={dismissPlantPlanPrompt}>
                    Nei, senere
                  </button>
                  <button className="primary-action" type="button" onClick={generatePlantPlan}>
                    Ja, lag smart plan
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}
