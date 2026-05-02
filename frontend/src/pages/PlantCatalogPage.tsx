import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPlantCatalog, type AuthSession, type PlantCatalogItem } from "../lib/api";
import { bundledPlantCatalog } from "../data/plantCatalog";
import { PlantAvatar } from "../components/PlantAvatar";
import { plantCareGuide } from "../lib/plantCare";

type PlantCatalogPageProps = {
  session: AuthSession | null;
};

type CatalogFilter = "all" | "base" | "variant" | "cultivar";

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
  const [filter, setFilter] = useState<CatalogFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlantCatalog().then((result) => {
      if (result.length) {
        setItems(result);
      }
    });
  }, []);

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    return items
      .filter((item) => filter === "all" || item.kind === filter)
      .filter((item) => {
        if (!search) return true;
        return `${item.display_name} ${item.subtitle} ${item.category} ${item.family} ${item.latin_name}`.toLowerCase().includes(search);
      })
      .slice(0, 160);
  }, [filter, items, query]);

  const selectedItem = items.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;
  const selectedCareGuide = selectedItem ? plantCareGuide(selectedItem) : null;

  return (
    <main className="page-shell app-page catalog-page">
      <section className="screen-header">
        <div>
          <h1>Kartotek</h1>
          <p>Bla i baseplanter, typer og sorter før du legger dem til i Mine planter.</p>
        </div>
      </section>

      <Link className="planner-entry-card soft-card" to="/kalender">
        <div>
          <p className="section-kicker">Growly Planlegger</p>
          <h2>Såkalender, plantevenner og smarte tiltak</h2>
          <span>Planlegg hva du skal så, hvor det passer, og hva du bør følge med på.</span>
        </div>
        <strong>Åpne</strong>
      </Link>

      <section className="settings-section catalog-browser">
        <label className="field">
          <span>Søk i kartoteket</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tomat, Sungold, chili, salat..." />
        </label>

        <div className="catalog-filter-row" aria-label="Filter">
          {[
            ["all", "Alle"],
            ["base", "Base"],
            ["variant", "Typer"],
            ["cultivar", "Sorter"],
          ].map(([value, label]) => (
            <button
              className={filter === value ? "is-selected" : ""}
              type="button"
              key={value}
              onClick={() => setFilter(value as CatalogFilter)}
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
                <small>{kindLabel(item.kind)} · {item.subtitle}</small>
              </span>
            </button>
          ))}
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
