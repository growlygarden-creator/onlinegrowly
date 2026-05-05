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

function svgPlantImage(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const radishImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <ellipse cx="80" cy="86" rx="39" ry="43" fill="#ec5471"/>
  <path d="M80 124c8-3 15-10 19-21-12 5-25 5-38 0 4 11 11 18 19 21Z" fill="#fff6eb"/>
  <path d="M53 80c9-23 39-31 59-12-7-24-45-32-61-8-5 7-7 15-7 23 2-1 5-2 9-3Z" fill="#f17f95" opacity=".55"/>
  <path d="M75 43c-11-17-25-25-42-24 4 17 16 29 36 34" fill="#54a15e"/>
  <path d="M84 45c2-19 12-31 29-37 5 17 0 33-19 47" fill="#3e8f4e"/>
  <path d="M82 44c12-13 27-17 45-11-5 15-18 24-39 23" fill="#67b86f"/>
  <path d="M76 44c-4-18 0-31 13-42 10 14 10 30 0 47" fill="#73bf77"/>
  <path d="M72 50c8 6 19 6 27 0" fill="none" stroke="#2e6e40" stroke-width="6" stroke-linecap="round"/>
</svg>`);

const beetrootImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <ellipse cx="80" cy="92" rx="39" ry="41" fill="#8f254e"/>
  <path d="M80 129c6-4 11-10 13-18-8 3-18 3-26 0 2 8 7 14 13 18Z" fill="#6f173b"/>
  <path d="M67 46c-12-18-27-26-44-25 3 18 18 31 39 37" fill="#3f9254"/>
  <path d="M84 47c0-20 10-34 28-42 6 19 0 36-19 50" fill="#4da861"/>
  <path d="M90 52c14-13 31-17 48-9-7 16-23 24-45 22" fill="#77be76"/>
  <path d="M72 55c10 8 20 8 31 0" fill="none" stroke="#5f1233" stroke-width="6" stroke-linecap="round"/>
</svg>`);

const parsnipImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <path d="M74 45c22 4 34 17 30 38-3 19-15 38-25 54-3 5-10 3-10-3-2-20-7-43-13-61-5-15 2-26 18-28Z" fill="#f3dfb2"/>
  <path d="M74 45c17 5 26 17 24 32-8-6-19-9-34-8-1-12 2-20 10-24Z" fill="#fff1cd" opacity=".8"/>
  <path d="M70 45c-13-13-27-17-43-13 6 15 20 24 40 25" fill="#6cad62"/>
  <path d="M82 44c2-17 12-29 29-34 4 16-2 31-20 44" fill="#4d9a54"/>
  <path d="M84 47c14-8 28-9 43-1-8 13-23 19-41 14" fill="#78bd6c"/>
</svg>`);

const turnipImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <path d="M44 80c0-24 17-39 38-39s37 15 37 39c0 26-20 43-38 58-17-15-37-32-37-58Z" fill="#f4f0dc"/>
  <path d="M44 80c0-23 17-39 38-39 18 0 33 11 36 30-20-8-48-9-74 0v9Z" fill="#d47aa2"/>
  <path d="M73 44c-10-16-24-24-41-23 4 17 17 29 37 33" fill="#4f9e5d"/>
  <path d="M86 44c4-18 16-30 35-34 3 18-6 33-27 44" fill="#69b36d"/>
  <path d="M82 48c11-9 25-12 42-6-7 13-20 20-39 18" fill="#7dc37a"/>
</svg>`);

const exactPlantImages: Record<string, string> = {
  arugula: leafyImage,
  basil: basilImage,
  bay: basilImage,
  bean: beanImage,
  beetroot: beetrootImage,
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
  kohlrabi: turnipImage,
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
  parsnip: parsnipImage,
  pea_garden: beanImage,
  pea_sugar: beanImage,
  pepper: pepperImage,
  petunia: begoniaImage,
  potato: carrotImage,
  pumpkin: squashImage,
  purslane: leafyImage,
  radicchio: radicchioImage,
  radish: radishImage,
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
  turnip: turnipImage,
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
  nepe: turnipImage,
  okra: okraImage,
  oregano: basilImage,
  paprika: pepperImage,
  pastinakk: parsnipImage,
  persille: basilImage,
  potet: carrotImage,
  purre: alliumImage,
  rabarbra: watercressImage,
  radicchio: radicchioImage,
  reddik: radishImage,
  rips: raspberryImage,
  rosmarin: basilImage,
  rødbete: beetrootImage,
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
