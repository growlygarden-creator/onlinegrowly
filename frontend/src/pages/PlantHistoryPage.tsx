import { Link } from "react-router-dom";
import { PlantAvatar } from "../components/PlantAvatar";
import type { AuthSession, PlantCatalogItem } from "../lib/api";
import { readUserArray } from "../lib/userStorage";

type PlantTone = PlantCatalogItem["tone"];

type PlantHistoryItem = {
  instanceId: string;
  displayName?: string;
  nickname?: string;
  family?: string;
  sowedAt?: string;
  archivedAt?: string;
  outcomeLabel?: string;
  outcome?: string;
  notes?: string;
  movedToGreenhouseAt?: string | null;
  location?: "greenhouse" | "outside";
};

const PLANT_HISTORY_STORAGE_KEY = "growly.plantHistory";

type PlantHistoryPageProps = {
  session: AuthSession | null;
};

function loadPlantHistory(session: AuthSession | null): PlantHistoryItem[] {
  return readUserArray<PlantHistoryItem>(PLANT_HISTORY_STORAGE_KEY, session);
}

function formatHistoryDate(value: string | undefined): string {
  if (!value) return "Ukjent dato";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Ukjent dato";
  return date.toLocaleDateString("nb-NO", { day: "2-digit", month: "short", year: "numeric" });
}

function toneForHistory(item: PlantHistoryItem): PlantTone {
  const text = `${item.displayName ?? ""} ${item.nickname ?? ""} ${item.family ?? ""}`.toLowerCase();
  if (text.includes("tomat")) return "tomato";
  if (text.includes("agurk")) return "cucumber";
  if (text.includes("chili") || text.includes("paprika") || text.includes("pepper")) return "pepper";
  if (text.includes("bær") || text.includes("jordbær") || text.includes("berry")) return "berry";
  if (text.includes("urt") || text.includes("basil") || text.includes("mynte")) return "basil";
  return "leafy";
}

export function PlantHistoryPage({ session }: PlantHistoryPageProps) {
  const plantHistory = loadPlantHistory(session);

  return (
    <main className="page-shell app-page history-page">
      <section className="screen-header">
        <div>
          <p className="section-kicker">Historikk</p>
          <h1>Tidligere prosjekter</h1>
          <p>Avsluttede planteprosjekter, sesonger og forsøk du har lagt bak deg.</p>
        </div>
        <Link className="icon-button" to="/settings" aria-label="Tilbake til innstillinger">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </Link>
      </section>

      <section className="settings-section">
        <article className="soft-card history-summary-card">
          <span>Lagret i historikk</span>
          <strong>{plantHistory.length}</strong>
          <small>{plantHistory.length === 1 ? "planteprosjekt" : "planteprosjekter"}</small>
        </article>
      </section>

      <section className="settings-section">
        {plantHistory.length ? (
          <div className="plant-history-list plant-history-list--page">
            {plantHistory.map((item) => (
              <article className="plant-history-item plant-history-item--page" key={`${item.instanceId}-${item.archivedAt}`}>
                <PlantAvatar tone={toneForHistory(item)} name={item.displayName || item.nickname} family={item.family} />
                <div>
                  <strong>{item.displayName || item.nickname || "Planteprosjekt"}</strong>
                  <span>{item.outcomeLabel || "Avsluttet"} · {formatHistoryDate(item.archivedAt)}</span>
                  <small>Sådd {formatHistoryDate(item.sowedAt)}{item.family ? ` · ${item.family}` : ""}</small>
                  {item.movedToGreenhouseAt ? <small>Flyttet til drivhus {formatHistoryDate(item.movedToGreenhouseAt)}</small> : null}
                  {item.notes ? <p>{item.notes}</p> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <article className="soft-card empty-history-card">
            <strong>Ingen historikk ennå</strong>
            <span>Når du avslutter et planteprosjekt fra Mine planter, dukker det opp her.</span>
          </article>
        )}
      </section>
    </main>
  );
}
