import { useState } from "react";
import { Link } from "react-router-dom";

type GardenArea = {
  title: string;
  detail: string;
  meta: string;
  focus: string;
  nextAction: string;
  plants: string[];
  tone: "greenhouse" | "kitchen" | "herbs" | "pollinator" | "berries" | "indoor" | "seeds";
  icon: JSX.Element;
};

type BloomMonth = {
  month: string;
  plants: string[];
  strength: "low" | "medium" | "high";
};

const gardenAreas: GardenArea[] = [
  {
    title: "Drivhus",
    detail: "12 planter",
    meta: "22.4°C · 2 oppgaver",
    focus: "Klima og vekst",
    nextAction: "Luft litt før ettermiddagen hvis temperaturen passerer 26°C.",
    plants: ["Tomat", "Agurk", "Basilikum"],
    tone: "greenhouse",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20V11.5L12 5l8 6.5V20M7.5 20v-6.4h9V20M12 5v15M3 20h18" />
      </svg>
    ),
  },
  {
    title: "Kjøkkenhage",
    detail: "8 sorter",
    meta: "Salat, gulrot, løk",
    focus: "Matproduksjon ute",
    nextAction: "Tynn gulrøttene og sjekk jordfukt etter neste regn.",
    plants: ["Salat", "Gulrot", "Løk"],
    tone: "kitchen",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 19c4.8-1 9.1-4.6 11.3-10.8M15.8 8.2c.1-2.2 1.7-4 3.9-4.2.4 2.7-.9 4.6-3.9 4.2ZM8 18.2c-2.2-1.6-3.1-4.1-2.5-7.5 3.2 1 5 3 5.3 5.9" />
      </svg>
    ),
  },
  {
    title: "Urtebed",
    detail: "6 urter",
    meta: "Oregano blomstrer snart",
    focus: "Urter for mat og pollinatorer",
    nextAction: "La litt gressløk og oregano blomstre før du klipper alt ned.",
    plants: ["Oregano", "Gressløk", "Timian"],
    tone: "herbs",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20V9M12 13.5c-3.7.2-6.2-1.8-7.5-6 4-.5 6.5 1.5 7.5 6ZM12 11.2c3.4.1 5.8-1.7 7.1-5.4-3.7-.4-6.1 1.4-7.1 5.4Z" />
      </svg>
    ),
  },
  {
    title: "Pollinatorbed",
    detail: "Sterk sommer",
    meta: "Mangler tidlig vår",
    focus: "Bier, humler og sommerfugler",
    nextAction: "Legg inn krokus, lungeurt eller selje for bedre vårtrekk.",
    plants: ["Lavendel", "Honningurt", "Ringblomst"],
    tone: "pollinator",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12c-1.8-2-1.7-4.4.2-7.2 2.3 2.5 2.3 4.9-.2 7.2Zm0 0c2.2-1.6 4.5-1.2 6.8 1.3-2.8 1.8-5.1 1.4-6.8-1.3Zm0 0c-2.2 1.6-4.5 1.2-6.8-1.3 2.8-1.8 5.1-1.4 6.8 1.3Zm0 0c1.8 2 1.7 4.4-.2 7.2-2.3-2.5-2.3-4.9.2-7.2Z" />
      </svg>
    ),
  },
  {
    title: "Bringebærhekk",
    detail: "Trekk + mat",
    meta: "Blomstring i juni",
    focus: "Bær, trekk og skjerming",
    nextAction: "Merk de sterkeste skuddene og behold luft mellom radene.",
    plants: ["Bringebær", "Kløver", "Markjordbær"],
    tone: "berries",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 6v14M9 10c-2.2.2-3.8-1-4.8-3.6 2.9-.5 4.7.7 5.4 3.5M15 11c2.1-.1 3.7-1.4 4.8-3.8-2.8-.5-4.6.7-5.4 3.5M9.5 15.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm5 1.2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      </svg>
    ),
  },
  {
    title: "Inneplanter",
    detail: "9 planter",
    meta: "2 trenger vann",
    focus: "Grønne rom inne",
    nextAction: "Vann bare plantene med tørr jord, ikke hele gruppen samtidig.",
    plants: ["Monstera", "Chili", "Basilikum"],
    tone: "indoor",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 21h8l1-8H7l1 8ZM12 13V5M12 9.5C9.5 9.7 7.7 8.2 6.5 5c3-.4 4.8 1.1 5.5 4.5Zm0 0c2.5.2 4.3-1.3 5.5-4.5-3-.4-4.8 1.1-5.5 4.5Z" />
      </svg>
    ),
  },
  {
    title: "Frøarkiv",
    detail: "24 frøposer",
    meta: "5 egne linjer",
    focus: "Frø, opphav og spiring",
    nextAction: "Registrer spireprosent på egne tomatfrø fra forrige sesong.",
    plants: ["Tomat 2025", "Ringblomst", "Honningurt"],
    tone: "seeds",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 5.5h12v15H6v-15ZM8.5 8.5h7M8.5 12h7M8.5 15.5h4M9 5.5V3.8h6v1.7" />
      </svg>
    ),
  },
];

