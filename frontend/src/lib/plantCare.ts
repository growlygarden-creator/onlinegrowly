import type { PlantCatalogItem } from "./api";
import type { AppLanguage } from "./i18n";

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

function phText(item: CareInput, language: AppLanguage): string {
  const [min, max] = item.ranges.ph.optimal;
  const range = `${min.toFixed(1)}-${max.toFixed(1)} pH`;
  const key = `${item.profile_id} ${item.display_name} ${item.family}`.toLowerCase();

  if (includesAny(key, ["blueberry", "blåbær", "vaccinium"])) {
    return language === "no"
      ? `Sur jord (${range}). Bruk rhododendron-/bærjord og unngå kalk.`
      : `Acidic soil (${range}). Use rhododendron/berry soil and avoid lime.`;
  }

  if (max <= 6.5) {
    return language === "no"
      ? `Sur til svakt sur jord (${range}). Unngå kalkrik jord ved ompotting.`
      : `Acidic to slightly acidic soil (${range}). Avoid lime-rich soil when repotting.`;
  }

  if (min >= 6.5) {
    return language === "no"
      ? `Nøytral til svakt kalkrik jord (${range}). Viktigst er god drenering.`
      : `Neutral to slightly alkaline soil (${range}). Good drainage matters most.`;
  }

  return language === "no"
    ? `Svakt sur til nøytral jord (${range}). Vanlig god plantejord passer fint.`
    : `Slightly acidic to neutral soil (${range}). Good general potting soil works well.`;
}

function soilQualityText(item: CareInput, language: AppLanguage): string {
  const key = `${item.profile_id} ${item.display_name} ${item.family}`.toLowerCase();

  if (includesAny(key, ["middelhavsurt", "lavendel", "timian", "rosmarin", "oregano", "salvie"])) {
    return language === "no" ? "Bruk mager, luftig jord med sand/perlite. Ikke kompakt eller våt jord." : "Use lean, airy soil with sand/perlite. Avoid compact or wet soil.";
  }

  if (includesAny(key, ["rotgrønnsak", "knollvekst", "gulrot", "reddik", "pastinakk", "potet"])) {
    return language === "no" ? "Bruk løs og dyp jord uten harde klumper, så røttene kan utvikle seg pent." : "Use loose, deep soil without hard clumps so roots can develop well.";
  }

  if (includesAny(key, ["bær", "jordbær", "bringebær", "bjørnebær", "rips", "solbær"])) {
    return language === "no" ? "Bruk moldrik, jevnt fuktig jord med god drenering. Ikke la potten stå i vann." : "Use humus-rich, evenly moist soil with good drainage. Do not leave the pot standing in water.";
  }

  if (includesAny(key, ["fruktgrønnsak", "tomat", "agurk", "paprika", "chili", "aubergine"])) {
    return language === "no" ? "Bruk næringsrik og luftig jord. Pott om når røttene fyller potten, ikke før jorden blir tett." : "Use nutrient-rich, airy soil. Repot when roots fill the pot, before the soil becomes dense.";
  }

  if (includesAny(key, ["bladgrønt", "kålvekst", "salat", "spinat"])) {
    return language === "no" ? "Bruk næringsrik, fuktighetsholdende jord som fortsatt drenerer godt." : "Use nutrient-rich, moisture-retentive soil that still drains well.";
  }

  return language === "no" ? "Bruk luftig såjord først, og pott om i mer næringsrik jord når planten er etablert." : "Start with airy seed compost, then repot into richer soil when the plant is established.";
}

function wateringMethodText(item: CareInput, language: AppLanguage): string {
  const key = `${item.profile_id} ${item.display_name} ${item.family} ${item.watering}`.toLowerCase();

  if (includesAny(key, ["middelhavsurt", "sparsom vanning", "lavendel", "timian", "rosmarin"])) {
    return language === "no" ? "Vann ovenfra ved jordoverflaten, sjelden men grundig. La jorden tørke godt mellom vanning." : "Water from above at soil level, rarely but thoroughly. Let the soil dry well between watering.";
  }

  if (includesAny(key, ["fuktig jord nesten hele tiden", "brønnkarse", "selleri", "rabarbra"])) {
    return language === "no" ? "Vann ovenfra ved jorden eller nedenfra i brett. Hold jevn fukt, men ikke stillestående vann." : "Water at soil level or from below in a tray. Keep moisture even, but avoid standing water.";
  }

  if (includesAny(key, ["bladgrønt", "salat", "spinat", "kålvekst", "urt"])) {
    return language === "no" ? "I såfase er undervanning i brett best. Etter ompotting kan du vanne forsiktig ovenfra ved jorden." : "During sowing, bottom watering in trays is best. After repotting, water gently from above at soil level.";
  }

  if (includesAny(key, ["bær", "jordbær", "bringebær", "bjørnebær"])) {
    return language === "no" ? "Vann ved basis/jorden, helst i små jevne runder. Unngå vann på blomster og bær." : "Water at the base/soil, preferably in small steady rounds. Avoid water on flowers and berries.";
  }

  return language === "no" ? "Vann ovenfra direkte på jorden ved basis. I småpotter/såfase kan undervanning brukes for roligere fukt." : "Water from above directly onto the soil at the base. In small pots/seed stage, bottom watering gives steadier moisture.";
}

