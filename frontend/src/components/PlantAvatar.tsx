import alliumImage from "../assets/plants/allium.png";
import basilImage from "../assets/plants/basil.png";
import beanImage from "../assets/plants/bean.png";
import begoniaImage from "../assets/plants/begonia.png";
import berryImage from "../assets/plants/berry.png";
import blackberryImage from "../assets/plants/blackberry.png";
import blueberryImage from "../assets/plants/blueberry.png";
import broccoliImage from "../assets/plants/broccoli.png";
import carrotImage from "../assets/plants/carrot.png";
import cornImage from "../assets/plants/corn.png";
import cucumberImage from "../assets/plants/cucumber.png";
import dillImage from "../assets/plants/dill.png";
import eggplantImage from "../assets/plants/eggplant.png";
import fennelImage from "../assets/plants/fennel.png";
import grapeImage from "../assets/plants/grape.png";
import leafyImage from "../assets/plants/leafy.png";
import okraImage from "../assets/plants/okra.png";
import pepperImage from "../assets/plants/pepper.png";
import radicchioImage from "../assets/plants/radicchio.png";
import raspberryImage from "../assets/plants/raspberry.png";
import squashImage from "../assets/plants/squash.png";
import sweetPeaImage from "../assets/plants/sweet_pea.png";
import tomatoImage from "../assets/plants/tomato.png";
import watercressImage from "../assets/plants/watercress.png";
import type { PlantCatalogItem } from "../lib/api";

type PlantTone = PlantCatalogItem["tone"];

type PlantAvatarProps = {
  tone: PlantTone;
  plantId?: string | null;
  name?: string;
  family?: string;
  className?: string;
};

const plantImages: Record<PlantTone, string> = {
  tomato: tomatoImage,
  cucumber: cucumberImage,
  basil: basilImage,
  leafy: leafyImage,
  berry: berryImage,
  pepper: pepperImage,
};

const exactPlantImages: Record<string, string> = {
  arugula: leafyImage,
  basil: basilImage,
  bay: basilImage,
  bean: beanImage,
  beetroot: carrotImage,
  begonia: begoniaImage,
  blackberry: blackberryImage,
  black_currant: blackberryImage,
  blueberry: blueberryImage,
  borage: begoniaImage,
  broad_bean: beanImage,
  broccoli: broccoliImage,
  cabbage: leafyImage,
  calendula: begoniaImage,
  carrot: carrotImage,
  cauliflower: broccoliImage,
  celery: watercressImage,
  chamomile: begoniaImage,
  chervil: dillImage,
  chili: pepperImage,
  chinese_cabbage: leafyImage,
  chives: alliumImage,
  coriander: basilImage,
  cosmos: begoniaImage,
  cucumber: cucumberImage,
  dill: dillImage,
  eggplant: eggplantImage,
  endive: radicchioImage,
  fennel_bulb: fennelImage,
  fennel_leaf: fennelImage,
  fig: grapeImage,
  fuchsia: begoniaImage,
  garlic: alliumImage,
  geranium: begoniaImage,
  gooseberry: blueberryImage,
  grape: grapeImage,
  impatiens: begoniaImage,
  kale: leafyImage,
  kohlrabi: carrotImage,
  lambs_lettuce: leafyImage,
  lavender: basilImage,
  leek: alliumImage,
  lemon_balm: basilImage,
  lemon_verbena: basilImage,
  lettuce: leafyImage,
  lobelia: begoniaImage,
  lovage: basilImage,
  marjoram: basilImage,
  melon: squashImage,
  mint: basilImage,
  mizuna: leafyImage,
  mustard_greens: leafyImage,
  nasturtium: begoniaImage,
  okra: okraImage,
  onion: alliumImage,
  oregano: basilImage,
  pak_choi: leafyImage,
  parsley: basilImage,
  parsnip: carrotImage,
  pea_garden: beanImage,
  pea_sugar: beanImage,
  pepper: pepperImage,
  petunia: begoniaImage,
  potato: carrotImage,
  pumpkin: squashImage,
  purslane: leafyImage,
  radicchio: radicchioImage,
  radish: carrotImage,
  raspberry: raspberryImage,
  red_currant: raspberryImage,
  rhubarb: watercressImage,
  romaine_lettuce: leafyImage,
  rosemary: basilImage,
  sage: basilImage,
  spinach: leafyImage,
  spring_onion: alliumImage,
  squash: squashImage,
  strawberry: berryImage,
  strawberry_spinach: leafyImage,
  sweet_pea: sweetPeaImage,
  sweetcorn: cornImage,
  swiss_chard: leafyImage,
  tagetes: begoniaImage,
  tarragon: basilImage,
  thyme: basilImage,
  tomato: tomatoImage,
  turnip: carrotImage,
  verbena: begoniaImage,
  watercress: watercressImage,
  zucchini: squashImage,
};

