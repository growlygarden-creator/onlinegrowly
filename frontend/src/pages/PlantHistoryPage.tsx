import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlantAvatar } from "../components/PlantAvatar";
import { fetchPlantHistory, type AuthSession, type GrowlyPlant, type PlantCatalogItem } from "../lib/api";
import { useI18n, type AppLanguage } from "../lib/i18n";

type PlantTone = PlantCatalogItem["tone"];

type PlantHistoryPageProps = {
  session: AuthSession | null;
};

function formatHistoryDate(value: string | undefined, language: AppLanguage): string {
  if (!value) return language === "en" ? "Unknown date" : "Ukjent dato";
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return language === "en" ? "Unknown date" : "Ukjent dato";
  return date.toLocaleDateString(language === "en" ? "en-US" : "nb-NO", { day: "2-digit", month: "short", year: "numeric" });
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
  const { language } = useI18n();
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
          <p className="section-kicker">{language === "en" ? "History" : "Historikk"}</p>
          <h1>{language === "en" ? "Previous projects" : "Tidligere prosjekter"}</h1>
          <p>
            {language === "en"
              ? "Finished plant projects, seasons and attempts you have put behind you."
              : "Avsluttede planteprosjekter, sesonger og forsøk du har lagt bak deg."}
          </p>
        </div>
        <Link className="icon-button" to="/settings" aria-label={language === "en" ? "Back to settings" : "Tilbake til innstillinger"}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </Link>
      </section>

      <section className="settings-section">
        <article className="soft-card history-summary-card">
          <span>{language === "en" ? "Saved in history" : "Lagret i historikk"}</span>
          <strong>{plantHistory.length}</strong>
          <small>
            {language === "en"
              ? plantHistory.length === 1 ? "plant project" : "plant projects"
              : plantHistory.length === 1 ? "planteprosjekt" : "planteprosjekter"}
          </small>
        </article>
      </section>

      <section className="settings-section">
        {loading ? (
          <article className="soft-card empty-history-card">
            <strong>{language === "en" ? "Loading history..." : "Laster historikk..."}</strong>
            <span>{language === "en" ? "Fetching finished plant projects from your account." : "Henter avsluttede planteprosjekter fra kontoen din."}</span>
          </article>
        ) : plantHistory.length ? (
          <div className="plant-history-list plant-history-list--page">
            {plantHistory.map((item) => (
              <article className="plant-history-item plant-history-item--page" key={`${item.instanceId}-${item.archivedAt ?? item.archived_at}`}>
                <PlantAvatar tone={toneForHistory(item)} name={item.display_name || item.nickname} />
                <div>
                  <strong>{item.display_name || item.nickname || (language === "en" ? "Plant project" : "Planteprosjekt")}</strong>
                  <span>{language === "en" ? "Finished" : "Avsluttet"} · {formatHistoryDate(item.archivedAt ?? item.archived_at ?? undefined, language)}</span>
                  <small>{language === "en" ? "Sown" : "Sådd"} {formatHistoryDate(item.sowedAt ?? item.sowed_at ?? undefined, language)}</small>
                  {item.movedToGreenhouseAt || item.moved_to_greenhouse_at ? (
                    <small>
                      {language === "en" ? "Moved to greenhouse" : "Flyttet til drivhus"} {formatHistoryDate(item.movedToGreenhouseAt ?? item.moved_to_greenhouse_at ?? undefined, language)}
                    </small>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <article className="soft-card empty-history-card">
            <strong>{language === "en" ? "No history yet" : "Ingen historikk ennå"}</strong>
            <span>
              {language === "en"
                ? "When you finish a plant project from My plants, it will appear here."
                : "Når du avslutter et planteprosjekt fra Mine planter, dukker det opp her."}
            </span>
          </article>
        )}
      </section>
    </main>
  );
}