function potSizeText(item: CareInput, language: AppLanguage): string {
  const key = `${item.profile_id} ${item.display_name} ${item.family}`.toLowerCase();

  if (includesAny(key, ["tomat", "tomato", "aubergine", "eggplant"])) {
    return language === "no" ? "Sluttpotte minst 20-30 liter per plante, eller bed med ca. 40-50 cm planteavstand." : "Final pot at least 20-30 liters per plant, or a bed with about 40-50 cm spacing.";
  }

  if (includesAny(key, ["agurk", "cucumber", "melon", "gresskar", "pumpkin", "squash", "zucchini"])) {
    return language === "no" ? "Sluttpotte minst 25-40 liter per plante, eller romslig bed med kraftig jordvolum." : "Final pot at least 25-40 liters per plant, or a roomy bed with generous soil volume.";
  }

  if (includesAny(key, ["paprika", "pepper", "chili"])) {
    return language === "no" ? "Sluttpotte ca. 10-20 liter. Store paprika trenger mer volum enn små chili." : "Final pot around 10-20 liters. Large sweet peppers need more volume than small chilies.";
  }

  if (includesAny(key, ["bær", "jordbær", "strawberry"])) {
    return language === "no" ? "Jordbær klarer 3-5 liter per plante. Bærbusker bør ha 20-40 liter eller plantes i bed." : "Strawberries manage with 3-5 liters per plant. Berry bushes should have 20-40 liters or be planted in beds.";
  }

  if (includesAny(key, ["middelhavsurt", "lavendel", "timian", "rosmarin", "oregano", "salvie"])) {
    return language === "no" ? "Vanligvis 3-10 liter i godt drenert potte. Rosmarin og lavendel trives bedre i litt større, dype potter." : "Usually 3-10 liters in a well-drained pot. Rosemary and lavender prefer slightly larger, deeper pots.";
  }

  if (includesAny(key, ["urt", "basilikum", "mynte", "persille", "koriander", "dill"])) {
    return language === "no" ? "Start smått, pott videre til 1-3 liter per plante. Mynte og store urter kan gjerne få 5 liter eller mer." : "Start small, then repot to 1-3 liters per plant. Mint and large herbs can use 5 liters or more.";
  }

  if (includesAny(key, ["salat", "bladgrønt", "spinat", "kålvekst", "pak choi", "mangold"])) {
    return language === "no" ? "Salat og bladgrønt trenger ofte 1-3 liter per plante, eller 15-25 cm planteavstand i kasse/bed." : "Lettuce and leafy greens often need 1-3 liters per plant, or 15-25 cm spacing in a box/bed.";
  }

  if (includesAny(key, ["rotgrønnsak", "gulrot", "reddik", "pastinakk", "rødbete", "nepe"])) {
    return language === "no" ? "Bruk dyp potte/kasse. Gulrot/pastinakk bør ha minst 25-35 cm jorddybde; reddik klarer mindre." : "Use a deep pot/box. Carrot/parsnip should have at least 25-35 cm soil depth; radish manages with less.";
  }

  if (includesAny(key, ["løkvekst", "løk", "purre", "hvitløk", "gressløk"])) {
    return language === "no" ? "Kan stå i kasse/bed med 8-15 cm avstand. Purre og hvitløk trenger dypere jord enn gressløk." : "Can grow in a box/bed with 8-15 cm spacing. Leeks and garlic need deeper soil than chives.";
  }

  if (includesAny(key, ["blomst", "krukke", "ampel"])) {
    return language === "no" ? "Velg minst 3-10 liter per plante etter vekstkraft. Ampelplanter trenger jevn fukt og nok jordvolum." : "Choose at least 3-10 liters per plant depending on vigor. Hanging plants need even moisture and enough soil volume.";
  }

  return language === "no" ? "Pott opp gradvis. Ikke la planten stå lenge i en potte der røttene fyller hele jordklumpen." : "Pot up gradually. Do not leave the plant long in a pot where roots fill the whole root ball.";
}

function foliageWateringText(item: CareInput, language: AppLanguage): string {
  const key = `${item.profile_id} ${item.display_name} ${item.family}`.toLowerCase();

  if (includesAny(key, ["agurk", "cucumber"])) {
    return language === "no" ? "Ikke dusj bladene fast. Agurk liker fuktig luft, men våte blader over tid øker sopprisiko." : "Do not mist the leaves routinely. Cucumber likes humid air, but wet leaves over time raise fungal risk.";
  }

  if (includesAny(key, ["tomat", "paprika", "chili", "aubergine", "jordbær", "bær"])) {
    return language === "no" ? "Ikke vann blader, blomster eller frukt. Hold vannet på jorden for å redusere sopp og råte." : "Do not water leaves, flowers or fruit. Keep water on the soil to reduce fungus and rot.";
  }

  if (includesAny(key, ["bladgrønt", "salat", "spinat", "urt"])) {
    return language === "no" ? "Lett dusj kan brukes ved spiring, men til vanlig bør vannet gå i jorden, ikke på bladverket." : "A light mist can help during germination, but normally water should go into the soil, not onto foliage.";
  }

  return language === "no" ? "Unngå rutinemessig vanning på blader. Vann jorden først, så holder planten seg renere og sunnere." : "Avoid routine watering on leaves. Water the soil first so the plant stays cleaner and healthier.";
}

export function plantCareGuide(item: CareInput, language: AppLanguage = "no"): PlantCareGuide {
  return {
    soilLabel: phText(item, language),
    soilText: soilQualityText(item, language),
    transplantText: language === "no"
      ? "Ved prikling/ompotting: fukt jorden lett først, flytt planten skånsomt, og vann rolig etterpå så røttene får kontakt."
      : "When pricking out/repotting: moisten the soil lightly first, move the plant gently, then water calmly so roots make contact.",
    potSizeText: potSizeText(item, language),
    wateringMethod: wateringMethodText(item, language),
    foliageWatering: foliageWateringText(item, language),
  };
}
