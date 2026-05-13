import { useEffect, useMemo, useState } from "react";
import {
  createSeedActivity,
  createSeedEntry,
  deleteSeedEntry,
  fetchPlantCatalog,
  fetchSeedCatalog,
  updateSeedEntry,
  type AuthSession,
  type PlantCatalogItem,
} from "../lib/api";
import { bundledPlantCatalog } from "../data/plantCatalog";
import { PlantAvatar } from "../components/PlantAvatar";
import { plantCareGuide } from "../lib/plantCare";
import { useI18n } from "../lib/i18n";
import { localizePlantCatalogItems } from "../lib/plantCatalogLocalization";
import {
  listSeedActivities,
  listSeedCatalogEntries,
  nextSeedCode,
  saveSeedActivities,
  saveSeedCatalogEntries,
  seedActivityStatusLabels,
  seedActivityTypeLabels,
  seedCategoryLabels,
  seedGerminationLabels,
  seedOriginLabels,
  seedStockLabels,
  type SeedActivityEntry,
  type SeedActivityStatus,
  type SeedActivityType,
  type SeedCatalogEntry,
  type SeedCategory,
  type SeedGermination,
  type SeedOrigin,
  type SeedStock,
} from "../lib/seedCatalog";

type PlantCatalogPageProps = {
  session: AuthSession | null;
};

type CatalogMode = "plants" | "seeds";
type SeedView = "library" | "activity" | "print";

type SeedFormState = {
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
};

type SeedActivityFormState = {
  seedId: string;
  type: SeedActivityType;
  date: string;
  quantity: string;
  placement: string;
  status: SeedActivityStatus;
  rootstock: string;
  scion: string;
  notes: string;
};

const seedCategoryOptions = Object.entries(seedCategoryLabels) as Array<[SeedCategory, string]>;
const seedOriginOptions = Object.entries(seedOriginLabels) as Array<[SeedOrigin, string]>;
const seedStockOptions = Object.entries(seedStockLabels) as Array<[SeedStock, string]>;
const seedGerminationOptions = Object.entries(seedGerminationLabels) as Array<[SeedGermination, string]>;
const seedActivityTypeOptions = Object.entries(seedActivityTypeLabels) as Array<[SeedActivityType, string]>;
const seedActivityStatusOptions = Object.entries(seedActivityStatusLabels) as Array<[SeedActivityStatus, string]>;

function kindLabel(kind: PlantCatalogItem["kind"], language: "no" | "en"): string {
  if (kind === "cultivar") return language === "en" ? "Cultivar" : "Sort";
  if (kind === "variant") return "Variant";
  return "Base";
}

function compactRange(range: { optimal: [number, number] } | undefined, suffix: string): string {
  if (!range) return "-";
  const [min, max] = range.optimal;
  if (suffix === " lx") {
    return `${Math.round(min / 1000)}-${Math.round(max / 1000)}k lx`;
  }
  return `${min.toFixed(0)}-${max.toFixed(0)}${suffix}`;
}

function catalogLocale(language: "no" | "en"): string {
  return language === "en" ? "en-US" : "nb-NO";
}

function compareCatalogText(a: string, b: string, language: "no" | "en"): number {
  return a.localeCompare(b, catalogLocale(language), { sensitivity: "base" });
}

function compareCatalogItems(a: PlantCatalogItem, b: PlantCatalogItem, language: "no" | "en"): number {
  return (
    compareCatalogText(a.display_name, b.display_name, language) ||
    compareCatalogText(a.subtitle || "", b.subtitle || "", language) ||
    compareCatalogText(a.id, b.id, language)
  );
}

