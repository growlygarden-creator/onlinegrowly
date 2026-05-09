import type { AppLanguage } from "./i18n";
import type { PlantCatalogItem } from "./api";

const profileNamesEn: Record<string, string> = {
  tomato: "tomato",
  cucumber: "cucumber",
  pepper: "sweet pepper",
  chili: "chili pepper",
  basil: "basil",
  parsley: "parsley",
  coriander: "coriander",
  dill: "dill",
  lettuce: "lettuce",
  spinach: "spinach",
  kale: "kale",
  arugula: "arugula",
  radish: "radish",
  carrot: "carrot",
  strawberry: "strawberry",
  squash: "summer squash",
  eggplant: "eggplant",
  melon: "melon",
  thyme: "thyme",
  oregano: "oregano",
  rosemary: "rosemary",
  mint: "mint",
  chives: "chives",
  spring_onion: "spring onion",
  pea_sugar: "sugar snap pea",
  bean: "beans",
  broccoli: "broccoli",
  cauliflower: "cauliflower",
  cabbage: "cabbage",
  celery: "celery",
  leek: "leek",
  onion: "onion",
  garlic: "garlic",
  potato: "potato",
  calendula: "pot marigold",
  tagetes: "marigold",
  lavender: "lavender",
  pak_choi: "pak choi",
  swiss_chard: "swiss chard",
  endive: "endive",
  romaine_lettuce: "romaine lettuce",
  lambs_lettuce: "lamb's lettuce",
  radicchio: "radicchio",
  mustard_greens: "mustard greens",
  mizuna: "mizuna",
  chinese_cabbage: "Chinese cabbage",
  purslane: "purslane",
  watercress: "watercress",
  beetroot: "beetroot",
  turnip: "turnip",
  parsnip: "parsnip",
  kohlrabi: "kohlrabi",
  fennel_bulb: "fennel bulb",
  pea_garden: "garden pea",
  broad_bean: "broad bean",
  sweet_pea: "sweet pea",
  zucchini: "zucchini",
  pumpkin: "pumpkin",
  okra: "okra",
  sweetcorn: "sweetcorn",
  tarragon: "tarragon",
  chervil: "chervil",
  lovage: "lovage",
  lemon_balm: "lemon balm",
  chamomile: "chamomile",
  fennel_leaf: "leaf fennel",
  sage: "sage",
  marjoram: "marjoram",
  bay: "bay laurel",
  lemon_verbena: "lemon verbena",
  raspberry: "raspberry",
  blueberry: "blueberry",
  blackberry: "blackberry",
  red_currant: "red currant",
  black_currant: "black currant",
  gooseberry: "gooseberry",
  grape: "grape",
  fig: "fig",
  geranium: "geranium",
  petunia: "petunia",
  fuchsia: "fuchsia",
  verbena: "verbena",
  lobelia: "lobelia",
  begonia: "begonia",
  impatiens: "impatiens",
  cosmos: "cosmos",
  nasturtium: "nasturtium",
  borage: "borage",
  rhubarb: "rhubarb",
  strawberry_spinach: "strawberry spinach",
};

const variantNamesEn: Record<string, string> = {
  tomato_cherry: "cherry tomato",
  tomato_beefsteak: "beefsteak tomato",
  tomato_plum: "plum/roma tomato",
  tomato_standard: "standard tomato",
  pepper_sweet: "sweet bell pepper",
  pepper_hot: "hot pepper",
  cucumber_slicing: "slicing cucumber",
  cucumber_snack: "mini/snack cucumber",
  lettuce_head: "head lettuce",
  lettuce_leaf: "leaf lettuce",
  lettuce_romaine: "romaine lettuce",
  basil_genovese: "Genovese basil",
  basil_lemon: "lemon basil",
  mint_strong: "strong mint type",
  rosemary_upright: "upright rosemary",
  lavender_compact: "compact lavender",
  strawberry_june: "June-bearing strawberry",
  strawberry_everbearing: "everbearing strawberry",
};

