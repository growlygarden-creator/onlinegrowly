import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchPlants,
  fetchPlantHistory,
  fetchPlantCatalog,
  createPlant,
  updatePlant,
  archivePlant as archivePlantApi,
  type AuthSession,
  type GrowlyPlant,
  type PlantCatalogItem,
} from "../lib/api";
import { bundledPlantCatalog } from "../data/plantCatalog";
import { PlantAvatar } from "../components/PlantAvatar";
import { plantCareGuide } from "../lib/plantCare";
import {
  listPlantCalendarEntries,
  removePlantCalendarEntriesForPlant,
  saveGeneratedPlantPlan,
  type PlantCalendarEntry,
} from "../lib/plantCalendar";

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

const starterPlantProfileIds = ["tomato", "cucumber", "basil", "pepper", "chili", "lettuce", "strawberry"];

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

function formatPlanDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "Dato ikke satt";
  }
  const today = new Date();
  const tomorrow = new Date();
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === today.toDateString()) {
    return "I dag";
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return "I morgen";
  }
  return date.toLocaleDateString("nb-NO", { day: "2-digit", month: "short" });
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

function plantStatus(plant: GreenhousePlant, profile: PlantProfile) {
  if (plantLocation(plant) === "outside") {
    return {
      title: "Forkultiveres",
      note: "Følg lys, varme og rotutvikling før flytting.",
      level: "missing" as const,
      checks: [],
    };
  }

  return {
    title: "I drivhus",
    note: `${profile.name} følges med planteinfo og dyrkerytme.`,
    level: "good" as const,
    checks: [],
  };
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

export function GreenhousePage({ session, selectedHubId = "" }: GreenhousePageProps) {
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
  const [sensorActionBusy, setSensorActionBusy] = useState(false);

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

  const selectedPlant = plants.find((plant) => plant.instanceId === selectedPlantId) ?? null;
  const hasPairedHub = Boolean(session?.hub?.hub_id || selectedHubId);
  const sevenInOnePlant = plants.find((plant) => plant.hasSevenInOne) ?? null;
  const searchableCatalogItems = catalogItems.length ? catalogItems : bundledPlantCatalog;
  const selectedCatalogDetail = selectedPlant ? catalogItemForPlant(selectedPlant, searchableCatalogItems) : null;
  const selectedProfile = selectedPlant ? profileForPlant(selectedPlant, searchableCatalogItems) : null;
  const selectedCareGuide = selectedCatalogDetail ? plantCareGuide(selectedCatalogDetail) : null;
  const selectedPlantPlanEntries = selectedPlant
    ? plantCalendarEntries
        .filter((entry) => entry.plantId === selectedPlant.instanceId)
        .sort((first, second) => first.date.localeCompare(second.date))
    : [];
  const todayPlanDate = todayDateInputValue();
  const selectedUpcomingPlanEntries = selectedPlantPlanEntries.filter((entry) => entry.date >= todayPlanDate);
  const selectedVisiblePlanEntries = (selectedUpcomingPlanEntries.length ? selectedUpcomingPlanEntries : selectedPlantPlanEntries).slice(0, 5);
  const plantSummaries = plants.map((plant) => {
    const profile = profileForPlant(plant, searchableCatalogItems);
    const catalogItem = catalogItemForPlant(plant, searchableCatalogItems);
    return { plant, profile, catalogItem, status: plantStatus(plant, profile) };
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

  async function setSevenInOneForPlant(plant: GreenhousePlant, nextEnabled: boolean) {
    if (!hasPairedHub || sensorActionBusy) {
      return;
    }

    const currentSensorPlant = sevenInOnePlant;
    if (nextEnabled && currentSensorPlant && currentSensorPlant.instanceId !== plant.instanceId && plants.length > 1) {
      const confirmed = window.confirm(
        `7-i-1-sensoren er koblet til ${currentSensorPlant.nickname}. Flytte den til ${plant.nickname}?`,
      );
      if (!confirmed) {
        return;
      }
    }

    setSensorActionBusy(true);
    try {
      const updated = await updatePlant(plant.instanceId, { hasSevenInOne: nextEnabled }, selectedHubId);
      if (!updated) {
        return;
      }
      setPlants((current) =>
        current.map((item) => {
          if (item.instanceId === plant.instanceId) {
            return normalizePlant({ ...item, ...updated, hasSevenInOne: nextEnabled, has_seven_in_one: nextEnabled });
          }
          return nextEnabled ? { ...item, hasSevenInOne: false, has_seven_in_one: false } : item;
        }),
      );
    } finally {
      setSensorActionBusy(false);
    }
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
              const timeline = plantTimelineSummary(plant, profile, status);
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
                  {plantLocation(plant) === "greenhouse" ? (
                    <div className="plant-mini-metrics">
                      <span>{timeline.dayLabel}</span>
                      <span>{timeline.phase}</span>
                      <span>{timeline.harvestLabel}</span>
                      <span>{plant.hasSevenInOne ? "7-i-1" : "I drivhus"}</span>
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
                      <small>{formatPlanDate(entry.date)}</small>
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

            {plantLocation(selectedPlant) === "greenhouse" && hasPairedHub ? (
              <article className="plant-info-card plant-sensor-card">
                <p className="section-kicker">Sensor</p>
                <strong>{selectedPlant.hasSevenInOne ? "7-i-1 er koblet hit" : "7-i-1-sensor"}</strong>
                <span>
                  {selectedPlant.hasSevenInOne
                    ? "Jordfuktighet, temperatur, pH og næring følger denne planten."
                    : sevenInOnePlant
                      ? `Sensoren måler ${sevenInOnePlant.nickname}.`
                      : "Ingen plante bruker 7-i-1-sensoren nå."}
                </span>
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => setSevenInOneForPlant(selectedPlant, !selectedPlant.hasSevenInOne)}
                  disabled={sensorActionBusy}
                >
                  {selectedPlant.hasSevenInOne ? "Koble fra 7-i-1" : "Bruk 7-i-1 her"}
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
                tone={plantPlanPrompt.catalogItem?.tone ?? profileForPlant(plantPlanPrompt.plant, searchableCatalogItems).tone}
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
