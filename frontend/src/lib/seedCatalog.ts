const SEED_CATALOG_STORAGE_PREFIX = "growly.seedCatalog.entries.v1";
const SEED_ACTIVITY_STORAGE_PREFIX = "growly.seedCatalog.activities.v1";

export type SeedCategory = "gronnsak" | "urt" | "blomst" | "frukt" | "bar" | "annet";
export type SeedOrigin = "kjopt" | "egne" | "fatt" | "byttet";
export type SeedStock = "mye" | "lite" | "tom" | "ukjent";
export type SeedGermination = "ukjent" | "god" | "middels" | "darlig" | "test";
export type SeedActivityType = "sadd" | "podet" | "spiretest";
export type SeedActivityStatus = "planlagt" | "ikke_spirt" | "spirt" | "plantet_ut" | "mislykket" | "hostet" | "vellykket";

export type SeedCatalogEntry = {
  id: string;
  code: string;
  name: string;
  variety: string;
  category: SeedCategory;
  origin: SeedOrigin;
  year: string;
  harvestDate: string;
  source: string;
  stock: SeedStock;
  germination: SeedGermination;
  location: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type SeedActivityEntry = {
  id: string;
  seedId: string;
  seedCode: string;
  seedName: string;
  type: SeedActivityType;
  date: string;
  quantity: string;
  placement: string;
  status: SeedActivityStatus;
  rootstock: string;
  scion: string;
  notes: string;
  createdAt: string;
};

export const seedCategoryLabels: Record<SeedCategory, string> = {
  gronnsak: "Grønnsak",
  urt: "Urt",
  blomst: "Blomst",
  frukt: "Frukt",
  bar: "Bær",
  annet: "Annet",
};

export const seedOriginLabels: Record<SeedOrigin, string> = {
  kjopt: "Kjøpt",
  egne: "Egne frø",
  fatt: "Fått",
  byttet: "Byttet",
};

export const seedStockLabels: Record<SeedStock, string> = {
  mye: "Mye igjen",
  lite: "Lite igjen",
  tom: "Tom",
  ukjent: "Ukjent",
};

export const seedGerminationLabels: Record<SeedGermination, string> = {
  ukjent: "Ukjent",
  god: "God",
  middels: "Middels",
  darlig: "Dårlig",
  test: "Test igjen",
};

export const seedActivityTypeLabels: Record<SeedActivityType, string> = {
  sadd: "Sådd",
  podet: "Podet",
  spiretest: "Spiretest",
};

export const seedActivityStatusLabels: Record<SeedActivityStatus, string> = {
  planlagt: "Planlagt",
  ikke_spirt: "Ikke spirt",
  spirt: "Spirt",
  plantet_ut: "Plantet ut",
  mislykket: "Mislykket",
  hostet: "Høstet",
  vellykket: "Vellykket",
};

function storageKey(prefix: string, username = ""): string {
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "-");
  return cleanUsername ? `${prefix}.${cleanUsername}` : `${prefix}.local`;
}

function readJsonArray<T>(key: string): T[] | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : null;
  } catch {
    return null;
  }
}

function writeJsonArray<T>(key: string, entries: T[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    // Seed notes are local convenience data; storage issues should not break the app.
  }
}

function normalizeSeedEntry(entry: Partial<SeedCatalogEntry>, index: number): SeedCatalogEntry {
  const now = new Date().toISOString();
  const code = typeof entry.code === "string" && entry.code.trim() ? entry.code.trim() : `F-${String(index + 1).padStart(3, "0")}`;
  return {
    id: typeof entry.id === "string" && entry.id ? entry.id : `seed-${code.toLowerCase()}`,
    code,
    name: typeof entry.name === "string" ? entry.name : "",
    variety: typeof entry.variety === "string" ? entry.variety : "",
    category: isSeedCategory(entry.category) ? entry.category : "annet",
    origin: isSeedOrigin(entry.origin) ? entry.origin : "egne",
    year: typeof entry.year === "string" ? entry.year : "",
    harvestDate: typeof entry.harvestDate === "string" ? entry.harvestDate : "",
    source: typeof entry.source === "string" ? entry.source : "",
    stock: isSeedStock(entry.stock) ? entry.stock : "ukjent",
    germination: isSeedGermination(entry.germination) ? entry.germination : "ukjent",
    location: typeof entry.location === "string" ? entry.location : "",
    notes: typeof entry.notes === "string" ? entry.notes : "",
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : now,
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : now,
  };
}