const cultivarNamesEn: Record<string, string> = {
  tomato_sungold: "Sungold cherry tomato",
  tomato_shirley: "Shirley tomato",
  tomato_roma: "Roma plum tomato",
  tomato_sanmarzano: "San Marzano tomato",
  pepper_california_wonder: "California Wonder bell pepper",
  pepper_jalapeno: "Jalapeño pepper",
  pepper_habanero: "Habanero pepper",
  cucumber_marketmore: "Marketmore cucumber",
  cucumber_socrates: "Socrates mini cucumber",
  lettuce_little_gem: "Little Gem lettuce",
  lettuce_lollo_rossa: "Lollo Rossa leaf lettuce",
  basil_genovese_cult: "Genovese basil",
  basil_dark_opal: "Dark Opal basil",
  mint_moroccan: "Moroccan mint",
  strawberry_elsanta: "Elsanta strawberry",
  strawberry_malling_opal: "Malling Opal strawberry",
};

const categoryEn: Record<string, string> = {
  "grønnsak": "vegetable",
  "urt": "herb",
  "bær": "berries",
  "frukt": "fruit",
  "blomst": "flower",
};

const familyEn: Record<string, string> = {
  "ampel/krukke": "hanging basket/container",
  "ettårig blomst": "annual flower",
  "ettårig klatre/markdekker": "annual climber/ground cover",
  "varmeelskende fruktgrønnsak": "warm-loving fruiting vegetable",
  "varmeelskende chili": "warm-loving chili",
  "varmeelskende urt": "warm-loving herb",
  "bladgrønt": "leafy greens",
  "bladgrønt med spiselige bær": "leafy green with edible berries",
  "bladurt": "leaf herb",
  "bladurt kortlivd": "short-lived leaf herb",
  "ettårig urt": "annual herb",
  "flerårig urt": "perennial herb",
  "kjølig bladgrønt": "cool-season leafy green",
  "kålvekst bladgrønt": "leafy brassica",
  "kålvekst kjølig": "cool-season brassica",
  "knollvekst": "tuber crop",
  "rotgrønnsak": "root vegetable",
  "kjølig rotgrønnsak": "cool-season root vegetable",
  "stilk/knoll": "stem or bulb crop",
  "stilkgrønnsak": "stem vegetable",
  "stilkvekst": "stem crop",
  "middelhavsurt": "Mediterranean herb",
  "bær flerårig": "perennial berry",
  "bær busk": "berry bush",
  "klatrende frukt": "climbing fruit",
  "middelhavsfrukt": "Mediterranean fruit",
  "potteblomst": "potted flower",
  "klatreblomst": "climbing flower",
  "skyggetålende blomst": "shade-tolerant flower",
  "løkvekst": "allium crop",
  "belgvekst": "legume",
  "belgvekst kjølig": "cool-season legume",
  "belgvekst varm": "warm-season legume",
  "varmeelskende korn": "warm-loving grain crop",
  "blomst/urt": "flowering herb",
  "ettårig urt/blomst": "annual herb/flower",
};

const variantTypeEn: Record<string, string> = {
  "små frukter, klaser": "small fruits, clusters",
  "store frukter": "large fruits",
  "avling/sause": "crop/sauce",
  "middels store frukter": "medium-sized fruits",
  "store søte frukter": "large sweet fruits",
  "sterke frukter": "hot fruits",
  "lange frukter": "long fruits",
  "kompakte hoder": "compact heads",
  "løse blader": "loose leaves",
  "avlange hoder": "elongated heads",
  "klassisk storbladet": "classic large-leaf",
  "aromatisk, tynnere blader": "aromatic, thinner leaves",
  "kraftig vekst": "vigorous growth",
  "buskform": "bush form",
  "lav og tett vekst": "low and compact growth",
  "en hovedavling": "one main crop",
  "bærer gjennom sesongen": "bears through the season",
};

