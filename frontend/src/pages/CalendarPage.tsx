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

type PlannerAction = {
  id: string;
  plantId: string;
  title: string;
  action: string;
  timing: string;
  note: string;
  group: "Så nå" | "Plant/flytt nå" | "Følg opp";
};

const mayPlannerActions: PlannerAction[] = [
  {
    id: "cucumber-sow",
    plantId: "cucumber",
    title: "Agurk",
    action: "Så inne eller plant inn småplanter",
    timing: "Mai",
    note: "Varm jord, lite rotforstyrrelse og jevn fukt fra start.",
    group: "Så nå",
  },
  {
    id: "squash-sow",
    plantId: "squash",
    title: "Squash",
    action: "Så inne nå",
    timing: "Mai",
    note: "Rask vekst. Bruk romslig potte og flytt når nettene er stabile.",
    group: "Så nå",
  },
  {
    id: "basil-sow",
    plantId: "basil",
    title: "Basilikum",
    action: "Så eller start ny potte",
    timing: "Mai",
    note: "Liker varme, lys og jevn fukt. Hold unna kalde netter.",
    group: "Så nå",
  },
  {
    id: "lettuce-sow",
    plantId: "lettuce",
    title: "Salat",
    action: "Så i omganger",
    timing: "Mai-juni",
    note: "Så små runder ofte, så får du jevnere høsting og mindre svinn.",
    group: "Så nå",
  },
  {
    id: "arugula-sow",
    plantId: "arugula",
    title: "Ruccola",
    action: "Så direkte",
    timing: "Mai",
    note: "Rask avling. Hold jorda lett fuktig for mildere smak.",
    group: "Så nå",
  },
  {
    id: "radish-sow",
    plantId: "radish",
    title: "Reddik",
    action: "Så direkte",
    timing: "Mai",
    note: "Klar raskt. Jevn fukt gir sprø røtter uten sprekking.",
    group: "Så nå",
  },
  {
    id: "carrot-sow",
    plantId: "carrot",
    title: "Gulrot",
    action: "Så direkte",
    timing: "Mai",
    note: "Så i dyp, løs jord. Unngå ompotting og hold overflaten fuktig.",
    group: "Så nå",
  },
  {
    id: "bean-sow",
    plantId: "bean",
    title: "Bønner",
    action: "Så når jorda er varm",
    timing: "Sen mai",
    note: "Vent heller litt enn å så i kald jord. Gir bedre spiring.",
    group: "Så nå",
  },
  {
    id: "tomato-move",
    plantId: "tomato",
    title: "Tomat",
    action: "Flytt til drivhus og bind opp",
    timing: "Mai-juni",
    note: "Plant dypt, gi støtte og hold jevn fukt for å unngå sprekking.",
    group: "Plant/flytt nå",
  },
  {
    id: "pepper-move",
    plantId: "pepper",
    title: "Paprika",
    action: "Flytt inn når nettene er stabile",
    timing: "Mai-juni",
    note: "Trenger varm jord, rolig ompotting og mye lys.",
    group: "Plant/flytt nå",
  },
  {
    id: "chili-move",
    plantId: "chili",
    title: "Chili",
    action: "Pott opp og herde forsiktig",
    timing: "Mai",
    note: "Ikke stress planten med kald jord. Litt tørrere mellom vanning.",
    group: "Plant/flytt nå",
  },
  {
    id: "strawberry-watch",
    plantId: "strawberry",
    title: "Jordbær",
    action: "Følg blomstring og fukt",
    timing: "Mai-juni",
    note: "Luft godt rundt plantene og unngå vann rett på blomster.",
    group: "Følg opp",
  },
  {
    id: "herbs-watch",
    plantId: "parsley",
    title: "Urter",
    action: "Klipp lett og så påfyll",
    timing: "Mai",
    note: "Persille, dill og koriander kan holdes i jevn produksjon.",
    group: "Følg opp",
  },
];

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
  {
    id: "leafy",
    title: "Salat og bladgrønt",
    subtitle: "Rask avling, små runder og kjøligere vekst",
    plantId: "lettuce",
    months: [
      { month: "Mar", task: "Start tidlig", tone: "soon" },
      { month: "Apr", task: "Så runde 1", tone: "now" },
      { month: "Mai", task: "Så på nytt", tone: "now" },
      { month: "Jun", task: "Høst ofte", tone: "soon" },
      { month: "Jul", task: "Skygge lett", tone: "later" },
      { month: "Aug", task: "Ny høstrunde", tone: "later" },
    ],
    goodNeighbors: ["Reddik", "Gulrot", "Jordbær"],
    badNeighbors: ["For tett tomat", "Sterk varme", "Tørr jord"],
    healthWatch: "Følg med på tørre bladkanter og rask stokkløping ved varme.",
    reminder: "Så små mengder hver 10.-14. dag for jevn tilgang.",
  },
  {
    id: "root",
    title: "Reddik og gulrot",
    subtitle: "Så direkte, jevn fukt og løs jord",
    plantId: "radish",
    months: [
      { month: "Apr", task: "Klargjør jord", tone: "soon" },
      { month: "Mai", task: "Så direkte", tone: "now" },
      { month: "Jun", task: "Tynn forsiktig", tone: "now" },
      { month: "Jul", task: "Høst reddik", tone: "soon" },
      { month: "Aug", task: "Høst gulrot", tone: "later" },
      { month: "Sep", task: "Siste runde", tone: "later" },
    ],
    goodNeighbors: ["Løk", "Salat", "Erter"],
    badNeighbors: ["Kompakt jord", "Ujevn vanning", "Ompotting"],
    healthWatch: "Sprekk og trevlete røtter kommer ofte av ujevn fukt.",
    reminder: "Vann lett og ofte i spiringen, deretter dypere.",
  },
  {
    id: "herbs",
    title: "Urter",
    subtitle: "Påfyll gjennom sesongen og riktig fukt per type",
    plantId: "basil",
    months: [
      { month: "Mar", task: "Start inne", tone: "soon" },
      { month: "Apr", task: "Pott om", tone: "now" },
      { month: "Mai", task: "Så mer", tone: "now" },
      { month: "Jun", task: "Klipp ofte", tone: "soon" },
      { month: "Jul", task: "Forny potter", tone: "later" },
      { month: "Aug", task: "Tørk/lagre", tone: "later" },
    ],
    goodNeighbors: ["Tomat", "Paprika", "Salat"],
    badNeighbors: ["Våt basilikumjord", "Tørr mynte", "Kalde netter"],
    healthWatch: "Ulike urter trenger ulik fukt. Middelhavsurter skal tørke mer.",
    reminder: "Klipp over bladpar og så små påfyll for jevn produksjon.",
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

function actionGroups() {
  return [
    { label: "Så nå", items: mayPlannerActions.filter((item) => item.group === "Så nå") },
    { label: "Plant/flytt nå", items: mayPlannerActions.filter((item) => item.group === "Plant/flytt nå") },
    { label: "Følg opp", items: mayPlannerActions.filter((item) => item.group === "Følg opp") },
  ];
}

function currentMonthLabel(): string {
  return new Date().toLocaleDateString("nb-NO", { month: "long" });
}

export function CalendarPage({ session }: CalendarPageProps) {
  const name = session?.user?.full_name || session?.username || "bruker";
  const groupedActions = actionGroups();
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
          <h2>Hei, {name}. Mai har mer enn tomat.</h2>
          <p>
            Her får du konkrete valg for hva som kan sås, flyttes og følges opp nå, med samme rolige
            Growly-stil som resten av appen.
          </p>
        </div>
        <div className="planner-hero__preview" aria-label="Planleggingskort">
          <span>Aktuelt nå</span>
          <strong>{mayPlannerActions.length} konkrete valg</strong>
          <small>Så nye runder, flytt varme planter inn og følg opp det som allerede vokser.</small>
          <div className="planner-now-summary">
            {groupedActions.map((group) => (
              <span key={group.label}>
                <strong>{group.items.length}</strong>
                {group.label}
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
        <p className="section-kicker">Kan gjøres nå</p>
        <div className="planner-action-groups">
          {groupedActions.map((group) => (
            <article className="planner-action-group soft-card" key={group.label}>
              <div className="planner-action-group__head">
                <span>{group.label}</span>
                <strong>{group.items.length}</strong>
              </div>
              <div className="planner-action-list">
                {group.items.map((item) => {
                  const match = catalogMatch(item.plantId);
                  return (
                    <div className="planner-action-row" key={item.id}>
                      <PlantAvatar tone={match?.tone ?? "leafy"} plantId={item.plantId} name={item.title} family={match?.family ?? item.group} />
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.action}</span>
                        <small>{item.note}</small>
                      </div>
                      <em>{item.timing}</em>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <p className="section-kicker">Dyrkeplaner</p>
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