const namedPlantImages: Record<string, string> = {
  agurk: cucumberImage,
  agurkurt: begoniaImage,
  aubergine: eggplantImage,
  basilikum: basilImage,
  begonia: begoniaImage,
  bjørnebær: blackberryImage,
  bladfennikel: fennelImage,
  blåbær: blueberryImage,
  blomkarse: begoniaImage,
  bondebønne: beanImage,
  brokkoli: broccoliImage,
  bringebær: raspberryImage,
  brønnkarse: watercressImage,
  chili: pepperImage,
  dill: dillImage,
  drue: grapeImage,
  endive: radicchioImage,
  erteblomst: sweetPeaImage,
  estragon: basilImage,
  fennel: fennelImage,
  fiken: grapeImage,
  flittig_lise: begoniaImage,
  gresskar: squashImage,
  gressløk: alliumImage,
  gulrot: carrotImage,
  hvitløk: alliumImage,
  jordbær: berryImage,
  jordbærspinat: leafyImage,
  kamille: begoniaImage,
  kål: leafyImage,
  kinakål: leafyImage,
  koriander: basilImage,
  kosmosblomst: begoniaImage,
  lavendel: basilImage,
  løk: alliumImage,
  løpstikke: basilImage,
  mangold: leafyImage,
  melon: squashImage,
  mynte: basilImage,
  okra: okraImage,
  oregano: basilImage,
  paprika: pepperImage,
  persille: basilImage,
  potet: carrotImage,
  purre: alliumImage,
  rabarbra: watercressImage,
  radicchio: radicchioImage,
  reddik: carrotImage,
  rips: raspberryImage,
  rosmarin: basilImage,
  salat: leafyImage,
  salvie: basilImage,
  selleri: watercressImage,
  sitronmelisse: basilImage,
  sitronverbena: basilImage,
  solbær: blackberryImage,
  spinat: leafyImage,
  squash: squashImage,
  stikkelsbær: blueberryImage,
  sukkererter: beanImage,
  sukkermais: cornImage,
  timian: basilImage,
  tomat: tomatoImage,
  vårløk: alliumImage,
  zucchini: squashImage,
};

function imageKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9æøå]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function imageForPlant(tone: PlantTone, plantId?: string | null, name = "", family = ""): string {
  const normalizedPlantId = imageKey(plantId ?? "");
  if (normalizedPlantId && exactPlantImages[normalizedPlantId]) {
    return exactPlantImages[normalizedPlantId];
  }

  const normalizedName = imageKey(name);
  if (normalizedName && exactPlantImages[normalizedName]) {
    return exactPlantImages[normalizedName];
  }
  if (normalizedName && namedPlantImages[normalizedName]) {
    return namedPlantImages[normalizedName];
  }

  const haystack = `${name} ${family}`.toLowerCase();
  if (haystack.includes("blomst")) return begoniaImage;
  if (haystack.includes("belgvekst")) return beanImage;
  if (haystack.includes("løkvekst")) return alliumImage;
  if (haystack.includes("rotgrønnsak") || haystack.includes("knollvekst")) return carrotImage;
  if (haystack.includes("kålvekst") || haystack.includes("bladgrønt")) return leafyImage;
  if (haystack.includes("urt")) return basilImage;
  if (haystack.includes("bær")) return berryImage;
  return plantImages[tone];
}

export function PlantAvatar({ tone, plantId, name, family, className = "" }: PlantAvatarProps) {
  const image = imageForPlant(tone, plantId, name, family);
  return (
    <span className={`plant-avatar plant-avatar--photo plant-avatar--${tone}${className ? ` ${className}` : ""}`} aria-hidden="true">
      <img src={image} alt="" draggable="false" />
    </span>
  );
}
