import { Link } from "react-router-dom";
import type { AuthSession, PlantCatalogItem } from "../lib/api";
import { PlantAvatar } from "../components/PlantAvatar";
import { bundledPlantCatalog } from "../data/plantCatalog";

type CalendarPageProps = {
  session: AuthSession | null;
};

type PlannerCrop = {
  id: string;
  title: string;
  subtitle: string;
  plantId: string;
  months: Array<{ month: string; task: string; tone: "now" | "soon" | "later" }>;
  goodNeighbors: string[];
  badNeighbors: string[];
  healthWatch: string;
  reminder: string;
};

const plannerCrops: PlannerCrop[] = [
  {
    id: "tomato",
    title: "Tomat",
    subtitle: "Varm start, jevn fukt og mye lys",
    plantId: "tomato",
    months: [
      { month: "Feb", task: "Forbered jord og lys", tone: "soon" },
      { month: "Mar", task: "Så inne", tone: "now" },
      { month: "Apr", task: "Pott om", tone: "now" },
      { month: "Mai", task: "Flytt til drivhus", tone: "soon" },
      { month: "Jun", task: "Bind opp", tone: "later" },
      { month: "Jul", task: "Høst og topp", tone: "later" },
    ],
    goodNeighbors: ["Basilikum", "Tagetes", "Persille"],
    badNeighbors: ["Potet", "Fennikel", "Kål"],
    healthWatch: "Se etter gråmugg, bladflekker og sprekking ved ujevn vanning.",
    reminder: "Sjekk sideskudd, binding og jevn jordfukt 2 ganger i uken.",
  },
  {
    id: "cucumber",
    title: "Agurk",
    subtitle: "Høy fukt, varm jord og rolig ompotting",
    plantId: "cucumber",
    months: [
      { month: "Mar", task: "Planlegg plass", tone: "soon" },
      { month: "Apr", task: "Så inne", tone: "now" },
      { month: "Mai", task: "Plant inn", tone: "now" },
      { month: "Jun", task: "Led oppover", tone: "soon" },
      { month: "Jul", task: "Høst ofte", tone: "later" },
      { month: "Aug", task: "Følg mugg", tone: "later" },
    ],
    goodNeighbors: ["Dill", "Bønner", "Salat"],
    badNeighbors: ["Potet", "Salvie", "Melon tett på"],
    healthWatch: "Se etter meldugg, slappe blad og råte ved for våt jord.",
    reminder: "Vann i små, jevne pulser og luft drivhuset etter fuktige perioder.",
  },
  {
    id: "pepper",
    title: "Paprika og chili",
    subtitle: "Tidlig start, stabil varme og kontrollert fukt",
    plantId: "pepper",
    months: [
      { month: "Jan", task: "Chili kan sås", tone: "soon" },
      { month: "Feb", task: "Så paprika", tone: "now" },
      { month: "Mar", task: "Lys og varme", tone: "now" },
      { month: "Apr", task: "Pott gradvis", tone: "soon" },
      { month: "Mai", task: "Flytt inn", tone: "later" },
      { month: "Aug", task: "Modning", tone: "later" },
    ],
    goodNeighbors: ["Basilikum", "Løk", "Tagetes"],
    badNeighbors: ["Fennikel", "Bønner tett på", "For tett bladverk"],
    healthWatch: "Se etter blomsterfall, bladlus og tørkestress i små potter.",
    reminder: "Hold jevn varme og la øverste jordlag tørke lett mellom vanning.",
  },
];

const premiumFeatures = [
  {
    title: "Hva kan sås nå",
    label: "Sesong",
    text: "Forslag basert på måned, drivhusstatus og plantene du allerede dyrker.",
  },
  {
    title: "Plantevenner",
    label: "Naboer",
    text: "Gode og dårlige naboer vises som rolige beslutningskort før du planter.",
  },
  {
    title: "Plantehelse",
    label: "Sjekk",
    text: "Symptomer kobles mot fukt, lys og temperatur før vi foreslår tiltak.",
  },
  {
    title: "Påminnelser",
    label: "Rutine",
    text: "Vanning, ompotting, herding og innflytting samles som neste handling.",
  },
];

function catalogMatch(plantId: string): PlantCatalogItem | undefined {
  return bundledPlantCatalog.find((item) => item.profile_id === plantId && item.kind === "base");
}