function normalizeSeedActivity(entry: Partial<SeedActivityEntry>, index: number): SeedActivityEntry {
  const now = new Date().toISOString();
  return {
    id: typeof entry.id === "string" && entry.id ? entry.id : `activity-${now}-${index}`,
    seedId: typeof entry.seedId === "string" ? entry.seedId : "",
    seedCode: typeof entry.seedCode === "string" ? entry.seedCode : "",
    seedName: typeof entry.seedName === "string" ? entry.seedName : "",
    type: isSeedActivityType(entry.type) ? entry.type : "sadd",
    date: typeof entry.date === "string" ? entry.date : "",
    quantity: typeof entry.quantity === "string" ? entry.quantity : "",
    placement: typeof entry.placement === "string" ? entry.placement : "",
    status: isSeedActivityStatus(entry.status) ? entry.status : "planlagt",
    rootstock: typeof entry.rootstock === "string" ? entry.rootstock : "",
    scion: typeof entry.scion === "string" ? entry.scion : "",
    notes: typeof entry.notes === "string" ? entry.notes : "",
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : now,
  };
}

function isSeedCategory(value: unknown): value is SeedCategory {
  return value === "gronnsak" || value === "urt" || value === "blomst" || value === "frukt" || value === "bar" || value === "annet";
}

function isSeedOrigin(value: unknown): value is SeedOrigin {
  return value === "kjopt" || value === "egne" || value === "fatt" || value === "byttet";
}

function isSeedStock(value: unknown): value is SeedStock {
  return value === "mye" || value === "lite" || value === "tom" || value === "ukjent";
}

function isSeedGermination(value: unknown): value is SeedGermination {
  return value === "ukjent" || value === "god" || value === "middels" || value === "darlig" || value === "test";
}

function isSeedActivityType(value: unknown): value is SeedActivityType {
  return value === "sadd" || value === "podet" || value === "spiretest";
}

function isSeedActivityStatus(value: unknown): value is SeedActivityStatus {
  return value === "planlagt" || value === "ikke_spirt" || value === "spirt" || value === "plantet_ut" || value === "mislykket" || value === "hostet" || value === "vellykket";
}

export function listSeedCatalogEntries(username = ""): SeedCatalogEntry[] {
  const stored = readJsonArray<Partial<SeedCatalogEntry>>(storageKey(SEED_CATALOG_STORAGE_PREFIX, username));
  return (stored ?? []).map(normalizeSeedEntry).sort((a, b) => a.code.localeCompare(b.code, "nb-NO", { numeric: true }));
}

export function saveSeedCatalogEntries(entries: SeedCatalogEntry[], username = ""): void {
  writeJsonArray(storageKey(SEED_CATALOG_STORAGE_PREFIX, username), entries);
}

export function listSeedActivities(username = ""): SeedActivityEntry[] {
  const stored = readJsonArray<Partial<SeedActivityEntry>>(storageKey(SEED_ACTIVITY_STORAGE_PREFIX, username));
  return (stored ?? []).map(normalizeSeedActivity).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export function saveSeedActivities(entries: SeedActivityEntry[], username = ""): void {
  writeJsonArray(storageKey(SEED_ACTIVITY_STORAGE_PREFIX, username), entries);
}

export function nextSeedCode(entries: SeedCatalogEntry[]): string {
  const highest = entries.reduce((max, entry) => {
    const number = Number.parseInt(entry.code.replace(/\D+/g, ""), 10);
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
  return `F-${String(highest + 1).padStart(3, "0")}`;
}