const textEn: Record<string, string> = {
  "Jevnt fuktig jord, ikke la tørke helt ut.": "Evenly moist soil; do not let it dry out completely.",
  "Jevnt fuktig jord, ikke la potter tørke helt ut.": "Evenly moist soil; do not let pots dry out completely.",
  "Jevnt lett fuktig jord, ikke la potten tørke helt ut.": "Keep soil lightly and evenly moist; do not let the pot dry out completely.",
  "Jevnt lett fuktig jord, ikke la den tørke helt ut.": "Keep soil lightly and evenly moist; do not let it dry out completely.",
  "Moderat jevn fukt, ikke vannmettet jord.": "Moderate, even moisture; avoid waterlogged soil.",
  "Moderat fukt, la jorden tørke lett mellom vanning.": "Moderate moisture; let the soil dry slightly between waterings.",
  "Moderat jevn fukt, spesielt i blomstring og belging.": "Moderate, even moisture, especially during flowering and pod set.",
  "Moderat vanning, unngå både uttørking og klissvåt jord.": "Moderate watering; avoid both drying out and soggy soil.",
  "Sparsom vanning, la jorden tørke godt opp mellom hver gang.": "Water sparingly and let the soil dry well between waterings.",
  "Varm og lyselskende drivhusplante som ikke tåler kulde eller langvarig hete.": "A warm, light-loving greenhouse plant that does not tolerate cold or prolonged heat.",
  "Urt som liker moderat varme, god lysmengde og jevnt fuktig jord.": "An herb that likes moderate warmth, good light and evenly moist soil.",
  "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.": "A cool to moderately warm leafy vegetable that likes even moisture and stable conditions.",
  "Kjølig til middels varm rotvekst som liker dyp, løs jord og jevn fukt.": "A cool to moderately warm root crop that likes deep, loose soil and even moisture.",
  "Middelhavsurt som liker varm, solrik og tørr plassering med veldrenert jord.": "A Mediterranean herb that likes a warm, sunny, dry position with well-drained soil.",
  "Bærvekst som liker kjølig til moderat varme, mye lys og jevn jordfukt.": "A berry crop that likes cool to moderate warmth, plenty of light and even soil moisture.",
  "Sommerblomst for drivhus og potter, liker sol, moderat temperatur og god lufting.": "A summer flower for greenhouses and pots; likes sun, moderate temperatures and good ventilation.",
};

const seedGuideEn: Record<string, string> = {
  "Så inne i mars-april.": "Sow indoors in March-April.",
  "Så inne i februar-mars.": "Sow indoors in February-March.",
  "Så inne i januar-mars.": "Sow indoors in January-March.",
  "Så inne i april-mai.": "Sow indoors in April-May.",
  "Så inne i mars-mai.": "Sow indoors in March-May.",
  "Så inne eller direkte fra mars-august.": "Sow indoors or direct from March-August.",
  "Så inne eller direkte fra mars-juli.": "Sow indoors or direct from March-July.",
  "Så direkte fra april-juni.": "Sow direct from April-June.",
  "Startes inne tidlig, varmt og lyst.": "Start indoors early, warm and bright.",
  "Startes inne varmt, lyst og uten trekk.": "Start indoors warm, bright and away from drafts.",
  "Forkultiveres inne lyst og varmt.": "Start indoors in a bright, warm place.",
  "Forkultiveres inne med varme og godt lys.": "Start indoors with warmth and good light.",
  "Forkultiveres kort inne, helst varmt.": "Start briefly indoors, preferably warm.",
  "Pottes om når planten har 2-4 varige blad.": "Repot when the plant has 2-4 true leaves.",
  "Pottes om når røttene fyller småpotten.": "Repot when the roots fill the small pot.",
  "Pottes om når røttene fyller potten.": "Repot when the roots fill the pot.",
  "Pottes om gradvis for sterk rotvekst.": "Repot gradually for strong root growth.",
  "Pottes/plantes om når småplantene er robuste.": "Repot or plant on when seedlings are sturdy.",
  "Pottes/plantes om når småplantene er håndterbare.": "Repot or plant on when seedlings are easy to handle.",
  "Prikles eller pottes om når plantene kan håndteres.": "Prick out or repot when the plants can be handled.",
  "Plantes i drivhus fra mai når nettene er stabile.": "Plant in the greenhouse from May when nights are stable.",
  "Plantes i drivhus fra mai-juni.": "Plant in the greenhouse from May-June.",
  "Settes i drivhus fra mai-juni.": "Move to the greenhouse from May-June.",
  "Flyttes til drivhus fra mai-juni.": "Move to the greenhouse from May-June.",
  "Settes i drivhus når temperaturen holder seg stabil.": "Move to the greenhouse when the temperature stays stable.",
  "Høstes vanligvis juli-september.": "Usually harvested July-September.",
  "Høstes fra juli og utover.": "Harvest from July onward.",
  "Høstes fra sensommeren og utover.": "Harvest from late summer onward.",
  "Høstes ofte fra juni/juli.": "Often harvested from June/July.",
  "Høstes fortløpende etter størrelse.": "Harvest continuously by size.",
  "Høstes fortløpende eller når hodet er utviklet.": "Harvest continuously or when the head has developed.",
  "Høstes når frukt eller blader er modne.": "Harvest when fruit or leaves are mature.",
  "Følg utviklingen gjennom sesongen.": "Follow development through the season.",
};

