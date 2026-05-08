import { useEffect, useMemo, useState } from "react";
import { fetchPlantCatalog, type AuthSession, type PlantCatalogItem } from "../lib/api";
import { bundledPlantCatalog } from "../data/plantCatalog";
import { PlantAvatar } from "../components/PlantAvatar";
import { plantCareGuide } from "../lib/plantCare";

type PlantCatalogPageProps = {
  session: AuthSession | null;
};

function kindLabel(kind: PlantCatalogItem["kind"]): string {
  if (kind === "cultivar") return "Sort";
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

export function PlantCatalogPage({ session }: PlantCatalogPageProps) {
  const [items, setItems] = useState<PlantCatalogItem[]>(bundledPlantCatalog);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlantCatalog().then((result) => {
      if (result.length) {
        setItems(result);
      }
    });
  }, []);

  const catalogCategories = useMemo(() => {
    const priority = ["grønnsak", "urt", "bær", "blomst", "frukt"];
    const unique = Array.from(new Set(items.filter((item) => item.kind === "base").map((item) => item.category).filter(Boolean)));
    return unique.sort((a, b) => {
      const aRank = priority.indexOf(a);
      const bRank = priority.indexOf(b);
      if (aRank !== -1 || bRank !== -1) {
        return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank);
      }
      return a.localeCompare(b, "nb-NO");
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    return items
      .filter((item) => search || item.kind === "base")
      .filter((item) => category === "all" || item.category === category)
      .filter((item) => {
        if (!search) return true;
        return `${item.display_name} ${item.subtitle} ${item.category} ${item.family} ${item.latin_name}`.toLowerCase().includes(search);
      })
      .slice(0, 80);
  }, [category, items, query]);

  const selectedItem = selectedId ? items.find((item) => item.id === selectedId) ?? null : null;
  const selectedCareGuide = selectedItem ? plantCareGuide(selectedItem) : null;

  return (
    <main className="page-shell app-page catalog-page">
      <section className="screen-header">
        <div>
          <h1>Kartotek</h1>
          <p>Finn riktig plante raskt, og åpne bare detaljene når du trenger dem.</p>
        </div>
      </section>

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
              <p className="section-kicker">{kindLabel(selectedItem.kind)} · {selectedItem.category}</p>
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
    </main>
  );
}
