import type { GrowlyPlant, PlantCatalogItem } from "./api";
import { currentAppLanguage, type AppLanguage } from "./i18n";

const PLANT_CALENDAR_STORAGE_KEY = "growly.plantCalendar.entries";

export type PlantCalendarEntryCategory = "water" | "cleanup" | "check" | "support" | "feeding" | "move" | "harvest" | "note";
export type PlantCalendarEntrySource = "generated" | "note";

export type PlantCalendarEntry = {
  id: string;
  hubId: string;
  plantId: string;
  plantName: string;
  plantProfileId: string;
  catalogItemId?: string;
  date: string;
  title: string;
  note: string;
  category: PlantCalendarEntryCategory;
  source: PlantCalendarEntrySource;
  createdAt: string;
};

type CalendarStep = {
  key: string;
  offsetDays: number;
  title: string;
  note: string;
  category: PlantCalendarEntryCategory;
};

function parseJsonArray<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: PlantCalendarEntry[]): void {
  try {
    window.localStorage.setItem(PLANT_CALENDAR_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Calendar plans should never block the core plant flow.
  }
}

function dateParam(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromInput(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function plantId(plant: GrowlyPlant): string {
  return plant.instanceId || plant.plant_id || `${plant.profileId || plant.profile_id || "plant"}-${Date.now()}`;
}

function plantName(plant: GrowlyPlant, catalogItem: PlantCatalogItem | null | undefined, language: AppLanguage): string {
  return plant.nickname || plant.display_name || catalogItem?.display_name || plant.profileId || (language === "en" ? "Plant" : "Plante");
}

function plantProfileId(plant: GrowlyPlant, catalogItem?: PlantCatalogItem | null): string {
  return plant.profileId || plant.profile_id || catalogItem?.profile_id || "plant";
}

function cleanId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "entry";
}

function planStartDate(plant: GrowlyPlant): Date {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const movedAt = dateFromInput(plant.movedToGreenhouseAt ?? plant.moved_to_greenhouse_at ?? undefined);
  const sowedAt = dateFromInput(plant.sowedAt ?? plant.sowed_at ?? undefined);
  const base = movedAt ?? sowedAt ?? today;
  return base.getTime() > today.getTime() ? base : today;
}

function profileSpecificSteps(profileId: string, name: string, language: AppLanguage): CalendarStep[] {
  const text = `${profileId} ${name}`.toLowerCase();
  const isEnglish = language === "en";
  if (text.includes("tomato") || text.includes("tomat")) {
    return [
      {
        key: "support",
        offsetDays: 8,
        title: isEnglish ? "Tie and shape the plant" : "Bind opp og form planten",
        note: isEnglish ? "Tie the main stem gently, check side shoots and keep foliage away from damp soil." : "Fest hovedstammen mykt, sjekk sideskudd og hold bladverk unna fuktig jord.",
        category: "support",
      },
      {
        key: "feeding",
        offsetDays: 15,
        title: isEnglish ? "Give mild feeding" : "Gi mild næring",
        note: isEnglish ? "Tomato likes a steady rhythm. Feed gently if the plant is growing well." : "Tomat liker jevn rytme. Gi rolig næring hvis planten er i god vekst.",
        category: "feeding",
      },
    ];
  }
  if (text.includes("cucumber") || text.includes("agurk")) {
    return [
      {
        key: "support",
        offsetDays: 7,
        title: isEnglish ? "Guide vines upward" : "Led ranker oppover",
        note: isEnglish ? "Cucumber climbs quickly. Tie loosely and avoid kinks in the main vine." : "Agurk vil raskt opp i høyden. Fest løst og unngå knekk i hovedranken.",
        category: "support",
      },
      {
        key: "check-humidity",
        offsetDays: 13,
        title: isEnglish ? "Check moisture and mildew" : "Sjekk fukt og meldugg",
        note: isEnglish ? "Keep soil moisture even, but ventilate after humid periods so leaves dry up." : "Hold jevn jordfukt, men luft etter fuktige perioder så bladene tørker opp.",
        category: "check",
      },
    ];
  }
  if (text.includes("pepper") || text.includes("chili") || text.includes("paprika")) {
    return [
      {
        key: "flower-check",
        offsetDays: 9,
        title: isEnglish ? "Check flowers and stress" : "Sjekk blomster og stress",
        note: isEnglish ? "Look for flower drop, aphids and small pots that dry quickly." : "Se etter blomsterfall, bladlus og små potter som tørker fort.",
        category: "check",
      },
      {
        key: "support",
        offsetDays: 18,
        title: isEnglish ? "Support heavy branches" : "Støtt tunge greiner",
        note: isEnglish ? "When fruits set, the plant often needs discreet support." : "Når fruktene setter seg, trenger planten ofte en diskret støtte.",
        category: "support",
      },
    ];
  }
  if (text.includes("basil") || text.includes("urt")) {
    return [
      {
        key: "pinch",
        offsetDays: 6,
        title: isEnglish ? "Pinch above a leaf pair" : "Topp over et bladpar",
        note: isEnglish ? "Cut above a leaf pair for denser growth, and do not let basil stand cold." : "Klipp over et bladpar for tettere vekst, og ikke la basilikum stå kaldt.",
        category: "harvest",
      },
      {
        key: "sow-more",
        offsetDays: 16,
        title: isEnglish ? "Start a small refill round" : "Start en liten påfyllsrunde",
        note: isEnglish ? "Herbs feel luxurious when there is always a little new growth coming." : "Urter føles luksus når det alltid er litt nytt på vei.",
        category: "harvest",
      },
    ];
  }
  if (text.includes("lettuce") || text.includes("salat")) {
    return [
      {
        key: "harvest-outer",
        offsetDays: 7,
        title: isEnglish ? "Harvest outer leaves" : "Høst ytterblader",
        note: isEnglish ? "Take a little at a time. It keeps the plant going and gives a steadier crop." : "Ta litt og litt. Det holder planten i gang og gir jevnere avling.",
        category: "harvest",
      },
      {
        key: "shade",
        offsetDays: 14,
        title: isEnglish ? "Check heat and shade" : "Sjekk varme og skygge",
        note: isEnglish ? "Lettuce bolts quickly when it gets warm and dry." : "Salat går fort i stokk når den blir varm og tørr.",
        category: "check",
      },
    ];
  }
  if (text.includes("strawberry") || text.includes("jordb")) {
    return [
      {
        key: "flower-cleanup",
        offsetDays: 7,
        title: isEnglish ? "Clean around flowers" : "Rydd rundt blomster",
        note: isEnglish ? "Keep air around the crown and avoid water directly on flowers." : "Hold luft rundt kronen og unngå vann rett på blomster.",
        category: "cleanup",
      },
      {
        key: "runner-check",
        offsetDays: 18,
        title: isEnglish ? "Follow runners and berries" : "Følg utløpere og bær",
        note: isEnglish ? "Decide whether runners should be kept or removed for more energy to berries." : "Velg om utløpere skal beholdes eller fjernes for mer energi til bær.",
        category: "check",
      },
    ];
  }
  return [
    {
      key: "support",
      offsetDays: 9,
      title: isEnglish ? "Check support and space" : "Sjekk støtte og plass",
      note: isEnglish ? "Give the plant room before it gets crowded. It is easier now than later." : "Gi planten rom før den blir tett. Det er enklere nå enn senere.",
      category: "support",
    },
    {
      key: "feeding",
      offsetDays: 18,
      title: isEnglish ? "Consider mild feeding" : "Vurder mild næring",
      note: isEnglish ? "If the plant is actively growing, a gentle feeding round may fit." : "Hvis planten er i aktiv vekst, kan en rolig næringsrunde passe.",
      category: "feeding",
    },
  ];
}

export function listPlantCalendarEntries(hubId = ""): PlantCalendarEntry[] {
  return parseJsonArray<PlantCalendarEntry>(PLANT_CALENDAR_STORAGE_KEY)
    .filter((entry) => !hubId || entry.hubId === hubId)
    .sort((first, second) => first.date.localeCompare(second.date));
}

export function listPlantCalendarEntriesForPlant(hubId: string, plantId: string): PlantCalendarEntry[] {
  return listPlantCalendarEntries(hubId).filter((entry) => entry.plantId === plantId);
}

export function removePlantCalendarEntriesForPlant(hubId: string, plantId: string): number {
  const current = parseJsonArray<PlantCalendarEntry>(PLANT_CALENDAR_STORAGE_KEY);
  const next = current.filter((entry) => !(entry.hubId === hubId && entry.plantId === plantId));
  writeEntries(next);
  return current.length - next.length;
}

export function saveGeneratedPlantPlan(
  plant: GrowlyPlant,
  catalogItem: PlantCatalogItem | null | undefined,
  hubId = "",
  note = "",
): PlantCalendarEntry[] {
  const language = currentAppLanguage();
  const isEnglish = language === "en";
  const id = plantId(plant);
  const name = plantName(plant, catalogItem, language);
  const profileId = plantProfileId(plant, catalogItem);
  const startDate = planStartDate(plant);
  const createdAt = new Date().toISOString();
  const baseSteps: CalendarStep[] = [
    {
      key: "first-water",
      offsetDays: 1,
      title: isEnglish ? "Remember water and soil moisture" : "Husk vann og jordfukt",
      note: isEnglish ? "Feel the soil before watering. Water gently at the root if it starts to dry." : "Kjenn i jorda før du vanner. Vann rolig ved roten hvis det begynner å tørke.",
      category: "water",
    },
    {
      key: "cleanup",
      offsetDays: 3,
      title: isEnglish ? "Clean up around the plant" : "Rydd opp rundt planten",
      note: isEnglish ? "Remove wilted leaves and small debris around the pot. Airflow around the plant prevents trouble." : "Fjern visne blader og småting rundt potten. Luft rundt planten forebygger trøbbel.",
      category: "cleanup",
    },
    {
      key: "leaf-check",
      offsetDays: 5,
      title: isEnglish ? "Check leaf undersides" : "Sjekk bladundersider",
      note: isEnglish ? "Look for small spots, pests, limp leaves and signs of stress while it is easy to correct." : "Se etter små prikker, skadedyr, slappe blad og tegn på stress mens det er lett å rette.",
      category: "check",
    },
  ];
  const finishSteps: CalendarStep[] = [
    {
      key: "weekly-review",
      offsetDays: 21,
      title: isEnglish ? "Weekly check and adjustment" : "Ukessjekk og justering",
      note: isEnglish ? "Check whether water, light, air and space still fit. Adjust before the plant asks for help." : "Se om vann, lys, luft og plass fortsatt passer. Juster før planten roper om hjelp.",
      category: "check",
    },
  ];
  const generated = [...baseSteps, ...profileSpecificSteps(profileId, name, language), ...finishSteps].map((step) => ({
    id: `generated-${cleanId(hubId || "local")}-${cleanId(id)}-${step.key}`,
    hubId,
    plantId: id,
    plantName: name,
    plantProfileId: profileId,
    catalogItemId: catalogItem?.id || plant.catalogItemId || plant.catalog_item_id,
    date: dateParam(addDays(startDate, step.offsetDays)),
    title: step.title,
    note: step.note,
    category: step.category,
    source: "generated" as const,
    createdAt,
  }));
  const userNote = note.trim()
    ? [
        {
          id: `note-${cleanId(hubId || "local")}-${cleanId(id)}-${Date.now()}`,
          hubId,
          plantId: id,
          plantName: name,
          plantProfileId: profileId,
          catalogItemId: catalogItem?.id || plant.catalogItemId || plant.catalog_item_id,
          date: dateParam(startDate),
          title: isEnglish ? "Note for the plant plan" : "Notat til planteplanen",
          note: note.trim(),
          category: "note" as const,
          source: "note" as const,
          createdAt,
        },
      ]
    : [];
  const current = parseJsonArray<PlantCalendarEntry>(PLANT_CALENDAR_STORAGE_KEY);
  const next = [
    ...current.filter((entry) => !(entry.hubId === hubId && entry.plantId === id && entry.source === "generated")),
    ...generated,
    ...userNote,
  ];
  writeEntries(next);
  return [...generated, ...userNote];
}

export function addPlantCalendarNote(input: {
  hubId?: string;
  plantId: string;
  plantName: string;
  plantProfileId: string;
  catalogItemId?: string;
  date: string;
  note: string;
}): PlantCalendarEntry | null {
  const language = currentAppLanguage();
  const note = input.note.trim();
  if (!note) {
    return null;
  }
  const createdAt = new Date().toISOString();
  const entry: PlantCalendarEntry = {
    id: `note-${cleanId(input.hubId || "local")}-${cleanId(input.plantId)}-${Date.now()}`,
    hubId: input.hubId || "",
    plantId: input.plantId,
    plantName: input.plantName,
    plantProfileId: input.plantProfileId,
    catalogItemId: input.catalogItemId,
    date: input.date,
    title: language === "en" ? "Own note" : "Eget notat",
    note,
    category: "note",
    source: "note",
    createdAt,
  };
  writeEntries([...parseJsonArray<PlantCalendarEntry>(PLANT_CALENDAR_STORAGE_KEY), entry]);
  return entry;
}