function currentMonthLabel(): string {
  return new Date().toLocaleDateString("nb-NO", { month: "long" });
}

export function CalendarPage({ session }: CalendarPageProps) {
  const name = session?.user?.full_name || session?.username || "bruker";
  const highlightedCrop = plannerCrops[0];

  return (
    <main className="page-shell app-page planner-page">
      <section className="screen-header planner-header">
        <div>
          <h1>Dyrkeplan <span className="leaf-mark">🌿</span></h1>
          <p>En roligere og mer presis Growly-versjon av plantekalender, plantevenner, sykdomssjekk og påminnelser.</p>
        </div>
        <Link className="planner-header-link" to="/kartotek">Kartotek</Link>
      </section>

      <section className="planner-hero soft-card">
        <div className="planner-hero__copy">
          <p className="section-kicker">Growly Planlegger · {currentMonthLabel()}</p>
          <h2>Hei, {name}. Dette er neste nivå for dyrkingen din.</h2>
          <p>
            Her får du kalender, plantelogikk og konkrete tiltak i samme premium språk som resten av appen:
            rolig, presist og koblet mot drivhuset ditt.
          </p>
        </div>
        <div className="planner-hero__preview" aria-label="Planleggingskort">
          <span>Aktuelt nå</span>
          <strong>{highlightedCrop.title}</strong>
          <small>{highlightedCrop.subtitle}</small>
          <div className="planner-mini-calendar">
            {highlightedCrop.months.slice(1, 5).map((item) => (
              <span key={item.month} className={`planner-month planner-month--${item.tone}`}>
                <strong>{item.month}</strong>
                {item.task}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="planner-feature-grid">
        {premiumFeatures.map((feature) => (
          <article className="planner-feature-card soft-card" key={feature.title}>
            <span>{feature.label}</span>
            <strong>{feature.title}</strong>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>

      <section className="settings-section">
        <p className="section-kicker">Hva passer nå</p>
        <div className="planner-crop-grid">
          {plannerCrops.map((crop) => {
            const match = catalogMatch(crop.plantId);
            return (
              <article className="planner-crop-card soft-card" key={crop.id}>
                <div className="planner-crop-card__head">
                  <PlantAvatar tone={match?.tone ?? "leafy"} plantId={crop.plantId} name={crop.title} family={match?.family ?? crop.subtitle} />
                  <div>
                    <span>{match?.category || "Dyrkeplan"}</span>
                    <h2>{crop.title}</h2>
                    <p>{crop.subtitle}</p>
                  </div>
                </div>
                <div className="planner-timeline">
                  {crop.months.map((item) => (
                    <span className={`planner-timeline__item planner-timeline__item--${item.tone}`} key={`${crop.id}-${item.month}`}>
                      <strong>{item.month}</strong>
                      {item.task}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="planner-split-grid">
        <article className="planner-neighbor-card soft-card">
          <p className="section-kicker">Plantevenner</p>
          <h2>{highlightedCrop.title}</h2>
          <div className="neighbor-columns">
            <div>
              <span className="neighbor-label neighbor-label--good">Gode naboer</span>
              {highlightedCrop.goodNeighbors.map((neighbor) => <strong key={neighbor}>{neighbor}</strong>)}
            </div>
            <div>
              <span className="neighbor-label neighbor-label--bad">Unngå tett på</span>
              {highlightedCrop.badNeighbors.map((neighbor) => <strong key={neighbor}>{neighbor}</strong>)}
            </div>
          </div>
        </article>

        <article className="planner-health-card soft-card">
          <p className="section-kicker">Plantehelse</p>
          <h2>Smart sjekk før diagnose</h2>
          <p>{highlightedCrop.healthWatch}</p>
          <div className="health-check-list">
            <span>Sjekk bladverk og underside</span>
            <span>Sammenlign med siste fukttrend</span>
            <span>Se om lys eller lufting har vært utenfor område</span>
          </div>
        </article>
      </section>

      <section className="planner-reminder-card soft-card">
        <div>
          <p className="section-kicker">Neste handling</p>
          <h2>{highlightedCrop.reminder}</h2>
          <p>Dette kan senere bli ekte pushvarsler når vi kobler planleggeren mot logg, sådato og sensordata.</p>
        </div>
        <Link className="button planner-cta" to="/drivhus">Se mine planter</Link>
      </section>
    </main>
  );
}
