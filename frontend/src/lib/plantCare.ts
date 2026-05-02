import type { PlantCatalogItem } from "./api";

type CareInput = Pick<PlantCatalogItem, "display_name" | "family" | "profile_id" | "ranges" | "watering">;

export type PlantCareGuide = {
  soilLabel: string;
  soilText: string;
  transplantText: string;
  potSizeText: string;
  wateringMethod: string;
  foliageWatering: string;
};

function includesAny(value: string, words: string[]): boolean {
  return words.some((word) => value.includes(word));
}

function phText(item: CareInput): string {
  const [min, max] = item.ranges.ph.optimal;
  const range = `${min.toFixed(1)}-${max.toFixed(1)} pH`;
  const key = `${item.profile_id} ${item.display_name} ${item.family}`.toLowerCase();

  if (includesAny(key, ["blueberry", "blåbær", "vaccinium"])) {
    return `Sur jord (${range}). Bruk rhododendron-/bærjord og unngå kalk.`;
  }

  if (max <= 6.5) {
    return `Sur til svakt sur jord (${range}). Unngå kalkrik jord ved ompotting.`;
  }

  if (min >= 6.5) {
    return `Nøytral til svakt kalkrik jord (${range}). Viktigst er god drenering.`;
  }

  return `Svakt sur til nøytral jord (${range}). Vanlig god plantejord passer fint.`;
}

function soilQualityText(item: CareInput): string {
  const key = `${item.profile_id} ${item.display_name} ${item.family}`.toLowerCase();

  if (includesAny(key, ["middelhavsurt", "lavendel", "timian", "rosmarin", "oregano", "salvie"])) {
    return "Bruk mager, luftig jord med sand/perlite. Ikke kompakt eller våt jord.";
  }

  if (includesAny(key, ["rotgrønnsak", "knollvekst", "gulrot", "reddik", "pastinakk", "potet"])) {
    return "Bruk løs og dyp jord uten harde klumper, så røttene kan utvikle seg pent.";
  }

  if (includesAny(key, ["bær", "jordbær", "bringebær", "bjørnebær", "rips", "solbær"])) {
    return "Bruk moldrik, jevnt fuktig jord med god drenering. Ikke la potten stå i vann.";
  }

  if (includesAny(key, ["fruktgrønnsak", "tomat", "agurk", "paprika", "chili", "aubergine"])) {
    return "Bruk næringsrik og luftig jord. Pott om når røttene fyller potten, ikke før jorden blir tett.";
  }

  if (includesAny(key, ["bladgrønt", "kålvekst", "salat", "spinat"])) {
    return "Bruk næringsrik, fuktighetsholdende jord som fortsatt drenerer godt.";
  }

  return "Bruk luftig såjord først, og pott om i mer næringsrik jord når planten er etablert.";
}

function wateringMethodText(item: CareInput): string {
  const key = `${item.profile_id} ${item.display_name} ${item.family} ${item.watering}`.toLowerCase();

  if (includesAny(key, ["middelhavsurt", "sparsom vanning", "lavendel", "timian", "rosmarin"])) {
    return "Vann ovenfra ved jordoverflaten, sjelden men grundig. La jorden tørke godt mellom vanning.";
  }

  if (includesAny(key, ["fuktig jord nesten hele tiden", "brønnkarse", "selleri", "rabarbra"])) {
    return "Vann ovenfra ved jorden eller nedenfra i brett. Hold jevn fukt, men ikke stillestående vann.";
  }

  if (includesAny(key, ["bladgrønt", "salat", "spinat", "kålvekst", "urt"])) {
    return "I såfase er undervanning i brett best. Etter ompotting kan du vanne forsiktig ovenfra ved jorden.";
  }

  if (includesAny(key, ["bær", "jordbær", "bringebær", "bjørnebær"])) {
    return "Vann ved basis/jorden, helst i små jevne runder. Unngå vann på blomster og bær.";
  }

  return "Vann ovenfra direkte på jorden ved basis. I småpotter/såfase kan undervanning brukes for roligere fukt.";
}

