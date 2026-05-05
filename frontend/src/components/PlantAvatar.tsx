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

const kohlrabiImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <circle cx="80" cy="94" r="38" fill="#bcd88e"/>
  <path d="M52 94c8-17 33-25 55-10-6-24-43-34-58-7-4 7-5 14-4 21 2-2 4-3 7-4Z" fill="#d8e8ac" opacity=".8"/>
  <path d="M59 67c-21-5-34-16-40-34 20-2 36 7 50 26" fill="#4d9651"/>
  <path d="M77 58c-4-21 2-38 18-51 11 18 9 37-5 55" fill="#61aa61"/>
  <path d="M99 64c14-17 31-25 52-22-5 20-20 33-43 38" fill="#77bd71"/>
  <path d="M62 75c14 7 28 7 42 0" fill="none" stroke="#6a9848" stroke-width="6" stroke-linecap="round"/>
</svg>`);

const potatoImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <path d="M39 83c0-25 21-43 49-43 24 0 43 17 43 40 0 27-21 45-52 45-24 0-40-17-40-42Z" fill="#c89a62"/>
  <path d="M55 72c7-14 27-22 48-15-13-13-43-11-55 7-6 9-7 21-2 31 1-8 4-16 9-23Z" fill="#e0bc82" opacity=".7"/>
  <circle cx="72" cy="82" r="4" fill="#8e663f"/>
  <circle cx="101" cy="93" r="4" fill="#8e663f"/>
  <circle cx="88" cy="63" r="3" fill="#8e663f"/>
</svg>`);

const celeryImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <path d="M56 132c6-29 8-58 6-89" stroke="#9ccf79" stroke-width="12" stroke-linecap="round"/>
  <path d="M80 134c2-34 2-66 0-97" stroke="#76b95f" stroke-width="13" stroke-linecap="round"/>
  <path d="M104 132c-6-29-8-58-6-89" stroke="#8bc86c" stroke-width="12" stroke-linecap="round"/>
  <path d="M57 42c-18-5-28-15-31-30 15 1 27 9 36 25" fill="#55a35b"/>
  <path d="M82 36c-5-16 0-29 13-39 8 14 7 27-4 40" fill="#66b864"/>
  <path d="M101 43c11-15 25-22 42-20-4 15-16 25-36 30" fill="#5daa60"/>
</svg>`);

const rhubarbImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <path d="M55 135 72 55" stroke="#d8647a" stroke-width="12" stroke-linecap="round"/>
  <path d="M82 136 83 50" stroke="#c64c66" stroke-width="13" stroke-linecap="round"/>
  <path d="M109 134 94 56" stroke="#dc7890" stroke-width="12" stroke-linecap="round"/>
  <path d="M80 42C52 14 25 18 13 42c24 22 48 22 67 0Z" fill="#69aa61"/>
  <path d="M82 42c25-28 53-24 65 0-24 22-48 22-65 0Z" fill="#5d9c59"/>
</svg>`);

const cauliflowerImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <path d="M38 105c5-29 21-48 42-48s38 18 42 48c-22 22-61 22-84 0Z" fill="#5f9f5d"/>
  <circle cx="63" cy="75" r="20" fill="#f4edd8"/>
  <circle cx="88" cy="68" r="23" fill="#fff6df"/>
  <circle cx="101" cy="91" r="22" fill="#efe5c9"/>
  <circle cx="70" cy="99" r="22" fill="#fff8e8"/>
</svg>`);

const herbImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <path d="M80 132V32" stroke="#4c8d52" stroke-width="8" stroke-linecap="round"/>
  <path d="M78 52c-24-18-43-19-58-5 14 17 34 20 58 5Z" fill="#66b86c"/>
  <path d="M82 68c25-18 45-20 59-5-14 17-35 20-59 5Z" fill="#58a95f"/>
  <path d="M78 86c-24-17-43-19-58-4 14 17 34 20 58 4Z" fill="#74c579"/>
  <path d="M82 103c23-16 41-17 55-4-13 16-32 19-55 4Z" fill="#5dab62"/>
</svg>`);

const mintImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <path d="M80 132V38" stroke="#398a4e" stroke-width="8" stroke-linecap="round"/>
  <ellipse cx="56" cy="63" rx="28" ry="18" fill="#5cbf73" transform="rotate(22 56 63)"/>
  <ellipse cx="102" cy="76" rx="31" ry="19" fill="#4ba965" transform="rotate(-24 102 76)"/>
  <ellipse cx="56" cy="99" rx="28" ry="18" fill="#75cc84" transform="rotate(24 56 99)"/>
  <ellipse cx="102" cy="111" rx="27" ry="17" fill="#5eba70" transform="rotate(-20 102 111)"/>
</svg>`);

const parsleyImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <path d="M79 134V72" stroke="#4f9d50" stroke-width="8" stroke-linecap="round"/>
  <circle cx="80" cy="55" r="17" fill="#66b85c"/>
  <circle cx="61" cy="65" r="16" fill="#74c96b"/>
  <circle cx="99" cy="66" r="16" fill="#5aa954"/>
  <circle cx="52" cy="86" r="16" fill="#68ba5f"/>
  <circle cx="108" cy="87" r="16" fill="#76c96b"/>
  <circle cx="79" cy="84" r="18" fill="#4f9f4f"/>
</svg>`);

const lavenderImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <path d="M80 136c0-36 0-70 1-103" stroke="#6b985a" stroke-width="7" stroke-linecap="round"/>
  <path d="M62 135c7-32 15-62 25-91" stroke="#7aa866" stroke-width="5" stroke-linecap="round"/>
  <path d="M99 135c-6-33-12-64-19-93" stroke="#6d9d5f" stroke-width="5" stroke-linecap="round"/>
  <g fill="#8d71c7">
    <ellipse cx="80" cy="32" rx="9" ry="13"/><ellipse cx="74" cy="50" rx="8" ry="12"/><ellipse cx="87" cy="49" rx="8" ry="12"/>
    <ellipse cx="70" cy="68" rx="7" ry="11"/><ellipse cx="92" cy="67" rx="7" ry="11"/>
  </g>
</svg>`);

const flowerImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <path d="M80 135V82" stroke="#5d9f57" stroke-width="8" stroke-linecap="round"/>
  <path d="M77 108c-18-12-33-13-45-3 12 14 27 16 45 3Z" fill="#75bd68"/>
  <g transform="translate(80 64)">
    <ellipse rx="17" ry="29" fill="#f0a7c8" transform="rotate(0) translate(0 -18)"/>
    <ellipse rx="17" ry="29" fill="#e58db9" transform="rotate(72) translate(0 -18)"/>
    <ellipse rx="17" ry="29" fill="#f0a7c8" transform="rotate(144) translate(0 -18)"/>
    <ellipse rx="17" ry="29" fill="#e58db9" transform="rotate(216) translate(0 -18)"/>
    <ellipse rx="17" ry="29" fill="#f0a7c8" transform="rotate(288) translate(0 -18)"/>
    <circle r="14" fill="#f1c35b"/>
  </g>
</svg>`);

const marigoldImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <path d="M80 136V88" stroke="#5d9f57" stroke-width="8" stroke-linecap="round"/>
  <g transform="translate(80 66)">
    <circle r="36" fill="#f2a534"/><circle r="27" fill="#f7c150"/><circle r="17" fill="#c87824"/>
    <path d="M0-46 9-28 28-36 23-15 44-8 25 4 37 22 15 19 8 41-5 23-25 35-19 13-42 5-20-7-31-26-10-22Z" fill="#f08f2f" opacity=".78"/>
  </g>
