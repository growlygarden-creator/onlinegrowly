import type { GrowlyPlant, PlantCatalogItem } from "./api";

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

function plantName(plant: GrowlyPlant, catalogItem?: PlantCatalogItem | null): string {
  return plant.nickname || plant.display_name || catalogItem?.display_name || plant.profileId || "Plante";
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

function profileSpecificSteps(profileId: string, name: string): CalendarStep[] {
  const text = `${profileId} ${name}`.toLowerCase();
  if (text.includes("tomato") || text.includes("tomat")) {
    return [
      {
        key: "support",
        offsetDays: 8,
        title: "Bind opp og form planten",
        note: "Fest hovedstammen mykt, sjekk sideskudd og hold bladverk unna fuktig jord.",
        category: "support",
      },
      {
        key: "feeding",
        offsetDays: 15,
        title: "Gi mild næring",
        note: "Tomat liker jevn rytme. Gi rolig næring hvis planten er i god vekst.",
        category: "feeding",
      },
    ];
  }
  if (text.includes("cucumber") || text.includes("agurk")) {
    return [
      {
        key: "support",
        offsetDays: 7,
        title: "Led ranker oppover",
        note: "Agurk vil raskt opp i høyden. Fest løst og unngå knekk i hovedranken.",
        category: "support",
      },
      {
        key: "check-humidity",
        offsetDays: 13,
        title: "Sjekk fukt og meldugg",
        note: "Hold jevn jordfukt, men luft etter fuktige perioder så bladene tørker opp.",
        category: "check",
      },
    ];
  }
  if (text.includes("pepper") || text.includes("chili") || text.includes("paprika")) {
    return [
      {
        key: "flower-check",
        offsetDays: 9,
        title: "Sjekk blomster og stress",
        note: "Se etter blomsterfall, bladlus og små potter som tørker fort.",
        category: "check",
      },
      {
        key: "support",
        offsetDays: 18,
        title: "Støtt tunge greiner",
        note: "Når fruktene setter seg, trenger planten ofte en diskret støtte.",
        category: "support",
      },
    ];
  }
  if (text.includes("basil") || text.includes("urt")) {
    return [
      {
        key: "pinch",
        offsetDays: 6,
        title: "Topp over et bladpar",
        note: "Klipp over et bladpar for tettere vekst, og ikke la basilikum stå kaldt.",
        category: "harvest",
      },
      {
        key: "sow-more",
        offsetDays: 16,
        title: "Start en liten påfyllsrunde",
        note: "Urter føles luksus når det alltid er litt nytt på vei.",
        category: "harvest",
      },
    ];
  }
  if (text.includes("lettuce") || text.includes("salat")) {
    return [
      {
        key: "harvest-outer",
        offsetDays: 7,
        title: "Høst ytterblader",
        note: "Ta litt og litt. Det holder planten i gang og gir jevnere avling.",
        category: "harvest",
      },
      {
        key: "shade",
        offsetDays: 14,
        title: "Sjekk varme og skygge",
        note: "Salat går fort i stokk når den blir varm og tørr.",
        category: "check",
      },
    ];
  }
  if (text.includes("strawberry") || text.includes("jordb")) {
    return [
      {
        key: "flower-cleanup",
        offsetDays: 7,
        title: "Rydd rundt blomster",
        note: "Hold luft rundt kronen og unngå vann rett på blomster.",
        category: "cleanup",
      },
      {
        key: "runner-check",
        offsetDays: 18,
        title: "Følg utløpere og bær",
        note: "Velg om utløpere skal beholdes eller fjernes for mer energi til bær.",
        category: "check",
      },
    ];
  }
  return [
    {
      key: "support",
      offsetDays: 9,
      title: "Sjekk støtte og plass",
      note: "Gi planten rom før den blir tett. Det er enklere nå enn senere.",
      category: "support",
    },
    {
      key: "feeding",
      offsetDays: 18,
      title: "Vurder mild næring",
      note: "Hvis planten er i aktiv vekst, kan en rolig næringsrunde passe.",
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
  const id = plantId(plant);
  const name = plantName(plant, catalogItem);
  const profileId = plantProfileId(plant, catalogItem);
  const startDate = planStartDate(plant);
  const createdAt = new Date().toISOString();
  const baseSteps: CalendarStep[] = [
    {
      key: "first-water",
      offsetDays: 1,
      title: "Husk vann og jordfukt",
      note: "Kjenn i jorda før du vanner. Vann rolig ved roten hvis det begynner å tørke.",
      category: "water",
    },
    {
      key: "cleanup",
      offsetDays: 3,
      title: "Rydd opp rundt planten",
      note: "Fjern visne blader og småting rundt potten. Luft rundt planten forebygger trøbbel.",
      category: "cleanup",
    },
    {
      key: "leaf-check",
      offsetDays: 5,
      title: "Sjekk bladundersider",
      note: "Se etter små prikker, skadedyr, slappe blad og tegn på stress mens det er lett å rette.",
      category: "check",
    },
  ];
  const finishSteps: CalendarStep[] = [
    {
      key: "weekly-review",
      offsetDays: 21,
      title: "Ukessjekk og justering",
      note: "Se om vann, lys, luft og plass fortsatt passer. Juster før planten roper om hjelp.",
      category: "check",
    },
  ];
  const generated = [...baseSteps, ...profileSpecificSteps(profileId, name), ...finishSteps].map((step) => ({
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
          title: "Notat til planteplanen",
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
    title: "Eget notat",
    note,
    category: "note",
    source: "note",
    createdAt,
  };
  writeEntries([...parseJsonArray<PlantCalendarEntry>(PLANT_CALENDAR_STORAGE_KEY), entry]);
  return entry;
}
