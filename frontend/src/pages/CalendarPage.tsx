import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPlants, type AuthSession, type GrowlyPlant, type PlantCatalogItem } from "../lib/api";
import { PlantAvatar } from "../components/PlantAvatar";
import { bundledPlantCatalog } from "../data/plantCatalog";
import { localizePlantCatalogItems } from "../lib/plantCatalogLocalization";
import {
  addPlantCalendarNote,
  listPlantCalendarEntries,
  type PlantCalendarEntry,
} from "../lib/plantCalendar";
import { useI18n, type AppLanguage } from "../lib/i18n";

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

type PlannerActionText = Pick<PlannerAction, "title" | "action" | "timing" | "note">;
type PlannerCropText = Pick<PlannerCrop, "title" | "subtitle" | "goodNeighbors" | "badNeighbors" | "healthWatch" | "reminder"> & {
  months: string[];
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

const plannerActionEnglish: Record<string, PlannerActionText> = {
  "cucumber-sow": {
    title: "Cucumber",
    action: "Sow indoors or plant small plants",
    timing: "May",
    note: "Warm soil, minimal root disturbance and even moisture from the start.",
  },
  "squash-sow": {
    title: "Summer squash",
    action: "Sow indoors now",
    timing: "May",
    note: "Fast growth. Use a roomy pot and move when nights are stable.",
  },
  "basil-sow": {
    title: "Basil",
    action: "Sow or start a new pot",
    timing: "May",
    note: "Likes warmth, light and even moisture. Keep away from cold nights.",
  },
  "lettuce-sow": {
    title: "Lettuce",
    action: "Sow in rounds",
    timing: "May-June",
    note: "Sow small rounds often for steadier harvests and less waste.",
  },
  "arugula-sow": {
    title: "Arugula",
    action: "Sow direct",
    timing: "May",
    note: "Quick crop. Keep the soil lightly moist for a milder taste.",
  },
  "radish-sow": {
    title: "Radish",
    action: "Sow direct",
    timing: "May",
    note: "Ready quickly. Even moisture gives crisp roots without splitting.",
  },
  "carrot-sow": {
    title: "Carrot",
    action: "Sow direct",
    timing: "May",
    note: "Sow in deep, loose soil. Avoid repotting and keep the surface moist.",
  },
  "bean-sow": {
    title: "Beans",
    action: "Sow when the soil is warm",
    timing: "Late May",
    note: "It is better to wait a little than sow in cold soil. Germination improves.",
  },
  "tomato-move": {
    title: "Tomato",
    action: "Move to greenhouse and tie up",
    timing: "May-June",
    note: "Plant deep, give support and keep moisture even to avoid splitting.",
  },
  "pepper-move": {
    title: "Sweet pepper",
    action: "Move in when nights are stable",
    timing: "May-June",
    note: "Needs warm soil, gentle repotting and plenty of light.",
  },
  "chili-move": {
    title: "Chili",
    action: "Pot up and harden off gently",
    timing: "May",
    note: "Do not stress the plant with cold soil. Let it dry slightly between waterings.",
  },
  "strawberry-watch": {
    title: "Strawberry",
    action: "Follow flowering and moisture",
    timing: "May-June",
    note: "Keep good air around the plants and avoid water directly on flowers.",
  },
  "herbs-watch": {
    title: "Herbs",
    action: "Trim lightly and sow refills",
    timing: "May",
    note: "Parsley, dill and coriander can be kept in steady production.",
  },
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

const plannerCropEnglish: Record<string, PlannerCropText> = {
  tomato: {
    title: "Tomato",
    subtitle: "Warm start, even moisture and plenty of light",
    months: ["Prepare soil and light", "Sow indoors", "Pot up", "Move to greenhouse", "Tie up", "Harvest and top"],
    goodNeighbors: ["Basil", "Marigold", "Parsley"],
    badNeighbors: ["Potato", "Fennel", "Cabbage"],
    healthWatch: "Watch for gray mold, leaf spots and splitting from uneven watering.",
    reminder: "Check side shoots, tying and even soil moisture twice a week.",
  },
  cucumber: {
    title: "Cucumber",
    subtitle: "High humidity, warm soil and gentle repotting",
    months: ["Plan space", "Sow indoors", "Plant in", "Guide upward", "Harvest often", "Watch mildew"],
    goodNeighbors: ["Dill", "Beans", "Lettuce"],
    badNeighbors: ["Potato", "Sage", "Melon too close"],
    healthWatch: "Watch for mildew, limp leaves and rot from overly wet soil.",
    reminder: "Water in small, even pulses and ventilate the greenhouse after humid periods.",
  },
  pepper: {
    title: "Sweet pepper and chili",
    subtitle: "Early start, stable warmth and controlled moisture",
    months: ["Chili can be sown", "Sow sweet pepper", "Light and warmth", "Pot up gradually", "Move in", "Ripening"],
    goodNeighbors: ["Basil", "Onion", "Marigold"],
    badNeighbors: ["Fennel", "Beans too close", "Too dense foliage"],
    healthWatch: "Watch for flower drop, aphids and drought stress in small pots.",
    reminder: "Keep steady warmth and let the top soil layer dry lightly between waterings.",
  },
  leafy: {
    title: "Lettuce and leafy greens",
    subtitle: "Quick crop, small rounds and cooler growth",
    months: ["Start early", "Sow round 1", "Sow again", "Harvest often", "Light shade", "New autumn round"],
    goodNeighbors: ["Radish", "Carrot", "Strawberry"],
    badNeighbors: ["Tomato too close", "Strong heat", "Dry soil"],
    healthWatch: "Watch for dry leaf edges and quick bolting in heat.",
    reminder: "Sow small amounts every 10-14 days for steady supply.",
  },
  root: {
    title: "Radish and carrot",
    subtitle: "Sow direct, even moisture and loose soil",
    months: ["Prepare soil", "Sow direct", "Thin gently", "Harvest radish", "Harvest carrot", "Last round"],
    goodNeighbors: ["Onion", "Lettuce", "Peas"],
    badNeighbors: ["Compacted soil", "Uneven watering", "Repotting"],
    healthWatch: "Splitting and woody roots often come from uneven moisture.",
    reminder: "Water lightly and often during germination, then more deeply.",
  },
  herbs: {
    title: "Herbs",
    subtitle: "Refills through the season and the right moisture for each type",
    months: ["Start indoors", "Pot up", "Sow more", "Trim often", "Renew pots", "Dry/store"],
    goodNeighbors: ["Tomato", "Sweet pepper", "Lettuce"],
    badNeighbors: ["Wet basil soil", "Dry mint", "Cold nights"],
    healthWatch: "Different herbs need different moisture. Mediterranean herbs should dry more.",
    reminder: "Cut above leaf pairs and sow small refills for steady production.",
  },
};

const monthNameEn: Record<string, string> = {
  Jan: "Jan",
  Feb: "Feb",
  Mar: "Mar",
  Apr: "Apr",
  Mai: "May",
  Jun: "Jun",
  Jul: "Jul",
  Aug: "Aug",
  Sep: "Sep",
  Okt: "Oct",
  Nov: "Nov",
  Des: "Dec",
};

const legacyCalendarTextEn: Record<string, string> = {
  "Husk vann og jordfukt": "Remember water and soil moisture",
  "Kjenn i jorda før du vanner. Vann rolig ved roten hvis det begynner å tørke.": "Feel the soil before watering. Water gently at the root if it starts to dry.",
  "Rydd opp rundt planten": "Clean up around the plant",
  "Fjern visne blader og småting rundt potten. Luft rundt planten forebygger trøbbel.": "Remove wilted leaves and small debris around the pot. Airflow around the plant prevents trouble.",
  "Sjekk bladundersider": "Check leaf undersides",
  "Se etter små prikker, skadedyr, slappe blad og tegn på stress mens det er lett å rette.": "Look for small spots, pests, limp leaves and signs of stress while it is easy to correct.",
  "Ukessjekk og justering": "Weekly check and adjustment",
  "Se om vann, lys, luft og plass fortsatt passer. Juster før planten roper om hjelp.": "Check whether water, light, air and space still fit. Adjust before the plant asks for help.",
  "Bind opp og form planten": "Tie and shape the plant",
  "Fest hovedstammen mykt, sjekk sideskudd og hold bladverk unna fuktig jord.": "Tie the main stem gently, check side shoots and keep foliage away from damp soil.",
  "Gi mild næring": "Give mild feeding",
  "Tomat liker jevn rytme. Gi rolig næring hvis planten er i god vekst.": "Tomato likes a steady rhythm. Feed gently if the plant is growing well.",
  "Led ranker oppover": "Guide vines upward",
  "Agurk vil raskt opp i høyden. Fest løst og unngå knekk i hovedranken.": "Cucumber climbs quickly. Tie loosely and avoid kinks in the main vine.",
  "Sjekk fukt og meldugg": "Check moisture and mildew",
  "Hold jevn jordfukt, men luft etter fuktige perioder så bladene tørker opp.": "Keep soil moisture even, but ventilate after humid periods so leaves dry up.",
  "Sjekk blomster og stress": "Check flowers and stress",
  "Se etter blomsterfall, bladlus og små potter som tørker fort.": "Look for flower drop, aphids and small pots that dry quickly.",
  "Støtt tunge greiner": "Support heavy branches",
  "Når fruktene setter seg, trenger planten ofte en diskret støtte.": "When fruits set, the plant often needs discreet support.",
  "Topp over et bladpar": "Pinch above a leaf pair",
  "Klipp over et bladpar for tettere vekst, og ikke la basilikum stå kaldt.": "Cut above a leaf pair for denser growth, and do not let basil stand cold.",
  "Start en liten påfyllsrunde": "Start a small refill round",
  "Urter føles luksus når det alltid er litt nytt på vei.": "Herbs feel luxurious when there is always a little new growth coming.",
  "Høst ytterblader": "Harvest outer leaves",
  "Ta litt og litt. Det holder planten i gang og gir jevnere avling.": "Take a little at a time. It keeps the plant going and gives a steadier crop.",
  "Sjekk varme og skygge": "Check heat and shade",
  "Salat går fort i stokk når den blir varm og tørr.": "Lettuce bolts quickly when it gets warm and dry.",
  "Rydd rundt blomster": "Clean around flowers",
  "Hold luft rundt kronen og unngå vann rett på blomster.": "Keep air around the crown and avoid water directly on flowers.",
  "Følg utløpere og bær": "Follow runners and berries",
  "Velg om utløpere skal beholdes eller fjernes for mer energi til bær.": "Decide whether runners should be kept or removed for more energy to berries.",
  "Sjekk støtte og plass": "Check support and space",
  "Gi planten rom før den blir tett. Det er enklere nå enn senere.": "Give the plant room before it gets crowded. It is easier now than later.",
  "Vurder mild næring": "Consider mild feeding",
  "Hvis planten er i aktiv vekst, kan en rolig næringsrunde passe.": "If the plant is actively growing, a gentle feeding round may fit.",
  "Notat til planteplanen": "Note for the plant plan",
  "Eget notat": "Own note",
};

function catalogMatch(plantId: string, catalogItems: PlantCatalogItem[]): PlantCatalogItem | undefined {
  return catalogItems.find((item) => item.profile_id === plantId && item.kind === "base");
}

function localizePlannerActions(language: AppLanguage): PlannerAction[] {
  if (language !== "en") {
    return mayPlannerActions;
  }
  return mayPlannerActions.map((item) => ({ ...item, ...plannerActionEnglish[item.id] }));
}

function groupLabel(group: PlannerAction["group"], language: AppLanguage): string {
  if (language !== "en") {
    return group;
  }
  if (group === "Så nå") {
    return "Sow now";
  }
  if (group === "Plant/flytt nå") {
    return "Plant/move now";
  }
  return "Follow up";
}

function actionGroups(actions: PlannerAction[], language: AppLanguage) {
  return [
    { label: groupLabel("Så nå", language), group: "Så nå" as const, items: actions.filter((item) => item.group === "Så nå") },
    { label: groupLabel("Plant/flytt nå", language), group: "Plant/flytt nå" as const, items: actions.filter((item) => item.group === "Plant/flytt nå") },
    { label: groupLabel("Følg opp", language), group: "Følg opp" as const, items: actions.filter((item) => item.group === "Følg opp") },
  ];
}

function currentMonthLabel(language: AppLanguage): string {
  return new Date().toLocaleDateString(language === "en" ? "en-US" : "nb-NO", { month: "long" });
}

function currentMonthShort(language: AppLanguage): string {
  return new Date().toLocaleDateString(language === "en" ? "en-US" : "nb-NO", { month: "short" });
}

function weekdayLabels(language: AppLanguage): string[] {
  return language === "en" ? ["M", "T", "W", "T", "F", "S", "S"] : ["M", "T", "O", "T", "F", "L", "S"];
}

function plannedDatesLabel(count: number, language: AppLanguage): string {
  if (language === "en") {
    return count === 1 ? "1 planned date" : `${count} planned dates`;
  }
  return `${count} planlagte datoer`;
}

function monthAbbreviation(month: string, language: AppLanguage): string {
  return language === "en" ? monthNameEn[month] ?? month : month;
}

function localizeCrop(crop: PlannerCrop, language: AppLanguage): PlannerCrop {
  if (language !== "en") {
    return crop;
  }
  const text = plannerCropEnglish[crop.id];
  if (!text) {
    return crop;
  }
  return {
    ...crop,
    title: text.title,
    subtitle: text.subtitle,
    goodNeighbors: text.goodNeighbors,
    badNeighbors: text.badNeighbors,
    healthWatch: text.healthWatch,
    reminder: text.reminder,
    months: crop.months.map((month, index) => ({
      ...month,
      month: monthAbbreviation(month.month, language),
      task: text.months[index] ?? month.task,
    })),
  };
}

function localizeCropMonth(cropId: string, month: PlannerCrop["months"][number], language: AppLanguage): PlannerCrop["months"][number] {
  if (language !== "en") {
    return month;
  }
  const crop = plannerCrops.find((item) => item.id === cropId);
  const index = crop?.months.findIndex((item) => item.month === month.month && item.task === month.task) ?? -1;
  return {
    ...month,
    month: monthAbbreviation(month.month, language),
    task: index >= 0 ? plannerCropEnglish[cropId]?.months[index] ?? month.task : month.task,
  };
}

function displayEntryText(value: string, language: AppLanguage): string {
  return language === "en" ? legacyCalendarTextEn[value] ?? value : value;
}

function displayEntryPlantName(value: string, language: AppLanguage): string {
  return language === "en" && value === "Generelt" ? "General" : value;
}

function entryTypeLabel(entry: PlantCalendarEntry, language: AppLanguage): string {
  if (entry.source === "note") {
    return language === "en" ? "Note" : "Notat";
  }
  return language === "en" ? "Plant plan" : "Planteplan";
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

function calendarEvents(today: number, actions: PlannerAction[]): CalendarEvent[] {
  const events: CalendarEvent[] = [
    { ...actions[0], day: today, marker: "sow" },
    { ...actions[2], day: today + 1, marker: "sow" },
    { ...actions[5], day: today + 5, marker: "sow" },
    { ...actions[8], day: today + 9, marker: "move" },
    { ...actions[10], day: today + 12, marker: "move" },
    { ...actions[11], day: today + 15, marker: "watch" },
    { ...actions[12], day: today + 20, marker: "watch" },
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
  const { language } = useI18n();
  const now = new Date();
  const today = now.getDate();
  const [selectedDay, setSelectedDay] = useState(today);
  const [plantEntries, setPlantEntries] = useState<PlantCalendarEntry[]>([]);
  const [plantOptions, setPlantOptions] = useState<CalendarPlantOption[]>([]);
  const [plantsLoading, setPlantsLoading] = useState(false);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [noteCategory, setNoteCategory] = useState("general");
  const [noteDraft, setNoteDraft] = useState("");
  const name = session?.user?.full_name || session?.username || (language === "en" ? "user" : "bruker");
  const activeHubId = selectedHubId || session?.hub?.hub_id || "";
  const catalogItems = useMemo(() => localizePlantCatalogItems(bundledPlantCatalog, language), [language]);
  const plannerActions = useMemo(() => localizePlannerActions(language), [language]);
  const groupedActions = actionGroups(plannerActions, language);
  const calendarDays = monthGridDays();
  const events = calendarEvents(today, plannerActions);
  const selectedEvents = events.filter((event) => event.day === selectedDay);
  const selectedDate = new Date(now.getFullYear(), now.getMonth(), selectedDay);
  const selectedDateQuery = dateParam(selectedDate);
  const monthLabel = currentMonthLabel(language);
  const monthShortLabel = currentMonthShort(language);
  const monthPlantEntries = plantEntriesForMonth(plantEntries, now);
  const selectedPlantEntries = monthPlantEntries.filter((entry) => entry.date === selectedDateQuery);
  const selectedPrimaryPlantEntry = selectedPlantEntries[0] ?? null;
  const selectedPrimaryAction = selectedEvents[0] ?? null;
  const currentPlannerCrops = plannerCrops
    .map((crop) => ({ crop, months: futureCropMonths(crop) }))
    .filter((entry) => entry.months.length)
    .slice(0, 3)
    .map(({ crop, months }) => ({
      crop: localizeCrop(crop, language),
      months: months.map((month) => localizeCropMonth(crop.id, month, language)),
    }));

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
      plantName: language === "en" ? "General" : "Generelt",
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
          <h1>{language === "en" ? "Calendar" : "Kalender"}</h1>
          <p>
            {language === "en"
              ? `Hi, ${name}. This is what matters most for the greenhouse right now.`
              : `Hei, ${name}. Dette er det viktigste for drivhuset akkurat nå.`}
          </p>
        </div>
        <Link className="planner-header-link" to="/kartotek">{language === "en" ? "Add plant" : "Legg til plante"}</Link>
      </section>

      <section className="calendar-overview soft-card">
        <div className="calendar-overview__head">
          <div>
            <p className="section-kicker">{language === "en" ? "Growing plan" : "Dyrkeplan"} · {monthLabel}</p>
            <h2>{plannedDatesLabel(events.length + monthPlantEntries.length, language)}</h2>
          </div>
          <span>{language === "en" ? "Today" : "I dag"} {today}</span>
        </div>
        <div className="calendar-month-grid" aria-label={language === "en" ? `${monthLabel} calendar` : `${monthLabel} kalender`}>
          {weekdayLabels(language).map((day, index) => (
            <strong key={`${day}-${index}`}>{day}</strong>
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
                aria-label={day ? (language === "en" ? `Choose ${day}. ${monthLabel}` : `Velg ${day}. ${monthLabel}`) : undefined}
              >
                {day}
                {marker ? <i aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="today-focus-card soft-card">
        <p className="section-kicker">
          {selectedDay === today ? (language === "en" ? "Today's focus" : "Dagens fokus") : `${selectedDay}. ${monthLabel}`}
        </p>
        <h2>
          {selectedPrimaryPlantEntry
            ? displayEntryText(selectedPrimaryPlantEntry.title, language)
            : selectedPrimaryAction
              ? selectedPrimaryAction.action
              : (language === "en" ? "Add a plant plan on this date" : "Legg en planteplan på denne datoen")}
        </h2>
        <p>
          {selectedPrimaryPlantEntry
            ? `${displayEntryPlantName(selectedPrimaryPlantEntry.plantName, language)}: ${selectedPrimaryPlantEntry.source === "note" ? selectedPrimaryPlantEntry.note : displayEntryText(selectedPrimaryPlantEntry.note, language)}`
            : selectedPrimaryAction
              ? selectedPrimaryAction.note
              : (language === "en"
                ? "Choose a plant from the catalog and use the date for sowing, planting out or a reminder."
                : "Velg en plante fra kartoteket og bruk datoen som sådato, utplanting eller påminnelse.")}
        </p>
        <div className="calendar-detail-actions">
          <Link className="button planner-cta" to="/drivhus">{language === "en" ? "View my plants" : "Se mine planter"}</Link>
          <Link className="button button--secondary planner-cta" to={`/kartotek?dato=${selectedDateQuery}`}>{language === "en" ? "Add to date" : "Legg til på dato"}</Link>
          <button className="button button--secondary planner-cta" type="button" onClick={openNoteSheet}>{language === "en" ? "Note" : "Notat"}</button>
        </div>
      </section>

      <section className="settings-section">
        <p className="section-kicker">{language === "en" ? "Selected date" : "Valgt dato"}</p>
        <div className="calendar-event-list">
          {selectedPlantEntries.length || selectedEvents.length ? (
            <>
              {selectedPlantEntries.map((entry) => {
                const match = catalogMatch(entry.plantProfileId, catalogItems);
                const typeLabel = entryTypeLabel(entry, language);
                return (
                  <article className={`calendar-event-card calendar-event-card--${plantEntryMarker(entry)} soft-card`} key={entry.id}>
                    <PlantAvatar tone={match?.tone ?? "leafy"} plantId={entry.plantProfileId} name={displayEntryPlantName(entry.plantName, language)} family={typeLabel} />
                    <div>
                      <span>{typeLabel}</span>
                      <strong>{displayEntryPlantName(entry.plantName, language)}</strong>
                      <p>{displayEntryText(entry.title, language)}</p>
                      <small>{entry.source === "note" ? entry.note : displayEntryText(entry.note, language)}</small>
                    </div>
                    <Link to="/drivhus">{language === "en" ? "Open" : "Åpne"}</Link>
                  </article>
                );
              })}
              {selectedEvents.map((event) => {
                const match = catalogMatch(event.plantId, catalogItems);
                return (
                  <article className={`calendar-event-card calendar-event-card--${event.marker} soft-card`} key={`${event.id}-${event.day}`}>
                    <PlantAvatar tone={match?.tone ?? "leafy"} plantId={event.plantId} name={event.title} family={match?.family ?? groupLabel(event.group, language)} />
                    <div>
                      <span>{groupLabel(event.group, language)}</span>
                      <strong>{event.title}</strong>
                      <p>{event.action}</p>
                      <small>{event.note}</small>
                    </div>
                    <Link to="/drivhus">{language === "en" ? "Open" : "Åpne"}</Link>
                  </article>
                );
              })}
            </>
          ) : (
            <article className="calendar-event-card calendar-event-card--empty soft-card">
              <div className="calendar-event-card__date">
                <strong>{selectedDay}</strong>
                <span>{monthShortLabel}</span>
              </div>
              <div>
                <span>{language === "en" ? "Plan" : "Planlegg"}</span>
                <strong>{language === "en" ? "No task yet" : "Ingen oppgave ennå"}</strong>
                <p>
                  {language === "en"
                    ? "Add a plant so Growly can connect the date to sowing, planting out or follow-up."
                    : "Legg til en plante, så kan Growly koble datoen til såing, utplanting eller oppfølging."}
                </p>
              </div>
              <Link to={`/kartotek?dato=${selectedDateQuery}`}>{language === "en" ? "Add" : "Legg til"}</Link>
              <button type="button" onClick={openNoteSheet}>{language === "en" ? "Note" : "Notat"}</button>
            </article>
          )}
        </div>
      </section>

      {noteSheetOpen ? (
        <div className="greenhouse-sheet" role="dialog" aria-modal="true" aria-labelledby="calendar-note-title">
          <button className="greenhouse-sheet__backdrop" type="button" aria-label={language === "en" ? "Close note" : "Lukk notat"} onClick={() => setNoteSheetOpen(false)} />
          <section className="greenhouse-sheet__panel soft-card greenhouse-sheet__panel--compact calendar-note-sheet">
            <div className="greenhouse-sheet__header">
              <div>
                <span>{selectedDay}. {monthLabel}</span>
                <h2 id="calendar-note-title">{language === "en" ? "New note" : "Nytt notat"}</h2>
              </div>
              <button className="icon-button" type="button" aria-label={language === "en" ? "Close" : "Lukk"} onClick={() => setNoteSheetOpen(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </div>

            <div className="calendar-note-picker">
              <p className="section-kicker">{language === "en" ? "Category" : "Kategori"}</p>
              <div className="calendar-note-options">
                <button
                  className={noteCategory === "general" ? "is-selected" : ""}
                  type="button"
                  onClick={() => setNoteCategory("general")}
                >
                  <strong>{language === "en" ? "General" : "Generelt"}</strong>
                  <span>{language === "en" ? "Note without plant connection" : "Notat uten plantekobling"}</span>
                </button>
                {plantOptions.map((plant) => {
                  const match = catalogMatch(plant.plantProfileId, catalogItems);
                  return (
                    <button
                      className={noteCategory === plant.plantId ? "is-selected" : ""}
                      type="button"
                      key={plant.plantId}
                      onClick={() => setNoteCategory(plant.plantId)}
                    >
                      <PlantAvatar tone={match?.tone ?? "leafy"} plantId={plant.plantProfileId} name={plant.plantName} family={match?.family ?? (language === "en" ? "Plant" : "Plante")} />
                      <span>
                        <strong>{plant.plantName}</strong>
                        <small>{match?.family ?? (language === "en" ? "My plants" : "Mine planter")}</small>
                      </span>
                    </button>
                  );
                })}
                {!plantOptions.length && !plantsLoading ? (
                  <Link className="calendar-note-empty-option" to="/drivhus">{language === "en" ? "Add a plant first" : "Legg til en plante først"}</Link>
                ) : null}
              </div>
            </div>

            <label className="calendar-note-field">
              <span>{language === "en" ? "Note" : "Notat"}</span>
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder={language === "en" ? "E.g. watered extra, sowed a new row, or check again tomorrow." : "F.eks. vannet ekstra, sådd ny rad, eller sjekk igjen i morgen."}
                rows={5}
                autoFocus
              />
            </label>
            <button className="primary-action" type="button" onClick={handleSaveNote} disabled={!noteDraft.trim()}>
              {language === "en" ? "Save note" : "Lagre notat"}
            </button>
          </section>
        </div>
      ) : null}

      <section className="settings-section">
        <p className="section-kicker">{language === "en" ? "Can be done now" : "Kan gjøres nå"}</p>
        <div className="planner-action-groups planner-action-groups--calm">
          {groupedActions.map((group) => (
            <article className="planner-action-group soft-card" key={group.label}>
              <div className="planner-action-group__head">
                <span>{group.label}</span>
                <strong>{group.items.length}</strong>
              </div>
              <div className="planner-action-list">
                {group.items.slice(0, 4).map((item) => {
                  const match = catalogMatch(item.plantId, catalogItems);
                  return (
                    <Link className="planner-action-row" to="/drivhus" key={item.id}>
                      <PlantAvatar tone={match?.tone ?? "leafy"} plantId={item.plantId} name={item.title} family={match?.family ?? groupLabel(item.group, language)} />
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
            <p className="section-kicker">{language === "en" ? "Growing plans" : "Dyrkeplaner"}</p>
            <h2>{language === "en" ? `From ${monthLabel} onward` : `Fra ${monthLabel} og videre`}</h2>
          </div>
          <Link to="/kartotek">{language === "en" ? "Catalog" : "Kartotek"}</Link>
        </div>
        <div className="planner-crop-grid">
          {currentPlannerCrops.map(({ crop, months }) => {
            const match = catalogMatch(crop.plantId, catalogItems);
            return (
              <article className="planner-crop-card soft-card" key={crop.id}>
                <div className="planner-crop-card__head">
                  <PlantAvatar tone={match?.tone ?? "leafy"} plantId={crop.plantId} name={crop.title} family={match?.family ?? crop.subtitle} />
                  <div>
                    <span>{match?.category || (language === "en" ? "Growing plan" : "Dyrkeplan")}</span>
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