</svg>`);

const chamomileImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <path d="M80 136V88" stroke="#5d9f57" stroke-width="8" stroke-linecap="round"/>
  <g transform="translate(80 64)">
    <ellipse rx="10" ry="26" fill="#ffffff" transform="rotate(0) translate(0 -19)"/>
    <ellipse rx="10" ry="26" fill="#ffffff" transform="rotate(45) translate(0 -19)"/>
    <ellipse rx="10" ry="26" fill="#ffffff" transform="rotate(90) translate(0 -19)"/>
    <ellipse rx="10" ry="26" fill="#ffffff" transform="rotate(135) translate(0 -19)"/>
    <ellipse rx="10" ry="26" fill="#ffffff" transform="rotate(180) translate(0 -19)"/>
    <ellipse rx="10" ry="26" fill="#ffffff" transform="rotate(225) translate(0 -19)"/>
    <ellipse rx="10" ry="26" fill="#ffffff" transform="rotate(270) translate(0 -19)"/>
    <ellipse rx="10" ry="26" fill="#ffffff" transform="rotate(315) translate(0 -19)"/>
    <circle r="15" fill="#f2c64d"/>
  </g>
</svg>`);

const currantImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <path d="M82 34c-8 36-8 67-1 94" stroke="#6a8b45" stroke-width="6" stroke-linecap="round"/>
  <path d="M81 50c-16-13-32-15-48-5 11 15 28 19 48 5Z" fill="#6aae5c"/>
  <path d="M83 66c18-13 35-15 51-4-12 16-29 19-51 4Z" fill="#77bd68"/>
  <g fill="#b3263e"><circle cx="67" cy="85" r="11"/><circle cx="93" cy="93" r="11"/><circle cx="76" cy="113" r="11"/></g>
</svg>`);

const gooseberryImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <path d="M80 36c-12 35-12 66 0 94" stroke="#6b8d45" stroke-width="6" stroke-linecap="round"/>
  <path d="M78 54c-20-12-38-12-52 2 15 14 33 15 52-2Z" fill="#73b76a"/>
  <circle cx="80" cy="100" r="30" fill="#9dcf64"/>
  <path d="M66 78c14 10 28 10 42 0" fill="none" stroke="#d6e9a6" stroke-width="5" stroke-linecap="round"/>
  <path d="M59 100c17 8 34 8 51 0" fill="none" stroke="#d6e9a6" stroke-width="5" stroke-linecap="round"/>
</svg>`);