const bloomMonths: BloomMonth[] = [
  { month: "Mar", plants: ["Krokus"], strength: "low" },
  { month: "Apr", plants: ["Lungeurt"], strength: "low" },
  { month: "Mai", plants: ["Jordbær", "Gressløk"], strength: "medium" },
  { month: "Jun", plants: ["Bringebær", "Kløver"], strength: "high" },
  { month: "Jul", plants: ["Lavendel", "Oregano"], strength: "high" },
  { month: "Aug", plants: ["Honningurt", "Ringblomst"], strength: "high" },
  { month: "Sep", plants: ["Bergknapp"], strength: "medium" },
];

export function MyGardenTestPage() {
  const [selectedArea, setSelectedArea] = useState<GardenArea>(gardenAreas[0]);

  return (
    <main className="page-shell app-page my-garden-test-page">
      <nav className="my-garden-test-nav" aria-label="Testside navigasjon">
        <Link to="/settings" aria-label="Tilbake til innstillinger">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Innstillinger
        </Link>
        <Link to="/" aria-label="Til start">
          Start
        </Link>
      </nav>

      <section className="my-garden-test-hero">
        <div>
          <p className="section-kicker">Testside</p>
          <h1>Min hage</h1>
          <p>En roligere oversikt over områdene dine, pollinatorverdi og hva Aurora ville fulgt med på i dag.</p>
        </div>
        <div className="my-garden-test-score" aria-label="Pollinator-score 64 av 100">
          <span>64</span>
          <small>Pollinator-score</small>
        </div>
      </section>

      <section className="my-garden-test-today" aria-label="Status i dag">
        <div>
          <span className="my-garden-test-pill">I dag</span>
          <h2>Rolig vekstdag</h2>
          <p>3 oppgaver · 1 værvarsel · 2 planter trenger oppfølging</p>
        </div>
        <Link className="my-garden-test-text-link" to="/kalender">
          Se kalender
        </Link>
      </section>

      <section className="my-garden-test-section">
        <div className="my-garden-test-section-head">
          <h2>Mine områder</h2>
          <span>7 rom</span>
        </div>
        <div className="my-garden-test-area-grid">
          {gardenAreas.map((area) => (
            <button
              className={`my-garden-test-area my-garden-test-area--${area.tone}${selectedArea.title === area.title ? " is-selected" : ""}`}
              key={area.title}
              type="button"
              onClick={() => setSelectedArea(area)}
            >
              <div className="my-garden-test-area-icon">{area.icon}</div>
              <div>
                <h3>{area.title}</h3>
                <p>{area.detail}</p>
                <small>{area.meta}</small>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className={`my-garden-test-detail my-garden-test-detail--${selectedArea.tone}`} aria-label={`${selectedArea.title} detalj`}>
        <div className="my-garden-test-detail-head">
          <div className="my-garden-test-area-icon">{selectedArea.icon}</div>
          <div>
            <span>{selectedArea.focus}</span>
            <h2>{selectedArea.title}</h2>
          </div>
        </div>
        <p>{selectedArea.nextAction}</p>
        <div className="my-garden-test-chip-row" aria-label="Eksempelplanter">
          {selectedArea.plants.map((plant) => (
            <span key={plant}>{plant}</span>
          ))}
        </div>
      </section>

      <section className="my-garden-test-section">
        <div className="my-garden-test-section-head">
          <h2>Blomstring</h2>
          <span>Mars-september</span>
        </div>
        <div className="my-garden-test-bloom-strip">
          {bloomMonths.map((month) => (
            <div className={`my-garden-test-bloom my-garden-test-bloom--${month.strength}`} key={month.month}>
              <strong>{month.month}</strong>
              <span aria-hidden="true" />
              <small>{month.plants.join(", ")}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="my-garden-test-aurora">
        <div className="my-garden-test-aurora-mark">A</div>
        <div>
          <h2>Aurora foreslår</h2>
          <p>Du har god sommerblomstring, men lite mat til humler tidlig på våren. Legg til krokus, lungeurt eller selje i neste plan.</p>
        </div>
      </section>
    </main>
  );
}