function lookup(dictionary: Record<string, string>, value: string): string | undefined {
  const normalized = value.trim().toLowerCase();
  return dictionary[normalized] ?? dictionary[value.trim()] ?? dictionary[value];
}

function localizeText(value: string): string {
  const direct = textEn[value] ?? seedGuideEn[value];
  if (direct) {
    return direct;
  }
  return value
    .replace(/\bgrønnsak\b/gi, "vegetable")
    .replace(/\bvarmeelskende fruktgrønnsak\b/gi, "warm-loving fruiting vegetable")
    .replace(/\bvarmeelskende urt\b/gi, "warm-loving herb")
    .replace(/\bvarmeelskende chili\b/gi, "warm-loving chili")
    .replace(/\bkjølig bladgrønt\b/gi, "cool-season leafy green")
    .replace(/\bmiddelhavsurt\b/gi, "Mediterranean herb")
    .replace(/\bbærvekst\b/gi, "berry crop")
    .replace(/\bdrivhus\b/gi, "greenhouse")
    .replace(/\bjevnt\b/gi, "evenly")
    .replace(/\bfukt\b/gi, "moisture")
    .replace(/\bvanning\b/gi, "watering");
}

function localizeSubtitle(item: PlantCatalogItem, family: string): string {
  const baseName = profileNamesEn[item.profile_id] ?? item.profile_id;
  if (item.kind === "base") {
    return family;
  }
  if (item.kind === "variant") {
    const subtitleParts = item.subtitle.split(" · ");
    const type = lookup(variantTypeEn, subtitleParts[subtitleParts.length - 1] ?? "") ?? variantNamesEn[item.variant_id ?? ""] ?? localizeText(item.subtitle);
    return `${baseName} · ${type}`;
  }
  const variantName = item.variant_id ? variantNamesEn[item.variant_id] : "";
  return `${baseName} · ${variantName || item.display_name}`;
}

function localizeDisplayName(item: PlantCatalogItem): string {
  if (item.cultivar_id && cultivarNamesEn[item.cultivar_id]) {
    return cultivarNamesEn[item.cultivar_id];
  }
  if (item.kind === "variant" && item.variant_id && variantNamesEn[item.variant_id]) {
    return variantNamesEn[item.variant_id];
  }
  return profileNamesEn[item.profile_id] ?? item.display_name;
}

export function localizePlantCatalogItem(item: PlantCatalogItem, language: AppLanguage): PlantCatalogItem {
  if (language !== "en") {
    return item;
  }

  const displayName = localizeDisplayName(item);
  const family = lookup(familyEn, item.family) ?? item.family;
  return {
    ...item,
    name: displayName,
    display_name: displayName,
    subtitle: localizeSubtitle(item, family),
    family,
    category: lookup(categoryEn, item.category) ?? item.category,
    notes: localizeText(item.notes),
    watering: localizeText(item.watering),
    seed_guide: item.seed_guide
      ? {
          sow: localizeText(item.seed_guide.sow),
          start: localizeText(item.seed_guide.start),
          repot: localizeText(item.seed_guide.repot),
          plant_out: localizeText(item.seed_guide.plant_out),
          harvest: localizeText(item.seed_guide.harvest),
        }
      : undefined,
  };
}

export function localizePlantCatalogItems(items: PlantCatalogItem[], language: AppLanguage): PlantCatalogItem[] {
  return language === "en" ? items.map((item) => localizePlantCatalogItem(item, language)) : items;
}