const figImage = svgPlantImage(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="28" fill="#f8fbf3"/>
  <path d="M80 38c28 25 41 48 41 69 0 24-17 39-41 39s-41-15-41-39c0-21 13-44 41-69Z" fill="#7b5aa6"/>
  <path d="M80 58c17 18 25 34 25 49 0 16-10 25-25 25s-25-9-25-25c0-15 8-31 25-49Z" fill="#d77987"/>
  <circle cx="80" cy="103" r="18" fill="#f0c15f" opacity=".72"/>
  <path d="M76 42c-13-12-27-15-42-9 8 13 22 19 40 16" fill="#6baa5f"/>
</svg>`);

const exactPlantImages: Record<string, string> = {
  arugula: leafyImage,
  basil: basilImage,
  bay: herbImage,
  bean: beanImage,
  beetroot: beetrootImage,
  begonia: begoniaImage,
  blackberry: blackberryImage,
  black_currant: currantImage,
  blueberry: blueberryImage,
  borage: flowerImage,
  broad_bean: beanImage,
  broccoli: broccoliImage,
  cabbage: leafyImage,
  calendula: marigoldImage,
  carrot: carrotImage,
  cauliflower: cauliflowerImage,
  celery: celeryImage,
  chamomile: chamomileImage,
  chervil: parsleyImage,
  chili: pepperImage,
  chinese_cabbage: leafyImage,
  chives: alliumImage,
  coriander: parsleyImage,
  cosmos: flowerImage,
  cucumber: cucumberImage,
  dill: dillImage,
  eggplant: eggplantImage,
  endive: radicchioImage,
  fennel_bulb: fennelImage,
  fennel_leaf: fennelImage,
  fig: figImage,
  fuchsia: flowerImage,
  garlic: alliumImage,
  geranium: flowerImage,
  gooseberry: gooseberryImage,
  grape: grapeImage,
  impatiens: flowerImage,
  kale: leafyImage,
  kohlrabi: kohlrabiImage,
  lambs_lettuce: leafyImage,
  lavender: lavenderImage,
  leek: alliumImage,
  lemon_balm: mintImage,
  lemon_verbena: herbImage,
  lettuce: leafyImage,
  lobelia: flowerImage,
  lovage: herbImage,
  marjoram: herbImage,
  melon: squashImage,
  mint: mintImage,
  mizuna: leafyImage,
  mustard_greens: leafyImage,
  nasturtium: flowerImage,
  okra: okraImage,
  onion: alliumImage,
  oregano: herbImage,
  pak_choi: leafyImage,
  parsley: parsleyImage,
  parsnip: parsnipImage,
  pea_garden: beanImage,
  pea_sugar: beanImage,
  pepper: pepperImage,
  petunia: flowerImage,
  potato: potatoImage,
  pumpkin: squashImage,
  purslane: leafyImage,
  radicchio: radicchioImage,
  radish: radishImage,
  raspberry: raspberryImage,
  red_currant: currantImage,
  rhubarb: rhubarbImage,
  romaine_lettuce: leafyImage,
  rosemary: herbImage,
  sage: herbImage,
  spinach: leafyImage,
  spring_onion: alliumImage,
  squash: squashImage,
  strawberry: berryImage,
  strawberry_spinach: leafyImage,
  sweet_pea: sweetPeaImage,
  sweetcorn: cornImage,
  swiss_chard: leafyImage,
  tagetes: marigoldImage,
  tarragon: herbImage,
  thyme: herbImage,
  tomato: tomatoImage,
  turnip: turnipImage,
  verbena: flowerImage,
  watercress: watercressImage,
  zucchini: squashImage,
};

const namedPlantImages: Record<string, string> = {
  agurk: cucumberImage,
  agurkurt: flowerImage,
  aubergine: eggplantImage,
  basilikum: basilImage,
  begonia: begoniaImage,
  bjørnebær: blackberryImage,
  bladfennikel: fennelImage,
  blåbær: blueberryImage,
  blomkarse: flowerImage,
  bondebønne: beanImage,
  brokkoli: broccoliImage,
  bringebær: raspberryImage,
  brønnkarse: watercressImage,
  chili: pepperImage,
  dill: dillImage,
  drue: grapeImage,
  endive: radicchioImage,
  erteblomst: sweetPeaImage,
  estragon: herbImage,
  fennel: fennelImage,
  fiken: figImage,
  flittig_lise: flowerImage,
  gresskar: squashImage,
  gressløk: alliumImage,
  gulrot: carrotImage,
  hvitløk: alliumImage,
  jordbær: berryImage,
  jordbærspinat: leafyImage,
  kamille: chamomileImage,
  kål: leafyImage,
  kinakål: leafyImage,
  koriander: parsleyImage,
  kosmosblomst: flowerImage,
  lavendel: lavenderImage,
  løk: alliumImage,
  løpstikke: herbImage,
  mangold: leafyImage,
  melon: squashImage,
  mynte: mintImage,
  nepe: turnipImage,
  okra: okraImage,
  oregano: herbImage,
  paprika: pepperImage,
  pastinakk: parsnipImage,
  persille: parsleyImage,
  potet: potatoImage,
  purre: alliumImage,
  rabarbra: rhubarbImage,
  radicchio: radicchioImage,
  reddik: radishImage,
  rips: currantImage,
  rosmarin: herbImage,
  rødbete: beetrootImage,
  salat: leafyImage,
  salvie: herbImage,
  selleri: celeryImage,
  sitronmelisse: mintImage,
  sitronverbena: herbImage,
  solbær: currantImage,
  spinat: leafyImage,
  squash: squashImage,
  stikkelsbær: gooseberryImage,
  sukkererter: beanImage,
  sukkermais: cornImage,
  timian: herbImage,
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