function todayInputValue(): string {
  const today = new Date();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function formatDate(value: string): string {
  if (!value) return "Ikke satt";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Ikke satt";
  return date.toLocaleDateString("nb-NO", { day: "2-digit", month: "short", year: "numeric" });
}

function seedTitle(seed: SeedCatalogEntry): string {
  return seed.variety ? `${seed.name}, ${seed.variety}` : seed.name;
}

function seedSearchText(seed: SeedCatalogEntry): string {
  return [
    seed.code,
    seed.name,
    seed.variety,
    seedCategoryLabels[seed.category],
    seedOriginLabels[seed.origin],
    seed.year,
    seed.source,
    seed.location,
    seed.notes,
  ].join(" ").toLowerCase();
}

function emptySeedForm(): SeedFormState {
  return {
    name: "",
    variety: "",
    category: "gronnsak",
    origin: "egne",
    year: `${new Date().getFullYear()}`,
    harvestDate: "",
    source: "",
    stock: "ukjent",
    germination: "ukjent",
    location: "Nummerert frøeske",
    notes: "",
  };
}

function seedFormFromEntry(seed: SeedCatalogEntry): SeedFormState {
  return {
    name: seed.name,
    variety: seed.variety,
    category: seed.category,
    origin: seed.origin,
    year: seed.year,
    harvestDate: seed.harvestDate,
    source: seed.source,
    stock: seed.stock,
    germination: seed.germination,
    location: seed.location,
    notes: seed.notes,
  };
}

function emptyActivityForm(seedId = ""): SeedActivityFormState {
  return {
    seedId,
    type: "sadd",
    date: todayInputValue(),
    quantity: "",
    placement: "",
    status: "planlagt",
    rootstock: "",
    scion: "",
    notes: "",
  };
}

export function PlantCatalogPage({ session }: PlantCatalogPageProps) {
  const { language } = useI18n();
  const storageUser = session?.username || session?.user?.email || "";
  const selectedHubId = session?.hub?.hub_id || "";
  const [catalogMode, setCatalogMode] = useState<CatalogMode>("plants");
  const [items, setItems] = useState<PlantCatalogItem[]>(() => localizePlantCatalogItems(bundledPlantCatalog, language));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [seedEntries, setSeedEntries] = useState<SeedCatalogEntry[]>(() => listSeedCatalogEntries(storageUser));
  const [seedActivities, setSeedActivities] = useState<SeedActivityEntry[]>(() => listSeedActivities(storageUser));
  const [seedView, setSeedView] = useState<SeedView>("library");
  const [seedQuery, setSeedQuery] = useState("");
  const [seedCategory, setSeedCategory] = useState<SeedCategory | "all">("all");
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);
  const [seedSheetOpen, setSeedSheetOpen] = useState(false);
  const [editingSeedId, setEditingSeedId] = useState<string | null>(null);
  const [seedForm, setSeedForm] = useState<SeedFormState>(emptySeedForm);
  const [seedFeedback, setSeedFeedback] = useState("");
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [activityForm, setActivityForm] = useState<SeedActivityFormState>(() => emptyActivityForm());
  const [activityFeedback, setActivityFeedback] = useState("");

  useEffect(() => {
    setItems(localizePlantCatalogItems(bundledPlantCatalog, language));
    fetchPlantCatalog("", language).then((result) => {
      if (result.length) {
        setItems(result);
      }
    });
  }, [language]);

  useEffect(() => {
    setSeedEntries(listSeedCatalogEntries(storageUser));
    setSeedActivities(listSeedActivities(storageUser));
    fetchSeedCatalog(selectedHubId).then((result) => {
      if (!result) {
        return;
      }
      setSeedEntries(result.seeds);
      setSeedActivities(result.activities);
      saveSeedCatalogEntries(result.seeds, storageUser);
      saveSeedActivities(result.activities, storageUser);
    });
  }, [selectedHubId, storageUser]);

  useEffect(() => {
    if (!seedEntries.length) {
      setSelectedSeedId(null);
      return;
    }
    if (!selectedSeedId || !seedEntries.some((seed) => seed.id === selectedSeedId)) {
      setSelectedSeedId(seedEntries[0].id);
    }
  }, [seedEntries, selectedSeedId]);

  const catalogCategories = useMemo(() => {
    const unique = Array.from(new Set(items.filter((item) => item.kind === "base").map((item) => item.category).filter(Boolean)));
    return unique.sort((a, b) => compareCatalogText(a, b, language));
  }, [items, language]);

  useEffect(() => {
    if (category !== "all" && !catalogCategories.includes(category)) {
      setCategory("all");
      setSelectedId(null);
    }
  }, [catalogCategories, category]);

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    return items
      .filter((item) => search || item.kind === "base")
      .filter((item) => category === "all" || item.category === category)
      .filter((item) => {
        if (!search) return true;
        return `${item.display_name} ${item.subtitle} ${item.category} ${item.family} ${item.latin_name}`.toLowerCase().includes(search);
      })
      .sort((a, b) => compareCatalogItems(a, b, language))
      .slice(0, 80);
  }, [category, items, language, query]);

  const selectedItem = selectedId ? items.find((item) => item.id === selectedId) ?? null : null;
  const selectedCareGuide = selectedItem ? plantCareGuide(selectedItem, language) : null;

  const filteredSeedEntries = useMemo(() => {
    const search = seedQuery.trim().toLowerCase();
    return seedEntries
      .filter((seed) => seedCategory === "all" || seed.category === seedCategory)
      .filter((seed) => !search || seedSearchText(seed).includes(search))
      .sort((a, b) => a.code.localeCompare(b.code, "nb-NO", { numeric: true }));
  }, [seedCategory, seedEntries, seedQuery]);

  const selectedSeed = selectedSeedId ? seedEntries.find((seed) => seed.id === selectedSeedId) ?? null : null;
  const selectedSeedActivities = selectedSeed ? seedActivities.filter((activity) => activity.seedId === selectedSeed.id) : [];
  const activeSeedCount = seedEntries.filter((seed) => seed.stock !== "tom").length;
  const lowStockCount = seedEntries.filter((seed) => seed.stock === "lite" || seed.stock === "tom").length;
  const currentYear = new Date().getFullYear();
  const needsCheckCount = seedEntries.filter((seed) => {
    const year = Number.parseInt(seed.year, 10);
    return seed.germination === "test" || seed.germination === "darlig" || (Number.isFinite(year) && currentYear - year >= 4);
  }).length;
  const ownSeedCount = seedEntries.filter((seed) => seed.origin === "egne").length;
  const printDate = new Date().toLocaleDateString("nb-NO", { day: "2-digit", month: "long", year: "numeric" });

  function persistSeedEntries(nextEntries: SeedCatalogEntry[]) {
    const sortedEntries = nextEntries.sort((a, b) => a.code.localeCompare(b.code, "nb-NO", { numeric: true }));
    setSeedEntries(sortedEntries);
    saveSeedCatalogEntries(sortedEntries, storageUser);
  }

  function persistSeedActivities(nextActivities: SeedActivityEntry[]) {
    const sortedActivities = nextActivities.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    setSeedActivities(sortedActivities);
    saveSeedActivities(sortedActivities, storageUser);
  }

  function openSeedSheet(seed?: SeedCatalogEntry) {
    setSeedFeedback("");
    if (seed) {
      setEditingSeedId(seed.id);
      setSeedForm(seedFormFromEntry(seed));
    } else {
      setEditingSeedId(null);
      setSeedForm(emptySeedForm());
    }
    setSeedSheetOpen(true);
  }

  function updateSeedForm<Key extends keyof SeedFormState>(key: Key, value: SeedFormState[Key]) {
    setSeedForm((current) => ({ ...current, [key]: value }));
  }

  async function saveSeedEntry() {
    const trimmedName = seedForm.name.trim();
    if (!trimmedName) {
      setSeedFeedback("Gi frøet et navn først.");
      return;
    }

    const now = new Date().toISOString();
    const payload = {
      ...seedForm,
      name: trimmedName,
      variety: seedForm.variety.trim(),
      year: seedForm.year.trim(),
      source: seedForm.source.trim(),
      location: seedForm.location.trim(),
      notes: seedForm.notes.trim(),
    };
    setSeedFeedback("Lagrer i Growly-skyen...");
    if (editingSeedId) {
      const updatedSeed = await updateSeedEntry(editingSeedId, payload, selectedHubId);
      if (!updatedSeed) {
        setSeedFeedback("Kunne ikke lagre i skyen akkurat nå. Prøv igjen.");
        return;
      }
      const updatedEntries = seedEntries.map((seed) =>
        seed.id === editingSeedId ? { ...updatedSeed, updatedAt: updatedSeed.updatedAt || now } : seed,
      );
      persistSeedEntries(updatedEntries);
      setSeedSheetOpen(false);
      return;
    }

    const createdSeed = await createSeedEntry(payload, selectedHubId);
    if (!createdSeed) {
      setSeedFeedback("Kunne ikke lagre i skyen akkurat nå. Prøv igjen.");
      return;
    }
    const newSeed: SeedCatalogEntry = { ...createdSeed, createdAt: createdSeed.createdAt || now, updatedAt: createdSeed.updatedAt || now };
    persistSeedEntries([...seedEntries, newSeed]);
    setSelectedSeedId(newSeed.id);
    setSeedSheetOpen(false);
  }

  async function deleteSeed(seedId: string) {
    const seed = seedEntries.find((entry) => entry.id === seedId);
    if (!seed || !window.confirm(`Slette ${seed.code} ${seedTitle(seed)}?`)) {
      return;
    }
    const deleted = await deleteSeedEntry(seedId, selectedHubId);
    if (!deleted) {
      window.alert("Kunne ikke slette i skyen akkurat nå. Prøv igjen.");
      return;
    }
    persistSeedEntries(seedEntries.filter((entry) => entry.id !== seedId));
    persistSeedActivities(seedActivities.filter((entry) => entry.seedId !== seedId));
  }

  function openActivitySheet(seedId = selectedSeedId || seedEntries[0]?.id || "") {
    setActivityFeedback("");
    setActivityForm(emptyActivityForm(seedId));
    setActivitySheetOpen(true);
  }

  function updateActivityForm<Key extends keyof SeedActivityFormState>(key: Key, value: SeedActivityFormState[Key]) {
    setActivityForm((current) => ({ ...current, [key]: value }));
  }

  async function saveSeedActivity() {
    const seed = seedEntries.find((entry) => entry.id === activityForm.seedId);
    if (!seed) {
      return;
    }
    const now = new Date().toISOString();
    setActivityFeedback("Lagrer i Growly-skyen...");
    const createdActivity = await createSeedActivity({
      seedId: seed.id,
      seedCode: seed.code,
      seedName: seedTitle(seed),
      type: activityForm.type,
      date: activityForm.date || todayInputValue(),
      quantity: activityForm.quantity.trim(),
      placement: activityForm.placement.trim(),
      status: activityForm.status,
      rootstock: activityForm.rootstock.trim(),
      scion: activityForm.scion.trim(),
      notes: activityForm.notes.trim(),
    }, selectedHubId);
    if (!createdActivity) {
      setActivityFeedback("Kunne ikke lagre i skyen akkurat nå. Prøv igjen.");
      return;
    }
    const activity: SeedActivityEntry = { ...createdActivity, createdAt: createdActivity.createdAt || now };
    persistSeedActivities([activity, ...seedActivities]);
    setActivitySheetOpen(false);
    setSeedView("activity");
  }

  function printSeedIndex() {
    window.print();
  }

  return (
    <main className="page-shell app-page catalog-page">
      <section className="screen-header catalog-screen-header">
        <div>
          <h1>{catalogMode === "plants" ? "Kartotek" : "Mine frø"}</h1>
          <p>
            {catalogMode === "plants"
              ? "Finn riktig plante raskt, og åpne bare detaljene når du trenger dem."
              : "Frønummer, små notater og historikk samlet på ett sted."}
          </p>
        </div>
      </section>

      <div className="catalog-mode-tabs" role="tablist" aria-label="Kartotekvalg">
        <button className={catalogMode === "plants" ? "is-selected" : ""} type="button" onClick={() => setCatalogMode("plants")}>
          Plantekartotek
        </button>
        <button className={catalogMode === "seeds" ? "is-selected" : ""} type="button" onClick={() => setCatalogMode("seeds")}>
          Mine frø
        </button>
      </div>

      {catalogMode === "plants" ? (
        <>
          <section className="settings-section catalog-browser">
            <label className="field">
              <span>Søk i kartoteket</span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedId(null);
                }}
                placeholder="Tomat, Sungold, chili, salat..."
              />
            </label>

            <div className="catalog-filter-row catalog-filter-row--categories" aria-label="Kategorier">
              {[["all", "Alle"], ...catalogCategories.map((value) => [value, value])].map(([value, label]) => (
                <button
                  className={category === value ? "is-selected" : ""}
                  type="button"
                  key={value}
                  onClick={() => {
                    setCategory(value);
                    setSelectedId(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="catalog-list">
              {filteredItems.map((item) => (
                <button
                  className={`catalog-list-item${selectedItem?.id === item.id ? " is-selected" : ""}`}
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                >
                  <PlantAvatar tone={item.tone} plantId={item.profile_id} name={item.display_name} family={item.family} />
                  <span>
                    <strong>{item.display_name}</strong>
                    <small>{item.category} · {item.subtitle}</small>
                  </span>
                </button>
              ))}
              {!filteredItems.length ? (
                <article className="soft-card empty-state-card">
                  <strong>Ingen treff</strong>
                  <p>Prøv et annet søk eller velg alle kategorier.</p>
                </article>
              ) : null}
            </div>
          </section>

          {selectedItem ? (
            <section className="settings-section catalog-detail">
              <div className="catalog-detail__head">
                <PlantAvatar tone={selectedItem.tone} plantId={selectedItem.profile_id} name={selectedItem.display_name} family={selectedItem.family} />
                <div>
                  <p className="section-kicker">{kindLabel(selectedItem.kind, language)} · {selectedItem.category}</p>
                  <h2>{selectedItem.display_name}</h2>
                  <span>{selectedItem.latin_name}</span>
                </div>
              </div>

              <article className="plant-info-card">
                <p className="section-kicker">Om planten</p>
                <span>{selectedItem.notes || selectedItem.watering || selectedItem.subtitle}</span>
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

              <div className="catalog-range-grid">
                <article>
                  <span>Temperatur</span>
                  <strong>{compactRange(selectedItem.ranges.airTemperature, "°C")}</strong>
                </article>
                <article>
                  <span>Luftfukt</span>
                  <strong>{compactRange(selectedItem.ranges.airHumidity, "%")}</strong>
                </article>
                <article>
                  <span>Lys</span>
                  <strong>{compactRange(selectedItem.ranges.lux, " lx")}</strong>
                </article>
                <article>
                  <span>pH</span>
                  <strong>{selectedItem.ranges.ph.optimal[0].toFixed(1)}-{selectedItem.ranges.ph.optimal[1].toFixed(1)}</strong>
                </article>
              </div>

              {selectedItem.seed_guide ? (
                <article className="plant-info-card plant-seed-card">
                  <p className="section-kicker">Såguide</p>
                  <div className="seed-guide-list">
                    <span><strong>Så</strong>{selectedItem.seed_guide.sow}</span>
                    <span><strong>Start</strong>{selectedItem.seed_guide.start}</span>
                    <span><strong>Ompotting</strong>{selectedItem.seed_guide.repot}</span>
                    <span><strong>Videre</strong>{selectedItem.seed_guide.plant_out}</span>
                    <span><strong>Sesong</strong>{selectedItem.seed_guide.harvest}</span>
                  </div>
                </article>
              ) : null}
            </section>
          ) : null}
        </>
      ) : (
        <>
          <section className="seed-vault-hero">
            <div className="seed-vault-hero__copy">
              <p className="section-kicker">Frøbank</p>
              <h2>Nummer på posen, alt annet i Growly.</h2>
              <span>Bruk små merkelapper som #-004, og la appen holde orden på sort, år, spireevne og notater.</span>
            </div>
            <div className="seed-vault-stats">
              <article>
                <span>Aktive frø</span>
                <strong>{activeSeedCount}</strong>
              </article>
              <article>
                <span>Egne linjer</span>
                <strong>{ownSeedCount}</strong>
              </article>
              <article>
                <span>Sjekk</span>
                <strong>{needsCheckCount}</strong>
              </article>
              <article>
                <span>Neste</span>
                <strong>{nextSeedCode(seedEntries)}</strong>
              </article>
            </div>
          </section>

          <div className="seed-vault-tabs" role="tablist" aria-label="Frøvisning">
            <button className={seedView === "library" ? "is-selected" : ""} type="button" onClick={() => setSeedView("library")}>
              Frø
            </button>
            <button className={seedView === "activity" ? "is-selected" : ""} type="button" onClick={() => setSeedView("activity")}>
              Sådd / podet
            </button>
            <button
              className={seedView === "print" ? "is-selected" : ""}
              type="button"
              onClick={() => setSeedView("print")}
              aria-label="Innholdsliste og utskrift"
            >
              Utskrift
            </button>
          </div>

          {seedView === "library" ? (
            <section className="seed-library-grid">
              <div className="settings-section seed-control-panel">
                <div className="seed-action-row">
                  <button className="primary-action" type="button" onClick={() => openSeedSheet()}>
                    Legg til frø
                  </button>
                  <button className="secondary-action" type="button" onClick={() => openActivitySheet()} disabled={!seedEntries.length}>
                    Registrer såing
                  </button>
                </div>

                <label className="field">
                  <span>Søk i frøene</span>
                  <input
                    value={seedQuery}
                    onChange={(event) => setSeedQuery(event.target.value)}
                    placeholder="#-004, sukkerert, blodbeger..."
                  />
                </label>

                <div className="catalog-filter-row catalog-filter-row--categories seed-category-filter" aria-label="Frøkategorier">
                  <button className={seedCategory === "all" ? "is-selected" : ""} type="button" onClick={() => setSeedCategory("all")}>
                    Alle
                  </button>
                  {seedCategoryOptions.map(([value, label]) => (
                    <button className={seedCategory === value ? "is-selected" : ""} type="button" key={value} onClick={() => setSeedCategory(value)}>
                      {label}
                    </button>
                  ))}
                </div>

                <div className="seed-list">
                  {filteredSeedEntries.map((seed) => (
                    <button
                      className={`seed-list-item${selectedSeed?.id === seed.id ? " is-selected" : ""}`}
                      type="button"
                      key={seed.id}
                      onClick={() => setSelectedSeedId(seed.id)}
                    >
                      <span className="seed-code-badge">{seed.code}</span>
                      <span>
                        <strong>{seedTitle(seed)}</strong>
                        <small>{seedCategoryLabels[seed.category]} · {seedOriginLabels[seed.origin]} · {seed.year || "år ukjent"}</small>
                      </span>
                      <em className={`seed-stock-dot seed-stock-dot--${seed.stock}`}>{seedStockLabels[seed.stock]}</em>
                    </button>
                  ))}
                  {!filteredSeedEntries.length ? (
                    <article className="soft-card empty-state-card">
                      <strong>Ingen frø her ennå</strong>
                      <p>Legg inn et frø eller juster søk og kategori.</p>
                    </article>
                  ) : null}
                </div>
              </div>

              {selectedSeed ? (
                <section className="seed-detail-panel">
                  <div className="seed-detail-panel__head">
                    <span className="seed-code-badge seed-code-badge--large">{selectedSeed.code}</span>
                    <div>
                      <p className="section-kicker">{seedCategoryLabels[selectedSeed.category]} · {seedOriginLabels[selectedSeed.origin]}</p>
                      <h2>{seedTitle(selectedSeed)}</h2>
                      <span>{selectedSeed.source || selectedSeed.location || "Ingen kilde registrert"}</span>
                    </div>
                  </div>

                  <div className="seed-detail-meta">
                    <article>
                      <span>År</span>
                      <strong>{selectedSeed.year || "Ukjent"}</strong>
                    </article>
                    <article>
                      <span>Høstet</span>
                      <strong>{formatDate(selectedSeed.harvestDate)}</strong>
                    </article>
                    <article>
                      <span>Beholdning</span>
                      <strong>{seedStockLabels[selectedSeed.stock]}</strong>
                    </article>
                    <article>
                      <span>Spireevne</span>
                      <strong>{seedGerminationLabels[selectedSeed.germination]}</strong>
                    </article>
                  </div>

                  <article className="plant-info-card seed-notes-card">
                    <p className="section-kicker">Notat</p>
                    <span>{selectedSeed.notes || "Ingen notater ennå."}</span>
                  </article>

                  <article className="plant-info-card seed-log-card">
                    <div className="seed-log-card__head">
                      <p className="section-kicker">Siste oppfølging</p>
                      <button className="text-action" type="button" onClick={() => openActivitySheet(selectedSeed.id)}>
                        Ny logg
                      </button>
                    </div>
                    <div className="seed-activity-mini-list">
                      {selectedSeedActivities.slice(0, 3).map((activity) => (
                        <span key={activity.id}>
                          <strong>{seedActivityTypeLabels[activity.type]}</strong>
                          {formatDate(activity.date)} · {seedActivityStatusLabels[activity.status]}
                        </span>
                      ))}
                      {!selectedSeedActivities.length ? <small>Ingen såing, poding eller spiretest registrert.</small> : null}
                    </div>
                  </article>

                  <div className="seed-detail-actions">
                    <button className="secondary-action" type="button" onClick={() => openSeedSheet(selectedSeed)}>
                      Rediger
                    </button>
                    <button className="secondary-action seed-delete-action" type="button" onClick={() => deleteSeed(selectedSeed.id)}>
                      Slett
                    </button>
                  </div>
                </section>
              ) : null}
            </section>
          ) : null}

          {seedView === "activity" ? (
            <section className="settings-section seed-activity-panel">
              <div className="seed-activity-panel__head">
                <div>
                  <p className="section-kicker">Sesonglogg</p>
                  <h2>Sådd, spiretestet og podet</h2>
                </div>
                <button className="primary-action" type="button" onClick={() => openActivitySheet()} disabled={!seedEntries.length}>
                  Ny logg
                </button>
              </div>

              <div className="seed-activity-list">
                {seedActivities.map((activity) => (
                  <article className="seed-activity-card" key={activity.id}>
                    <span className="seed-code-badge">{activity.seedCode}</span>
                    <div>
                      <p className="section-kicker">{seedActivityTypeLabels[activity.type]} · {formatDate(activity.date)}</p>
                      <h3>{activity.seedName}</h3>
                      <small>
                        {seedActivityStatusLabels[activity.status]}
                        {activity.quantity ? ` · ${activity.quantity} stk` : ""}
                        {activity.placement ? ` · ${activity.placement}` : ""}
                      </small>
                      {activity.type === "podet" && (activity.rootstock || activity.scion) ? (
                        <small>Grunnstamme: {activity.rootstock || "ikke satt"} · Podekvist: {activity.scion || "ikke satt"}</small>
                      ) : null}
                      {activity.notes ? <p>{activity.notes}</p> : null}
                    </div>
                  </article>
                ))}
                {!seedActivities.length ? (
                  <article className="soft-card empty-state-card">
                    <strong>Ingen logg ennå</strong>
                    <p>Registrer en såing, poding eller spiretest når du bruker frøene.</p>
                  </article>
                ) : null}
              </div>
            </section>
          ) : null}

          {seedView === "print" ? (
            <section className="settings-section seed-print-panel">
              <div className="seed-print-actions">
                <div>
                  <p className="section-kicker">Utskrift</p>
                  <h2>Innholdsliste for frøesken</h2>
                </div>
                <button className="primary-action" type="button" onClick={printSeedIndex}>
                  Skriv ut / PDF
                </button>
              </div>

              <article className="seed-print-sheet">
                <header>
                  <div>
                    <p>Growly Garden</p>
                    <h2>Frøeske innholdsliste</h2>
                  </div>
                  <span>{printDate}</span>
                </header>
                <table>
                  <thead>
                    <tr>
                      <th>Nr.</th>
                      <th>Frø / sort</th>
                      <th>Type</th>
                      <th>År</th>
                      <th>Opprinnelse</th>
                      <th>Status</th>
                      <th>Plass / notat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seedEntries.map((seed) => (
                      <tr key={seed.id}>
                        <td>{seed.code}</td>
                        <td>{seedTitle(seed)}</td>
                        <td>{seedCategoryLabels[seed.category]}</td>
                        <td>{seed.year || "-"}</td>
                        <td>{seedOriginLabels[seed.origin]}</td>
                        <td>{seedStockLabels[seed.stock]}</td>
                        <td>{[seed.location, seed.notes].filter(Boolean).join(" · ") || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <footer>
                  <span>{seedEntries.length} frøposer</span>
                  <span>{lowStockCount} med lav/tom beholdning</span>
                  <span>{needsCheckCount} bør sjekkes</span>
                </footer>
              </article>
            </section>
          ) : null}
        </>
      )}

      {seedSheetOpen ? (
        <div className="greenhouse-sheet" role="dialog" aria-modal="true" aria-labelledby="seed-sheet-title">
          <button className="greenhouse-sheet__backdrop" type="button" aria-label="Lukk frøskjema" onClick={() => setSeedSheetOpen(false)} />
          <section className="greenhouse-sheet__panel soft-card greenhouse-sheet__panel--compact seed-sheet-panel">
            <div className="greenhouse-sheet__header">
              <div>
                <p className="section-kicker">{editingSeedId ? "Rediger frø" : nextSeedCode(seedEntries)}</p>
                <h2 id="seed-sheet-title">{editingSeedId ? "Oppdater frøpose" : "Legg til frø"}</h2>
              </div>
              <button className="soil-modal__close" type="button" aria-label="Lukk" onClick={() => setSeedSheetOpen(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6L18 18M18 6L6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </div>

            <div className="seed-form-grid">
              <label className="field">
                <span>Navn</span>
                <input value={seedForm.name} onChange={(event) => updateSeedForm("name", event.target.value)} placeholder="Sukkerert, blodbeger..." />
              </label>
              <label className="field">
                <span>Sort / variant</span>
                <input value={seedForm.variety} onChange={(event) => updateSeedForm("variety", event.target.value)} placeholder="Høy type, 2. generasjon..." />
              </label>
              <label className="field">
                <span>Type</span>
                <select value={seedForm.category} onChange={(event) => updateSeedForm("category", event.target.value as SeedCategory)}>
                  {seedCategoryOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Opprinnelse</span>
                <select value={seedForm.origin} onChange={(event) => updateSeedForm("origin", event.target.value as SeedOrigin)}>
                  {seedOriginOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>År</span>
                <input value={seedForm.year} onChange={(event) => updateSeedForm("year", event.target.value)} inputMode="numeric" placeholder="2026" />
              </label>
              <label className="field">
                <span>Høstet dato</span>
                <input type="date" value={seedForm.harvestDate} onChange={(event) => updateSeedForm("harvestDate", event.target.value)} />
              </label>
              <label className="field">
                <span>Beholdning</span>
                <select value={seedForm.stock} onChange={(event) => updateSeedForm("stock", event.target.value as SeedStock)}>
                  {seedStockOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Spireevne</span>
                <select value={seedForm.germination} onChange={(event) => updateSeedForm("germination", event.target.value as SeedGermination)}>
                  {seedGerminationOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Kilde</span>
              <input value={seedForm.source} onChange={(event) => updateSeedForm("source", event.target.value)} placeholder="Egne planter, fått av mamma, kjøpt..." />
            </label>
            <label className="field">
              <span>Plassering</span>
              <input value={seedForm.location} onChange={(event) => updateSeedForm("location", event.target.value)} placeholder="Frøeske rad 1, glass, pose..." />
            </label>
            <label className="field">
              <span>Notat</span>
              <textarea value={seedForm.notes} onChange={(event) => updateSeedForm("notes", event.target.value)} rows={4} placeholder="Spirevillige frø, god avling, bør testes..." />
            </label>

            {seedFeedback ? <p className="plant-submit-feedback" role="status">{seedFeedback}</p> : null}
            <button className="primary-action" type="button" onClick={saveSeedEntry}>
              {editingSeedId ? "Lagre endringer" : "Legg til frø"}
            </button>
          </section>
        </div>
      ) : null}

      {activitySheetOpen ? (
        <div className="greenhouse-sheet" role="dialog" aria-modal="true" aria-labelledby="seed-activity-title">
          <button className="greenhouse-sheet__backdrop" type="button" aria-label="Lukk loggskjema" onClick={() => setActivitySheetOpen(false)} />
          <section className="greenhouse-sheet__panel soft-card greenhouse-sheet__panel--compact seed-sheet-panel">
            <div className="greenhouse-sheet__header">
              <div>
                <p className="section-kicker">Frølogg</p>
                <h2 id="seed-activity-title">Registrer aktivitet</h2>
              </div>
              <button className="soil-modal__close" type="button" aria-label="Lukk" onClick={() => setActivitySheetOpen(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6L18 18M18 6L6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </div>

            <label className="field">
              <span>Frø</span>
              <select value={activityForm.seedId} onChange={(event) => updateActivityForm("seedId", event.target.value)}>
                {seedEntries.map((seed) => <option value={seed.id} key={seed.id}>{seed.code} · {seedTitle(seed)}</option>)}
              </select>
            </label>

            <div className="seed-form-grid">
              <label className="field">
                <span>Aktivitet</span>
                <select value={activityForm.type} onChange={(event) => updateActivityForm("type", event.target.value as SeedActivityType)}>
                  {seedActivityTypeOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Dato</span>
                <input type="date" value={activityForm.date} onChange={(event) => updateActivityForm("date", event.target.value)} />
              </label>
              <label className="field">
                <span>Antall</span>
                <input value={activityForm.quantity} onChange={(event) => updateActivityForm("quantity", event.target.value)} inputMode="numeric" placeholder="12" />
              </label>
              <label className="field">
                <span>Status</span>
                <select value={activityForm.status} onChange={(event) => updateActivityForm("status", event.target.value as SeedActivityStatus)}>
                  {seedActivityStatusOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Plassering</span>
              <input value={activityForm.placement} onChange={(event) => updateActivityForm("placement", event.target.value)} placeholder="Inne, drivhus, bed, pallekarm..." />
            </label>

            {activityForm.type === "podet" ? (
              <div className="seed-form-grid">
                <label className="field">
                  <span>Grunnstamme</span>
                  <input value={activityForm.rootstock} onChange={(event) => updateActivityForm("rootstock", event.target.value)} placeholder="Grunnstamme" />
                </label>
                <label className="field">
                  <span>Podekvist / sort</span>
                  <input value={activityForm.scion} onChange={(event) => updateActivityForm("scion", event.target.value)} placeholder="Sort eller kvist" />
                </label>
              </div>
            ) : null}

            <label className="field">
              <span>Notat</span>
              <textarea value={activityForm.notes} onChange={(event) => updateActivityForm("notes", event.target.value)} rows={4} placeholder="Spirte etter 6 dager, svak spiring, plantet ut..." />
            </label>

            {activityFeedback ? <p className="plant-submit-feedback" role="status">{activityFeedback}</p> : null}
            <button className="primary-action" type="button" onClick={saveSeedActivity} disabled={!activityForm.seedId}>
              Lagre logg
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
