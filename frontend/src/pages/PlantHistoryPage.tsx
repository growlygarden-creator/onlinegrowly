import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlantAvatar } from "../components/PlantAvatar";
import { fetchPlantHistory, type AuthSession, type GrowlyPlant, type PlantCatalogItem } from "../lib/api";

type PlantTone = PlantCatalogItem["tone"];

type PlantHistoryPageProps = {
  session: AuthSession | null;
};

function formatHistoryDate(value: string | undefined): string {
  if (!value) return "Ukjent dato";
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Ukjent dato";
  return date.toLocaleDateString("nb-NO", { day: "2-digit", month: "short", year: "numeric" });
}

function toneForHistory(item: GrowlyPlant): PlantTone {
  const text = `${item.display_name ?? ""} ${item.nickname ?? ""} ${item.profileId ?? ""}`.toLowerCase();
  if (text.includes("tomat")) return "tomato";
  if (text.includes("agurk")) return "cucumber";
  if (text.includes("chili") || text.includes("paprika") || text.includes("pepper")) return "pepper";
  if (text.includes("bær") || text.includes("jordbær") || text.includes("berry")) return "berry";
  if (text.includes("urt") || text.includes("basil") || text.includes("mynte")) return "basil";
  return "leafy";
}

export function PlantHistoryPage({ session }: PlantHistoryPageProps) {
  const [plantHistory, setPlantHistory] = useState<GrowlyPlant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPlantHistory(session?.hub?.hub_id ?? "").then((items) => {
      if (!cancelled) {
        setPlantHistory(items);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session?.username, session?.hub?.hub_id]);

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
        {loading ? (
          <article className="soft-card empty-history-card">
            <strong>Laster historikk...</strong>
            <span>Henter avsluttede planteprosjekter fra kontoen din.</span>
          </article>
        ) : plantHistory.length ? (
          <div className="plant-history-list plant-history-list--page">
            {plantHistory.map((item) => (
              <article className="plant-history-item plant-history-item--page" key={`${item.instanceId}-${item.archivedAt ?? item.archived_at}`}>
                <PlantAvatar tone={toneForHistory(item)} name={item.display_name || item.nickname} />
                <div>
                  <strong>{item.display_name || item.nickname || "Planteprosjekt"}</strong>
                  <span>Avsluttet · {formatHistoryDate(item.archivedAt ?? item.archived_at ?? undefined)}</span>
                  <small>Sådd {formatHistoryDate(item.sowedAt ?? item.sowed_at ?? undefined)}</small>
                  {item.movedToGreenhouseAt || item.moved_to_greenhouse_at ? (
                    <small>Flyttet til drivhus {formatHistoryDate(item.movedToGreenhouseAt ?? item.moved_to_greenhouse_at ?? undefined)}</small>
                  ) : null}
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