function potSizeText(item: CareInput): string {
  const key = `${item.profile_id} ${item.display_name} ${item.family}`.toLowerCase();

  if (includesAny(key, ["tomat", "tomato", "aubergine", "eggplant"])) {
    return "Sluttpotte minst 20-30 liter per plante, eller bed med ca. 40-50 cm planteavstand.";
  }

  if (includesAny(key, ["agurk", "cucumber", "melon", "gresskar", "pumpkin", "squash", "zucchini"])) {
    return "Sluttpotte minst 25-40 liter per plante, eller romslig bed med kraftig jordvolum.";
  }

  if (includesAny(key, ["paprika", "pepper", "chili"])) {
    return "Sluttpotte ca. 10-20 liter. Store paprika trenger mer volum enn små chili.";
  }

  if (includesAny(key, ["bær", "jordbær", "strawberry"])) {
    return "Jordbær klarer 3-5 liter per plante. Bærbusker bør ha 20-40 liter eller plantes i bed.";
  }

  if (includesAny(key, ["middelhavsurt", "lavendel", "timian", "rosmarin", "oregano", "salvie"])) {
    return "Vanligvis 3-10 liter i godt drenert potte. Rosmarin og lavendel trives bedre i litt større, dype potter.";
  }

  if (includesAny(key, ["urt", "basilikum", "mynte", "persille", "koriander", "dill"])) {
    return "Start smått, pott videre til 1-3 liter per plante. Mynte og store urter kan gjerne få 5 liter eller mer.";
  }

  if (includesAny(key, ["salat", "bladgrønt", "spinat", "kålvekst", "pak choi", "mangold"])) {
    return "Salat og bladgrønt trenger ofte 1-3 liter per plante, eller 15-25 cm planteavstand i kasse/bed.";
  }

  if (includesAny(key, ["rotgrønnsak", "gulrot", "reddik", "pastinakk", "rødbete", "nepe"])) {
    return "Bruk dyp potte/kasse. Gulrot/pastinakk bør ha minst 25-35 cm jorddybde; reddik klarer mindre.";
  }

  if (includesAny(key, ["løkvekst", "løk", "purre", "hvitløk", "gressløk"])) {
    return "Kan stå i kasse/bed med 8-15 cm avstand. Purre og hvitløk trenger dypere jord enn gressløk.";
  }

  if (includesAny(key, ["blomst", "krukke", "ampel"])) {
    return "Velg minst 3-10 liter per plante etter vekstkraft. Ampelplanter trenger jevn fukt og nok jordvolum.";
  }

  return "Pott opp gradvis. Ikke la planten stå lenge i en potte der røttene fyller hele jordklumpen.";
}

function foliageWateringText(item: CareInput): string {
  const key = `${item.profile_id} ${item.display_name} ${item.family}`.toLowerCase();

  if (includesAny(key, ["agurk", "cucumber"])) {
    return "Ikke dusj bladene fast. Agurk liker fuktig luft, men våte blader over tid øker sopprisiko.";
  }

  if (includesAny(key, ["tomat", "paprika", "chili", "aubergine", "jordbær", "bær"])) {
    return "Ikke vann blader, blomster eller frukt. Hold vannet på jorden for å redusere sopp og råte.";
  }

  if (includesAny(key, ["bladgrønt", "salat", "spinat", "urt"])) {
    return "Lett dusj kan brukes ved spiring, men til vanlig bør vannet gå i jorden, ikke på bladverket.";
  }

  return "Unngå rutinemessig vanning på blader. Vann jorden først, så holder planten seg renere og sunnere.";
}

export function plantCareGuide(item: CareInput): PlantCareGuide {
  return {
    soilLabel: phText(item),
    soilText: soilQualityText(item),
    transplantText: "Ved prikling/ompotting: fukt jorden lett først, flytt planten skånsomt, og vann rolig etterpå så røttene får kontakt.",
    potSizeText: potSizeText(item),
    wateringMethod: wateringMethodText(item),
    foliageWatering: foliageWateringText(item),
  };
}
