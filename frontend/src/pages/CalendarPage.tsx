import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPlants, type AuthSession, type GrowlyPlant, type PlantCatalogItem } from "../lib/api";
import { PlantAvatar } from "../components/PlantAvatar";
import { bundledPlantCatalog } from "../data/plantCatalog";
import {
  addPlantCalendarNote,
  listPlantCalendarEntries,
  type PlantCalendarEntry,
} from "../lib/plantCalendar";

type CalendarPageProps = {
  session: AuthSession | null;
  selectedHubId?: string;
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
type CalendarEvent = PlannerAction & {
  day: number;
  marker: "sow" | "move" | "watch";
};
type CalendarPlantOption = {
  plantId: string;
  plantName: string;
  plantProfileId: string;
  catalogItemId?: string;
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

const plannerMonthOrder = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"];

function monthRank(month: string): number {
  return plannerMonthOrder.findIndex((value) => value.toLowerCase() === month.toLowerCase());
}

function futureCropMonths(crop: PlannerCrop) {
  const currentMonth = new Date().getMonth();
  return crop.months
    .filter((item) => {
      const rank = monthRank(item.month);
      return rank >= currentMonth;
    })
    .map((item) => {
      const rank = monthRank(item.month);
      const tone = rank === currentMonth ? "now" : rank === currentMonth + 1 ? "soon" : "later";
      return { ...item, tone: tone as PlannerCrop["months"][number]["tone"] };
    });
}

function dateParam(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthGridDays() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayIndex = (firstDay.getDay() + 6) % 7;
  return [
    ...Array.from({ length: mondayIndex }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}

function calendarEvents(today: number): CalendarEvent[] {
  const events: CalendarEvent[] = [
    { ...mayPlannerActions[0], day: today, marker: "sow" },
    { ...mayPlannerActions[2], day: today + 1, marker: "sow" },
    { ...mayPlannerActions[5], day: today + 5, marker: "sow" },
    { ...mayPlannerActions[8], day: today + 9, marker: "move" },
    { ...mayPlannerActions[10], day: today + 12, marker: "move" },
    { ...mayPlannerActions[11], day: today + 15, marker: "watch" },
    { ...mayPlannerActions[12], day: today + 20, marker: "watch" },
  ];

  return events.filter((event) => event.day <= 31);
}

function plantEntryDate(entry: PlantCalendarEntry): Date | null {
  const date = new Date(`${entry.date}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function plantEntryMarker(entry: PlantCalendarEntry): "sow" | "move" | "watch" {
  if (entry.category === "move" || entry.category === "support") {
    return "move";
  }
  if (entry.category === "water" || entry.category === "harvest") {
    return "sow";
  }
  return "watch";
}

function plantEntriesForMonth(entries: PlantCalendarEntry[], now: Date): PlantCalendarEntry[] {
  return entries.filter((entry) => {
    const date = plantEntryDate(entry);
    return date?.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
}

function markerForDay(day: number, events: CalendarEvent[], plantEntries: PlantCalendarEntry[], now: Date): "sow" | "move" | "watch" | null {
  const staticMarker = events.find((event) => event.day === day)?.marker;
  if (staticMarker) {
    return staticMarker;
  }
  const plantEntry = plantEntries.find((entry) => {
    const date = plantEntryDate(entry);
    return date?.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === day;
  });
  return plantEntry ? plantEntryMarker(plantEntry) : null;
}

function normalizePlantOption(plant: GrowlyPlant): CalendarPlantOption {
  const profileId = plant.profileId || plant.profile_id || "plant";
  return {
    plantId: plant.instanceId || plant.plant_id || `${profileId}-${Date.now()}`,
    plantName: plant.nickname || plant.display_name || profileId,
    plantProfileId: profileId,
    catalogItemId: plant.catalogItemId || plant.catalog_item_id || profileId,
  };
}

export function CalendarPage({ session, selectedHubId = "" }: CalendarPageProps) {
  const now = new Date();
  const today = now.getDate();
  const [selectedDay, setSelectedDay] = useState(today);
  const [plantEntries, setPlantEntries] = useState<PlantCalendarEntry[]>([]);
  const [plantOptions, setPlantOptions] = useState<CalendarPlantOption[]>([]);
  const [plantsLoading, setPlantsLoading] = useState(false);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [noteCategory, setNoteCategory] = useState("general");
  const [noteDraft, setNoteDraft] = useState("");
  const name = session?.user?.full_name || session?.username || "bruker";
  const activeHubId = selectedHubId || session?.hub?.hub_id || "";
  const groupedActions = actionGroups();
  const calendarDays = monthGridDays();
  const events = calendarEvents(today);
  const selectedEvents = events.filter((event) => event.day === selectedDay);
  const selectedDate = new Date(now.getFullYear(), now.getMonth(), selectedDay);
  const selectedDateQuery = dateParam(selectedDate);
  const monthPlantEntries = plantEntriesForMonth(plantEntries, now);
  const selectedPlantEntries = monthPlantEntries.filter((entry) => entry.date === selectedDateQuery);
  const selectedPrimaryPlantEntry = selectedPlantEntries[0] ?? null;
  const selectedPrimaryAction = selectedEvents[0] ?? null;
  const currentPlannerCrops = plannerCrops
    .map((crop) => ({ crop, months: futureCropMonths(crop) }))
    .filter((entry) => entry.months.length)
    .slice(0, 3);

  useEffect(() => {
    function refreshEntries() {
      setPlantEntries(listPlantCalendarEntries(activeHubId));
    }
    refreshEntries();
    window.addEventListener("focus", refreshEntries);
    return () => {
      window.removeEventListener("focus", refreshEntries);
    };
  }, [activeHubId]);

  useEffect(() => {
    let cancelled = false;
    setPlantsLoading(true);
    fetchPlants(activeHubId).then((plants) => {
      if (cancelled) {
        return;
      }
      const options = plants.map(normalizePlantOption);
      setPlantOptions(options);
      setPlantsLoading(false);
      setNoteCategory((current) => {
        if (current === "general" || options.some((plant) => plant.plantId === current)) {
          return current;
        }
        return "general";
      });
    });
    return () => {
      cancelled = true;
    };
  }, [activeHubId, session?.username]);

  function handleSaveNote() {
    const selectedPlant = plantOptions.find((plant) => plant.plantId === noteCategory);
    const target = selectedPlant ?? {
      plantId: "general",
      plantName: "Generelt",
      plantProfileId: "leafy",
      catalogItemId: "general",
    };
    const entry = addPlantCalendarNote({
      hubId: activeHubId,
      plantId: target.plantId,
      plantName: target.plantName,
      plantProfileId: target.plantProfileId,
      catalogItemId: target.catalogItemId,
      date: selectedDateQuery,
      note: noteDraft,
    });
    if (!entry) {
      return;
    }
    setPlantEntries((current) => [...current, entry].sort((first, second) => first.date.localeCompare(second.date)));
    setNoteDraft("");
    setNoteCategory("general");
    setNoteSheetOpen(false);
  }

  function openNoteSheet() {
    setNoteCategory("general");
    setNoteDraft("");
    setNoteSheetOpen(true);
  }

  return (
    <main className="page-shell app-page planner-page">
      <section className="screen-header planner-header">
        <div>
          <h1>Kalender</h1>
          <p>Hei, {name}. Dette er det viktigste for drivhuset akkurat nå.</p>
        </div>
        <Link className="planner-header-link" to="/kartotek">Legg til plante</Link>
      </section>

      <section className="calendar-overview soft-card">
        <div className="calendar-overview__head">
          <div>
            <p className="section-kicker">Dyrkeplan · {currentMonthLabel()}</p>
            <h2>{events.length + monthPlantEntries.length} planlagte datoer</h2>
          </div>
          <span>I dag {today}</span>
        </div>
        <div className="calendar-month-grid" aria-label={`${currentMonthLabel()} kalender`}>
          {["M", "T", "O", "T", "F", "L", "S"].map((day) => (
            <strong key={day}>{day}</strong>
          ))}
          {calendarDays.map((day, index) => {
            const marker = day ? markerForDay(day, events, monthPlantEntries, now) : null;
            const isPastDay = !!day && day < today;
            return (
              <button
                type="button"
                disabled={!day || isPastDay}
                className={`calendar-day${isPastDay ? " is-past" : ""}${day === today ? " is-today" : ""}${day === selectedDay ? " is-selected" : ""}${marker ? ` calendar-day--${marker}` : ""}`}
                key={`${day ?? "blank"}-${index}`}
                onClick={() => day && !isPastDay && setSelectedDay(day)}
                aria-label={day ? `Velg ${day}. ${currentMonthLabel()}` : undefined}
              >
                {day}
                {marker ? <i aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="today-focus-card soft-card">
        <p className="section-kicker">{selectedDay === today ? "Dagens fokus" : `${selectedDay}. ${currentMonthLabel()}`}</p>
        <h2>
          {selectedPrimaryPlantEntry
            ? selectedPrimaryPlantEntry.title
            : selectedPrimaryAction
              ? selectedPrimaryAction.action
              : "Legg en planteplan på denne datoen"}
        </h2>
        <p>
          {selectedPrimaryPlantEntry
            ? `${selectedPrimaryPlantEntry.plantName}: ${selectedPrimaryPlantEntry.note}`
            : selectedPrimaryAction
              ? selectedPrimaryAction.note
            : "Velg en plante fra kartoteket og bruk datoen som sådato, utplanting eller påminnelse."}
        </p>
        <div className="calendar-detail-actions">
          <Link className="button planner-cta" to="/drivhus">Se mine planter</Link>
          <Link className="button button--secondary planner-cta" to={`/kartotek?dato=${selectedDateQuery}`}>Legg til på dato</Link>
          <button className="button button--secondary planner-cta" type="button" onClick={openNoteSheet}>Notat</button>
        </div>
      </section>

      <section className="settings-section">
        <p className="section-kicker">Valgt dato</p>
        <div className="calendar-event-list">
          {selectedPlantEntries.length || selectedEvents.length ? (
            <>
              {selectedPlantEntries.map((entry) => {
                const match = catalogMatch(entry.plantProfileId);
                return (
                  <article className={`calendar-event-card calendar-event-card--${plantEntryMarker(entry)} soft-card`} key={entry.id}>
                    <PlantAvatar tone={match?.tone ?? "leafy"} plantId={entry.plantProfileId} name={entry.plantName} family={entry.source === "note" ? "Notat" : "Planteplan"} />
                    <div>
                      <span>{entry.source === "note" ? "Notat" : "Planteplan"}</span>
                      <strong>{entry.plantName}</strong>
                      <p>{entry.title}</p>
                      <small>{entry.note}</small>
                    </div>
                    <Link to="/drivhus">Åpne</Link>
                  </article>
                );
              })}
              {selectedEvents.map((event) => {
                const match = catalogMatch(event.plantId);
                return (
                  <article className={`calendar-event-card calendar-event-card--${event.marker} soft-card`} key={`${event.id}-${event.day}`}>
                    <PlantAvatar tone={match?.tone ?? "leafy"} plantId={event.plantId} name={event.title} family={match?.family ?? event.group} />
                    <div>
                      <span>{event.group}</span>
                      <strong>{event.title}</strong>
                      <p>{event.action}</p>
                      <small>{event.note}</small>
                    </div>
                    <Link to="/drivhus">Åpne</Link>
                  </article>
                );
              })}
            </>
          ) : (
            <article className="calendar-event-card calendar-event-card--empty soft-card">
              <div className="calendar-event-card__date">
                <strong>{selectedDay}</strong>
                <span>{currentMonthLabel().slice(0, 3)}</span>
              </div>
              <div>
                <span>Planlegg</span>
                <strong>Ingen oppgave ennå</strong>
                <p>Legg til en plante, så kan Growly koble datoen til såing, utplanting eller oppfølging.</p>
              </div>
              <Link to={`/kartotek?dato=${selectedDateQuery}`}>Legg til</Link>
              <button type="button" onClick={openNoteSheet}>Notat</button>
            </article>
          )}
        </div>
      </section>

      {noteSheetOpen ? (
        <div className="greenhouse-sheet" role="dialog" aria-modal="true" aria-labelledby="calendar-note-title">
          <button className="greenhouse-sheet__backdrop" type="button" aria-label="Lukk notat" onClick={() => setNoteSheetOpen(false)} />
          <section className="greenhouse-sheet__panel soft-card greenhouse-sheet__panel--compact calendar-note-sheet">
            <div className="greenhouse-sheet__header">
              <div>
                <span>{selectedDay}. {currentMonthLabel()}</span>
                <h2 id="calendar-note-title">Nytt notat</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Lukk" onClick={() => setNoteSheetOpen(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </div>

            <div className="calendar-note-picker">
              <p className="section-kicker">Kategori</p>
              <div className="calendar-note-options">
                <button
                  className={noteCategory === "general" ? "is-selected" : ""}
                  type="button"
                  onClick={() => setNoteCategory("general")}
                >
                  <strong>Generelt</strong>
                  <span>Notat uten plantekobling</span>
                </button>
                {plantOptions.map((plant) => {
                  const match = catalogMatch(plant.plantProfileId);
                  return (
                    <button
                      className={noteCategory === plant.plantId ? "is-selected" : ""}
                      type="button"
                      key={plant.plantId}
                      onClick={() => setNoteCategory(plant.plantId)}
                    >
                      <PlantAvatar tone={match?.tone ?? "leafy"} plantId={plant.plantProfileId} name={plant.plantName} family={match?.family ?? "Plante"} />
                      <span>
                        <strong>{plant.plantName}</strong>
                        <small>{match?.family ?? "Mine planter"}</small>
                      </span>
                    </button>
                  );
                })}
                {!plantOptions.length && !plantsLoading ? (
                  <Link className="calendar-note-empty-option" to="/drivhus">Legg til en plante først</Link>
                ) : null}
              </div>
            </div>

            <label className="calendar-note-field">
              <span>Notat</span>
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="F.eks. vannet ekstra, sådd ny rad, eller sjekk igjen i morgen."
                rows={5}
                autoFocus
              />
            </label>
            <button className="primary-action" type="button" onClick={handleSaveNote} disabled={!noteDraft.trim()}>
              Lagre notat
            </button>
          </section>
        </div>
      ) : null}

      <section className="settings-section">
        <p className="section-kicker">Kan gjøres nå</p>
        <div className="planner-action-groups planner-action-groups--calm">
          {groupedActions.map((group) => (
            <article className="planner-action-group soft-card" key={group.label}>
              <div className="planner-action-group__head">
                <span>{group.label}</span>
                <strong>{group.items.length}</strong>
              </div>
              <div className="planner-action-list">
                {group.items.slice(0, 4).map((item) => {
                  const match = catalogMatch(item.plantId);
                  return (
                    <Link className="planner-action-row" to="/drivhus" key={item.id}>
                      <PlantAvatar tone={match?.tone ?? "leafy"} plantId={item.plantId} name={item.title} family={match?.family ?? item.group} />
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.action}</span>
                        <small>{item.note}</small>
                      </div>
                      <em>{item.timing}</em>
                    </Link>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <div className="home-section-head">
          <div>
            <p className="section-kicker">Dyrkeplaner</p>
            <h2>Fra {currentMonthLabel()} og videre</h2>
          </div>
          <Link to="/kartotek">Kartotek</Link>
        </div>
        <div className="planner-crop-grid">
          {currentPlannerCrops.map(({ crop, months }) => {
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
                  {months.map((item) => (
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
    </main>
  );
}
