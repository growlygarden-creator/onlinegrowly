from contextlib import asynccontextmanager
import base64
import csv
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import html
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import shutil
import smtplib
import ssl
import sqlite3
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlsplit, urlunsplit
from urllib.request import Request as UrlRequest, urlopen
from zoneinfo import ZoneInfo

from fastapi import BackgroundTasks, FastAPI, Form, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

try:
    import certifi
except ImportError:  # pragma: no cover - production environments may rely on system certs.
    certifi = None


BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
PLANT_IMPORT_DIR = ROOT_DIR / "data" / "imports"
FRONTEND_DIST_CANDIDATES = (
    ROOT_DIR / "frontend" / "dist",
    BASE_DIR / "frontend_dist",
)


def load_local_env(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_local_env(ROOT_DIR / ".env")

def resolve_preferred_data_dir() -> Path:
    configured_data_dir = os.getenv("GROWLY_DATA_DIR", "").strip()
    if configured_data_dir:
        return Path(configured_data_dir)
    if os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"):
        return Path("/var/data")
    return ROOT_DIR / "data"


LEGACY_DATA_DIR = ROOT_DIR / "data"
PREFERRED_DATA_DIR = resolve_preferred_data_dir()
FALLBACK_DATA_DIR = Path("/tmp/growly-data")
DATA_DIR = PREFERRED_DATA_DIR
DB_PATH = DATA_DIR / "growly.db"
DATA_DIR_FALLBACK_REASON = ""
DEFAULT_SENSOR_URL = "http://192.168.0.133/sensor"
APP_USERNAME = os.getenv("APP_USERNAME", "growly")
APP_PASSWORD = os.getenv("APP_PASSWORD", "growly-view")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "Growly@Admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", APP_PASSWORD)
ACTIVE_FIRMWARE_VERSION = os.getenv("ACTIVE_FIRMWARE_VERSION", "").strip()
ACTIVE_FIRMWARE_URL = os.getenv("ACTIVE_FIRMWARE_URL", "").strip()
BUNDLED_FIRMWARE_DIR = BASE_DIR / "static" / "firmware"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4-mini").strip()
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587").strip() or "587")
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER).strip()
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").strip().lower() in {"1", "true", "yes", "on"}
APP_PUBLIC_URL = os.getenv("APP_PUBLIC_URL", "https://onlinegrowly.onrender.com/app").strip()
SETTINGS_PASSWORD = os.getenv("SETTINGS_PASSWORD", "growly-settings")
SESSION_SECRET = os.getenv("SESSION_SECRET", "growly-local-session-secret")
SESSION_SAME_SITE = os.getenv("SESSION_SAME_SITE", "lax").strip().lower() or "lax"
SESSION_HTTPS_ONLY = os.getenv("SESSION_HTTPS_ONLY", "false").strip().lower() in {"1", "true", "yes", "on"}
NATIVE_APP_ORIGINS = tuple(
    origin.strip()
    for origin in os.getenv(
        "NATIVE_APP_ORIGINS",
        "capacitor://localhost,http://localhost,http://127.0.0.1,ionic://localhost",
    ).split(",")
    if origin.strip()
)
DEFAULT_VIEWER_USERNAME = os.getenv("DEFAULT_VIEWER_USERNAME", "Testuser")
DEFAULT_VIEWER_PASSWORD = os.getenv("DEFAULT_VIEWER_PASSWORD", "Growly2026")
DEFAULT_PRIMARY_HUB_ID = "growly-hub-001"
PAIRING_TOKEN_LENGTH = 6
PAIRING_TOKEN_ALPHABET = "0123456789"
PAIRING_TOKEN_TTL = timedelta(minutes=10)
SUPABASE_REST_ENDPOINT = os.getenv(
    "SUPABASE_REST_ENDPOINT",
    "https://ffxkxsclgiojrzmxvyuk.supabase.co/rest/v1/sensor_data",
)
SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
SUPABASE_CORE_SYNC_ENABLED = os.getenv("SUPABASE_CORE_SYNC_ENABLED", "true").strip().lower() in {"1", "true", "yes", "on"}
MET_WEATHER_USER_AGENT = os.getenv(
    "MET_WEATHER_USER_AGENT",
    "GrowlyGarden/1.0 growlygarden@gmail.com",
).strip()
WEATHER_REPORT_CACHE: dict[str, dict[str, Any]] = {}
SUPABASE_CORE_TABLES = (
    "growly_users",
    "growly_hubs",
    "growly_hub_members",
    "growly_pairing_tokens",
)


def app_language(value: Any) -> str:
    raw = str(value or "").strip().lower()
    return "en" if raw.startswith("en") else "no"


DEFAULT_APP_SETTINGS: dict[str, Any] = {
    "sensor_url": DEFAULT_SENSOR_URL,
    "sample_time_soil_ms": 60000,
    "sample_time_light_ms": 60000,
    "sample_time_air_ms": 60000,
    "sample_time_cloud_ms": 60000,
    "history_start_at": "",
}
GLOBAL_CONFIG_KEYS = {
    "sample_time_soil_ms",
    "sample_time_light_ms",
    "sample_time_air_ms",
    "sample_time_cloud_ms",
}
DEFAULT_PLANT_PROFILES: tuple[dict[str, Any], ...] = (
    {
        "profile_id": "tomato",
        "name": "Tomat",
        "family": "Varmeelskende",
        "icon": "T",
        "tone": "tomato",
        "ranges": {
            "airTemperature": {"optimal": [20, 26], "caution": [16, 30]},
            "airHumidity": {"optimal": [45, 65], "caution": [35, 78]},
            "soilHumidity": {"optimal": [55, 75], "caution": [45, 85]},
            "soilTemperature": {"optimal": [20, 26], "caution": [16, 30]},
            "ph": {"optimal": [6.0, 6.8], "caution": [5.5, 7.2]},
            "lux": {"optimal": [5000, 25000], "caution": [2000, 40000]},
        },
    },
    {
        "profile_id": "cucumber",
        "name": "Agurk",
        "family": "Varmeelskende",
        "icon": "A",
        "tone": "cucumber",
        "ranges": {
            "airTemperature": {"optimal": [22, 28], "caution": [18, 31]},
            "airHumidity": {"optimal": [60, 80], "caution": [48, 90]},
            "soilHumidity": {"optimal": [60, 80], "caution": [50, 90]},
            "soilTemperature": {"optimal": [22, 28], "caution": [18, 31]},
            "ph": {"optimal": [6.0, 7.0], "caution": [5.5, 7.5]},
            "lux": {"optimal": [6000, 30000], "caution": [2500, 45000]},
        },
    },
    {
        "profile_id": "basil",
        "name": "Basilikum",
        "family": "Urter",
        "icon": "B",
        "tone": "basil",
        "ranges": {
            "airTemperature": {"optimal": [20, 26], "caution": [18, 30]},
            "airHumidity": {"optimal": [45, 65], "caution": [35, 78]},
            "soilHumidity": {"optimal": [50, 70], "caution": [40, 80]},
            "soilTemperature": {"optimal": [20, 26], "caution": [18, 30]},
            "ph": {"optimal": [6.0, 7.0], "caution": [5.5, 7.5]},
            "lux": {"optimal": [5000, 22000], "caution": [2500, 35000]},
        },
    },
    {
        "profile_id": "pepper",
        "name": "Paprika",
        "family": "Varmeelskende",
        "icon": "P",
        "tone": "pepper",
        "ranges": {
            "airTemperature": {"optimal": [21, 28], "caution": [18, 31]},
            "airHumidity": {"optimal": [45, 65], "caution": [35, 78]},
            "soilHumidity": {"optimal": [55, 72], "caution": [45, 82]},
            "soilTemperature": {"optimal": [22, 29], "caution": [18, 32]},
            "ph": {"optimal": [6.0, 6.8], "caution": [5.5, 7.2]},
            "lux": {"optimal": [6000, 26000], "caution": [3000, 42000]},
        },
    },
    {
        "profile_id": "lettuce",
        "name": "Salat",
        "family": "Kjølig start",
        "icon": "S",
        "tone": "leafy",
        "ranges": {
            "airTemperature": {"optimal": [10, 18], "caution": [6, 24]},
            "airHumidity": {"optimal": [50, 75], "caution": [40, 85]},
            "soilHumidity": {"optimal": [55, 75], "caution": [45, 85]},
            "soilTemperature": {"optimal": [10, 18], "caution": [6, 22]},
            "ph": {"optimal": [6.0, 7.0], "caution": [5.5, 7.5]},
            "lux": {"optimal": [3000, 18000], "caution": [1500, 30000]},
        },
    },
    {
        "profile_id": "strawberry",
        "name": "Jordbær",
        "family": "Bær",
        "icon": "J",
        "tone": "berry",
        "ranges": {
            "airTemperature": {"optimal": [16, 22], "caution": [12, 28]},
            "airHumidity": {"optimal": [55, 75], "caution": [45, 85]},
            "soilHumidity": {"optimal": [58, 74], "caution": [48, 84]},
            "soilTemperature": {"optimal": [16, 22], "caution": [12, 26]},
            "ph": {"optimal": [5.5, 6.5], "caution": [5.2, 6.9]},
            "lux": {"optimal": [4000, 20000], "caution": [1800, 32000]},
        },
    },
)


def csv_float(row: dict[str, str], key: str, fallback: float = 0) -> float:
    value = (row.get(key) or "").strip()
    if not value:
        return fallback
    return float(value)


def csv_int(row: dict[str, str], key: str, fallback: int = 0) -> int:
    return int(round(csv_float(row, key, fallback)))


def bool_text(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "ja", "on"}


def plant_tone(row: dict[str, str]) -> str:
    plant_id = (row.get("plant_id") or "").lower()
    category = (row.get("kategori") or "").lower()
    family = (row.get("familie_type") or "").lower()
    if "tomato" in plant_id:
        return "tomato"
    if "cucumber" in plant_id or "agurk" in plant_id:
        return "cucumber"
    if "basil" in plant_id:
        return "basil"
    if "pepper" in plant_id or "chili" in plant_id:
        return "pepper"
    if category == "bær" or family.startswith("bær"):
        return "berry"
    if "blad" in family or "kål" in family or plant_id in {"lettuce", "spinach", "kale"}:
        return "leafy"
    return "leafy" if category in {"grønnsak", "urt"} else "berry"


def plant_icon(name: str, plant_id: str) -> str:
    plant_id = (plant_id or "").lower()
    name = (name or "").lower()
    icon_map = {
        "tomato": "🍅",
        "cucumber": "🥒",
        "pepper": "🫑",
        "chili": "🌶️",
        "basil": "🌿",
        "parsley": "🌿",
        "coriander": "🌿",
        "dill": "🌿",
        "lettuce": "🥬",
        "spinach": "🥬",
        "kale": "🥬",
        "arugula": "🥬",
        "radish": "🫜",
        "carrot": "🥕",
        "strawberry": "🍓",
        "squash": "🌼",
        "zucchini": "🌼",
        "eggplant": "🍆",
        "melon": "🍈",
        "thyme": "🌿",
        "oregano": "🌿",
        "rosemary": "🌿",
        "mint": "🌿",
        "chives": "🌿",
        "onion": "🧅",
        "garlic": "🧄",
        "potato": "🥔",
        "pumpkin": "🎃",
        "raspberry": "🫐",
        "blueberry": "🫐",
        "grape": "🍇",
        "fig": "🪴",
    }
    if plant_id in icon_map:
        return icon_map[plant_id]
    if "tomat" in name:
        return "🍅"
    if "agurk" in name:
        return "🥒"
    if "paprika" in name:
        return "🫑"
    if "chili" in name:
        return "🌶️"
    if "salat" in name or "kål" in name:
        return "🥬"
    if "bær" in name:
        return "🫐"
    if "blomst" in name:
        return "🌸"
    return "🌱"


CATALOG_CATEGORY_EN = {
    "grønnsak": "vegetable",
    "urt": "herb",
    "bær": "berries",
    "frukt": "fruit",
    "blomst": "flower",
}

CATALOG_FAMILY_EN = {
    "varmeelskende fruktgrønnsak": "warm-loving fruiting vegetable",
    "varmeelskende chili": "warm-loving chili",
    "varmeelskende urt": "warm-loving herb",
    "bladurt": "leaf herb",
    "bladurt kortlivd": "short-lived leaf herb",
    "ettårig urt": "annual herb",
    "flerårig urt": "perennial herb",
    "kjølig bladgrønt": "cool-season leafy green",
    "kålvekst kjølig": "cool-season brassica",
    "rotgrønnsak": "root vegetable",
    "kjølig rotgrønnsak": "cool-season root vegetable",
    "stilk/knoll": "stem or bulb crop",
    "middelhavsurt": "Mediterranean herb",
    "bær flerårig": "perennial berry",
    "bær busk": "berry bush",
    "klatrende frukt": "climbing fruit",
    "middelhavsfrukt": "Mediterranean fruit",
    "potteblomst": "potted flower",
    "klatreblomst": "climbing flower",
    "løkvekst": "allium crop",
    "belgvekst": "legume",
    "belgvekst kjølig": "cool-season legume",
    "belgvekst varm": "warm-season legume",
    "varmeelskende korn": "warm-loving grain crop",
    "blomst/urt": "flowering herb",
}

CATALOG_VARIANT_TYPE_EN = {
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
}

CATALOG_TEXT_EN = {
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
    "Kjølig til mild løkvekst som liker veldrenert jord og moderat fukt.": "A cool to mild allium crop that likes well-drained soil and moderate moisture.",
    "Belgvekst som trives i kjølig til moderat temperatur og jevnt fuktig jord.": "A legume that thrives in cool to moderate temperatures and evenly moist soil.",
    "Sommerblomst for drivhus og potter, liker sol, moderat temperatur og god lufting.": "A summer flower for greenhouses and pots; likes sun, moderate temperatures and good ventilation.",
    "Kompakte planter med mange små frukter; tåler ofte litt høyere varme men er følsom for ujevn vanning (sprekk).": "Compact plants with many small fruits; often tolerate slightly higher heat but are sensitive to uneven watering and cracking.",
    "Store frukter krever jevn fukt og god lufting for å unngå sprekk og gråmugg.": "Large fruits need even moisture and good ventilation to avoid cracking and grey mould.",
    "Ofte dyrket for saus; tåler varme, men krever jevn vanning for å unngå sprekking.": "Often grown for sauce; tolerates warmth but needs even watering to avoid cracking.",
    "Standard tomatprofil; følger baseverdiene uten særlige avvik.": "Standard tomato profile; follows the base values without notable adjustments.",
    "Store frukter, noe mer følsom for ujevn fukt og høy luftfukt enn små paprika.": "Large fruits, somewhat more sensitive to uneven moisture and high humidity than small peppers.",
    "Tåler ofte litt høyere varme og litt tørrere jord, men er følsom for høy luftfukt og stillestående luft.": "Often tolerates slightly higher heat and slightly drier soil, but is sensitive to high humidity and stagnant air.",
    "Klassisk drivhusagurk med høyt vann- og fuktbehov.": "Classic greenhouse cucumber with high water and humidity needs.",
    "Kompakte planter, tåler litt høyere varme og lys, men krever fortsatt høy jordfukt.": "Compact plants that tolerate slightly higher heat and light, but still need high soil moisture.",
    "Trives best kjølig; går lett i stokk ved høy varme og tørke.": "Thrives best cool; bolts easily in high heat and drought.",
    "Tåler ofte litt mer varme og høsting over tid enn hodesalat.": "Often tolerates a little more heat and repeated harvesting than head lettuce.",
    "Tåler ofte litt mer varme og lys enn hodesalat, men liker fortsatt jevn fukt.": "Often tolerates a little more heat and light than head lettuce, but still likes even moisture.",
    "Trenger varme, lys og jevn fukt; svært kuldefølsom.": "Needs warmth, light and even moisture; very sensitive to cold.",
    "Tåler ofte litt tørrere jord og mer lys enn storbladet basilikum.": "Often tolerates slightly drier soil and more light than large-leaf basil.",
    "Kraftigvoksende mynte; tåler mye klipping, men ikke uttørking.": "Vigorous mint; tolerates frequent cutting but not drying out.",
    "Tåler mye varme og tørke, men reagerer raskt på for våt jord.": "Tolerates plenty of heat and drought, but reacts quickly to soil that is too wet.",
    "God i potter; krever svært god drenering og mye lys.": "Good in pots; requires excellent drainage and plenty of light.",
    "Klassiske sorter med én hovedavling; foretrekker kjøligere klima.": "Classic varieties with one main crop; prefer cooler conditions.",
    "Bærer lenge; tåler ofte mer varme og lys, men krever jevn fukt for fin bærkvalitet.": "Bears for a long period; often tolerates more heat and light, but needs even moisture for good berry quality.",
    "Søt oransje cherrytomat; liker høy varme og jevn fukt, svært sprekk-sensitiv.": "Sweet orange cherry tomato; likes high warmth and even moisture, very crack-sensitive.",
    "Klassisk drivhustomat; forholdsvis robust for norske forhold.": "Classic greenhouse tomato; fairly robust for Nordic conditions.",
    "Plommetomat for saus; trenger jevn fukt for å unngå sprekking.": "Plum tomato for sauce; needs even moisture to avoid cracking.",
    "Italiensk saus-tomat; liker varme og god drenering, jevn vanning.": "Italian sauce tomato; likes warmth, good drainage and even watering.",
    "Klassisk blokkpaprika for drivhus; trenger varm jord og jevn fukt.": "Classic bell pepper for greenhouses; needs warm soil and even moisture.",
    "Kompakt sterk chili; trives varmt og lyst, tåler litt tørrere jord.": "Compact hot chili; thrives warm and bright, tolerates slightly drier soil.",
    "Varmekrevende chili; krever mye lys og jevn temperatur.": "Heat-demanding chili; needs plenty of light and steady temperature.",
    "Robust salatagurk; egnet til hobbydrivhus.": "Robust slicing cucumber; suitable for hobby greenhouses.",
    "Miniagurk som gir jevn avling i varmt drivhus.": "Mini cucumber that gives steady yields in a warm greenhouse.",
    "Liten, kompakt romansalat; egnet til potter og kasser.": "Small, compact romaine lettuce; suitable for pots and boxes.",
    "Krusete rød plukksalat; tåler en del varme, men går i stokk ved langvarig tørke.": "Curly red leaf lettuce; tolerates some heat, but bolts during prolonged drought.",
    "Standard storbladet basilikum for potter og drivhus.": "Standard large-leaf basil for pots and greenhouses.",
    "Mørk dekorativ basilikum med samme klimakrav som Genovese.": "Dark decorative basil with the same climate needs as Genovese.",
    "Sterk mynte til te; liker fuktig jord og mye lys.": "Strong mint for tea; likes moist soil and plenty of light.",
    "Vanlig tidlig sort; ganske fast frukt, følsom for gråmugg ved høy fukt.": "Common early variety; fairly firm fruit, sensitive to grey mould in high humidity.",
    "Remonterende sort for lang sesong i drivhus og potter.": "Everbearing variety for a long season in greenhouses and pots.",
}

SEED_GUIDE_TEXT_EN = {
    "Så inne i mars-april.": "Sow indoors in March-April.",
    "Forkultiveres inne lyst og varmt.": "Start indoors in a bright, warm place.",
    "Pottes om når planten har 2-4 varige blad.": "Repot when the plant has 2-4 true leaves.",
    "Plantes i drivhus fra mai når nettene er stabile.": "Plant in the greenhouse from May when nights are stable.",
    "Høstes vanligvis juli-september.": "Usually harvested July-September.",
    "Så inne i februar-mars.": "Sow indoors in February-March.",
    "Startes inne tidlig, varmt og lyst.": "Start indoors early, warm and bright.",
    "Pottes om når røttene fyller småpotten.": "Repot when the roots fill the small pot.",
    "Settes i drivhus fra mai-juni.": "Move to the greenhouse from May-June.",
    "Høstes fra juli og utover.": "Harvest from July onward.",
    "Så inne i januar-mars.": "Sow indoors in January-March.",
    "Startes inne tidlig med varme og mye lys.": "Start indoors early with warmth and plenty of light.",
    "Pottes om gradvis for sterk rotvekst.": "Repot gradually for strong root growth.",
    "Settes i drivhus når temperaturen holder seg stabil.": "Move to the greenhouse when the temperature stays stable.",
    "Høstes fra sensommeren og utover.": "Harvest from late summer onward.",
    "Så inne i april-mai.": "Sow indoors in April-May.",
    "Forkultiveres kort inne, helst varmt.": "Start briefly indoors, preferably warm.",
    "Pottes forsiktig om uten å forstyrre røttene for mye.": "Repot carefully without disturbing the roots too much.",
    "Plantes i drivhus fra mai-juni.": "Plant in the greenhouse from May-June.",
    "Høstes ofte fra juni/juli.": "Often harvested from June/July.",
    "Så inne i mars-mai.": "Sow indoors in March-May.",
    "Startes inne varmt, lyst og uten trekk.": "Start indoors warm, bright and away from drafts.",
    "Prikles eller pottes om når plantene kan håndteres.": "Prick out or repot when the plants can be handled.",
    "Trives best i drivhus eller varm vinduskarm.": "Thrives best in a greenhouse or warm windowsill.",
    "Toppes og høstes jevnlig gjennom sesongen.": "Pinch and harvest regularly through the season.",
    "Så inne eller direkte fra mars-august.": "Sow indoors or direct from March-August.",
    "Kan forkultiveres i pluggbrett for tidligere avling.": "Can be started in plug trays for an earlier crop.",
    "Pottes/plantes om når småplantene er håndterbare.": "Repot or plant on when seedlings are easy to handle.",
    "Settes ut/drivhus når jorda er kjølig og fuktig.": "Move outdoors or into the greenhouse when the soil is cool and moist.",
    "Høstes fortløpende etter størrelse.": "Harvest continuously by size.",
    "Plantes vanligvis som småplanter vår eller sensommer.": "Usually planted as young plants in spring or late summer.",
    "Kan stå i potter/kasser i drivhus.": "Can grow in pots or boxes in the greenhouse.",
    "Pottes om ved tett rotklump eller før ny sesong.": "Repot when root-bound or before a new season.",
    "Settes ut eller i drivhus når faren for hard frost er over.": "Move outdoors or into the greenhouse when hard frost risk has passed.",
    "Bærer vanligvis fra juni, remonterende sorter lengre.": "Usually bears from June; everbearing varieties crop longer.",
    "Forkultiveres inne med varme og godt lys.": "Start indoors with warmth and good light.",
    "Pottes om når røttene fyller potten.": "Repot when the roots fill the pot.",
    "Flyttes til drivhus fra mai-juni.": "Move to the greenhouse from May-June.",
    "Høstes når frukt eller blader er modne.": "Harvest when fruit or leaves are mature.",
    "Så direkte fra april-juni.": "Sow direct from April-June.",
    "Forkultivering er sjelden nødvendig.": "Starting indoors is rarely necessary.",
    "Unngå mye ompotting, røtter liker ro.": "Avoid repeated repotting; roots prefer to be left undisturbed.",
    "Dyrkes direkte i dyp og løs jord.": "Grow direct in deep, loose soil.",
    "Høstes når røttene har ønsket størrelse.": "Harvest when roots reach the desired size.",
    "Så inne eller direkte fra mars-juli.": "Sow indoors or direct from March-July.",
    "Kan forkultiveres for jevnere start.": "Can be started indoors for a more even start.",
    "Pottes/plantes om når småplantene er robuste.": "Repot or plant on when seedlings are sturdy.",
    "Trives best i kjølig til mildt drivhusklima.": "Thrives best in cool to mild greenhouse conditions.",
    "Høstes fortløpende eller når hodet er utviklet.": "Harvest continuously or when the head has developed.",
    "Så inne fra mars-mai.": "Sow indoors from March-May.",
    "Startes lyst og jevnt fuktig.": "Start bright and evenly moist.",
    "Pottes om når planten har god rotklump.": "Repot when the plant has a good root ball.",
    "Kan stå i drivhus, potte eller varm krok.": "Can grow in a greenhouse, pot or warm corner.",
    "Høstes jevnlig ved å klippe skudd/topper.": "Harvest regularly by cutting shoots or tips.",
    "Start inne vår eller plant som småplante etter behov.": "Start indoors in spring or plant as a young plant as needed.",
    "Gi lys, moderat varme og jevn fukt.": "Give light, moderate warmth and even moisture.",
    "Settes i drivhus/krukke når veksten er i gang.": "Move to greenhouse or container when growth is active.",
    "Følg blomstring/fruktsetting gjennom sesongen.": "Follow flowering and fruit set through the season.",
    "Såtid avhenger av sort og dyrkingsmål.": "Sowing time depends on variety and growing goal.",
    "Start lyst, jevnt fuktig og uten temperatursjokk.": "Start bright, evenly moist and without temperature shocks.",
    "Flyttes videre når planten er robust.": "Move on when the plant is sturdy.",
    "Følg utviklingen gjennom sesongen.": "Follow development through the season.",
}


def catalog_category(value: Any, language: str) -> str:
    text = str(value or "").strip()
    return CATALOG_CATEGORY_EN.get(text.lower(), text) if language == "en" else text


def catalog_family(value: Any, language: str) -> str:
    text = str(value or "").strip()
    return CATALOG_FAMILY_EN.get(text.lower(), text) if language == "en" else text


def catalog_variant_type(value: Any, language: str) -> str:
    text = str(value or "").strip()
    return CATALOG_VARIANT_TYPE_EN.get(text.lower(), text) if language == "en" else text


def catalog_text(value: Any, language: str, fallback: str = "") -> str:
    text = str(value or "").strip()
    if language != "en":
        return text
    if not text:
        return fallback
    return CATALOG_TEXT_EN.get(text, fallback or "Use the listed climate range and keep care steady for this plant.")


def localized_seed_guide(guide: dict[str, str], language: str) -> dict[str, str]:
    if language != "en":
        return guide
    return {key: SEED_GUIDE_TEXT_EN.get(value, value) for key, value in guide.items()}


def seed_guide_for_profile(profile_id: str, category: str, family: str, language: str = "no") -> dict[str, str]:
    language = app_language(language)
    profile_id = (profile_id or "").lower()
    category = (category or "").lower()
    family = (family or "").lower()
    guides: dict[str, dict[str, str]] = {
        "tomato": {
            "sow": "Så inne i mars-april.",
            "start": "Forkultiveres inne lyst og varmt.",
            "repot": "Pottes om når planten har 2-4 varige blad.",
            "plant_out": "Plantes i drivhus fra mai når nettene er stabile.",
            "harvest": "Høstes vanligvis juli-september.",
        },
        "pepper": {
            "sow": "Så inne i februar-mars.",
            "start": "Startes inne tidlig, varmt og lyst.",
            "repot": "Pottes om når røttene fyller småpotten.",
            "plant_out": "Settes i drivhus fra mai-juni.",
            "harvest": "Høstes fra juli og utover.",
        },
        "chili": {
            "sow": "Så inne i januar-mars.",
            "start": "Startes inne tidlig med varme og mye lys.",
            "repot": "Pottes om gradvis for sterk rotvekst.",
            "plant_out": "Settes i drivhus når temperaturen holder seg stabil.",
            "harvest": "Høstes fra sensommeren og utover.",
        },
        "cucumber": {
            "sow": "Så inne i april-mai.",
            "start": "Forkultiveres kort inne, helst varmt.",
            "repot": "Pottes forsiktig om uten å forstyrre røttene for mye.",
            "plant_out": "Plantes i drivhus fra mai-juni.",
            "harvest": "Høstes ofte fra juni/juli.",
        },
        "basil": {
            "sow": "Så inne i mars-mai.",
            "start": "Startes inne varmt, lyst og uten trekk.",
            "repot": "Prikles eller pottes om når plantene kan håndteres.",
            "plant_out": "Trives best i drivhus eller varm vinduskarm.",
            "harvest": "Toppes og høstes jevnlig gjennom sesongen.",
        },
        "lettuce": {
            "sow": "Så inne eller direkte fra mars-august.",
            "start": "Kan forkultiveres i pluggbrett for tidligere avling.",
            "repot": "Pottes/plantes om når småplantene er håndterbare.",
            "plant_out": "Settes ut/drivhus når jorda er kjølig og fuktig.",
            "harvest": "Høstes fortløpende etter størrelse.",
        },
        "strawberry": {
            "sow": "Plantes vanligvis som småplanter vår eller sensommer.",
            "start": "Kan stå i potter/kasser i drivhus.",
            "repot": "Pottes om ved tett rotklump eller før ny sesong.",
            "plant_out": "Settes ut eller i drivhus når faren for hard frost er over.",
            "harvest": "Bærer vanligvis fra juni, remonterende sorter lengre.",
        },
    }
    if profile_id in guides:
        return localized_seed_guide(guides[profile_id], language)
    if "varmeelskende" in family:
        return localized_seed_guide({
            "sow": "Så inne i mars-april.",
            "start": "Forkultiveres inne med varme og godt lys.",
            "repot": "Pottes om når røttene fyller potten.",
            "plant_out": "Flyttes til drivhus fra mai-juni.",
            "harvest": "Høstes når frukt eller blader er modne.",
        }, language)
    if "rot" in family or "knoll" in family:
        return localized_seed_guide({
            "sow": "Så direkte fra april-juni.",
            "start": "Forkultivering er sjelden nødvendig.",
            "repot": "Unngå mye ompotting, røtter liker ro.",
            "plant_out": "Dyrkes direkte i dyp og løs jord.",
            "harvest": "Høstes når røttene har ønsket størrelse.",
        }, language)
    if "blad" in family or "kål" in family or category == "grønnsak":
        return localized_seed_guide({
            "sow": "Så inne eller direkte fra mars-juli.",
            "start": "Kan forkultiveres for jevnere start.",
            "repot": "Pottes/plantes om når småplantene er robuste.",
            "plant_out": "Trives best i kjølig til mildt drivhusklima.",
            "harvest": "Høstes fortløpende eller når hodet er utviklet.",
        }, language)
    if category == "urt":
        return localized_seed_guide({
            "sow": "Så inne fra mars-mai.",
            "start": "Startes lyst og jevnt fuktig.",
            "repot": "Pottes om når planten har god rotklump.",
            "plant_out": "Kan stå i drivhus, potte eller varm krok.",
            "harvest": "Høstes jevnlig ved å klippe skudd/topper.",
        }, language)
    if category in {"blomst", "bær", "frukt"}:
        return localized_seed_guide({
            "sow": "Start inne vår eller plant som småplante etter behov.",
            "start": "Gi lys, moderat varme og jevn fukt.",
            "repot": "Pottes om når røttene fyller potten.",
            "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
            "harvest": "Følg blomstring/fruktsetting gjennom sesongen.",
        }, language)
    return localized_seed_guide({
        "sow": "Såtid avhenger av sort og dyrkingsmål.",
        "start": "Start lyst, jevnt fuktig og uten temperatursjokk.",
        "repot": "Pottes om når røttene fyller potten.",
        "plant_out": "Flyttes videre når planten er robust.",
        "harvest": "Følg utviklingen gjennom sesongen.",
    }, language)


def profile_ranges_from_csv(row: dict[str, str]) -> dict[str, dict[str, list[float]]]:
    return {
        "airTemperature": {
            "optimal": [csv_float(row, "lufttemp_optimal_min_c"), csv_float(row, "lufttemp_optimal_max_c")],
            "caution": [csv_float(row, "lufttemp_akseptabel_min_c"), csv_float(row, "lufttemp_akseptabel_max_c")],
        },
        "airHumidity": {
            "optimal": [csv_float(row, "luftfukt_optimal_min_pct"), csv_float(row, "luftfukt_optimal_max_pct")],
            "caution": [csv_float(row, "luftfukt_akseptabel_min_pct"), csv_float(row, "luftfukt_akseptabel_max_pct")],
        },
        "soilHumidity": {
            "optimal": [csv_float(row, "jordfukt_optimal_min_pct"), csv_float(row, "jordfukt_optimal_max_pct")],
            "caution": [csv_float(row, "jordfukt_akseptabel_min_pct"), csv_float(row, "jordfukt_akseptabel_max_pct")],
        },
        "soilTemperature": {
            "optimal": [csv_float(row, "jordtemp_optimal_min_c"), csv_float(row, "jordtemp_optimal_max_c")],
            "caution": [csv_float(row, "jordtemp_akseptabel_min_c"), csv_float(row, "jordtemp_akseptabel_max_c")],
        },
        "ph": {
            "optimal": [csv_float(row, "ph_optimal_min"), csv_float(row, "ph_optimal_max")],
            "caution": [csv_float(row, "ph_akseptabel_min"), csv_float(row, "ph_akseptabel_max")],
        },
        "lux": {
            "optimal": [csv_float(row, "lys_optimal_min_lux"), csv_float(row, "lys_optimal_max_lux")],
            "caution": [csv_float(row, "lys_akseptabel_min_lux"), csv_float(row, "lys_akseptabel_max_lux")],
        },
    }


def adjusted_ranges(base_ranges: dict[str, Any], variant: dict[str, Any] | None) -> dict[str, Any]:
    ranges = json.loads(json.dumps(base_ranges))
    if not variant:
        return ranges

    ranges["airTemperature"]["caution"][0] += float(variant.get("delta_lufttemp_akseptabel_min_c") or 0)
    ranges["airTemperature"]["caution"][1] += float(variant.get("delta_lufttemp_akseptabel_max_c") or 0)
    ranges["soilHumidity"]["optimal"][0] += float(variant.get("delta_jordfukt_optimal_min_pct") or 0)
    ranges["soilHumidity"]["optimal"][1] += float(variant.get("delta_jordfukt_optimal_max_pct") or 0)
    ranges["airHumidity"]["caution"][1] += float(variant.get("delta_luftfukt_akseptabel_max_pct") or 0)
    ranges["lux"]["optimal"][0] += float(variant.get("delta_lys_optimal_min_lux") or 0)
    ranges["lux"]["optimal"][1] += float(variant.get("delta_lys_optimal_max_lux") or 0)
    return ranges
METRIC_KEYS = (
    "air_temperature",
    "air_humidity",
    "air_pressure",
    "lux",
    "humidity",
    "temperature",
    "ph",
    "conductivity",
    "nitrogen",
    "phosphorus",
    "potassium",
    "salinity",
    "tds",
)

METRIC_PAYLOAD_ALIASES = {
    "air_temperature": ("air_temperature", "airTemperature", "air_temperature_c"),
    "air_humidity": ("air_humidity", "airHumidity", "air_humidity_percent"),
    "air_pressure": ("air_pressure", "airPressure", "air_pressure_hpa", "pressure_hpa", "pressure"),
}
SPAN_CONFIG = {
    "minutes": {
        "window": timedelta(days=1),
        "bucket_seconds": 60,
    },
    "hours": {
        "window": timedelta(days=14),
        "bucket_seconds": 3600,
    },
    "days": {
        "window": timedelta(days=30),
        "bucket_seconds": 86400,
    },
}
APP_TIMEZONE = ZoneInfo("Europe/Oslo")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str, salt: str | None = None) -> str:
    salt_value = salt or secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_value.encode("utf-8"),
        200000,
    )
    return f"{salt_value}${derived.hex()}"


def issue_api_token(username: str) -> str:
    encoded_username = base64.urlsafe_b64encode(username.encode("utf-8")).decode("ascii").rstrip("=")
    signature = hmac.new(SESSION_SECRET.encode("utf-8"), encoded_username.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{encoded_username}.{signature}"


def username_from_api_token(token: str) -> str:
    try:
        encoded_username, signature = token.split(".", 1)
    except ValueError:
        return ""

    expected_signature = hmac.new(
        SESSION_SECRET.encode("utf-8"),
        encoded_username.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        return ""

    padding = "=" * (-len(encoded_username) % 4)
    try:
        return base64.urlsafe_b64decode(f"{encoded_username}{padding}").decode("utf-8").strip()
    except (ValueError, UnicodeDecodeError):
        return ""


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt_value, _ = password_hash.split("$", 1)
    except ValueError:
        return False
    expected = hash_password(password, salt_value)
    return hmac.compare_digest(expected, password_hash)


def mail_is_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD and SMTP_FROM)


def public_base_url() -> str:
    return APP_PUBLIC_URL.removesuffix("/app").rstrip("/")


def bundled_firmware_info() -> tuple[str, str]:
    if not BUNDLED_FIRMWARE_DIR.exists():
        return "", ""
    candidates = sorted(BUNDLED_FIRMWARE_DIR.glob("growly-*.bin"), key=lambda path: path.stat().st_mtime)
    if not candidates:
        return "", ""
    firmware_path = candidates[-1]
    version = firmware_path.stem.removeprefix("growly-")
    url = f"{public_base_url()}/static/firmware/{firmware_path.name}"
    return version, url


def firmware_version_parts(version: str) -> tuple[int, ...]:
    value = str(version or "").strip()
    start = next((index for index, char in enumerate(value) if char.isdigit()), -1)
    if start < 0:
        return ()
    core_chars: list[str] = []
    for char in value[start:]:
        if char.isdigit() or char == ".":
            core_chars.append(char)
            continue
        break
    return tuple(int(part) for part in "".join(core_chars).split(".") if part != "")


def is_newer_firmware_version(candidate_version: str, current_version: str) -> bool:
    candidate = str(candidate_version or "").strip()
    current = str(current_version or "").strip()
    if not candidate:
        return False
    if not current:
        return True
    candidate_parts = firmware_version_parts(candidate)
    current_parts = firmware_version_parts(current)
    if not candidate_parts or not current_parts:
        return False
    max_length = max(len(candidate_parts), len(current_parts))
    padded_candidate = candidate_parts + (0,) * (max_length - len(candidate_parts))
    padded_current = current_parts + (0,) * (max_length - len(current_parts))
    return padded_candidate > padded_current


def build_email_shell(title: str, intro: str, body: str, next_label: str, next_text: str, button_label: str, button_url: str, footer: str) -> str:
    safe_title = html.escape(title)
    safe_intro = html.escape(intro)
    safe_body = html.escape(body)
    safe_next_label = html.escape(next_label)
    safe_next_text = html.escape(next_text)
    safe_button_label = html.escape(button_label)
    safe_button_url = html.escape(button_url, quote=True)
    safe_footer = html.escape(footer)
    safe_logo_url = html.escape(f"{public_base_url()}/static/logo.png", quote=True)
    return f"""\
<!doctype html>
<html lang="no">
  <body style="margin:0;padding:0;background:#f4f6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#183322;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6ef;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #dfeade;border-radius:28px;overflow:hidden;box-shadow:0 18px 42px rgba(24,51,34,0.10);">
            <tr>
              <td style="padding:34px 32px 22px;background:linear-gradient(135deg,#eef8e9 0%,#ffffff 56%,#dff2d6 100%);">
                <img src="{safe_logo_url}" width="92" alt="Growly Garden" style="display:block;width:92px;max-width:92px;height:auto;margin:0 0 18px;border:0;">
                <div style="font-size:13px;line-height:1;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#2f8a54;">Growly Garden</div>
                <h1 style="margin:14px 0 10px;font-size:34px;line-height:1.05;color:#142d1e;">{safe_title}</h1>
                <p style="margin:0;font-size:18px;line-height:1.45;color:#657467;">{safe_intro}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px;">
                <p style="margin:0 0 16px;font-size:17px;line-height:1.55;color:#405244;">{safe_body}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background:#eef7e8;border-radius:20px;border:1px solid #d9ead3;">
                  <tr>
                    <td style="padding:20px 22px;">
                      <div style="font-size:13px;font-weight:800;letter-spacing:.10em;text-transform:uppercase;color:#2f8a54;">{safe_next_label}</div>
                      <p style="margin:8px 0 0;font-size:16px;line-height:1.45;color:#405244;">{safe_next_text}</p>
                    </td>
                  </tr>
                </table>
                <a href="{safe_button_url}" style="display:inline-block;margin:8px 0 20px;padding:15px 24px;border-radius:999px;background:#246b43;color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;">{safe_button_label}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 30px;border-top:1px solid #edf3ea;">
                <p style="margin:0;font-size:14px;line-height:1.5;color:#7a887d;">{safe_footer}</p>
                <p style="margin:18px 0 0;font-size:15px;line-height:1.5;color:#405244;">Hilsen<br><strong style="color:#183322;">Growly Garden</strong></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def send_email(recipient: str, subject: str, text_body: str, html_body: str) -> bool:
    if not mail_is_configured() or not recipient:
        return False
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = SMTP_FROM
    message["To"] = recipient
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
            if SMTP_USE_TLS:
                smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.send_message(message)
        return True
    except (OSError, smtplib.SMTPException):
        return False


def send_email_verification(user: dict[str, Any]) -> bool:
    recipient = str(user.get("email") or "").strip()
    token = str(user.get("email_verification_token") or "").strip()
    if not recipient or not token:
        return False

    display_name = str(user.get("full_name") or user.get("username") or "Growly-bruker").strip()
    verification_url = f"{public_base_url()}/verify-email/{token}"
    text_body = "\n".join(
        [
            f"Hei {display_name},",
            "",
            "Velkommen til Growly Garden.",
            "Bekreft e-postadressen din for å aktivere kontoen.",
            "",
            f"Bekreft kontoen: {verification_url}",
            "",
            "Hvis du ikke opprettet denne kontoen, kan du se bort fra denne e-posten.",
            "",
            "Hilsen Growly Garden",
        ]
    )
    html_body = build_email_shell(
        "Bekreft Growly-kontoen din",
        f"Hei {display_name}, velkommen inn.",
        "Før du kan bruke Growly Garden må du bekrefte e-postadressen din. Det hjelper oss å sikre at kontoen faktisk tilhører deg.",
        "Aktiver kontoen",
        "Trykk på knappen under. Etter bekreftelsen sender vi deg en velkomstmail og du kan logge inn.",
        "Bekreft kontoen",
        verification_url,
        "Hvis du ikke opprettet denne kontoen, kan du bare se bort fra denne e-posten. Kontoen blir ikke aktivert uten bekreftelse.",
    )
    return send_email(recipient, "Bekreft Growly Garden-kontoen din", text_body, html_body)


def send_welcome_email(user: dict[str, Any]) -> bool:
    recipient = str(user.get("email") or "").strip()
    if not recipient:
        return False

    display_name = str(user.get("full_name") or user.get("username") or "Growly-bruker").strip()
    text_body = "\n".join(
        [
            f"Hei {display_name},",
            "",
            "Kontoen din hos Growly Garden er bekreftet og klar.",
            "Du kan nå logge inn og begynne å sette opp drivhuset ditt.",
            "",
            f"Åpne Growly Garden: {APP_PUBLIC_URL}",
            "",
            "Hilsen Growly Garden",
        ]
    )
    html_body = build_email_shell(
        "Velkommen til Growly Garden",
        f"Hei {display_name}, kontoen din er klar.",
        "Nå kan du logge inn og begynne å sette opp drivhuset ditt. Growly hjelper deg med planter, sensordata, vanning og små grep som holder veksten i gang.",
        "Neste steg",
        "Logg inn, legg til planter, og koble til Growly Hub når du er klar for sensordata.",
        "Åpne Growly Garden",
        APP_PUBLIC_URL,
        "Denne e-posten ble sendt fordi kontoen din nettopp ble bekreftet.",
    )
    return send_email(recipient, "Velkommen til Growly Garden", text_body, html_body)


def find_user_by_verification_token(token: str) -> dict[str, Any] | None:
    normalized_token = token.strip()
    if len(normalized_token) < 20:
        return None
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT username, full_name, phone, email, password_hash,
                   is_active, is_admin, email_verified,
                   email_verification_token, email_verification_sent_at,
                   created_at, updated_at
            FROM app_users
            WHERE email_verification_token = ?
              AND email_verification_token != ''
            LIMIT 1
            """,
            (normalized_token,),
        ).fetchone()
    return dict(row) if row else None


def mark_email_verified(token: str) -> dict[str, Any] | None:
    user = find_user_by_verification_token(token)
    if not user:
        return None
    now = utc_now_iso()
    with db_connection() as connection:
        connection.execute(
            """
            UPDATE app_users
            SET email_verified = 1,
                email_verification_token = '',
                email_verification_sent_at = '',
                updated_at = ?
            WHERE username = ?
            """,
            (now, user["username"]),
        )
        connection.commit()
    if not bool(user.get("is_admin")):
        create_hub_for_user(str(user["username"]))
    return find_app_user(str(user["username"]))


def verification_result_page(title: str, message: str, button_label: str = "Logg inn") -> HTMLResponse:
    safe_title = html.escape(title)
    safe_message = html.escape(message)
    safe_button_label = html.escape(button_label)
    login_url = html.escape(f"{public_base_url()}/login", quote=True)
    logo_url = html.escape(f"{public_base_url()}/static/logo.png", quote=True)
    body = f"""\
<!doctype html>
<html lang="no">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{safe_title} · Growly Garden</title>
    <style>
      body {{
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at 25% 12%, #e6f7db 0, transparent 34%), #f4f6ef;
        color: #183322;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      }}
      main {{
        width: min(560px, calc(100vw - 32px));
        background: #fff;
        border: 1px solid #dfeade;
        border-radius: 30px;
        padding: 34px;
        box-shadow: 0 22px 54px rgba(24, 51, 34, .12);
      }}
      img {{ width: 96px; height: auto; display: block; margin-bottom: 20px; }}
      p.kicker {{ margin: 0 0 10px; color: #2f8a54; font-size: 13px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }}
      h1 {{ margin: 0 0 14px; font-size: clamp(34px, 8vw, 56px); line-height: .95; }}
      p {{ margin: 0; color: #657467; font-size: 18px; line-height: 1.5; }}
      a {{
        display: inline-block;
        margin-top: 26px;
        padding: 15px 24px;
        border-radius: 999px;
        background: #246b43;
        color: #fff;
        text-decoration: none;
        font-weight: 800;
      }}
    </style>
  </head>
  <body>
    <main>
      <img src="{logo_url}" alt="Growly Garden">
      <p class="kicker">Growly Garden</p>
      <h1>{safe_title}</h1>
      <p>{safe_message}</p>
      <a href="{login_url}">{safe_button_label}</a>
    </main>
  </body>
</html>
"""
    return HTMLResponse(body)


def db_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def ensure_data_dir() -> None:
    global DATA_DIR, DB_PATH, DATA_DIR_FALLBACK_REASON
    DATA_DIR_FALLBACK_REASON = ""
    try:
        PREFERRED_DATA_DIR.mkdir(parents=True, exist_ok=True)
        probe_path = PREFERRED_DATA_DIR / ".growly-write-test"
        probe_path.write_text("ok", encoding="utf-8")
        probe_path.unlink(missing_ok=True)
        DATA_DIR = PREFERRED_DATA_DIR
    except OSError as exc:
        DATA_DIR_FALLBACK_REASON = f"{type(exc).__name__}: {exc}"
        FALLBACK_DATA_DIR.mkdir(parents=True, exist_ok=True)
        DATA_DIR = FALLBACK_DATA_DIR
    DB_PATH = DATA_DIR / "growly.db"
    legacy_db_path = LEGACY_DATA_DIR / "growly.db"
    if DATA_DIR != LEGACY_DATA_DIR and not DB_PATH.exists() and legacy_db_path.exists():
        shutil.copy2(legacy_db_path, DB_PATH)


def storage_status() -> dict[str, Any]:
    preferred_path = str(PREFERRED_DATA_DIR)
    active_path = str(DATA_DIR)
    render_runtime = bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"))
    preferred_exists = PREFERRED_DATA_DIR.exists()
    preferred_is_mount = preferred_exists and os.path.ismount(PREFERRED_DATA_DIR)
    preferred_writable = False
    preferred_write_error = ""
    try:
        PREFERRED_DATA_DIR.mkdir(parents=True, exist_ok=True)
        probe_path = PREFERRED_DATA_DIR / ".growly-status-write-test"
        probe_path.write_text("ok", encoding="utf-8")
        probe_path.unlink(missing_ok=True)
        preferred_writable = True
    except OSError as exc:
        preferred_write_error = f"{type(exc).__name__}: {exc}"
    persistent = DATA_DIR == PREFERRED_DATA_DIR and preferred_writable
    if persistent:
        message = "Brukere og innstillinger lagres varig."
    elif render_runtime and DATA_DIR == PREFERRED_DATA_DIR and not preferred_writable:
        message = (
            "Render bruker ønsket databaseplassering, men appen klarte ikke å verifisere skrivetilgang. "
            "Brukere og innstillinger kan nullstilles ved deploy eller restart."
        )
    else:
        message = "Appen bruker midlertidig lagring nå. Brukere og innstillinger kan forsvinne ved deploy eller restart."
    return {
        "persistent": persistent,
        "active_path": active_path,
        "preferred_path": preferred_path,
        "env_data_dir": os.getenv("GROWLY_DATA_DIR", ""),
        "render_runtime": render_runtime,
        "preferred_exists": preferred_exists,
        "preferred_is_mount": preferred_is_mount,
        "preferred_writable": preferred_writable,
        "preferred_write_error": preferred_write_error,
        "fallback_reason": DATA_DIR_FALLBACK_REASON,
        "mode": "persistent" if persistent else "temporary",
        "message": message,
    }


def import_plant_profiles_from_csv(connection: sqlite3.Connection) -> None:
    path = PLANT_IMPORT_DIR / "plant_profiles.csv"
    if not path.exists():
        return

    now = utc_now_iso()
    with path.open(encoding="utf-8", newline="") as file:
        for row in csv.DictReader(file):
            profile_id = (row.get("plant_id") or "").strip()
            name = (row.get("norsk_navn") or profile_id).strip()
            if not profile_id or not name:
                continue
            ranges = profile_ranges_from_csv(row)
            connection.execute(
                """
                INSERT INTO plant_profiles (
                    profile_id, name, family, icon, tone, english_name, latin_name, category,
                    watering_short, climate_note, underwatering_signs, overwatering_signs,
                    underwatering_action, overwatering_action, watering_strategy, ranges_json, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(profile_id) DO UPDATE SET
                    name = excluded.name,
                    family = excluded.family,
                    icon = excluded.icon,
                    tone = excluded.tone,
                    english_name = excluded.english_name,
                    latin_name = excluded.latin_name,
                    category = excluded.category,
                    watering_short = excluded.watering_short,
                    climate_note = excluded.climate_note,
                    underwatering_signs = excluded.underwatering_signs,
                    overwatering_signs = excluded.overwatering_signs,
                    underwatering_action = excluded.underwatering_action,
                    overwatering_action = excluded.overwatering_action,
                    watering_strategy = excluded.watering_strategy,
                    ranges_json = excluded.ranges_json,
                    updated_at = excluded.updated_at
                """,
                (
                    profile_id,
                    name,
                    (row.get("familie_type") or "").strip(),
                    plant_icon(name, profile_id),
                    plant_tone(row),
                    (row.get("engelsk_navn") or "").strip(),
                    (row.get("latinsk_navn") or "").strip(),
                    (row.get("kategori") or "").strip(),
                    (row.get("vanning_kort") or "").strip(),
                    (row.get("klima_notat") or "").strip(),
                    (row.get("undervanning_tegn") or "").strip(),
                    (row.get("overvanning_tegn") or "").strip(),
                    (row.get("undervanning_tiltak") or "").strip(),
                    (row.get("overvanning_tiltak") or "").strip(),
                    (row.get("vanningsstrategi") or "").strip(),
                    json.dumps(ranges),
                    now,
                ),
            )


def import_plant_variants_from_csv(connection: sqlite3.Connection) -> None:
    path = PLANT_IMPORT_DIR / "plant_variants.csv"
    if not path.exists():
        return

    now = utc_now_iso()
    with path.open(encoding="utf-8", newline="") as file:
        for row in csv.DictReader(file):
            variant_id = (row.get("variant_id") or "").strip()
            base_plant_id = (row.get("base_plant_id") or "").strip()
            if not variant_id or not base_plant_id:
                continue
            connection.execute(
                """
                INSERT INTO plant_variants (
                    variant_id, base_plant_id, norsk_navn, engelsk_navn, variant_type,
                    heat_tolerant, cool_tolerant, drought_sensitive, crack_sensitive, humidity_sensitive,
                    delta_lufttemp_akseptabel_min_c, delta_lufttemp_akseptabel_max_c,
                    delta_jordfukt_optimal_min_pct, delta_jordfukt_optimal_max_pct,
                    delta_luftfukt_akseptabel_max_pct, delta_lys_optimal_min_lux,
                    delta_lys_optimal_max_lux, notes, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(variant_id) DO UPDATE SET
                    base_plant_id = excluded.base_plant_id,
                    norsk_navn = excluded.norsk_navn,
                    engelsk_navn = excluded.engelsk_navn,
                    variant_type = excluded.variant_type,
                    heat_tolerant = excluded.heat_tolerant,
                    cool_tolerant = excluded.cool_tolerant,
                    drought_sensitive = excluded.drought_sensitive,
                    crack_sensitive = excluded.crack_sensitive,
                    humidity_sensitive = excluded.humidity_sensitive,
                    delta_lufttemp_akseptabel_min_c = excluded.delta_lufttemp_akseptabel_min_c,
                    delta_lufttemp_akseptabel_max_c = excluded.delta_lufttemp_akseptabel_max_c,
                    delta_jordfukt_optimal_min_pct = excluded.delta_jordfukt_optimal_min_pct,
                    delta_jordfukt_optimal_max_pct = excluded.delta_jordfukt_optimal_max_pct,
                    delta_luftfukt_akseptabel_max_pct = excluded.delta_luftfukt_akseptabel_max_pct,
                    delta_lys_optimal_min_lux = excluded.delta_lys_optimal_min_lux,
                    delta_lys_optimal_max_lux = excluded.delta_lys_optimal_max_lux,
                    notes = excluded.notes,
                    updated_at = excluded.updated_at
                """,
                (
                    variant_id,
                    base_plant_id,
                    (row.get("norsk_navn") or "").strip(),
                    (row.get("engelsk_navn") or "").strip(),
                    (row.get("variant_type") or "").strip(),
                    int(bool_text(row.get("heat_tolerant"))),
                    int(bool_text(row.get("cool_tolerant"))),
                    int(bool_text(row.get("drought_sensitive"))),
                    int(bool_text(row.get("crack_sensitive"))),
                    int(bool_text(row.get("humidity_sensitive"))),
                    csv_float(row, "delta_lufttemp_akseptabel_min_c"),
                    csv_float(row, "delta_lufttemp_akseptabel_max_c"),
                    csv_float(row, "delta_jordfukt_optimal_min_pct"),
                    csv_float(row, "delta_jordfukt_optimal_max_pct"),
                    csv_float(row, "delta_luftfukt_akseptabel_max_pct"),
                    csv_float(row, "delta_lys_optimal_min_lux"),
                    csv_float(row, "delta_lys_optimal_max_lux"),
                    (row.get("notes") or "").strip(),
                    now,
                ),
            )


def import_plant_cultivars_from_csv(connection: sqlite3.Connection) -> None:
    path = PLANT_IMPORT_DIR / "plant_cultivars.csv"
    if not path.exists():
        return

    now = utc_now_iso()
    with path.open(encoding="utf-8", newline="") as file:
        for row in csv.DictReader(file):
            cultivar_id = (row.get("cultivar_id") or "").strip()
            base_plant_id = (row.get("base_plant_id") or "").strip()
            variant_id = (row.get("variant_id") or "").strip()
            if not cultivar_id or not base_plant_id or not variant_id:
                continue
            connection.execute(
                """
                INSERT INTO plant_cultivars (
                    cultivar_id, cultivar_name, base_plant_id, variant_id, norsk_navn, engelsk_navn,
                    heat_tolerant, cool_tolerant, drought_sensitive, crack_sensitive, humidity_sensitive,
                    notes, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(cultivar_id) DO UPDATE SET
                    cultivar_name = excluded.cultivar_name,
                    base_plant_id = excluded.base_plant_id,
                    variant_id = excluded.variant_id,
                    norsk_navn = excluded.norsk_navn,
                    engelsk_navn = excluded.engelsk_navn,
                    heat_tolerant = excluded.heat_tolerant,
                    cool_tolerant = excluded.cool_tolerant,
                    drought_sensitive = excluded.drought_sensitive,
                    crack_sensitive = excluded.crack_sensitive,
                    humidity_sensitive = excluded.humidity_sensitive,
                    notes = excluded.notes,
                    updated_at = excluded.updated_at
                """,
                (
                    cultivar_id,
                    (row.get("cultivar_name") or "").strip(),
                    base_plant_id,
                    variant_id,
                    (row.get("norsk_navn") or "").strip(),
                    (row.get("engelsk_navn") or "").strip(),
                    int(bool_text(row.get("heat_tolerant"))),
                    int(bool_text(row.get("cool_tolerant"))),
                    int(bool_text(row.get("drought_sensitive"))),
                    int(bool_text(row.get("crack_sensitive"))),
                    int(bool_text(row.get("humidity_sensitive"))),
                    (row.get("notes") or "").strip(),
                    now,
                ),
            )


def import_plant_catalog_from_csv(connection: sqlite3.Connection) -> None:
    import_plant_profiles_from_csv(connection)
    import_plant_variants_from_csv(connection)
    import_plant_cultivars_from_csv(connection)


def rebuild_hubs_without_owner_unique(connection: sqlite3.Connection) -> None:
    owner_unique = False
    for index_row in connection.execute("PRAGMA index_list(hubs)").fetchall():
        if not int(index_row["unique"] or 0):
            continue
        index_name = str(index_row["name"] or "")
        index_columns = [
            str(column["name"] or "")
            for column in connection.execute(f"PRAGMA index_info({index_name})").fetchall()
        ]
        if index_columns == ["owner_username"]:
            owner_unique = True
            break
    if not owner_unique:
        return

    connection.execute("PRAGMA foreign_keys = OFF")
    connection.execute("DROP TABLE IF EXISTS hubs_rebuild")
    connection.execute(
        """
        CREATE TABLE hubs_rebuild (
            hub_id TEXT PRIMARY KEY,
            hub_name TEXT NOT NULL,
            location_label TEXT NOT NULL DEFAULT '',
            weather_address TEXT NOT NULL DEFAULT '',
            weather_latitude REAL,
            weather_longitude REAL,
            owner_username TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            sensor_url TEXT NOT NULL,
            local_ip TEXT NOT NULL DEFAULT '',
            sample_time_soil_ms INTEGER NOT NULL,
            sample_time_light_ms INTEGER NOT NULL,
            sample_time_air_ms INTEGER NOT NULL,
            sample_time_cloud_ms INTEGER NOT NULL,
            history_start_at TEXT NOT NULL DEFAULT '',
            config_revision INTEGER NOT NULL DEFAULT 1,
            config_updated_at TEXT NOT NULL DEFAULT '',
            config_applied_revision INTEGER NOT NULL DEFAULT 0,
            config_applied_at TEXT NOT NULL DEFAULT '',
            config_applied_settings_json TEXT NOT NULL DEFAULT '',
            device_status_at TEXT NOT NULL DEFAULT '',
            device_status_message TEXT NOT NULL DEFAULT '',
            device_firmware_version TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(owner_username) REFERENCES app_users(username)
        )
        """
    )
    connection.execute(
        """
        INSERT INTO hubs_rebuild (
            hub_id, hub_name, location_label, weather_address, weather_latitude, weather_longitude,
            owner_username, is_active, sensor_url, local_ip,
            sample_time_soil_ms, sample_time_light_ms, sample_time_air_ms,
            sample_time_cloud_ms, history_start_at, config_revision,
            config_updated_at, config_applied_revision, config_applied_at,
            config_applied_settings_json, device_status_at, device_status_message,
            device_firmware_version, created_at, updated_at
        )
        SELECT hub_id, hub_name, '', '', NULL, NULL, owner_username, is_active, sensor_url, local_ip,
               sample_time_soil_ms, sample_time_light_ms, sample_time_air_ms,
               sample_time_cloud_ms, history_start_at, config_revision,
               config_updated_at, config_applied_revision, config_applied_at,
               config_applied_settings_json, device_status_at, device_status_message,
               device_firmware_version, created_at, updated_at
        FROM hubs
        """
    )
    connection.execute("DROP TABLE hubs")
    connection.execute("ALTER TABLE hubs_rebuild RENAME TO hubs")
    connection.execute("PRAGMA foreign_keys = ON")


def ensure_hub_member(
    connection: sqlite3.Connection,
    hub_id: str,
    username: str,
    role: str = "owner",
) -> None:
    now = utc_now_iso()
    connection.execute(
        """
        INSERT INTO hub_members (hub_id, username, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(hub_id, username) DO UPDATE SET
            role = excluded.role,
            updated_at = excluded.updated_at
        """,
        (hub_id, username, role, now, now),
    )


def init_db() -> None:
    ensure_data_dir()
    with db_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sensor_samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recorded_at TEXT NOT NULL,
                source TEXT NOT NULL,
                valid INTEGER NOT NULL,
                error TEXT,
                air_temperature REAL,
                air_humidity REAL,
                air_pressure REAL,
                lux REAL,
                humidity REAL,
                temperature REAL,
                ph REAL,
                conductivity REAL,
                nitrogen REAL,
                phosphorus REAL,
                potassium REAL,
                salinity REAL,
                tds REAL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS app_users (
                username TEXT PRIMARY KEY,
                full_name TEXT NOT NULL DEFAULT '',
                phone TEXT NOT NULL DEFAULT '',
                email TEXT NOT NULL DEFAULT '',
                password_hash TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                is_admin INTEGER NOT NULL DEFAULT 0,
                email_verified INTEGER NOT NULL DEFAULT 1,
                email_verification_token TEXT NOT NULL DEFAULT '',
                email_verification_sent_at TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS hubs (
                hub_id TEXT PRIMARY KEY,
                hub_name TEXT NOT NULL,
                location_label TEXT NOT NULL DEFAULT '',
                weather_address TEXT NOT NULL DEFAULT '',
                weather_latitude REAL,
                weather_longitude REAL,
                owner_username TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                sensor_url TEXT NOT NULL,
                local_ip TEXT NOT NULL DEFAULT '',
                sample_time_soil_ms INTEGER NOT NULL,
                sample_time_light_ms INTEGER NOT NULL,
                sample_time_air_ms INTEGER NOT NULL,
                sample_time_cloud_ms INTEGER NOT NULL,
                history_start_at TEXT NOT NULL DEFAULT '',
                config_revision INTEGER NOT NULL DEFAULT 1,
                config_updated_at TEXT NOT NULL DEFAULT '',
                config_applied_revision INTEGER NOT NULL DEFAULT 0,
                config_applied_at TEXT NOT NULL DEFAULT '',
                config_applied_settings_json TEXT NOT NULL DEFAULT '',
                device_status_at TEXT NOT NULL DEFAULT '',
                device_status_message TEXT NOT NULL DEFAULT '',
                device_firmware_version TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(owner_username) REFERENCES app_users(username)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS hub_members (
                hub_id TEXT NOT NULL,
                username TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'member',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (hub_id, username),
                FOREIGN KEY(hub_id) REFERENCES hubs(hub_id),
                FOREIGN KEY(username) REFERENCES app_users(username)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS pairing_tokens (
                token TEXT PRIMARY KEY,
                target_username TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                used_at TEXT,
                paired_hub_id TEXT,
                FOREIGN KEY(target_username) REFERENCES app_users(username)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS customer_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                hub_id TEXT NOT NULL DEFAULT '',
                category TEXT NOT NULL DEFAULT 'annet',
                title TEXT NOT NULL DEFAULT '',
                message TEXT NOT NULL,
                source TEXT NOT NULL DEFAULT 'ai_chat',
                conversation_json TEXT NOT NULL DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'ny',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(username) REFERENCES app_users(username)
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_customer_messages_user_status
            ON customer_messages(username, status, created_at)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_customer_messages_status_created
            ON customer_messages(status, created_at)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS plant_profiles (
                profile_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                family TEXT NOT NULL,
                icon TEXT NOT NULL,
                tone TEXT NOT NULL,
                english_name TEXT NOT NULL DEFAULT '',
                latin_name TEXT NOT NULL DEFAULT '',
                category TEXT NOT NULL DEFAULT '',
                watering_short TEXT NOT NULL DEFAULT '',
                climate_note TEXT NOT NULL DEFAULT '',
                underwatering_signs TEXT NOT NULL DEFAULT '',
                overwatering_signs TEXT NOT NULL DEFAULT '',
                underwatering_action TEXT NOT NULL DEFAULT '',
                overwatering_action TEXT NOT NULL DEFAULT '',
                watering_strategy TEXT NOT NULL DEFAULT '',
                ranges_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        profile_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(plant_profiles)").fetchall()
        }
        profile_column_defaults = {
            "english_name": "TEXT NOT NULL DEFAULT ''",
            "latin_name": "TEXT NOT NULL DEFAULT ''",
            "category": "TEXT NOT NULL DEFAULT ''",
            "watering_short": "TEXT NOT NULL DEFAULT ''",
            "climate_note": "TEXT NOT NULL DEFAULT ''",
            "underwatering_signs": "TEXT NOT NULL DEFAULT ''",
            "overwatering_signs": "TEXT NOT NULL DEFAULT ''",
            "underwatering_action": "TEXT NOT NULL DEFAULT ''",
            "overwatering_action": "TEXT NOT NULL DEFAULT ''",
            "watering_strategy": "TEXT NOT NULL DEFAULT ''",
        }
        for column_name, column_sql in profile_column_defaults.items():
            if column_name not in profile_columns:
                connection.execute(f"ALTER TABLE plant_profiles ADD COLUMN {column_name} {column_sql}")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS plant_variants (
                variant_id TEXT PRIMARY KEY,
                base_plant_id TEXT NOT NULL,
                norsk_navn TEXT NOT NULL,
                engelsk_navn TEXT NOT NULL,
                variant_type TEXT NOT NULL,
                heat_tolerant INTEGER NOT NULL,
                cool_tolerant INTEGER NOT NULL,
                drought_sensitive INTEGER NOT NULL,
                crack_sensitive INTEGER NOT NULL,
                humidity_sensitive INTEGER NOT NULL,
                delta_lufttemp_akseptabel_min_c REAL NOT NULL,
                delta_lufttemp_akseptabel_max_c REAL NOT NULL,
                delta_jordfukt_optimal_min_pct REAL NOT NULL,
                delta_jordfukt_optimal_max_pct REAL NOT NULL,
                delta_luftfukt_akseptabel_max_pct REAL NOT NULL,
                delta_lys_optimal_min_lux REAL NOT NULL,
                delta_lys_optimal_max_lux REAL NOT NULL,
                notes TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(base_plant_id) REFERENCES plant_profiles(profile_id)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS plant_cultivars (
                cultivar_id TEXT PRIMARY KEY,
                cultivar_name TEXT NOT NULL,
                base_plant_id TEXT NOT NULL,
                variant_id TEXT NOT NULL,
                norsk_navn TEXT NOT NULL,
                engelsk_navn TEXT NOT NULL,
                heat_tolerant INTEGER NOT NULL,
                cool_tolerant INTEGER NOT NULL,
                drought_sensitive INTEGER NOT NULL,
                crack_sensitive INTEGER NOT NULL,
                humidity_sensitive INTEGER NOT NULL,
                notes TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(base_plant_id) REFERENCES plant_profiles(profile_id),
                FOREIGN KEY(variant_id) REFERENCES plant_variants(variant_id)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS growly_plants (
                plant_id TEXT PRIMARY KEY,
                remote_plant_id TEXT,
                hub_id TEXT NOT NULL,
                owner_username TEXT NOT NULL,
                profile_id TEXT NOT NULL,
                catalog_item_id TEXT NOT NULL DEFAULT '',
                variant_id TEXT,
                cultivar_id TEXT,
                display_name TEXT NOT NULL,
                location_label TEXT NOT NULL DEFAULT 'greenhouse',
                sowed_at TEXT,
                moved_to_greenhouse_at TEXT,
                has_seven_in_one INTEGER NOT NULL DEFAULT 0,
                watering_enabled INTEGER NOT NULL DEFAULT 0,
                archived_at TEXT,
                deleted_at TEXT,
                sync_status TEXT NOT NULL DEFAULT 'pending',
                sync_error TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(hub_id) REFERENCES hubs(hub_id),
                FOREIGN KEY(owner_username) REFERENCES app_users(username)
            )
            """
        )
        plant_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(growly_plants)").fetchall()
        }
        plant_column_defaults = {
            "remote_plant_id": "TEXT",
            "catalog_item_id": "TEXT NOT NULL DEFAULT ''",
            "variant_id": "TEXT",
            "cultivar_id": "TEXT",
            "location_label": "TEXT NOT NULL DEFAULT 'greenhouse'",
            "sowed_at": "TEXT",
            "moved_to_greenhouse_at": "TEXT",
            "has_seven_in_one": "INTEGER NOT NULL DEFAULT 0",
            "watering_enabled": "INTEGER NOT NULL DEFAULT 0",
            "archived_at": "TEXT",
            "deleted_at": "TEXT",
            "sync_status": "TEXT NOT NULL DEFAULT 'pending'",
            "sync_error": "TEXT NOT NULL DEFAULT ''",
            "created_at": "TEXT NOT NULL DEFAULT ''",
            "updated_at": "TEXT NOT NULL DEFAULT ''",
        }
        for column_name, column_definition in plant_column_defaults.items():
            if column_name not in plant_columns:
                connection.execute(f"ALTER TABLE growly_plants ADD COLUMN {column_name} {column_definition}")
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_growly_plants_owner_hub
            ON growly_plants(owner_username, hub_id, archived_at, created_at)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_growly_plants_remote
            ON growly_plants(remote_plant_id)
            """
        )
        pairing_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(pairing_tokens)").fetchall()
        }
        if "paired_hub_id" not in pairing_columns or "hub_id" in pairing_columns:
            existing_pairings = connection.execute(
                """
                SELECT token, target_username, created_at, expires_at, used_at
                FROM pairing_tokens
                """
            ).fetchall()
            connection.execute("DROP TABLE pairing_tokens")
            connection.execute(
                """
                CREATE TABLE pairing_tokens (
                    token TEXT PRIMARY KEY,
                    target_username TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    used_at TEXT,
                    paired_hub_id TEXT,
                    FOREIGN KEY(target_username) REFERENCES app_users(username)
                )
                """
            )
            for row in existing_pairings:
                connection.execute(
                    """
                    INSERT INTO pairing_tokens (token, target_username, created_at, expires_at, used_at, paired_hub_id)
                    VALUES (?, ?, ?, ?, ?, NULL)
                    """,
                    (
                        row["token"],
                        row["target_username"],
                        row["created_at"],
                        row["expires_at"],
                        row["used_at"],
                    ),
                )
        existing_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(sensor_samples)").fetchall()
        }
        required_columns = {
            "air_temperature": "REAL",
            "air_humidity": "REAL",
            "air_pressure": "REAL",
            "lux": "REAL",
        }
        for column_name, column_type in required_columns.items():
            if column_name not in existing_columns:
                connection.execute(
                    f"ALTER TABLE sensor_samples ADD COLUMN {column_name} {column_type}"
                )
        if "hub_id" not in existing_columns:
            connection.execute("ALTER TABLE sensor_samples ADD COLUMN hub_id TEXT")
        existing_user_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(app_users)").fetchall()
        }
        if "full_name" not in existing_user_columns:
            connection.execute("ALTER TABLE app_users ADD COLUMN full_name TEXT NOT NULL DEFAULT ''")
        if "phone" not in existing_user_columns:
            connection.execute("ALTER TABLE app_users ADD COLUMN phone TEXT NOT NULL DEFAULT ''")
        if "email" not in existing_user_columns:
            connection.execute("ALTER TABLE app_users ADD COLUMN email TEXT NOT NULL DEFAULT ''")
        if "is_admin" not in existing_user_columns:
            connection.execute("ALTER TABLE app_users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0")
        if "email_verified" not in existing_user_columns:
            connection.execute("ALTER TABLE app_users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1")
        if "email_verification_token" not in existing_user_columns:
            connection.execute("ALTER TABLE app_users ADD COLUMN email_verification_token TEXT NOT NULL DEFAULT ''")
        if "email_verification_sent_at" not in existing_user_columns:
            connection.execute("ALTER TABLE app_users ADD COLUMN email_verification_sent_at TEXT NOT NULL DEFAULT ''")
        existing_hub_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(hubs)").fetchall()
        }
        if "local_ip" not in existing_hub_columns:
            connection.execute("ALTER TABLE hubs ADD COLUMN local_ip TEXT NOT NULL DEFAULT ''")
        if "location_label" not in existing_hub_columns:
            connection.execute("ALTER TABLE hubs ADD COLUMN location_label TEXT NOT NULL DEFAULT ''")
        hub_column_defaults = {
            "weather_address": "TEXT NOT NULL DEFAULT ''",
            "weather_latitude": "REAL",
            "weather_longitude": "REAL",
            "config_revision": "INTEGER NOT NULL DEFAULT 1",
            "config_updated_at": "TEXT NOT NULL DEFAULT ''",
            "config_applied_revision": "INTEGER NOT NULL DEFAULT 0",
            "config_applied_at": "TEXT NOT NULL DEFAULT ''",
            "config_applied_settings_json": "TEXT NOT NULL DEFAULT ''",
            "device_status_at": "TEXT NOT NULL DEFAULT ''",
            "device_status_message": "TEXT NOT NULL DEFAULT ''",
            "device_firmware_version": "TEXT NOT NULL DEFAULT ''",
        }
        for column_name, column_definition in hub_column_defaults.items():
            if column_name not in existing_hub_columns:
                connection.execute(f"ALTER TABLE hubs ADD COLUMN {column_name} {column_definition}")
        rebuild_hubs_without_owner_unique(connection)
        connection.execute(
            """
            INSERT INTO hub_members (hub_id, username, role, created_at, updated_at)
            SELECT h.hub_id, h.owner_username, 'owner', h.created_at, h.updated_at
            FROM hubs h
            WHERE h.owner_username != ''
            ON CONFLICT(hub_id, username) DO UPDATE SET
                role = 'owner',
                updated_at = excluded.updated_at
            """
        )
        for key, value in DEFAULT_APP_SETTINGS.items():
            connection.execute(
                """
                INSERT INTO app_settings (key, value)
                VALUES (?, ?)
                ON CONFLICT(key) DO NOTHING
                """,
                (key, str(value)),
            )
        now_for_profiles = utc_now_iso()
        for profile in DEFAULT_PLANT_PROFILES:
            connection.execute(
                """
                INSERT INTO plant_profiles (profile_id, name, family, icon, tone, ranges_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(profile_id) DO UPDATE SET
                    name = excluded.name,
                    family = excluded.family,
                    icon = excluded.icon,
                    tone = excluded.tone,
                    ranges_json = excluded.ranges_json,
                    updated_at = excluded.updated_at
                """,
                (
                    profile["profile_id"],
                    profile["name"],
                    profile["family"],
                    profile["icon"],
                    profile["tone"],
                    json.dumps(profile["ranges"]),
                    now_for_profiles,
                ),
            )
        import_plant_catalog_from_csv(connection)
        existing_admin = connection.execute(
            """
            SELECT username
            FROM app_users
            WHERE username = ?
            """,
            (ADMIN_USERNAME,),
        ).fetchone()
        if not existing_admin:
            now = utc_now_iso()
            connection.execute(
                """
                INSERT INTO app_users (
                    username, password_hash, is_active, is_admin,
                    email_verified, created_at, updated_at
                )
                VALUES (?, ?, 1, 1, 1, ?, ?)
                """,
                (ADMIN_USERNAME, hash_password(ADMIN_PASSWORD), now, now),
            )
        else:
            connection.execute(
                """
                UPDATE app_users
                SET is_active = 1, is_admin = 1, email_verified = 1, updated_at = ?
                WHERE username = ?
                """,
                (utc_now_iso(), ADMIN_USERNAME),
            )
        if APP_USERNAME != ADMIN_USERNAME:
            legacy_user = connection.execute(
                """
                SELECT username
                FROM app_users
                WHERE username = ?
                """,
                (APP_USERNAME,),
            ).fetchone()
            if legacy_user:
                connection.execute(
                    """
                    UPDATE app_users
                    SET is_active = 1, is_admin = 0, email_verified = 1, updated_at = ?
                    WHERE username = ?
                    """,
                    (utc_now_iso(), APP_USERNAME),
                )
        existing_viewer = connection.execute(
            """
            SELECT username
            FROM app_users
            WHERE username = ?
            """,
            (DEFAULT_VIEWER_USERNAME,),
        ).fetchone()
        if not existing_viewer:
            now = utc_now_iso()
            connection.execute(
                """
                INSERT INTO app_users (
                    username, password_hash, is_active, is_admin,
                    email_verified, created_at, updated_at
                )
                VALUES (?, ?, 1, 0, 1, ?, ?)
                """,
                (DEFAULT_VIEWER_USERNAME, hash_password(DEFAULT_VIEWER_PASSWORD), now, now),
            )
        else:
            connection.execute(
                """
                UPDATE app_users
                SET is_active = 1, is_admin = 0, email_verified = 1, updated_at = ?
                WHERE username = ?
                """,
                (utc_now_iso(), DEFAULT_VIEWER_USERNAME),
            )

        legacy_settings = DEFAULT_APP_SETTINGS.copy()
        settings_rows = connection.execute(
            """
            SELECT key, value
            FROM app_settings
            """
        ).fetchall()
        for row in settings_rows:
            key = row["key"]
            if key == "history_start_date" and not legacy_settings.get("history_start_at"):
                legacy_settings["history_start_at"] = normalize_history_start_at(row["value"])
                continue
            if key in legacy_settings:
                if key == "sensor_url":
                    legacy_settings[key] = normalize_sensor_url(row["value"])
                    continue
                if key == "history_start_at":
                    legacy_settings[key] = normalize_history_start_at(row["value"])
                    continue
                try:
                    legacy_settings[key] = int(row["value"])
                except (TypeError, ValueError):
                    legacy_settings[key] = DEFAULT_APP_SETTINGS[key]

        primary_owner_row = connection.execute(
            """
            SELECT username
            FROM app_users
            WHERE is_admin = 0
            ORDER BY created_at ASC, username COLLATE NOCASE ASC
            LIMIT 1
            """
        ).fetchone()
        primary_owner_username = (
            str(primary_owner_row["username"])
            if primary_owner_row and primary_owner_row["username"]
            else DEFAULT_VIEWER_USERNAME
        )

        primary_hub = connection.execute(
            """
            SELECT hub_id
            FROM hubs
            WHERE hub_id = ?
            """,
            (DEFAULT_PRIMARY_HUB_ID,),
        ).fetchone()
        primary_owner_hub = connection.execute(
            """
            SELECT hub_id
            FROM hubs
            WHERE owner_username = ?
            LIMIT 1
            """,
            (primary_owner_username,),
        ).fetchone()
        if not primary_hub and not primary_owner_hub:
            now = utc_now_iso()
            connection.execute(
                """
                INSERT INTO hubs (
                    hub_id, hub_name, owner_username, is_active, sensor_url, local_ip,
                    sample_time_soil_ms, sample_time_light_ms, sample_time_air_ms,
                    sample_time_cloud_ms, history_start_at, created_at, updated_at
                ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    DEFAULT_PRIMARY_HUB_ID,
                    primary_owner_username,
                    primary_owner_username,
                    legacy_settings["sensor_url"],
                    "",
                    legacy_settings["sample_time_soil_ms"],
                    legacy_settings["sample_time_light_ms"],
                    legacy_settings["sample_time_air_ms"],
                    legacy_settings["sample_time_cloud_ms"],
                    legacy_settings["history_start_at"],
                    now,
                    now,
                ),
            )
            ensure_hub_member(connection, DEFAULT_PRIMARY_HUB_ID, primary_owner_username, "owner")

        connection.execute(
            """
            UPDATE sensor_samples
            SET hub_id = ?
            WHERE hub_id IS NULL OR TRIM(hub_id) = ''
            """,
            (DEFAULT_PRIMARY_HUB_ID,),
        )
        connection.commit()


def normalize_history_start_at(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    try:
        if "T" in text:
            parsed = datetime.strptime(text, "%Y-%m-%dT%H:%M")
        else:
            parsed = datetime.strptime(text, "%Y-%m-%d")
    except ValueError:
        return ""
    if "T" in text:
        return parsed.strftime("%Y-%m-%dT%H:%M")
    return parsed.strftime("%Y-%m-%dT00:00")


def normalize_sensor_url(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return DEFAULT_SENSOR_URL
    return f"{normalize_device_base_url(text)}/sensor"


def normalize_optional_float(value: Any, min_value: float, max_value: float) -> float | None:
    if value in (None, ""):
        return None
    parsed = float(value)
    if parsed < min_value or parsed > max_value:
        raise ValueError("coordinate_out_of_range")
    return round(parsed, 6)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_pairing_token() -> str:
    return "".join(secrets.choice(PAIRING_TOKEN_ALPHABET) for _ in range(PAIRING_TOKEN_LENGTH))


def next_hub_id(connection: sqlite3.Connection) -> str:
    rows = connection.execute(
        """
        SELECT hub_id
        FROM hubs
        ORDER BY hub_id ASC
        """
    ).fetchall()
    max_number = 0
    for row in rows:
        hub_id = str(row["hub_id"] or "")
        if not hub_id.startswith("growly-hub-"):
            continue
        suffix = hub_id.removeprefix("growly-hub-")
        if suffix.isdigit():
            max_number = max(max_number, int(suffix))
    return f"growly-hub-{max_number + 1:03d}"


def is_valid_hub_id(hub_id: str) -> bool:
    suffix = hub_id.removeprefix("growly-hub-")
    return hub_id.startswith("growly-hub-") and suffix.isdigit() and 1 <= len(suffix) <= 6


def default_hub_owner_username(connection: sqlite3.Connection) -> str:
    row = connection.execute(
        """
        SELECT username
        FROM app_users
        WHERE is_admin = 0 AND is_active = 1
        ORDER BY created_at ASC, username COLLATE NOCASE ASC
        LIMIT 1
        """
    ).fetchone()
    if row and row["username"]:
        return str(row["username"])
    return DEFAULT_VIEWER_USERNAME


def list_hubs() -> list[dict[str, Any]]:
    with db_connection() as connection:
        rows = connection.execute(
            """
            SELECT hub_id, hub_name, location_label, weather_address, weather_latitude, weather_longitude,
                   owner_username, is_active, sensor_url, local_ip,
                   sample_time_soil_ms, sample_time_light_ms, sample_time_air_ms,
                   sample_time_cloud_ms, history_start_at, config_revision,
                   config_updated_at, config_applied_revision, config_applied_at,
                   config_applied_settings_json, device_status_at, device_status_message,
                   device_firmware_version, created_at, updated_at
            FROM hubs
            ORDER BY created_at ASC, hub_id ASC
            """
        ).fetchall()
    return [dict(row) for row in rows]


def find_hub(hub_id: str) -> dict[str, Any] | None:
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT hub_id, hub_name, location_label, weather_address, weather_latitude, weather_longitude,
                   owner_username, is_active, sensor_url, local_ip,
                   sample_time_soil_ms, sample_time_light_ms, sample_time_air_ms,
                   sample_time_cloud_ms, history_start_at, config_revision,
                   config_updated_at, config_applied_revision, config_applied_at,
                   config_applied_settings_json, device_status_at, device_status_message,
                   device_firmware_version, created_at, updated_at
            FROM hubs
            WHERE hub_id = ?
            """,
            (hub_id,),
        ).fetchone()
    return dict(row) if row else None


def find_hub_by_owner(username: str) -> dict[str, Any] | None:
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT hub_id, hub_name, location_label, weather_address, weather_latitude, weather_longitude,
                   owner_username, is_active, sensor_url, local_ip,
                   sample_time_soil_ms, sample_time_light_ms, sample_time_air_ms,
                   sample_time_cloud_ms, history_start_at, config_revision,
                   config_updated_at, config_applied_revision, config_applied_at,
                   config_applied_settings_json, device_status_at, device_status_message,
                   device_firmware_version, created_at, updated_at
            FROM hubs
            WHERE owner_username = ?
            """,
            (username,),
        ).fetchone()
    return dict(row) if row else None


def list_hubs_for_user(username: str) -> list[dict[str, Any]]:
    clean_username = username.strip()
    if not clean_username:
        return []
    with db_connection() as connection:
        rows = connection.execute(
            """
            SELECT h.hub_id, h.hub_name, h.location_label, h.weather_address, h.weather_latitude, h.weather_longitude,
                   h.owner_username, h.is_active, h.sensor_url, h.local_ip,
                   h.sample_time_soil_ms, h.sample_time_light_ms, h.sample_time_air_ms,
                   h.sample_time_cloud_ms, h.history_start_at, h.config_revision,
                   h.config_updated_at, h.config_applied_revision, h.config_applied_at,
                   h.config_applied_settings_json, h.device_status_at, h.device_status_message,
                   h.device_firmware_version, h.created_at, h.updated_at,
                   hm.role AS member_role
            FROM hubs h
            INNER JOIN hub_members hm ON hm.hub_id = h.hub_id
            WHERE hm.username = ?
            ORDER BY CASE hm.role WHEN 'owner' THEN 0 ELSE 1 END,
                     h.created_at ASC, h.hub_id ASC
            """,
            (clean_username,),
        ).fetchall()
    return [dict(row) for row in rows]


def find_hub_for_user(username: str, hub_id: str) -> dict[str, Any] | None:
    clean_username = username.strip()
    clean_hub_id = hub_id.strip()
    if not clean_username or not clean_hub_id:
        return None
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT h.hub_id, h.hub_name, h.location_label, h.weather_address, h.weather_latitude, h.weather_longitude,
                   h.owner_username, h.is_active, h.sensor_url, h.local_ip,
                   h.sample_time_soil_ms, h.sample_time_light_ms, h.sample_time_air_ms,
                   h.sample_time_cloud_ms, h.history_start_at, h.config_revision,
                   h.config_updated_at, h.config_applied_revision, h.config_applied_at,
                   h.config_applied_settings_json, h.device_status_at, h.device_status_message,
                   h.device_firmware_version, h.created_at, h.updated_at,
                   hm.role AS member_role
            FROM hubs h
            INNER JOIN hub_members hm ON hm.hub_id = h.hub_id
            WHERE hm.username = ?
              AND h.hub_id = ?
            LIMIT 1
            """,
            (clean_username, clean_hub_id),
        ).fetchone()
    return dict(row) if row else None


def primary_hub_for_user(username: str) -> dict[str, Any] | None:
    hubs = list_hubs_for_user(username)
    return hubs[0] if hubs else None


def list_hub_members() -> list[dict[str, Any]]:
    with db_connection() as connection:
        rows = connection.execute(
            """
            SELECT hub_id, username, role, created_at, updated_at
            FROM hub_members
            ORDER BY hub_id ASC, username COLLATE NOCASE ASC
            """
        ).fetchall()
    return [dict(row) for row in rows]


def global_app_settings() -> dict[str, Any]:
    settings = DEFAULT_APP_SETTINGS.copy()
    with db_connection() as connection:
        rows = connection.execute(
            """
            SELECT key, value
            FROM app_settings
            """
        ).fetchall()

    for row in rows:
        key = str(row["key"])
        value = row["value"]
        if key == "history_start_date" and not settings.get("history_start_at"):
            settings["history_start_at"] = normalize_history_start_at(value)
            continue
        if key not in settings:
            continue
        if key == "sensor_url":
            settings[key] = normalize_sensor_url(value)
            continue
        if key == "history_start_at":
            settings[key] = normalize_history_start_at(value)
            continue
        try:
            settings[key] = int(value)
        except (TypeError, ValueError):
            settings[key] = DEFAULT_APP_SETTINGS[key]
    return settings


def save_global_config_settings(connection: sqlite3.Connection, settings: dict[str, Any]) -> None:
    for key in GLOBAL_CONFIG_KEYS:
        connection.execute(
            """
            INSERT INTO app_settings (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """,
            (key, str(settings[key])),
        )


def list_plant_profiles(query: str = "") -> list[dict[str, Any]]:
    query_text = query.strip().lower()
    with db_connection() as connection:
        rows = connection.execute(
            """
            SELECT profile_id, name, family, icon, tone, english_name, latin_name, category,
                   watering_short, climate_note, underwatering_signs, overwatering_signs,
                   underwatering_action, overwatering_action, watering_strategy, ranges_json
            FROM plant_profiles
            ORDER BY name COLLATE NOCASE ASC
            """
        ).fetchall()

    profiles: list[dict[str, Any]] = []
    for row in rows:
        profile = dict(row)
        if query_text and query_text not in f"{profile['name']} {profile['family']}".lower():
            continue
        try:
            ranges = json.loads(str(profile.pop("ranges_json") or "{}"))
        except json.JSONDecodeError:
            ranges = {}
        profile["ranges"] = ranges
        profiles.append(profile)
    return profiles


def list_plant_catalog(query: str = "", language: str = "no") -> list[dict[str, Any]]:
    language = app_language(language)
    query_text = query.strip().lower()
    with db_connection() as connection:
        profile_rows = connection.execute(
            """
            SELECT profile_id, name, family, icon, tone, english_name, latin_name, category,
                   watering_short, climate_note, underwatering_signs, overwatering_signs,
                   underwatering_action, overwatering_action, watering_strategy, ranges_json
            FROM plant_profiles
            ORDER BY name COLLATE NOCASE ASC
            """
        ).fetchall()
        variant_rows = connection.execute(
            """
            SELECT variant_id, base_plant_id, norsk_navn, engelsk_navn, variant_type,
                   heat_tolerant, cool_tolerant, drought_sensitive, crack_sensitive, humidity_sensitive,
                   delta_lufttemp_akseptabel_min_c, delta_lufttemp_akseptabel_max_c,
                   delta_jordfukt_optimal_min_pct, delta_jordfukt_optimal_max_pct,
                   delta_luftfukt_akseptabel_max_pct, delta_lys_optimal_min_lux,
                   delta_lys_optimal_max_lux, notes
            FROM plant_variants
            ORDER BY norsk_navn COLLATE NOCASE ASC
            """
        ).fetchall()
        cultivar_rows = connection.execute(
            """
            SELECT cultivar_id, cultivar_name, base_plant_id, variant_id, norsk_navn, engelsk_navn,
                   heat_tolerant, cool_tolerant, drought_sensitive, crack_sensitive, humidity_sensitive, notes
            FROM plant_cultivars
            ORDER BY cultivar_name COLLATE NOCASE ASC
            """
        ).fetchall()

    profiles: dict[str, dict[str, Any]] = {}
    for row in profile_rows:
        profile = dict(row)
        try:
            ranges = json.loads(str(profile.pop("ranges_json") or "{}"))
        except json.JSONDecodeError:
            ranges = {}
        profile["ranges"] = ranges
        profiles[str(profile["profile_id"])] = profile

    variants = {str(row["variant_id"]): dict(row) for row in variant_rows}
    items: list[dict[str, Any]] = []

    def matches(item: dict[str, Any]) -> bool:
        if not query_text:
            return True
        haystack = " ".join(str(value or "") for value in item.values()).lower()
        return query_text in haystack

    for profile in profiles.values():
        profile_name = str(profile.get("name") or "")
        profile_display_name = str(profile.get("english_name") or profile_name) if language == "en" else profile_name
        profile_family = catalog_family(profile.get("family"), language)
        profile_category = catalog_category(profile.get("category"), language)
        profile_note = catalog_text(
            profile.get("climate_note") or profile.get("watering_short") or "",
            language,
            "Use the listed climate range and keep watering steady for this plant.",
        )
        profile_watering = catalog_text(
            profile.get("watering_short") or "",
            language,
            "Keep soil moisture steady and adjust after the pot feels lightly dry.",
        )
        item = {
            "id": profile["profile_id"],
            "kind": "base",
            "profile_id": profile["profile_id"],
            "variant_id": None,
            "cultivar_id": None,
            "name": profile_display_name,
            "display_name": profile_display_name,
            "subtitle": profile_family,
            "family": profile_family,
            "icon": profile["icon"],
            "tone": profile["tone"],
            "ranges": profile["ranges"],
            "notes": profile_note,
            "watering": profile_watering,
            "seed_guide": seed_guide_for_profile(str(profile["profile_id"]), str(profile.get("category") or ""), str(profile.get("family") or ""), language),
            "category": profile_category,
            "latin_name": profile.get("latin_name") or "",
        }
        if matches(item):
            items.append(item)

    for variant in variants.values():
        base = profiles.get(str(variant["base_plant_id"]))
        if not base:
            continue
        base_name = str(base.get("name") or "")
        base_display_name = str(base.get("english_name") or base_name) if language == "en" else base_name
        variant_name = str(variant.get("engelsk_navn") or variant.get("norsk_navn") or "") if language == "en" else str(variant.get("norsk_navn") or "")
        variant_type = catalog_variant_type(variant.get("variant_type"), language)
        family = catalog_family(base.get("family"), language)
        category = catalog_category(base.get("category"), language)
        base_note = catalog_text(base.get("climate_note") or base.get("watering_short") or "", language)
        item = {
            "id": variant["variant_id"],
            "kind": "variant",
            "profile_id": base["profile_id"],
            "variant_id": variant["variant_id"],
            "cultivar_id": None,
            "name": variant_name,
            "display_name": variant_name,
            "subtitle": f"{base_display_name} · {variant_type}",
            "family": family,
            "icon": base["icon"],
            "tone": base["tone"],
            "ranges": adjusted_ranges(base["ranges"], variant),
            "notes": catalog_text(variant.get("notes") or "", language, base_note),
            "watering": catalog_text(base.get("watering_short") or "", language, "Keep soil moisture steady and adjust after the pot feels lightly dry."),
            "seed_guide": seed_guide_for_profile(str(base["profile_id"]), str(base.get("category") or ""), str(base.get("family") or ""), language),
            "category": category,
            "latin_name": base.get("latin_name") or "",
        }
        if matches(item):
            items.append(item)

    for cultivar in cultivar_rows:
        cultivar_item = dict(cultivar)
        base = profiles.get(str(cultivar_item["base_plant_id"]))
        variant = variants.get(str(cultivar_item["variant_id"]))
        if not base:
            continue
        base_name = str(base.get("name") or "")
        base_display_name = str(base.get("english_name") or base_name) if language == "en" else base_name
        cultivar_name = str(cultivar_item.get("engelsk_navn") or cultivar_item.get("norsk_navn") or "") if language == "en" else str(cultivar_item.get("norsk_navn") or "")
        variant_name = ""
        if variant:
            variant_name = str(variant.get("engelsk_navn") or variant.get("norsk_navn") or "") if language == "en" else str(variant.get("norsk_navn") or "")
        family = catalog_family(base.get("family"), language)
        category = catalog_category(base.get("category"), language)
        base_note = catalog_text(base.get("climate_note") or base.get("watering_short") or "", language)
        variant_note = catalog_text(variant.get("notes") if variant else "", language, base_note)
        item = {
            "id": cultivar_item["cultivar_id"],
            "kind": "cultivar",
            "profile_id": base["profile_id"],
            "variant_id": cultivar_item["variant_id"],
            "cultivar_id": cultivar_item["cultivar_id"],
            "name": cultivar_name,
            "display_name": cultivar_name,
            "subtitle": f"{base_display_name} · {variant_name if variant_name else cultivar_item['cultivar_name']}",
            "family": family,
            "icon": base["icon"],
            "tone": base["tone"],
            "ranges": adjusted_ranges(base["ranges"], variant),
            "notes": catalog_text(cultivar_item.get("notes") or "", language, variant_note),
            "watering": catalog_text(base.get("watering_short") or "", language, "Keep soil moisture steady and adjust after the pot feels lightly dry."),
            "seed_guide": seed_guide_for_profile(str(base["profile_id"]), str(base.get("category") or ""), str(base.get("family") or ""), language),
            "category": category,
            "latin_name": base.get("latin_name") or "",
        }
        if matches(item):
            items.append(item)

    kind_order = {"cultivar": 0, "variant": 1, "base": 2}
    return sorted(items, key=lambda item: (kind_order.get(str(item["kind"]), 3), str(item["display_name"]).lower()))


def list_active_pairing_tokens() -> list[dict[str, Any]]:
    now_iso = utc_now_iso()
    with db_connection() as connection:
        rows = connection.execute(
            """
            SELECT token, target_username, created_at, expires_at, used_at, paired_hub_id
            FROM pairing_tokens
            WHERE used_at IS NULL
              AND expires_at > ?
            ORDER BY created_at DESC
            """,
            (now_iso,),
        ).fetchall()
    return [dict(row) for row in rows]


def find_pairing_token(token: str) -> dict[str, Any] | None:
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT token, target_username, created_at, expires_at, used_at, paired_hub_id
            FROM pairing_tokens
            WHERE token = ?
            """,
            (token,),
        ).fetchone()
    return dict(row) if row else None


def active_pairing_for_user(username: str) -> dict[str, Any] | None:
    now_iso = utc_now_iso()
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT token, target_username, created_at, expires_at, used_at, paired_hub_id
            FROM pairing_tokens
            WHERE target_username = ?
              AND used_at IS NULL
              AND expires_at > ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (username, now_iso),
        ).fetchone()
    return dict(row) if row else None


def cleanup_expired_pairing_tokens() -> None:
    with db_connection() as connection:
        connection.execute(
            """
            DELETE FROM pairing_tokens
            WHERE used_at IS NULL
              AND expires_at <= ?
            """,
            (utc_now_iso(),),
        )
        connection.commit()


def create_pairing_token(target_username: str) -> dict[str, Any]:
    cleanup_expired_pairing_tokens()
    user = find_app_user(target_username)
    if not user:
        raise ValueError("user_not_found")
    if not user["is_active"]:
        raise ValueError("user_inactive")

    existing_token = active_pairing_for_user(target_username)
    if existing_token:
        return existing_token

    now = utc_now()
    created_at = now.isoformat()
    expires_at = (now + PAIRING_TOKEN_TTL).isoformat()

    with db_connection() as connection:
        token = generate_pairing_token()
        while connection.execute(
            "SELECT 1 FROM pairing_tokens WHERE token = ?",
            (token,),
        ).fetchone():
            token = generate_pairing_token()

        connection.execute(
            """
            INSERT INTO pairing_tokens (token, target_username, created_at, expires_at, used_at, paired_hub_id)
            VALUES (?, ?, ?, ?, NULL, NULL)
            """,
            (token, target_username, created_at, expires_at),
        )
        connection.commit()

    pairing = find_pairing_token(token)
    best_effort_sync_core_to_supabase("pairing token create")
    return pairing or {}


def complete_pairing_token(
    token: str,
    sensor_url: str | None = None,
    local_ip: str | None = None,
    hub_id: str | None = None,
) -> dict[str, Any]:
    cleanup_expired_pairing_tokens()
    pairing = find_pairing_token(token.strip().upper())
    if not pairing:
        raise ValueError("pairing_token_not_found")
    if pairing["used_at"]:
        raise ValueError("pairing_token_used")
    if parse_iso_datetime(str(pairing["expires_at"])) <= utc_now():
        raise ValueError("pairing_token_expired")

    target_username = str(pairing["target_username"])
    now = utc_now_iso()
    global_settings = global_app_settings()
    effective_sensor_url = normalize_sensor_url(sensor_url or global_settings["sensor_url"])
    effective_local_ip = str(local_ip or "").strip()
    requested_hub_id = str(hub_id or "").strip()
    if requested_hub_id and not is_valid_hub_id(requested_hub_id):
        raise ValueError("invalid_hub_id")
    existing_hub = find_hub_by_owner(target_username)
    physical_hub = find_hub(requested_hub_id) if requested_hub_id else None

    with db_connection() as connection:
        if requested_hub_id:
            hub_id = requested_hub_id
            if physical_hub:
                connection.execute(
                    """
                    UPDATE hubs
                    SET owner_username = ?,
                        hub_name = ?,
                        is_active = 1,
                        sensor_url = ?,
                        local_ip = ?,
                        updated_at = ?
                    WHERE hub_id = ?
                    """,
                    (
                        target_username,
                        target_username,
                        effective_sensor_url,
                        effective_local_ip or str(physical_hub.get("local_ip") or ""),
                        now,
                        hub_id,
                    ),
                )
                ensure_hub_member(connection, hub_id, target_username, "owner")
            else:
                connection.execute(
                    """
                    INSERT INTO hubs (
                        hub_id, hub_name, owner_username, is_active, sensor_url, local_ip,
                        sample_time_soil_ms, sample_time_light_ms, sample_time_air_ms,
                        sample_time_cloud_ms, history_start_at, created_at, updated_at
                    ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        hub_id,
                        target_username,
                        target_username,
                        effective_sensor_url,
                        effective_local_ip,
                        global_settings["sample_time_soil_ms"],
                        global_settings["sample_time_light_ms"],
                        global_settings["sample_time_air_ms"],
                        global_settings["sample_time_cloud_ms"],
                        global_settings["history_start_at"],
                        now,
                        now,
                    ),
                )
                ensure_hub_member(connection, hub_id, target_username, "owner")
        elif existing_hub:
            hub_id = str(existing_hub["hub_id"])
            connection.execute(
                """
                UPDATE hubs
                SET is_active = 1,
                    sensor_url = ?,
                    local_ip = ?,
                    updated_at = ?
                WHERE hub_id = ?
                """,
                (
                    effective_sensor_url,
                    effective_local_ip or str(existing_hub.get("local_ip") or ""),
                    now,
                    hub_id,
                ),
            )
            ensure_hub_member(connection, hub_id, target_username, "owner")
        else:
            hub_id = next_hub_id(connection)
            connection.execute(
                """
                INSERT INTO hubs (
                    hub_id, hub_name, owner_username, is_active, sensor_url, local_ip,
                    sample_time_soil_ms, sample_time_light_ms, sample_time_air_ms,
                    sample_time_cloud_ms, history_start_at, created_at, updated_at
                ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    hub_id,
                    target_username,
                    target_username,
                    effective_sensor_url,
                    effective_local_ip,
                    global_settings["sample_time_soil_ms"],
                    global_settings["sample_time_light_ms"],
                    global_settings["sample_time_air_ms"],
                    global_settings["sample_time_cloud_ms"],
                    global_settings["history_start_at"],
                    now,
                    now,
                ),
            )
            ensure_hub_member(connection, hub_id, target_username, "owner")
        connection.execute(
            """
            UPDATE pairing_tokens
            SET used_at = ?, paired_hub_id = ?
            WHERE token = ?
            """,
            (now, hub_id, pairing["token"]),
        )
        connection.commit()

    hub = find_hub(hub_id) or {}
    best_effort_sync_core_to_supabase("hub pairing")
    return hub


def create_hub_for_user(username: str) -> dict[str, Any]:
    existing_hub = find_hub_by_owner(username)
    if existing_hub:
        return existing_hub

    now = utc_now_iso()
    global_settings = global_app_settings()
    with db_connection() as connection:
        hub_id = next_hub_id(connection)
        connection.execute(
            """
            INSERT INTO hubs (
                hub_id, hub_name, owner_username, is_active, sensor_url, local_ip,
                sample_time_soil_ms, sample_time_light_ms, sample_time_air_ms,
                sample_time_cloud_ms, history_start_at, created_at, updated_at
            ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                hub_id,
                username,
                username,
                global_settings["sensor_url"],
                "",
                global_settings["sample_time_soil_ms"],
                global_settings["sample_time_light_ms"],
                global_settings["sample_time_air_ms"],
                global_settings["sample_time_cloud_ms"],
                global_settings["history_start_at"],
                now,
                now,
            ),
        )
        ensure_hub_member(connection, hub_id, username, "owner")
        connection.commit()
    hub = find_hub(hub_id) or {}
    best_effort_sync_core_to_supabase("hub create")
    return hub


def transfer_hub_owner(hub_id: str, target_username: str, replace_existing: bool = False) -> dict[str, Any]:
    clean_hub_id = hub_id.strip()
    clean_username = target_username.strip()
    hub = find_hub(clean_hub_id)
    if not hub:
        raise ValueError("hub_not_found")
    user = find_app_user(clean_username)
    if not user:
        raise ValueError("user_not_found")
    if not user["is_active"]:
        raise ValueError("user_inactive")
    if user["is_admin"]:
        raise ValueError("admin_cannot_own_hub")

    target_hub = find_hub_by_owner(clean_username)
    now = utc_now_iso()
    deleted_hub_ids: list[str] = []
    with db_connection() as connection:
        if target_hub and str(target_hub["hub_id"]) != clean_hub_id:
            target_hub_id = str(target_hub["hub_id"])
            sample_row = connection.execute(
                """
                SELECT COUNT(*) AS count
                FROM sensor_samples
                WHERE hub_id = ?
                """,
                (target_hub_id,),
            ).fetchone()
            sample_count = int(sample_row["count"]) if sample_row else 0
            if sample_count > 0 and not replace_existing:
                raise ValueError("target_hub_has_samples")
            if not replace_existing:
                raise ValueError("target_has_hub")
            deleted_hub_ids.append(target_hub_id)
            connection.execute(
                """
                DELETE FROM growly_plants
                WHERE hub_id = ?
                """,
                (target_hub_id,),
            )
            connection.execute(
                """
                DELETE FROM pairing_tokens
                WHERE paired_hub_id = ?
                """,
                (target_hub_id,),
            )
            connection.execute(
                """
                DELETE FROM hubs
                WHERE hub_id = ?
                """,
                (target_hub_id,),
            )

        connection.execute(
            """
            UPDATE hubs
            SET owner_username = ?,
                hub_name = ?,
                is_active = 1,
                updated_at = ?
            WHERE hub_id = ?
            """,
            (clean_username, clean_username, now, clean_hub_id),
        )
        connection.execute(
            """
            UPDATE growly_plants
            SET owner_username = ?,
                sync_status = 'pending',
                sync_error = '',
                updated_at = ?
            WHERE hub_id = ?
            """,
            (clean_username, now, clean_hub_id),
        )
        connection.execute(
            """
            DELETE FROM hub_members
            WHERE hub_id = ?
              AND role = 'owner'
              AND username != ?
            """,
            (clean_hub_id, clean_username),
        )
        ensure_hub_member(connection, clean_hub_id, clean_username, "owner")
        connection.commit()

    for deleted_hub_id in deleted_hub_ids:
        best_effort_delete_supabase_sensor_samples(deleted_hub_id)
        best_effort_delete_supabase_plants_for_hub(deleted_hub_id)
        best_effort_delete_supabase_hub(deleted_hub_id)
    hub = find_hub(clean_hub_id) or {}
    best_effort_sync_user_plants(clean_username, clean_hub_id)
    best_effort_sync_core_to_supabase("hub transfer")
    return hub


def delete_hub(hub_id: str) -> None:
    clean_hub_id = hub_id.strip()
    hub = find_hub(clean_hub_id)
    if not hub:
        raise ValueError("hub_not_found")

    with db_connection() as connection:
        connection.execute(
            """
            DELETE FROM sensor_samples
            WHERE hub_id = ?
            """,
            (clean_hub_id,),
        )
        connection.execute(
            """
            DELETE FROM growly_plants
            WHERE hub_id = ?
            """,
            (clean_hub_id,),
        )
        connection.execute(
            """
            DELETE FROM hub_members
            WHERE hub_id = ?
            """,
            (clean_hub_id,),
        )
        connection.execute(
            """
            DELETE FROM pairing_tokens
            WHERE paired_hub_id = ?
            """,
            (clean_hub_id,),
        )
        connection.execute(
            """
            DELETE FROM hubs
            WHERE hub_id = ?
            """,
            (clean_hub_id,),
        )
        connection.commit()

    best_effort_delete_supabase_hub(clean_hub_id)
    best_effort_delete_supabase_sensor_samples(clean_hub_id)
    best_effort_delete_supabase_plants_for_hub(clean_hub_id)
    best_effort_sync_core_to_supabase("hub delete")


def ensure_device_hub(hub_id: str, local_ip: str | None = None) -> dict[str, Any]:
    hub_id = hub_id.strip()
    existing_hub = find_hub(hub_id)
    if existing_hub:
        return existing_hub
    raise ValueError("hub_not_found")


def hub_settings(hub_id: str) -> dict[str, Any]:
    hub = find_hub(hub_id)
    if not hub:
        raise ValueError("hub_not_found")

    try:
        applied_settings = json.loads(str(hub.get("config_applied_settings_json") or "{}"))
    except json.JSONDecodeError:
        applied_settings = {}
    if not isinstance(applied_settings, dict):
        applied_settings = {}

    return {
        "hub_id": hub["hub_id"],
        "hub_name": hub["hub_name"],
        "location_label": str(hub.get("location_label") or "").strip(),
        "weather_address": str(hub.get("weather_address") or "").strip(),
        "weather_latitude": hub.get("weather_latitude"),
        "weather_longitude": hub.get("weather_longitude"),
        "owner_username": hub["owner_username"],
        "is_active": hub["is_active"],
        "sensor_url": normalize_sensor_url(hub["sensor_url"]),
        "local_ip": str(hub.get("local_ip") or "").strip(),
        "sample_time_soil_ms": int(hub["sample_time_soil_ms"]),
        "sample_time_light_ms": int(hub["sample_time_light_ms"]),
        "sample_time_air_ms": int(hub["sample_time_air_ms"]),
        "sample_time_cloud_ms": int(hub["sample_time_cloud_ms"]),
        "history_start_at": normalize_history_start_at(hub["history_start_at"]),
        "config_revision": int(hub.get("config_revision") or 1),
        "config_updated_at": str(hub.get("config_updated_at") or ""),
        "config_applied_revision": int(hub.get("config_applied_revision") or 0),
        "config_applied_at": str(hub.get("config_applied_at") or ""),
        "config_applied_settings": applied_settings,
        "device_status_at": str(hub.get("device_status_at") or ""),
        "device_status_message": str(hub.get("device_status_message") or ""),
        "device_firmware_version": str(hub.get("device_firmware_version") or ""),
    }


def save_hub_settings(hub_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    current = hub_settings(hub_id)
    updated = current.copy()
    for text_key in ("hub_name", "location_label", "weather_address"):
        if text_key in payload:
            updated[text_key] = str(payload.get(text_key) or "").strip()
    if "is_active" in payload and isinstance(payload.get("is_active"), bool):
        updated["is_active"] = 1 if payload.get("is_active") else 0
    if "weather_latitude" in payload:
        updated["weather_latitude"] = normalize_optional_float(payload.get("weather_latitude"), -90, 90)
    if "weather_longitude" in payload:
        updated["weather_longitude"] = normalize_optional_float(payload.get("weather_longitude"), -180, 180)
    if not updated.get("hub_name"):
        updated["hub_name"] = current["hub_name"]
    for key in DEFAULT_APP_SETTINGS:
        if key not in payload:
            continue
        value = payload[key]
        if value is None:
            continue
        if key == "sensor_url":
            updated[key] = normalize_sensor_url(value)
            continue
        if key == "history_start_at":
            updated[key] = normalize_history_start_at(value)
            continue
        value_int = int(value)
        if value_int < 5000:
            value_int = 5000
        if value_int > 3600000:
            value_int = 3600000
        updated[key] = value_int
    config_payload = any(key in payload for key in GLOBAL_CONFIG_KEYS)
    config_changed = config_payload
    now = utc_now_iso()
    config_updated_at = now if config_changed else str(current.get("config_updated_at") or "")

    with db_connection() as connection:
        connection.execute(
            """
            UPDATE hubs
            SET hub_name = ?,
                location_label = ?,
                weather_address = ?,
                weather_latitude = ?,
                weather_longitude = ?,
                is_active = ?,
                sensor_url = ?,
                local_ip = ?,
                history_start_at = ?,
                config_updated_at = ?,
                updated_at = ?
            WHERE hub_id = ?
            """,
            (
                updated["hub_name"],
                updated["location_label"],
                updated.get("weather_address") or "",
                updated.get("weather_latitude"),
                updated.get("weather_longitude"),
                int(updated.get("is_active") or 0),
                updated["sensor_url"],
                str(updated.get("local_ip", "") or "").strip(),
                updated["history_start_at"],
                config_updated_at,
                now,
                hub_id,
            ),
        )
        if config_changed:
            save_global_config_settings(connection, updated)
            connection.execute(
                """
                UPDATE hubs
                SET sample_time_soil_ms = ?,
                    sample_time_light_ms = ?,
                    sample_time_air_ms = ?,
                    sample_time_cloud_ms = ?,
                    config_revision = config_revision + 1,
                    config_updated_at = ?,
                    updated_at = ?
                """,
                (
                    updated["sample_time_soil_ms"],
                    updated["sample_time_light_ms"],
                    updated["sample_time_air_ms"],
                    updated["sample_time_cloud_ms"],
                    now,
                    now,
                ),
            )
        connection.commit()

    settings = hub_settings(hub_id)
    best_effort_sync_core_to_supabase("hub settings")
    return settings


def update_hub_local_ip(hub_id: str, local_ip: str | None) -> None:
    clean_ip = str(local_ip or "").strip()
    if not clean_ip:
        return
    with db_connection() as connection:
        connection.execute(
            """
            UPDATE hubs
            SET local_ip = ?,
                updated_at = ?
            WHERE hub_id = ?
            """,
            (clean_ip, utc_now_iso(), hub_id),
        )
        connection.commit()
    best_effort_sync_core_to_supabase("hub local ip")


def update_hub_device_status(hub_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    now = utc_now_iso()
    local_ip = str(payload.get("local_ip") or "").strip()
    status_message = str(payload.get("status") or payload.get("message") or payload.get("event") or "").strip()
    status_detail = str(payload.get("detail") or "").strip()
    if status_detail:
        status_message = f"{status_message}: {status_detail}" if status_message else status_detail
    firmware_version = str(payload.get("firmware_version") or payload.get("version") or "").strip()
    config_revision_raw = payload.get("config_revision", payload.get("applied_config_revision"))
    try:
        applied_revision = int(config_revision_raw or 0)
    except (TypeError, ValueError):
        applied_revision = 0
    applied_settings = payload.get("applied_settings")
    if not isinstance(applied_settings, dict):
        applied_settings = {}

    assignments = [
        "device_status_at = ?",
        "device_status_message = ?",
        "device_firmware_version = ?",
        "updated_at = ?",
    ]
    values: list[Any] = [now, status_message, firmware_version, now]
    if local_ip:
        assignments.insert(0, "local_ip = ?")
        values.insert(0, local_ip)
    if applied_revision > 0:
        assignments.extend(
            [
                "config_applied_revision = ?",
                "config_applied_at = ?",
                "config_applied_settings_json = ?",
            ]
        )
        values.extend([applied_revision, now, json.dumps(applied_settings, ensure_ascii=False)])

    values.append(hub_id)
    with db_connection() as connection:
        connection.execute(
            f"""
            UPDATE hubs
            SET {", ".join(assignments)}
            WHERE hub_id = ?
            """,
            values,
        )
        connection.commit()
    settings = hub_settings(hub_id)
    best_effort_sync_core_to_supabase("hub device status")
    return settings


def device_config_response(hub_id: str, current_version: str = "") -> dict[str, Any]:
    settings = hub_settings(hub_id)
    bundled_version, bundled_url = bundled_firmware_info()
    latest_version = ACTIVE_FIRMWARE_VERSION or bundled_version
    firmware_url = ACTIVE_FIRMWARE_URL or bundled_url
    update_available = (
        bool(latest_version)
        and bool(firmware_url)
        and is_newer_firmware_version(latest_version, current_version)
    )

    return {
        "ok": True,
        "hub_id": settings["hub_id"],
        "server_time": utc_now_iso(),
        "settings": {
            "sample_time_soil_ms": settings["sample_time_soil_ms"],
            "sample_time_light_ms": settings["sample_time_light_ms"],
            "sample_time_air_ms": settings["sample_time_air_ms"],
            "sample_time_cloud_ms": settings["sample_time_cloud_ms"],
        },
        "config": {
            "revision": settings["config_revision"],
            "updated_at": settings["config_updated_at"],
        },
        "firmware": {
            "current_version": str(current_version or "").strip(),
            "latest_version": latest_version,
            "url": firmware_url,
            "update_available": update_available,
        },
    }


def history_start_iso(hub_id: str) -> str | None:
    start_at = normalize_history_start_at(hub_settings(hub_id).get("history_start_at", ""))
    if not start_at:
        return None
    start_local = datetime.strptime(start_at, "%Y-%m-%dT%H:%M").replace(tzinfo=APP_TIMEZONE)
    return start_local.astimezone(timezone.utc).isoformat()


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def clamp_history_window(
    hub_id: str,
    since: datetime | None,
    until: datetime | None,
) -> tuple[datetime, datetime]:
    now_utc = datetime.now(timezone.utc)
    start_dt = since or now_utc - timedelta(days=3)
    end_dt = until or now_utc

    global_start = parse_iso_datetime(history_start_iso(hub_id))
    if global_start and start_dt < global_start:
        start_dt = global_start

    if end_dt > now_utc:
        end_dt = now_utc

    if end_dt <= start_dt:
        end_dt = start_dt + timedelta(minutes=1)

    return start_dt, end_dt


def list_app_users() -> list[dict[str, Any]]:
    with db_connection() as connection:
        rows = connection.execute(
            """
            SELECT u.username, u.full_name, u.phone, u.email,
                   u.is_active, u.is_admin, u.email_verified,
                   u.created_at, u.updated_at,
                   h.hub_id, h.hub_name, h.owner_username,
                   COALESCE(hc.hub_count, 0) AS hub_count,
                   COALESCE(cm.message_count, 0) AS message_count,
                   COALESCE(cm.unread_message_count, 0) AS unread_message_count,
                   cm.last_message_at
            FROM app_users u
            LEFT JOIN (
                SELECT hm.username, MIN(h.hub_id) AS hub_id
                FROM hub_members hm
                INNER JOIN hubs h ON h.hub_id = hm.hub_id
                GROUP BY hm.username
            ) primary_hub ON primary_hub.username = u.username
            LEFT JOIN hubs h ON h.hub_id = primary_hub.hub_id
            LEFT JOIN (
                SELECT username, COUNT(*) AS hub_count
                FROM hub_members
                GROUP BY username
            ) hc ON hc.username = u.username
            LEFT JOIN (
                SELECT username,
                       COUNT(*) AS message_count,
                       SUM(CASE WHEN status = 'ny' THEN 1 ELSE 0 END) AS unread_message_count,
                       MAX(created_at) AS last_message_at
                FROM customer_messages
                WHERE status != 'arkivert'
                GROUP BY username
            ) cm ON cm.username = u.username
            ORDER BY u.username COLLATE NOCASE ASC
            """
        ).fetchall()
    return [dict(row) for row in rows]


def find_app_user(username: str) -> dict[str, Any] | None:
    lookup = username.strip()
    if not lookup:
        return None
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT username, full_name, phone, email, password_hash,
                   is_active, is_admin, email_verified,
                   email_verification_token, email_verification_sent_at,
                   created_at, updated_at
            FROM app_users
            WHERE lower(username) = lower(?)
               OR lower(email) = lower(?)
            ORDER BY CASE WHEN lower(username) = lower(?) THEN 0 ELSE 1 END
            LIMIT 1
            """,
            (lookup, lookup, lookup),
        ).fetchone()
    return dict(row) if row else None


def email_in_use(email: str, exclude_username: str | None = None) -> bool:
    normalized_email = email.strip().lower()
    if not normalized_email:
        return False
    with db_connection() as connection:
        if exclude_username:
            row = connection.execute(
                """
                SELECT 1
                FROM app_users
                WHERE lower(email) = ?
                  AND username != ?
                LIMIT 1
                """,
                (normalized_email, exclude_username),
            ).fetchone()
        else:
            row = connection.execute(
                """
                SELECT 1
                FROM app_users
                WHERE lower(email) = ?
                LIMIT 1
                """,
                (normalized_email,),
            ).fetchone()
    return bool(row)


def create_app_user(
    username: str,
    password: str,
    is_admin: bool = False,
    assign_hub: bool = False,
    full_name: str = "",
    phone: str = "",
    email: str = "",
    email_verified: bool = True,
) -> dict[str, Any]:
    normalized_username = username.strip().lower() if "@" in username else username.strip()
    normalized_full_name = full_name.strip()
    normalized_phone = phone.strip()
    normalized_email = email.strip().lower()
    if not normalized_username:
        raise ValueError("missing_username")
    if len(normalized_username) < 3:
        raise ValueError("username_too_short")
    if not normalized_full_name:
        raise ValueError("missing_full_name")
    if len(normalized_full_name) < 2:
        raise ValueError("full_name_too_short")
    if not normalized_phone:
        raise ValueError("missing_phone")
    if len(normalized_phone) < 6:
        raise ValueError("phone_too_short")
    if not normalized_email:
        raise ValueError("missing_email")
    if "@" not in normalized_email or "." not in normalized_email.split("@", 1)[-1]:
        raise ValueError("invalid_email")
    if len(password) < 6:
        raise ValueError("password_too_short")
    if find_app_user(normalized_username):
        raise ValueError("user_exists")
    if email_in_use(normalized_email):
        raise ValueError("email_exists")

    now = utc_now_iso()
    verification_token = "" if email_verified else secrets.token_urlsafe(32)
    verification_sent_at = "" if email_verified else now
    with db_connection() as connection:
        connection.execute(
            """
            INSERT INTO app_users (
                username, full_name, phone, email, password_hash,
                is_active, is_admin, email_verified,
                email_verification_token, email_verification_sent_at,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
            """,
            (
                normalized_username,
                normalized_full_name,
                normalized_phone,
                normalized_email,
                hash_password(password),
                1 if is_admin else 0,
                1 if email_verified else 0,
                verification_token,
                verification_sent_at,
                now,
                now,
            ),
        )
        connection.commit()
    if assign_hub and not is_admin:
        assigned_hub = create_hub_for_user(normalized_username)
    else:
        assigned_hub = None
    user = find_app_user(normalized_username)
    best_effort_sync_core_to_supabase("user create")
    return {
        "username": user["username"],
        "full_name": user["full_name"],
        "phone": user["phone"],
        "email": user["email"],
        "is_active": user["is_active"],
        "is_admin": user["is_admin"],
        "email_verified": user["email_verified"],
        "email_verification_token": user["email_verification_token"],
        "email_verification_sent_at": user["email_verification_sent_at"],
        "created_at": user["created_at"],
        "updated_at": user["updated_at"],
        "hub_id": assigned_hub["hub_id"] if assigned_hub else None,
        "hub_name": assigned_hub["hub_name"] if assigned_hub else None,
        "owner_username": assigned_hub["owner_username"] if assigned_hub else None,
    }


def update_app_user(
    username: str,
    password: str | None = None,
    is_active: bool | None = None,
    is_admin: bool | None = None,
    full_name: str | None = None,
    phone: str | None = None,
    email: str | None = None,
) -> dict[str, Any]:
    user = find_app_user(username)
    if not user:
        raise ValueError("user_not_found")

    updates: list[str] = []
    values: list[Any] = []

    if password is not None:
        if len(password) < 6:
            raise ValueError("password_too_short")
        updates.append("password_hash = ?")
        values.append(hash_password(password))

    if full_name is not None:
        normalized_full_name = full_name.strip()
        if len(normalized_full_name) < 2:
            raise ValueError("full_name_too_short")
        updates.append("full_name = ?")
        values.append(normalized_full_name)

    if phone is not None:
        normalized_phone = phone.strip()
        if len(normalized_phone) < 6:
            raise ValueError("phone_too_short")
        updates.append("phone = ?")
        values.append(normalized_phone)

    if email is not None:
        normalized_email = email.strip().lower()
        if "@" not in normalized_email or "." not in normalized_email.split("@", 1)[-1]:
            raise ValueError("invalid_email")
        if email_in_use(normalized_email, exclude_username=username):
            raise ValueError("email_exists")
        updates.append("email = ?")
        values.append(normalized_email)

    if is_active is not None:
        updates.append("is_active = ?")
        values.append(1 if is_active else 0)

    if is_admin is not None:
        updates.append("is_admin = ?")
        values.append(1 if is_admin else 0)

    if not updates:
        return {
            "username": user["username"],
            "full_name": user["full_name"],
            "phone": user["phone"],
            "email": user["email"],
            "is_active": user["is_active"],
            "is_admin": user["is_admin"],
            "email_verified": user["email_verified"],
            "created_at": user["created_at"],
            "updated_at": user["updated_at"],
        }

    now = utc_now_iso()
    updates.append("updated_at = ?")
    values.append(now)
    values.append(username)

    with db_connection() as connection:
        connection.execute(
            f"""
            UPDATE app_users
            SET {", ".join(updates)}
            WHERE username = ?
            """,
            values,
        )
        connection.commit()

    updated = find_app_user(username)
    assigned_hub = primary_hub_for_user(username)
    best_effort_sync_core_to_supabase("user update")
    return {
        "username": updated["username"],
        "full_name": updated["full_name"],
        "phone": updated["phone"],
        "email": updated["email"],
        "is_active": updated["is_active"],
        "is_admin": updated["is_admin"],
        "email_verified": updated["email_verified"],
        "created_at": updated["created_at"],
        "updated_at": updated["updated_at"],
        "hub_id": assigned_hub["hub_id"] if assigned_hub else None,
        "hub_name": assigned_hub["hub_name"] if assigned_hub else None,
        "owner_username": assigned_hub["owner_username"] if assigned_hub else None,
    }


def delete_app_user(username: str, acting_username: str) -> None:
    user = find_app_user(username)
    if not user:
        raise ValueError("user_not_found")
    if username == acting_username:
        raise ValueError("cannot_delete_self")

    with db_connection() as connection:
        if int(user.get("is_admin") or 0):
            admin_count_row = connection.execute(
                """
                SELECT COUNT(*) AS count
                FROM app_users
                WHERE is_admin = 1
                """
            ).fetchone()
            admin_count = int(admin_count_row["count"]) if admin_count_row else 0
            if admin_count <= 1:
                raise ValueError("cannot_delete_last_admin")

        owned_hubs = connection.execute(
            """
            SELECT hub_id
            FROM hubs
            WHERE owner_username = ?
            """,
            (username,),
        ).fetchall()

        for hub in owned_hubs:
            hub_id = str(hub["hub_id"]) if hub and hub["hub_id"] else ""
            if not hub_id:
                continue
            connection.execute(
                """
                DELETE FROM sensor_samples
                WHERE hub_id = ?
                """,
                (hub_id,),
            )
            connection.execute(
                """
                DELETE FROM growly_plants
                WHERE hub_id = ?
                """,
                (hub_id,),
            )
            connection.execute(
                """
                DELETE FROM hub_members
                WHERE hub_id = ?
                """,
                (hub_id,),
            )
            connection.execute(
                """
                DELETE FROM hubs
                WHERE hub_id = ?
                """,
                (hub_id,),
            )
            connection.execute(
                """
                DELETE FROM pairing_tokens
                WHERE paired_hub_id = ?
                """,
                (hub_id,),
            )

        connection.execute(
            """
            DELETE FROM growly_plants
            WHERE owner_username = ?
            """,
            (username,),
        )
        connection.execute(
            """
            DELETE FROM hub_members
            WHERE username = ?
            """,
            (username,),
        )
        connection.execute(
            """
            DELETE FROM pairing_tokens
            WHERE target_username = ?
            """,
            (username,),
        )
        connection.execute(
            """
            DELETE FROM customer_messages
            WHERE username = ?
            """,
            (username,),
        )
        connection.execute(
            """
            DELETE FROM app_users
            WHERE username = ?
            """,
            (username,),
        )
        connection.commit()
    for hub in owned_hubs:
        hub_id = str(hub["hub_id"]) if hub and hub["hub_id"] else ""
        if hub_id:
            best_effort_delete_supabase_sensor_samples(hub_id)
            best_effort_delete_supabase_plants_for_hub(hub_id)
            best_effort_delete_supabase_hub(hub_id)
    best_effort_delete_supabase_plants_for_user(username)
    best_effort_delete_supabase_user(username)
    best_effort_sync_core_to_supabase("user delete")


def reset_app_user_password(username: str) -> str:
    user = find_app_user(username)
    if not user:
        raise ValueError("user_not_found")

    temporary_password = f"Growly-{secrets.token_urlsafe(6)}"
    update_app_user(username, password=temporary_password)
    return temporary_password


CUSTOMER_MESSAGE_CATEGORIES = {"utfordring", "forslag", "tips", "sporsmal", "annet"}
CUSTOMER_MESSAGE_STATUSES = {"ny", "lest", "arkivert"}


def clean_customer_message_category(category: Any) -> str:
    normalized = (
        str(category or "")
        .strip()
        .lower()
        .replace("æ", "ae")
        .replace("ø", "o")
        .replace("å", "a")
    )
    if normalized in CUSTOMER_MESSAGE_CATEGORIES:
        return normalized
    if normalized in {"sporsmal", "question"}:
        return "sporsmal"
    if normalized in {"problem", "bug", "feil"}:
        return "utfordring"
    if normalized in {"improvement", "feature"}:
        return "forslag"
    return "annet"


def clean_customer_message_conversation(conversation: Any) -> list[dict[str, str]]:
    if not isinstance(conversation, list):
        return []
    cleaned: list[dict[str, str]] = []
    for item in conversation[-18:]:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role") or "").strip().lower()
        if role not in {"user", "assistant"}:
            continue
        text = str(item.get("text") or "").strip()
        if not text:
            continue
        entry = {
            "role": role,
            "text": text[:1200],
        }
        image_name = str(item.get("imageName") or item.get("image_name") or "").strip()
        if image_name:
            entry["imageName"] = image_name[:120]
        cleaned.append(entry)
    return cleaned


def customer_message_payload(row: dict[str, Any]) -> dict[str, Any]:
    conversation: list[dict[str, str]] = []
    try:
        parsed = json.loads(str(row.get("conversation_json") or "[]"))
        if isinstance(parsed, list):
            conversation = clean_customer_message_conversation(parsed)
    except json.JSONDecodeError:
        conversation = []
    return {
        "id": row.get("id"),
        "username": row.get("username"),
        "full_name": row.get("full_name") or "",
        "email": row.get("email") or "",
        "hub_id": row.get("hub_id") or "",
        "category": row.get("category") or "annet",
        "title": row.get("title") or "",
        "message": row.get("message") or "",
        "source": row.get("source") or "ai_chat",
        "conversation": conversation,
        "status": row.get("status") or "ny",
        "created_at": row.get("created_at") or "",
        "updated_at": row.get("updated_at") or "",
    }


def create_customer_message(username: str, hub_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    user = find_app_user(username)
    if not user:
        raise ValueError("user_not_found")

    message = str(payload.get("message") or "").strip()
    if len(message) < 8:
        raise ValueError("missing_message")
    if len(message) > 4000:
        raise ValueError("message_too_long")

    title = str(payload.get("title") or "").strip()
    if not title:
        title = message.splitlines()[0].strip()
    title = title[:120]
    category = clean_customer_message_category(payload.get("category"))
    conversation = clean_customer_message_conversation(payload.get("conversation"))
    now = utc_now_iso()

    with db_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO customer_messages (
                username, hub_id, category, title, message, source,
                conversation_json, status, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, 'ai_chat', ?, 'ny', ?, ?)
            """,
            (
                username,
                str(hub_id or "").strip(),
                category,
                title,
                message,
                json.dumps(conversation, ensure_ascii=False),
                now,
                now,
            ),
        )
        connection.commit()
        message_id = cursor.lastrowid

    created = find_customer_message(message_id)
    if not created:
        raise ValueError("message_create_failed")
    return created


def find_customer_message(message_id: int) -> dict[str, Any] | None:
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT m.id, m.username, u.full_name, u.email, m.hub_id, m.category,
                   m.title, m.message, m.source, m.conversation_json,
                   m.status, m.created_at, m.updated_at
            FROM customer_messages m
            LEFT JOIN app_users u ON u.username = m.username
            WHERE m.id = ?
            """,
            (message_id,),
        ).fetchone()
    return customer_message_payload(dict(row)) if row else None


def list_customer_messages(username: str = "", limit: int = 100, status: str = "") -> list[dict[str, Any]]:
    clean_username = username.strip()
    clean_status = str(status or "").strip().lower()
    params: list[Any] = []
    where_parts: list[str] = []
    if clean_username:
        where_parts.append("lower(m.username) = lower(?)")
        params.append(clean_username)
    if clean_status:
        if clean_status == "active":
            where_parts.append("m.status != 'arkivert'")
        else:
            if clean_status not in CUSTOMER_MESSAGE_STATUSES:
                raise ValueError("invalid_status")
            where_parts.append("m.status = ?")
            params.append(clean_status)
    where_clause = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""
    params.append(max(1, min(limit, 300)))

    with db_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT m.id, m.username, u.full_name, u.email, m.hub_id, m.category,
                   m.title, m.message, m.source, m.conversation_json,
                   m.status, m.created_at, m.updated_at
            FROM customer_messages m
            LEFT JOIN app_users u ON u.username = m.username
            {where_clause}
            ORDER BY CASE m.status WHEN 'ny' THEN 0 WHEN 'lest' THEN 1 ELSE 2 END,
                     m.created_at DESC
            LIMIT ?
            """,
            params,
        ).fetchall()
    return [customer_message_payload(dict(row)) for row in rows]


def delete_customer_message(message_id: int) -> dict[str, Any]:
    message = find_customer_message(message_id)
    if not message:
        raise ValueError("message_not_found")

    with db_connection() as connection:
        connection.execute(
            """
            DELETE FROM customer_messages
            WHERE id = ?
            """,
            (message_id,),
        )
        connection.commit()

    return message


def update_customer_message_status(message_id: int, status: str) -> dict[str, Any]:
    clean_status = str(status or "").strip().lower()
    if clean_status not in CUSTOMER_MESSAGE_STATUSES:
        raise ValueError("invalid_status")

    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT id
            FROM customer_messages
            WHERE id = ?
            """,
            (message_id,),
        ).fetchone()
        if not row:
            raise ValueError("message_not_found")
        connection.execute(
            """
            UPDATE customer_messages
            SET status = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (clean_status, utc_now_iso(), message_id),
        )
        connection.commit()

    updated = find_customer_message(message_id)
    if not updated:
        raise ValueError("message_not_found")
    return updated


def normalized_sensor_payload(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = {
        "recorded_at": utc_now_iso(),
        "source": str(payload.get("source", "unknown")),
        "valid": 1 if payload.get("valid", False) else 0,
        "error": str(payload.get("error", "")),
    }
    for metric in METRIC_KEYS:
        value = None
        for payload_key in METRIC_PAYLOAD_ALIASES.get(metric, (metric,)):
            if payload_key in payload and payload.get(payload_key) is not None:
                value = payload.get(payload_key)
                break
        normalized[metric] = None if value is None else float(value)
    return normalized


def sensor_sample_supabase_payload(normalized: dict[str, Any], hub_id: str) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "created_at": normalized["recorded_at"],
        "hub_id": hub_id,
    }
    for metric in METRIC_KEYS:
        payload[metric] = normalized.get(metric)
    return payload


def best_effort_store_sensor_sample_supabase(normalized: dict[str, Any], hub_id: str) -> dict[str, Any] | None:
    if not supabase_enabled():
        return None
    try:
        supabase_request(
            "sensor_data",
            method="POST",
            payload=sensor_sample_supabase_payload(normalized, hub_id),
            prefer="return=minimal",
        )
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        return {"ok": False, "error": f"HTTP {exc.code}: {body or exc.reason}"}
    except (URLError, json.JSONDecodeError) as exc:
        return {"ok": False, "error": str(exc)}
    return {"ok": True}


def store_sensor_sample(payload: dict[str, Any], hub_id: str) -> dict[str, Any]:
    normalized = normalized_sensor_payload(payload)
    with db_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO sensor_samples (
                recorded_at, source, valid, error, humidity, temperature, ph,
                conductivity, nitrogen, phosphorus, potassium, salinity, tds,
                air_temperature, air_humidity, air_pressure, lux, hub_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                normalized["recorded_at"],
                normalized["source"],
                normalized["valid"],
                normalized["error"],
                normalized["humidity"],
                normalized["temperature"],
                normalized["ph"],
                normalized["conductivity"],
                normalized["nitrogen"],
                normalized["phosphorus"],
                normalized["potassium"],
                normalized["salinity"],
                normalized["tds"],
                normalized["air_temperature"],
                normalized["air_humidity"],
                normalized["air_pressure"],
                normalized["lux"],
                hub_id,
            ),
        )
        connection.commit()
        normalized["id"] = cursor.lastrowid
        normalized["hub_id"] = hub_id
    normalized["supabase"] = best_effort_store_sensor_sample_supabase(normalized, hub_id)
    return normalized


def latest_sample(hub_id: str) -> dict[str, Any] | None:
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM sensor_samples
            WHERE hub_id = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (hub_id,),
        ).fetchone()
    return dict(row) if row else None


def ai_sample_context(hub_id: str) -> dict[str, Any] | None:
    try:
        if supabase_enabled():
            return supabase_latest_sample(hub_id)
    except (HTTPError, URLError, json.JSONDecodeError):
        pass
    return latest_sample(hub_id)


def ai_plant_context(limit: int = 10, language: str = "no") -> list[dict[str, Any]]:
    plants: list[dict[str, Any]] = []
    for item in list_plant_catalog("", language)[:limit]:
        plants.append(
            {
                "name": item.get("display_name") or item.get("name"),
                "type": item.get("kind"),
                "category": item.get("category"),
                "latin_name": item.get("latin_name"),
                "ranges": item.get("ranges"),
                "watering": item.get("watering"),
                "notes": item.get("notes"),
                "seed_guide": item.get("seed_guide"),
            }
        )
    return plants


def openai_response_text(payload: dict[str, Any]) -> str:
    text = str(payload.get("output_text") or "").strip()
    if text:
        return text

    output = payload.get("output")
    if isinstance(output, list):
        parts: list[str] = []
        for item in output:
            if not isinstance(item, dict):
                continue
            content = item.get("content")
            if not isinstance(content, list):
                continue
            for content_item in content:
                if not isinstance(content_item, dict):
                    continue
                item_text = content_item.get("text")
                if isinstance(item_text, str) and item_text.strip():
                    parts.append(item_text.strip())
        if parts:
            return "\n\n".join(parts)

    return ""


def parse_ai_json_object(text: str) -> dict[str, Any] | None:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.lower().startswith("json"):
            stripped = stripped[4:].strip()
    try:
        parsed = json.loads(stripped)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        start = stripped.find("{")
        end = stripped.rfind("}")
        if start == -1 or end <= start:
            return None
        try:
            parsed = json.loads(stripped[start : end + 1])
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None


def clean_ai_image_payload(image: Any) -> dict[str, str] | None:
    if not isinstance(image, dict):
        return None
    data_url = str(image.get("dataUrl") or image.get("data_url") or "").strip()
    if not data_url.startswith("data:image/") or ";base64," not in data_url:
        return None
    if len(data_url) > 7_000_000:
        raise ValueError("image_too_large")
    name = str(image.get("name") or "plantebilde").strip()[:80]
    return {"data_url": data_url, "name": name}


def ask_openai_growly(question: str, context: dict[str, Any], image: dict[str, str] | None = None, language: str = "no") -> str:
    if not OPENAI_API_KEY:
        raise ValueError("openai_key_missing")

    language = app_language(language)
    system_prompt = (
        "You are Growly Gardening Assistant, a calm greenhouse assistant. "
        "Answer warmly, premium and concretely in English. "
        "Use 2 short sentences in one small paragraph, maximum 45 words total. "
        "Do not use Markdown, bold text, headings, bullet lists or long explanatory paragraphs unless the user asks for it. "
        "For explanation questions: start with a short, warm opening such as 'Sure:' or 'Yes:', but do not become chatty. "
        "Your first answer should build on the user's description, the plant image, general plant knowledge and weather data when relevant. "
        "Do not base the first answer on sensors unless the user clearly asks about sensor values or sensors are necessary for the answer. "
        "Answer general greenhouse, growing and plant-care questions without bringing in sensors when they are not needed. "
        "Help with questions and simple diagnostics around plants, watering, climate and visible symptoms. "
        "Sensors are only extra context when growly_context.sensors_available is true and latest_measurement exists. "
        "If sensors_available is false: do not mention sensors, hub, connection, pairing or missing sensor values at all. "
        "When sensor data can help and sensors are available, ask one short follow-up question rather than assuming the plant is connected to a sensor. "
        "Use concrete sensor values and plant requirements only when they are actually relevant, but do not overstate precision. "
        "Weather data is separate from sensors and can be used even if sensors are unavailable. "
        "If the user sends an image, assess visible signs on the plant and suggest a safe next action. "
        "If the user talks about problems, suggestions or wishes for the Growly app itself, ask one short follow-up question and help them formulate feedback. "
        "Do not say anything has been sent to admin; that only happens when the user confirms in the app. "
        "If data is missing, say so clearly in one short sentence. "
        "Do not give firm disease diagnoses; give likely causes and safe actions."
    ) if language == "en" else (
        "Du er Growly Gartnerassistent, en rolig norsk hageassistent for drivhus. "
        "Svar vennlig, premium og konkret på norsk. "
        "Bruk 2 korte setninger i ett lite avsnitt, maks 45 ord totalt. "
        "Ikke bruk Markdown, fet tekst, overskrifter, punktliste eller lange forklaringsavsnitt med mindre brukeren ber om det. "
        "Ved forklaringsspørsmål: start med en kort, varm åpning som 'Klart:' eller 'Ja:', men ikke bli pratete. "
        "Første svar skal bygge på brukerens beskrivelse, plantebildet, generell plantekunnskap og værdata når det er relevant. "
        "Ikke baser første svar på sensorer med mindre brukeren tydelig spør om sensorverdier eller sensorene er nødvendige for svaret. "
        "Svar på generelle drivhus-, dyrke- og plantepleiespørsmål uten å trekke inn sensorer når det ikke trengs. "
        "Hjelp med spørsmål og enkel diagnostikk rundt planter, vanning, klima og synlige symptomer. "
        "Sensorer er bare ekstra kontekst når growly_kontekst.sensorer_tilgjengelig er true og siste_maling finnes. "
        "Hvis sensorer_tilgjengelig er false: ikke nevn sensorer, hub, kobling, pairing eller manglende sensorverdier i det hele tatt. "
        "Når sensordata kan hjelpe og sensorene er tilgjengelige, spør heller ett kort oppfølgingsspørsmål enn å anta at planten er koblet til sensor. "
        "Bruk konkrete sensorverdier og plantekrav bare når de faktisk er relevante, men ikke overdriv presisjonen. "
        "Værdata er separat fra sensorer og kan brukes selv om sensorer ikke er tilgjengelige. "
        "Hvis brukeren sender bilde, vurder synlige tegn på planten og foreslå trygg neste handling. "
        "Hvis brukeren snakker om problemer, forslag eller ønsker for selve Growly-appen, "
        "still ett kort oppfølgingsspørsmål og hjelp dem å formulere tilbakemeldingen. "
        "Ikke si at noe er sendt til admin; det skjer bare når brukeren bekrefter i appen. "
        "Hvis data mangler, si det tydelig i én kort setning. "
        "Ikke gi bastante sykdomsdiagnoser; gi sannsynlige årsaker og trygge tiltak."
    )

    user_content: list[dict[str, Any]] = [
        {
            "type": "input_text",
            "text": json.dumps(
                {
                    "language": "English" if language == "en" else "Norwegian",
                    "question": question,
                    "growly_context": context,
                    "image": image["name"] if image else None,
                },
                ensure_ascii=False,
            ),
        }
    ]
    if image:
        user_content.append({"type": "input_image", "image_url": image["data_url"]})

    request_payload = {
        "model": OPENAI_MODEL,
        "input": [
            {
                "role": "system",
                "content": [
                    {
                        "type": "input_text",
                        "text": system_prompt,
                    }
                ],
            },
            {
                "role": "user",
                "content": user_content,
            },
        ],
        "max_output_tokens": 180,
    }
    request = UrlRequest(
        "https://api.openai.com/v1/responses",
        data=json.dumps(request_payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    request_ssl_context = ssl.create_default_context(cafile=certifi.where()) if certifi else None
    with urlopen(request, timeout=25, context=request_ssl_context) as response:
        response_payload = json.loads(response.read().decode("utf-8"))

    answer = openai_response_text(response_payload)
    if not answer:
        raise ValueError("empty_ai_response")
    return answer


def recent_sensor_targets(hub_id: str, limit: int = 5) -> list[str]:
    with db_connection() as connection:
        rows = connection.execute(
            """
            SELECT source
            FROM sensor_samples
            WHERE source LIKE 'http%'
              AND hub_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (hub_id, limit * 4),
        ).fetchall()

    targets: list[str] = []
    for row in rows:
        source = str(row["source"] or "").strip()
        if not source:
            continue
        try:
            normalized = normalize_sensor_url(source)
        except ValueError:
            continue
        if normalized not in targets:
            targets.append(normalized)
        if len(targets) >= limit:
            break
    return targets


def sensor_target_candidates(hub_id: str, target: str | None = None) -> list[str]:
    if target:
        return [normalize_sensor_url(target)]

    configured_target = normalize_sensor_url(hub_settings(hub_id).get("sensor_url", DEFAULT_SENSOR_URL))
    candidates = [configured_target]

    for recent_target in recent_sensor_targets(hub_id):
        if recent_target not in candidates:
            candidates.append(recent_target)

    default_target = normalize_sensor_url(DEFAULT_SENSOR_URL)
    if default_target not in candidates:
        candidates.append(default_target)

    return candidates


def metric_history(metric: str, limit: int) -> list[dict[str, Any]]:
    if metric not in METRIC_KEYS:
        raise ValueError("unsupported_metric")

    with db_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT recorded_at, {metric} AS value, valid
            FROM sensor_samples
            WHERE {metric} IS NOT NULL
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    history = [dict(row) for row in reversed(rows)]
    return history


def metric_history_by_span(
    hub_id: str,
    metric: str,
    span: str,
    limit: int,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[dict[str, Any]]:
    if metric not in METRIC_KEYS:
        raise ValueError("unsupported_metric")
    if span not in SPAN_CONFIG:
        raise ValueError("unsupported_span")

    config = SPAN_CONFIG[span]
    requested_since = parse_iso_datetime(date_from) or (datetime.now(timezone.utc) - config["window"])
    requested_until = parse_iso_datetime(date_to) or datetime.now(timezone.utc)
    since_dt, until_dt = clamp_history_window(hub_id, requested_since, requested_until)
    bucket_seconds = config["bucket_seconds"]
    custom_window = bool(date_from or date_to)

    with db_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT recorded_at, {metric} AS value, valid
            FROM sensor_samples
            WHERE {metric} IS NOT NULL
              AND hub_id = ?
              AND recorded_at >= ?
              AND recorded_at < ?
            ORDER BY recorded_at ASC
            LIMIT ?
            """,
            (hub_id, since_dt.isoformat(), until_dt.isoformat(), limit * 8),
        ).fetchall()
        if not rows and not custom_window:
            latest_row = connection.execute(
                f"""
                SELECT recorded_at
                FROM sensor_samples
                WHERE {metric} IS NOT NULL
                  AND hub_id = ?
                ORDER BY recorded_at DESC
                LIMIT 1
                """,
                (hub_id,),
            ).fetchone()
            if latest_row and latest_row["recorded_at"]:
                latest_dt = parse_iso_datetime(str(latest_row["recorded_at"]))
                if latest_dt:
                    until_dt = latest_dt + timedelta(seconds=1)
                    since_dt = until_dt - config["window"]
                    global_start = parse_iso_datetime(history_start_iso(hub_id))
                    if global_start and since_dt < global_start:
                        since_dt = global_start
                    rows = connection.execute(
                        f"""
                        SELECT recorded_at, {metric} AS value, valid
                        FROM sensor_samples
                        WHERE {metric} IS NOT NULL
                          AND hub_id = ?
                          AND recorded_at >= ?
                          AND recorded_at < ?
                        ORDER BY recorded_at ASC
                        LIMIT ?
                        """,
                        (hub_id, since_dt.isoformat(), until_dt.isoformat(), limit * 8),
                    ).fetchall()

    buckets: dict[str, list[float]] = {}
    valid_map: dict[str, int] = {}
    origin_dt = since_dt if custom_window else None
    for row in rows:
        recorded_at = row["recorded_at"]
        value = row["value"]
        if recorded_at is None or value is None:
            continue
        bucket_key = bucket_recorded_at(str(recorded_at), bucket_seconds, origin_dt)
        buckets.setdefault(bucket_key, []).append(float(value))
        valid_map[bucket_key] = max(valid_map.get(bucket_key, 0), int(row["valid"] or 0))

    points = [
        {
            "recorded_at": bucket_key,
            "value": sum(values) / len(values),
            "valid": valid_map.get(bucket_key, 1),
        }
        for bucket_key, values in sorted(buckets.items())
    ]
    return points[-limit:]


def supabase_enabled() -> bool:
    return bool(SUPABASE_REST_ENDPOINT and supabase_auth_key())


def supabase_auth_key() -> str:
    return SUPABASE_SERVICE_ROLE_KEY or SUPABASE_API_KEY


def supabase_auth_headers() -> dict[str, str]:
    key = supabase_auth_key()
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }


def supabase_rest_base_url() -> str:
    endpoint = SUPABASE_REST_ENDPOINT.rstrip("/")
    suffix = "/sensor_data"
    if endpoint.endswith(suffix):
        return endpoint[: -len(suffix)]
    return endpoint.rsplit("/", 1)[0]


def supabase_request_url(params: dict[str, str]) -> str:
    return f"{SUPABASE_REST_ENDPOINT}?{urlencode(params)}"


def supabase_table_url(table_name: str, params: dict[str, str] | None = None) -> str:
    url = f"{supabase_rest_base_url()}/{quote(table_name, safe='')}"
    if params:
        url = f"{url}?{urlencode(params)}"
    return url


def fetch_supabase_rows(params: dict[str, str]) -> list[dict[str, Any]]:
    request = UrlRequest(
        supabase_request_url(params),
        headers=supabase_auth_headers(),
        method="GET",
    )
    ssl_context = ssl.create_default_context(cafile=certifi.where()) if certifi else None
    with urlopen(request, timeout=8, context=ssl_context) as response:
        payload = response.read().decode("utf-8")
        data = json.loads(payload)
        return data if isinstance(data, list) else []


def supabase_request(
    table_name: str,
    method: str = "GET",
    params: dict[str, str] | None = None,
    payload: Any | None = None,
    prefer: str | None = None,
) -> Any:
    headers = supabase_auth_headers()
    data: bytes | None = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    if prefer:
        headers["Prefer"] = prefer
    request = UrlRequest(
        supabase_table_url(table_name, params),
        data=data,
        headers=headers,
        method=method,
    )
    request_ssl_context = ssl.create_default_context(cafile=certifi.where()) if certifi else None
    with urlopen(request, timeout=10, context=request_ssl_context) as response:
        body = response.read().decode("utf-8")
    if not body:
        return None
    return json.loads(body)


def supabase_fetch_table(table_name: str, params: dict[str, str] | None = None) -> list[dict[str, Any]]:
    data = supabase_request(table_name, params=params)
    return data if isinstance(data, list) else []


def supabase_upsert_rows(table_name: str, rows: list[dict[str, Any]], conflict_columns: str) -> None:
    if not rows:
        return
    supabase_request(
        table_name,
        method="POST",
        params={"on_conflict": conflict_columns},
        payload=rows,
        prefer="resolution=merge-duplicates",
    )


def supabase_delete_rows(table_name: str, params: dict[str, str]) -> None:
    supabase_request(
        table_name,
        method="DELETE",
        params=params,
        prefer="return=minimal",
    )


def fetch_supabase_rows_for_hub(hub_id: str, params: dict[str, str]) -> list[dict[str, Any]]:
    hub_params = dict(params)
    hub_params["hub_id"] = f"eq.{hub_id}"
    try:
        return fetch_supabase_rows(hub_params)
    except HTTPError as exc:
        # Older Supabase tables did not include hub_id. Keep the app usable
        # until the migration is applied, but never hide other Supabase errors.
        body = exc.read().decode("utf-8", errors="ignore")
        if exc.code == 400 and "hub_id" in body and "does not exist" in body:
            return fetch_supabase_rows(params)
        raise


def supabase_latest_sample(hub_id: str) -> dict[str, Any] | None:
    params = {
        "select": "created_at,temperature,humidity,ph,conductivity,nitrogen,phosphorus,potassium,salinity,tds,lux,air_temperature,air_humidity,air_pressure",
        "order": "created_at.desc",
        "limit": "1",
    }
    global_start = history_start_iso(hub_id)
    if global_start:
        params["created_at"] = f"gte.{global_start}"
    rows = fetch_supabase_rows_for_hub(hub_id, params)
    if not rows:
        return None

    row = rows[0]
    sample = {
        "recorded_at": row.get("created_at"),
        "source": "supabase",
        "valid": 1,
        "error": "",
    }
    for metric in METRIC_KEYS:
        sample[metric] = row.get(metric)
    return sample


def bucket_recorded_at(recorded_at: str, bucket_seconds: int, origin_dt: datetime | None = None) -> str:
    dt = datetime.fromisoformat(recorded_at.replace("Z", "+00:00"))
    timestamp = int(dt.timestamp())
    if origin_dt is None:
        bucketed = (timestamp // bucket_seconds) * bucket_seconds
    else:
        origin_timestamp = int(origin_dt.timestamp())
        relative = max(0, timestamp - origin_timestamp)
        bucketed = origin_timestamp + ((relative // bucket_seconds) * bucket_seconds)
    return datetime.fromtimestamp(bucketed, tz=timezone.utc).isoformat()


def supabase_metric_history_by_span(
    hub_id: str,
    metric: str,
    span: str,
    limit: int,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[dict[str, Any]]:
    if metric not in METRIC_KEYS:
        raise ValueError("unsupported_metric")
    if span not in SPAN_CONFIG:
        raise ValueError("unsupported_span")

    config = SPAN_CONFIG[span]
    requested_since = parse_iso_datetime(date_from) or (datetime.now(timezone.utc) - config["window"])
    requested_until = parse_iso_datetime(date_to) or datetime.now(timezone.utc)
    since_dt, until_dt = clamp_history_window(hub_id, requested_since, requested_until)
    custom_window = bool(date_from or date_to)
    rows = fetch_supabase_rows_for_hub(
        hub_id,
        {
            "select": f"created_at,{metric}",
            "created_at": f"gte.{since_dt.isoformat()}",
            f"{metric}": "not.is.null",
            "and": f"(created_at.lt.{until_dt.isoformat()})",
            "order": "created_at.asc",
            "limit": str(limit * 8),
        },
    )

    if not rows and not custom_window:
        latest_params = {
            "select": "created_at",
            f"{metric}": "not.is.null",
            "order": "created_at.desc",
            "limit": "1",
        }
        global_start = history_start_iso(hub_id)
        if global_start:
            latest_params["created_at"] = f"gte.{global_start}"

        latest_rows = fetch_supabase_rows_for_hub(hub_id, latest_params)
        if latest_rows and latest_rows[0].get("created_at"):
            latest_dt = parse_iso_datetime(str(latest_rows[0]["created_at"]))
            if latest_dt:
                until_dt = latest_dt + timedelta(seconds=1)
                since_dt = until_dt - config["window"]
                global_start_dt = parse_iso_datetime(history_start_iso(hub_id))
                if global_start_dt and since_dt < global_start_dt:
                    since_dt = global_start_dt
                rows = fetch_supabase_rows_for_hub(
                    hub_id,
                    {
                        "select": f"created_at,{metric}",
                        "created_at": f"gte.{since_dt.isoformat()}",
                        f"{metric}": "not.is.null",
                        "and": f"(created_at.lt.{until_dt.isoformat()})",
                        "order": "created_at.asc",
                        "limit": str(limit * 8),
                    },
                )

    if not rows:
        return []

    bucket_seconds = config["bucket_seconds"]
    buckets: dict[str, list[float]] = {}
    origin_dt = since_dt if custom_window else None
    for row in rows:
        value = row.get(metric)
        recorded_at = row.get("created_at")
        if value is None or not recorded_at:
            continue
        bucket_key = bucket_recorded_at(recorded_at, bucket_seconds, origin_dt)
        buckets.setdefault(bucket_key, []).append(float(value))

    points = [
        {
            "recorded_at": bucket_key,
            "value": sum(values) / len(values),
            "valid": 1,
        }
        for bucket_key, values in sorted(buckets.items())
    ]
    return points[-limit:]


def local_metric_first_recorded_at(hub_id: str, metric: str) -> str | None:
    if metric not in METRIC_KEYS:
        raise ValueError("unsupported_metric")
    global_start = history_start_iso(hub_id)
    with db_connection() as connection:
        if global_start:
            row = connection.execute(
                f"""
                SELECT recorded_at
                FROM sensor_samples
                WHERE {metric} IS NOT NULL
                  AND hub_id = ?
                  AND recorded_at >= ?
                ORDER BY recorded_at ASC
                LIMIT 1
                """,
                (hub_id, global_start),
            ).fetchone()
        else:
            row = connection.execute(
                f"""
                SELECT recorded_at
                FROM sensor_samples
                WHERE {metric} IS NOT NULL
                  AND hub_id = ?
                ORDER BY recorded_at ASC
                LIMIT 1
                """,
                (hub_id,),
            ).fetchone()
    return row["recorded_at"] if row else None


def supabase_metric_first_recorded_at(hub_id: str, metric: str) -> str | None:
    if metric not in METRIC_KEYS:
        raise ValueError("unsupported_metric")
    params = {
        "select": "created_at",
        f"{metric}": "not.is.null",
        "order": "created_at.asc",
        "limit": "1",
    }
    global_start = history_start_iso(hub_id)
    if global_start:
        params["created_at"] = f"gte.{global_start}"
    rows = fetch_supabase_rows_for_hub(hub_id, params)
    if not rows:
        return None
    return rows[0].get("created_at")


def today_window_iso(hub_id: str) -> tuple[str, str]:
    now_local = datetime.now(APP_TIMEZONE)
    start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    end_local = start_local + timedelta(days=1)
    since_dt, until_dt = clamp_history_window(
        hub_id,
        start_local.astimezone(timezone.utc),
        end_local.astimezone(timezone.utc),
    )
    return since_dt.isoformat(), until_dt.isoformat()


def day_summary_from_rows(rows: list[dict[str, Any]]) -> dict[str, dict[str, float | None]]:
    summary: dict[str, dict[str, float | None]] = {}
    for metric in METRIC_KEYS:
        values: list[float] = []
        for row in rows:
            value = row.get(metric)
            if value is None:
                continue
            values.append(float(value))
        summary[metric] = {
            "min": min(values) if values else None,
            "max": max(values) if values else None,
        }
    return summary


def supabase_day_summary(hub_id: str) -> dict[str, dict[str, float | None]]:
    since, until = today_window_iso(hub_id)
    rows = fetch_supabase_rows_for_hub(
        hub_id,
        {
            "select": "created_at,temperature,humidity,ph,conductivity,nitrogen,phosphorus,potassium,salinity,tds,lux,air_temperature,air_humidity,air_pressure",
            "created_at": f"gte.{since}",
            "and": f"(created_at.lt.{until})",
            "order": "created_at.asc",
            "limit": "5000",
        },
    )
    return day_summary_from_rows(rows)


def iso_or_none(value: Any) -> str | None:
    text = str(value or "").strip()
    return text or None


def bool_from_int(value: Any) -> bool:
    return bool(int(value or 0))


def supabase_core_readiness() -> dict[str, Any]:
    status: dict[str, Any] = {
        "enabled": supabase_enabled(),
        "sync_enabled": SUPABASE_CORE_SYNC_ENABLED,
        "service_role": bool(SUPABASE_SERVICE_ROLE_KEY),
        "tables": {},
    }
    if not supabase_enabled():
        return status
    for table_name in SUPABASE_CORE_TABLES:
        try:
            supabase_fetch_table(table_name, {"select": "*", "limit": "1"})
            status["tables"][table_name] = {"ok": True, "error": ""}
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            status["tables"][table_name] = {"ok": False, "error": body or f"http_{exc.code}"}
        except (URLError, TimeoutError, OSError) as exc:
            status["tables"][table_name] = {"ok": False, "error": str(exc)}
    return status


def supabase_core_ready() -> bool:
    readiness = supabase_core_readiness()
    tables = readiness.get("tables", {})
    return bool(readiness.get("enabled")) and all(bool(table.get("ok")) for table in tables.values())


def sync_core_to_supabase() -> dict[str, Any]:
    if not supabase_enabled():
        return {"ok": False, "error": "supabase_not_configured"}
    if not SUPABASE_CORE_SYNC_ENABLED:
        return {"ok": False, "error": "supabase_core_sync_disabled"}

    users = [
        {
            "username": user["username"],
            "full_name": user.get("full_name") or "",
            "phone": user.get("phone") or "",
            "email": user.get("email") or "",
            "is_active": bool_from_int(user.get("is_active")),
            "is_admin": bool_from_int(user.get("is_admin")),
            "email_verified": bool_from_int(user.get("email_verified")),
            "created_at": user["created_at"],
            "updated_at": user["updated_at"],
        }
        for user in list_app_users()
    ]
    hubs = [
        {
            "hub_id": hub["hub_id"],
            "hub_name": hub["hub_name"],
            "location_label": hub.get("location_label") or "",
            "owner_username": hub["owner_username"],
            "is_active": bool_from_int(hub.get("is_active")),
            "sensor_url": hub.get("sensor_url") or "",
            "local_ip": hub.get("local_ip") or "",
            "sample_time_soil_ms": int(hub.get("sample_time_soil_ms") or DEFAULT_APP_SETTINGS["sample_time_soil_ms"]),
            "sample_time_light_ms": int(hub.get("sample_time_light_ms") or DEFAULT_APP_SETTINGS["sample_time_light_ms"]),
            "sample_time_air_ms": int(hub.get("sample_time_air_ms") or DEFAULT_APP_SETTINGS["sample_time_air_ms"]),
            "sample_time_cloud_ms": int(hub.get("sample_time_cloud_ms") or DEFAULT_APP_SETTINGS["sample_time_cloud_ms"]),
            "history_start_at": iso_or_none(history_start_iso(str(hub["hub_id"]))),
            "config_revision": int(hub.get("config_revision") or 1),
            "config_updated_at": iso_or_none(hub.get("config_updated_at")),
            "config_applied_revision": int(hub.get("config_applied_revision") or 0),
            "config_applied_at": iso_or_none(hub.get("config_applied_at")),
            "config_applied_settings_json": json.loads(str(hub.get("config_applied_settings_json") or "{}")),
            "device_status_at": iso_or_none(hub.get("device_status_at")),
            "device_status_message": hub.get("device_status_message") or "",
            "device_firmware_version": hub.get("device_firmware_version") or "",
            "created_at": hub["created_at"],
            "updated_at": hub["updated_at"],
        }
        for hub in list_hubs()
    ]
    members = [
        {
            "hub_id": member["hub_id"],
            "username": member["username"],
            "role": member.get("role") or "member",
            "created_at": member["created_at"],
            "updated_at": member["updated_at"],
        }
        for member in list_hub_members()
    ]
    pairings = [
        {
            "token": pairing["token"],
            "target_username": pairing["target_username"],
            "created_at": pairing["created_at"],
            "expires_at": pairing["expires_at"],
            "used_at": iso_or_none(pairing.get("used_at")),
            "paired_hub_id": iso_or_none(pairing.get("paired_hub_id")),
        }
        for pairing in list_active_pairing_tokens()
    ]

    supabase_upsert_rows("growly_users", users, "username")
    supabase_upsert_rows("growly_hubs", hubs, "hub_id")
    supabase_upsert_rows("growly_hub_members", members, "hub_id,username")
    supabase_upsert_rows("growly_pairing_tokens", pairings, "token")

    return {
        "ok": True,
        "counts": {
            "users": len(users),
            "hubs": len(hubs),
            "hub_members": len(members),
            "pairing_tokens": len(pairings),
        },
    }


def best_effort_sync_core_to_supabase(reason: str = "") -> None:
    if not SUPABASE_CORE_SYNC_ENABLED or not supabase_enabled():
        return
    try:
        sync_core_to_supabase()
    except Exception as exc:
        print(f"Supabase core sync skipped{f' after {reason}' if reason else ''}: {exc}")


def best_effort_delete_supabase_user(username: str) -> None:
    if not SUPABASE_CORE_SYNC_ENABLED or not supabase_enabled():
        return
    try:
        supabase_delete_rows("growly_users", {"username": f"eq.{username}"})
    except Exception as exc:
        print(f"Supabase user delete skipped for {username}: {exc}")


def best_effort_delete_supabase_hub(hub_id: str) -> None:
    if not SUPABASE_CORE_SYNC_ENABLED or not supabase_enabled():
        return
    try:
        supabase_delete_rows("growly_hubs", {"hub_id": f"eq.{hub_id}"})
    except Exception as exc:
        print(f"Supabase hub delete skipped for {hub_id}: {exc}")


def best_effort_delete_supabase_sensor_samples(hub_id: str) -> None:
    if not supabase_enabled():
        return
    try:
        supabase_delete_rows("sensor_data", {"hub_id": f"eq.{hub_id}"})
    except Exception as exc:
        print(f"Supabase sensor sample delete skipped for {hub_id}: {exc}")


def best_effort_delete_supabase_plants_for_hub(hub_id: str) -> None:
    if not supabase_enabled():
        return
    try:
        supabase_delete_rows("growly_plants", {"hub_id": f"eq.{hub_id}"})
    except Exception as exc:
        print(f"Supabase plant delete skipped for hub {hub_id}: {exc}")


def best_effort_delete_supabase_plants_for_user(username: str) -> None:
    if not supabase_enabled():
        return
    try:
        supabase_delete_rows("growly_plants", {"owner_username": f"eq.{username}"})
    except Exception as exc:
        print(f"Supabase plant delete skipped for user {username}: {exc}")


def plant_row_payload(row: dict[str, Any]) -> dict[str, Any]:
    remote_plant_id = row.get("remote_plant_id") if "remote_plant_id" in row else row.get("remotePlantId") or row.get("plant_id")
    sync_status = str(row.get("sync_status") or "synced").strip() or "synced"
    return {
        "plant_id": row.get("plant_id"),
        "instanceId": row.get("plant_id"),
        "remote_plant_id": remote_plant_id,
        "remotePlantId": remote_plant_id,
        "hub_id": row.get("hub_id"),
        "owner_username": row.get("owner_username"),
        "profileId": row.get("profile_id"),
        "profile_id": row.get("profile_id"),
        "variantId": row.get("variant_id"),
        "variant_id": row.get("variant_id"),
        "cultivarId": row.get("cultivar_id"),
        "cultivar_id": row.get("cultivar_id"),
        "catalogItemId": row.get("catalog_item_id") or row.get("profile_id"),
        "catalog_item_id": row.get("catalog_item_id") or row.get("profile_id"),
        "nickname": row.get("display_name") or "",
        "display_name": row.get("display_name") or "",
        "location": row.get("location_label") or "greenhouse",
        "location_label": row.get("location_label") or "greenhouse",
        "sowedAt": row.get("sowed_at"),
        "sowed_at": row.get("sowed_at"),
        "movedToGreenhouseAt": row.get("moved_to_greenhouse_at"),
        "moved_to_greenhouse_at": row.get("moved_to_greenhouse_at"),
        "hasSevenInOne": bool(row.get("has_seven_in_one")),
        "has_seven_in_one": bool(row.get("has_seven_in_one")),
        "wateringEnabled": bool(row.get("watering_enabled")),
        "watering_enabled": bool(row.get("watering_enabled")),
        "archivedAt": row.get("archived_at"),
        "archived_at": row.get("archived_at"),
        "deletedAt": row.get("deleted_at"),
        "deleted_at": row.get("deleted_at"),
        "syncStatus": sync_status,
        "sync_status": sync_status,
        "syncError": row.get("sync_error") or "",
        "sync_error": row.get("sync_error") or "",
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def generate_local_plant_id() -> str:
    return f"local_{secrets.token_urlsafe(14)}"


def bool_to_int(value: Any) -> int:
    return 1 if bool(value) else 0


def plant_mutation_row(username: str, hub_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    profile_id = str(payload.get("profile_id") or payload.get("profileId") or "").strip()
    display_name = str(payload.get("display_name") or payload.get("nickname") or "").strip()
    if not profile_id:
        raise ValueError("missing_profile_id")
    if not display_name:
        raise ValueError("missing_display_name")

    return {
        "hub_id": hub_id,
        "owner_username": username,
        "profile_id": profile_id,
        "catalog_item_id": str(payload.get("catalog_item_id") or payload.get("catalogItemId") or profile_id).strip() or profile_id,
        "variant_id": str(payload.get("variant_id") or payload.get("variantId") or "").strip() or None,
        "cultivar_id": str(payload.get("cultivar_id") or payload.get("cultivarId") or "").strip() or None,
        "display_name": display_name,
        "location_label": str(payload.get("location_label") or payload.get("location") or "greenhouse").strip() or "greenhouse",
        "sowed_at": iso_or_none(payload.get("sowed_at") or payload.get("sowedAt")),
        "moved_to_greenhouse_at": iso_or_none(payload.get("moved_to_greenhouse_at") or payload.get("movedToGreenhouseAt")),
        "has_seven_in_one": bool_to_int(payload.get("has_seven_in_one", payload.get("hasSevenInOne", False))),
        "watering_enabled": bool_to_int(payload.get("watering_enabled", payload.get("wateringEnabled", False))),
    }


def local_plant_by_id(username: str, hub_id: str, plant_id: str) -> dict[str, Any] | None:
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT plant_id, remote_plant_id, hub_id, owner_username, profile_id, catalog_item_id,
                   variant_id, cultivar_id, display_name, location_label, sowed_at,
                   moved_to_greenhouse_at, has_seven_in_one, watering_enabled, archived_at,
                   deleted_at, sync_status, sync_error, created_at, updated_at
            FROM growly_plants
            WHERE owner_username = ?
              AND hub_id = ?
              AND deleted_at IS NULL
              AND (plant_id = ? OR remote_plant_id = ?)
            LIMIT 1
            """,
            (username, hub_id, plant_id, plant_id),
        ).fetchone()
    return dict(row) if row else None


def list_local_user_plants(username: str, hub_id: str, include_archived: bool = False, archived_only: bool = False) -> list[dict[str, Any]]:
    params: list[Any] = [username, hub_id]
    archive_clause = ""
    if archived_only:
        archive_clause = "AND archived_at IS NOT NULL"
    elif not include_archived:
        archive_clause = "AND archived_at IS NULL"

    with db_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT plant_id, remote_plant_id, hub_id, owner_username, profile_id, catalog_item_id,
                   variant_id, cultivar_id, display_name, location_label, sowed_at,
                   moved_to_greenhouse_at, has_seven_in_one, watering_enabled, archived_at,
                   deleted_at, sync_status, sync_error, created_at, updated_at
            FROM growly_plants
            WHERE owner_username = ?
              AND hub_id = ?
              AND deleted_at IS NULL
              {archive_clause}
            ORDER BY created_at DESC, updated_at DESC
            """,
            params,
        ).fetchall()
    return [plant_row_payload(dict(row)) for row in rows]


def supabase_list_user_plants(username: str, hub_id: str, include_archived: bool = False, archived_only: bool = False) -> list[dict[str, Any]]:
    if not supabase_enabled():
        return []
    params = {
        "select": "*",
        "owner_username": f"eq.{username}",
        "hub_id": f"eq.{hub_id}",
        "order": "created_at.desc",
    }
    if archived_only:
        params["archived_at"] = "not.is.null"
    elif not include_archived:
        params["archived_at"] = "is.null"
    rows = supabase_fetch_table("growly_plants", params)
    return [plant_row_payload(row) for row in rows]


def remote_plant_payload(row: dict[str, Any]) -> dict[str, Any]:
    archived_at = iso_or_none(row.get("archived_at"))
    row = {
        "hub_id": row["hub_id"],
        "owner_username": row["owner_username"],
        "profile_id": row["profile_id"],
        "catalog_item_id": row.get("catalog_item_id") or row["profile_id"],
        "variant_id": row.get("variant_id") or None,
        "cultivar_id": row.get("cultivar_id") or None,
        "display_name": row.get("display_name") or "",
        "location_label": row.get("location_label") or "greenhouse",
        "sowed_at": iso_or_none(row.get("sowed_at")),
        "moved_to_greenhouse_at": iso_or_none(row.get("moved_to_greenhouse_at")),
        "has_seven_in_one": bool(row.get("has_seven_in_one")),
        "watering_enabled": bool(row.get("watering_enabled")),
        "archived_at": archived_at,
        "updated_at": row.get("updated_at") or utc_now_iso(),
    }
    return row


def mark_local_plant_sync_error(plant_id: str, error: str) -> None:
    with db_connection() as connection:
        connection.execute(
            """
            UPDATE growly_plants
            SET sync_status = 'error',
                sync_error = ?,
                updated_at = updated_at
            WHERE plant_id = ?
            """,
            (error[:500], plant_id),
        )
        connection.commit()


def mark_local_plant_synced(plant_id: str, remote_row: dict[str, Any]) -> None:
    remote_plant_id = str(remote_row.get("plant_id") or remote_row.get("remote_plant_id") or "").strip()
    if not remote_plant_id:
        return
    with db_connection() as connection:
        connection.execute(
            """
            UPDATE growly_plants
            SET remote_plant_id = ?,
                sync_status = 'synced',
                sync_error = '',
                updated_at = COALESCE(NULLIF(?, ''), updated_at)
            WHERE plant_id = ?
            """,
            (remote_plant_id, str(remote_row.get("updated_at") or ""), plant_id),
        )
        connection.commit()


def push_local_plant_to_supabase(row: dict[str, Any]) -> None:
    if not supabase_enabled():
        mark_local_plant_sync_error(str(row["plant_id"]), "supabase_not_configured")
        return

    remote_id = str(row.get("remote_plant_id") or "").strip()
    payload = remote_plant_payload(row)
    if remote_id:
        rows = supabase_request(
            "growly_plants",
            method="PATCH",
            params={
                "plant_id": f"eq.{remote_id}",
                "hub_id": f"eq.{row['hub_id']}",
                "owner_username": f"eq.{row['owner_username']}",
            },
            payload=payload,
            prefer="return=representation",
        )
        if isinstance(rows, list) and rows:
            mark_local_plant_synced(str(row["plant_id"]), rows[0])
            return

    inserted = supabase_request(
        "growly_plants",
        method="POST",
        payload=[payload],
        prefer="return=representation",
    )
    if not isinstance(inserted, list) or not inserted:
        raise ValueError("plant_sync_failed")
    mark_local_plant_synced(str(row["plant_id"]), inserted[0])


def upsert_local_plant_from_remote(username: str, hub_id: str, remote_row: dict[str, Any]) -> None:
    remote_plant_id = str(remote_row.get("plant_id") or "").strip()
    if not remote_plant_id:
        return
    remote_payload = plant_row_payload(remote_row)
    now = utc_now_iso()

    with db_connection() as connection:
        existing = connection.execute(
            """
            SELECT plant_id, sync_status, updated_at
            FROM growly_plants
            WHERE owner_username = ?
              AND hub_id = ?
              AND (remote_plant_id = ? OR plant_id = ?)
            LIMIT 1
            """,
            (username, hub_id, remote_plant_id, remote_plant_id),
        ).fetchone()
        if existing and str(existing["sync_status"] or "") in {"pending", "error"}:
            local_updated_at = str(existing["updated_at"] or "")
            remote_updated_at = str(remote_row.get("updated_at") or "")
            if not remote_updated_at or local_updated_at >= remote_updated_at:
                return

        values = (
            remote_plant_id,
            remote_plant_id,
            hub_id,
            username,
            remote_payload.get("profile_id") or "",
            remote_payload.get("catalog_item_id") or remote_payload.get("profile_id") or "",
            remote_payload.get("variant_id"),
            remote_payload.get("cultivar_id"),
            remote_payload.get("display_name") or "",
            remote_payload.get("location_label") or "greenhouse",
            remote_payload.get("sowed_at"),
            remote_payload.get("moved_to_greenhouse_at"),
            bool_to_int(remote_payload.get("has_seven_in_one")),
            bool_to_int(remote_payload.get("watering_enabled")),
            remote_payload.get("archived_at"),
            remote_payload.get("deleted_at"),
            "synced",
            "",
            str(remote_row.get("created_at") or now),
            str(remote_row.get("updated_at") or now),
        )
        if existing:
            connection.execute(
                """
                UPDATE growly_plants
                SET remote_plant_id = ?,
                    hub_id = ?,
                    owner_username = ?,
                    profile_id = ?,
                    catalog_item_id = ?,
                    variant_id = ?,
                    cultivar_id = ?,
                    display_name = ?,
                    location_label = ?,
                    sowed_at = ?,
                    moved_to_greenhouse_at = ?,
                    has_seven_in_one = ?,
                    watering_enabled = ?,
                    archived_at = ?,
                    deleted_at = ?,
                    sync_status = ?,
                    sync_error = ?,
                    updated_at = ?
                WHERE plant_id = ?
                """,
                (
                    values[1],
                    values[2],
                    values[3],
                    values[4],
                    values[5],
                    values[6],
                    values[7],
                    values[8],
                    values[9],
                    values[10],
                    values[11],
                    values[12],
                    values[13],
                    values[14],
                    values[15],
                    values[16],
                    values[17],
                    values[19],
                    str(existing["plant_id"]),
                ),
            )
        else:
            connection.execute(
                """
                INSERT INTO growly_plants (
                    plant_id, remote_plant_id, hub_id, owner_username, profile_id, catalog_item_id,
                    variant_id, cultivar_id, display_name, location_label, sowed_at,
                    moved_to_greenhouse_at, has_seven_in_one, watering_enabled, archived_at,
                    deleted_at, sync_status, sync_error, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                values,
            )
        connection.commit()


def sync_pending_local_plants_to_supabase(username: str, hub_id: str) -> None:
    if not supabase_enabled():
        return
    with db_connection() as connection:
        rows = connection.execute(
            """
            SELECT plant_id, remote_plant_id, hub_id, owner_username, profile_id, catalog_item_id,
                   variant_id, cultivar_id, display_name, location_label, sowed_at,
                   moved_to_greenhouse_at, has_seven_in_one, watering_enabled, archived_at,
                   deleted_at, sync_status, sync_error, created_at, updated_at
            FROM growly_plants
            WHERE owner_username = ?
              AND hub_id = ?
              AND deleted_at IS NULL
              AND sync_status != 'synced'
            ORDER BY updated_at ASC
            """,
            (username, hub_id),
        ).fetchall()
    for row in rows:
        try:
            push_local_plant_to_supabase(dict(row))
        except Exception as exc:
            mark_local_plant_sync_error(str(row["plant_id"]), str(exc) or "plant_sync_failed")


def pull_user_plants_from_supabase(username: str, hub_id: str) -> None:
    if not supabase_enabled():
        return
    for plant in supabase_list_user_plants(username, hub_id, include_archived=True, archived_only=False):
        upsert_local_plant_from_remote(username, hub_id, plant)


def best_effort_sync_user_plants(username: str, hub_id: str) -> None:
    if not supabase_enabled():
        return
    try:
        sync_pending_local_plants_to_supabase(username, hub_id)
        pull_user_plants_from_supabase(username, hub_id)
    except Exception as exc:
        print(f"Supabase plant sync skipped for {username}/{hub_id}: {exc}")


def list_user_plants(username: str, hub_id: str, include_archived: bool = False, archived_only: bool = False) -> list[dict[str, Any]]:
    return list_local_user_plants(username, hub_id, include_archived=include_archived, archived_only=archived_only)


def clear_other_seven_in_one_plants(connection: sqlite3.Connection, username: str, hub_id: str, keep_plant_id: str, now: str) -> None:
    connection.execute(
        """
        UPDATE growly_plants
        SET has_seven_in_one = 0,
            sync_status = 'pending',
            sync_error = '',
            updated_at = ?
        WHERE owner_username = ?
          AND hub_id = ?
          AND plant_id != ?
          AND archived_at IS NULL
          AND deleted_at IS NULL
          AND has_seven_in_one != 0
        """,
        (now, username, hub_id, keep_plant_id),
    )


def create_user_plant(username: str, hub_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    row = plant_mutation_row(username, hub_id, payload)
    now = utc_now_iso()
    plant_id = generate_local_plant_id()
    with db_connection() as connection:
        connection.execute(
            """
            INSERT INTO growly_plants (
                plant_id, remote_plant_id, hub_id, owner_username, profile_id, catalog_item_id,
                variant_id, cultivar_id, display_name, location_label, sowed_at,
                moved_to_greenhouse_at, has_seven_in_one, watering_enabled, archived_at,
                deleted_at, sync_status, sync_error, created_at, updated_at
            )
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'pending', '', ?, ?)
            """,
            (
                plant_id,
                row["hub_id"],
                row["owner_username"],
                row["profile_id"],
                row["catalog_item_id"],
                row["variant_id"],
                row["cultivar_id"],
                row["display_name"],
                row["location_label"],
                row["sowed_at"],
                row["moved_to_greenhouse_at"],
                row["has_seven_in_one"],
                row["watering_enabled"],
                now,
                now,
            ),
        )
        if row["has_seven_in_one"]:
            clear_other_seven_in_one_plants(connection, username, hub_id, plant_id, now)
        connection.commit()
    created = local_plant_by_id(username, hub_id, plant_id)
    if not created:
        raise ValueError("plant_create_failed")
    return plant_row_payload(created)


def update_user_plant(username: str, hub_id: str, plant_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    existing = local_plant_by_id(username, hub_id, plant_id)
    if not existing:
        raise ValueError("plant_not_found")

    updates: dict[str, Any] = {"updated_at": utc_now_iso()}
    if "location" in payload or "location_label" in payload:
        updates["location_label"] = str(payload.get("location_label") or payload.get("location") or "greenhouse").strip() or "greenhouse"
    if "movedToGreenhouseAt" in payload or "moved_to_greenhouse_at" in payload:
        updates["moved_to_greenhouse_at"] = iso_or_none(payload.get("moved_to_greenhouse_at") or payload.get("movedToGreenhouseAt"))
    if "hasSevenInOne" in payload or "has_seven_in_one" in payload:
        updates["has_seven_in_one"] = bool(payload.get("has_seven_in_one", payload.get("hasSevenInOne", False)))
    if "wateringEnabled" in payload or "watering_enabled" in payload:
        updates["watering_enabled"] = bool(payload.get("watering_enabled", payload.get("wateringEnabled", False)))
    if "archived_at" in payload:
        updates["archived_at"] = iso_or_none(payload.get("archived_at"))

    if len(updates) == 1:
        return plant_row_payload(existing)

    allowed_columns = {
        "location_label",
        "moved_to_greenhouse_at",
        "has_seven_in_one",
        "watering_enabled",
        "archived_at",
        "updated_at",
    }
    assignments = [f"{key} = ?" for key in updates if key in allowed_columns]
    values = [updates[key] for key in updates if key in allowed_columns]
    assignments.extend(["sync_status = 'pending'", "sync_error = ''"])
    values.extend([str(existing["plant_id"])])

    with db_connection() as connection:
        connection.execute(
            f"""
            UPDATE growly_plants
            SET {", ".join(assignments)}
            WHERE plant_id = ?
            """,
            values,
        )
        if updates.get("has_seven_in_one"):
            clear_other_seven_in_one_plants(connection, username, hub_id, str(existing["plant_id"]), str(updates["updated_at"]))
        connection.commit()
    updated = local_plant_by_id(username, hub_id, str(existing["plant_id"]))
    if not updated:
        raise ValueError("plant_not_found")
    return plant_row_payload(updated)


def local_day_summary(hub_id: str) -> dict[str, dict[str, float | None]]:
    since, until = today_window_iso(hub_id)
    with db_connection() as connection:
        rows = connection.execute(
            """
            SELECT air_temperature, air_humidity, air_pressure, lux, humidity, temperature, ph,
                   conductivity, nitrogen, phosphorus, potassium, salinity, tds
            FROM sensor_samples
            WHERE hub_id = ? AND recorded_at >= ? AND recorded_at < ?
            ORDER BY recorded_at ASC
            """,
            (hub_id, since, until),
        ).fetchall()
    return day_summary_from_rows([dict(row) for row in rows])


def fetch_sensor_payload(target: str) -> dict[str, Any]:
    with urlopen(target, timeout=4) as response:
        payload = response.read().decode("utf-8")
        return json.loads(payload)


def fetch_address_matches(query: str) -> list[dict[str, Any]]:
    normalized_query = " ".join(query.strip().split())
    if len(normalized_query) < 3:
        return []
    params = urlencode({"sok": normalized_query, "treffPerSide": "5", "asciiKompatibel": "true"})
    request = UrlRequest(
        f"https://ws.geonorge.no/adresser/v1/sok?{params}",
        headers={
            "Accept": "application/json",
            "User-Agent": MET_WEATHER_USER_AGENT,
        },
        method="GET",
    )
    ssl_context = ssl.create_default_context(cafile=certifi.where()) if certifi else None
    with urlopen(request, timeout=8, context=ssl_context) as response:
        payload = response.read().decode("utf-8")
    data = json.loads(payload)
    addresses = data.get("adresser", [])
    if not isinstance(addresses, list):
        return []

    matches: list[dict[str, Any]] = []
    for address in addresses[:5]:
        if not isinstance(address, dict):
            continue
        point = address.get("representasjonspunkt")
        if not isinstance(point, dict):
            continue
        lat = point.get("lat")
        lon = point.get("lon")
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            continue
        address_text = str(address.get("adressetekst") or "").strip()
        postal_code = str(address.get("postnummer") or "").strip()
        postal_place = str(address.get("poststed") or address.get("kommunenavn") or "").strip().title()
        label_parts = [address_text]
        place_label = " ".join(part for part in (postal_code, postal_place) if part)
        if place_label:
            label_parts.append(place_label)
        matches.append(
            {
                "label": ", ".join(part for part in label_parts if part),
                "address": address_text or normalized_query,
                "postal_code": postal_code,
                "place": postal_place,
                "latitude": round(float(lat), 6),
                "longitude": round(float(lon), 6),
            }
        )
    return matches


def weather_symbol_for_timeseries(item: dict[str, Any]) -> str:
    next_1h = item.get("data", {}).get("next_1_hours", {})
    next_6h = item.get("data", {}).get("next_6_hours", {})
    summary = next_1h.get("summary") or next_6h.get("summary") or {}
    return str(summary.get("symbol_code") or "")


def fetch_met_weather_forecast(lat: float, lon: float) -> dict[str, Any]:
    params = urlencode({"lat": f"{lat:.6f}", "lon": f"{lon:.6f}"})
    request = UrlRequest(
        f"https://api.met.no/weatherapi/locationforecast/2.0/compact?{params}",
        headers={
            "Accept": "application/json",
            "User-Agent": MET_WEATHER_USER_AGENT,
        },
        method="GET",
    )
    ssl_context = ssl.create_default_context(cafile=certifi.where()) if certifi else None
    with urlopen(request, timeout=8, context=ssl_context) as response:
        payload = response.read().decode("utf-8")
    data = json.loads(payload)
    timeseries = data.get("properties", {}).get("timeseries", [])
    if not isinstance(timeseries, list):
        timeseries = []

    now = datetime.now(timezone.utc)
    upcoming: list[dict[str, Any]] = []
    daily: dict[str, list[dict[str, Any]]] = {}
    for item in timeseries:
        if not isinstance(item, dict):
            continue
        forecast_time = parse_iso_datetime(str(item.get("time") or ""))
        if not forecast_time or forecast_time < now - timedelta(hours=1):
            continue
        details = item.get("data", {}).get("instant", {}).get("details", {})
        if not isinstance(details, dict):
            continue
        next_1h_details = item.get("data", {}).get("next_1_hours", {}).get("details", {})
        if not isinstance(next_1h_details, dict):
            next_1h_details = {}
        row = {
            "time": forecast_time.isoformat(),
            "air_temperature": details.get("air_temperature"),
            "relative_humidity": details.get("relative_humidity"),
            "wind_speed": details.get("wind_speed"),
            "wind_from_direction": details.get("wind_from_direction"),
            "precipitation_amount": next_1h_details.get("precipitation_amount"),
            "symbol_code": weather_symbol_for_timeseries(item),
        }
        upcoming.append(row)
        local_day = forecast_time.astimezone(APP_TIMEZONE).date().isoformat()
        daily.setdefault(local_day, []).append(row)

    days: list[dict[str, Any]] = []
    for date_key, rows in list(daily.items())[:5]:
        temperatures = [float(row["air_temperature"]) for row in rows if isinstance(row.get("air_temperature"), (int, float))]
        humidities = [float(row["relative_humidity"]) for row in rows if isinstance(row.get("relative_humidity"), (int, float))]
        winds = [float(row["wind_speed"]) for row in rows if isinstance(row.get("wind_speed"), (int, float))]
        midday = min(
            rows,
            key=lambda row: abs(parse_iso_datetime(str(row["time"])).astimezone(APP_TIMEZONE).hour - 12)
            if parse_iso_datetime(str(row["time"]))
            else 24,
        )
        days.append(
            {
                "date": date_key,
                "temperature_min": min(temperatures) if temperatures else None,
                "temperature_max": max(temperatures) if temperatures else None,
                "humidity_avg": round(sum(humidities) / len(humidities), 1) if humidities else None,
                "wind_max": max(winds) if winds else None,
                "symbol_code": midday.get("symbol_code") or "",
            }
        )

    return {
        "updated_at": utc_now_iso(),
        "now": upcoming[0] if upcoming else None,
        "hours": upcoming[:54],
        "days": days,
    }


def weather_label_nb(symbol_code: str | None) -> str:
    code = (symbol_code or "").lower()
    if "thunder" in code:
        return "tordenvær"
    if "rain" in code or "sleet" in code:
        return "regn"
    if "snow" in code:
        return "snø"
    if "fog" in code:
        return "tåke"
    if "cloud" in code:
        return "skyet vær"
    if "partly" in code or "fair" in code:
        return "lettskyet vær"
    if "clear" in code:
        return "sol"
    return "skiftende vær"


def weather_label_en(symbol_code: str | None) -> str:
    code = (symbol_code or "").lower()
    if "thunder" in code:
        return "thunderstorms"
    if "rain" in code or "sleet" in code:
        return "rain"
    if "snow" in code:
        return "snow"
    if "fog" in code:
        return "fog"
    if "cloud" in code:
        return "cloudy weather"
    if "partly" in code or "fair" in code:
        return "partly cloudy weather"
    if "clear" in code:
        return "sun"
    return "changeable weather"


def daily_weather_report_fallback(forecast: dict[str, Any], language: str = "no") -> dict[str, Any]:
    language = app_language(language)
    now = forecast.get("now") if isinstance(forecast.get("now"), dict) else {}
    days = forecast.get("days") if isinstance(forecast.get("days"), list) else []
    today = days[0] if days and isinstance(days[0], dict) else {}
    symbol = str(now.get("symbol_code") or today.get("symbol_code") or "")
    condition = weather_label_en(symbol) if language == "en" else weather_label_nb(symbol)
    temperature = now.get("air_temperature")
    humidity = now.get("relative_humidity")
    wind = now.get("wind_speed")
    max_temp = today.get("temperature_max")

    if language == "en":
        temp_text = f"{float(temperature):.0f}°C" if isinstance(temperature, (int, float)) else "mild temperatures"
        humidity_text = f" with humidity around {float(humidity):.0f}%" if isinstance(humidity, (int, float)) else ""
        wind_text = f" Wind {float(wind):.1f} m/s." if isinstance(wind, (int, float)) else ""

        if isinstance(max_temp, (int, float)) and max_temp >= 20:
            tip = "Ventilate early and add a little shade around midday."
        elif "rain" in symbol.lower():
            tip = "Hold back outdoor watering, but check pots under cover."
        elif isinstance(wind, (int, float)) and wind >= 7:
            tip = "Secure light pots and ventilate carefully if the wind picks up."
        elif "clear" in symbol.lower() or "fair" in symbol.lower():
            tip = "Strong sun can heat the greenhouse quickly. Open before it gets too warm."
        else:
            tip = "Check soil moisture before watering, especially in small pots."

        return {
            "title": "Today's Growing Weather",
            "body": f"Today calls for {condition}, {temp_text}{humidity_text}.{wind_text}".replace("..", "."),
            "tip": tip,
        }

    temp_text = f"{float(temperature):.0f}°C" if isinstance(temperature, (int, float)) else "mild temperatur"
    humidity_text = f" og fukt rundt {float(humidity):.0f} %" if isinstance(humidity, (int, float)) else ""
    wind_text = f" Vind {float(wind):.1f} m/s." if isinstance(wind, (int, float)) else ""

    if isinstance(max_temp, (int, float)) and max_temp >= 20:
        tip = "Luft tidlig og gi litt skygge midt på dagen."
    elif "rain" in symbol.lower():
        tip = "Hold igjen vanningen ute, men sjekk potter under tak."
    elif isinstance(wind, (int, float)) and wind >= 7:
        tip = "Sikre lette potter og luft forsiktig hvis vinden tar."
    elif "clear" in symbol.lower() or "fair" in symbol.lower():
        tip = "Sterk sol kan varme drivhuset raskt. Åpne før det blir for varmt."
    else:
        tip = "Sjekk jordfukt før du vanner, særlig i små potter."

    return {
        "title": "Dagens dyrkevær",
        "body": f"I dag er det meldt {condition}, {temp_text}{humidity_text}.{wind_text}".replace("..", "."),
        "tip": tip,
    }


def ask_openai_weather_report(forecast: dict[str, Any], hub: dict[str, Any], sample: dict[str, Any] | None, plants: list[dict[str, Any]], language: str = "no") -> dict[str, Any]:
    if not OPENAI_API_KEY:
        raise ValueError("openai_key_missing")

    language = app_language(language)
    system_prompt = (
        "You are Growly's daily greenhouse report. "
        "Write in English, warm and premium, but very short. "
        "Use the weather as the main basis and sensor/plant data only as bonus context. "
        "Return only valid JSON with the fields title, body and tip. "
        "title max 4 words. body max 22 words. tip max 18 words. "
        "No markdown, no bullet list, no extra text."
    ) if language == "en" else (
        "Du er Growly sin daglige drivhusrapport. "
        "Skriv på norsk, varmt og premium, men svært kort. "
        "Bruk været som hovedgrunnlag og sensordata/plantedata kun som bonus. "
        "Returner kun gyldig JSON med feltene title, body og tip. "
        "title maks 4 ord. body maks 22 ord. tip maks 18 ord. "
        "Ingen markdown, ingen punktliste, ingen ekstra tekst."
    )

    request_payload = {
        "model": OPENAI_MODEL,
        "input": [
            {
                "role": "system",
                "content": [
                    {
                        "type": "input_text",
                        "text": system_prompt,
                    }
                ],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": json.dumps(
                            {
                                "language": "English" if language == "en" else "Norwegian",
                                "dato": datetime.now(APP_TIMEZONE).date().isoformat(),
                                "hub": {
                                    "hub_id": hub.get("hub_id"),
                                    "hub_name": hub.get("hub_name"),
                                    "hub_aktiv": bool(hub.get("is_active")),
                                    "dyrkested": hub.get("weather_address") or hub.get("location_label"),
                                },
                                "vaer": forecast,
                                "siste_sensor": sample,
                                "aktive_planter": plants[:6],
                            },
                            ensure_ascii=False,
                        ),
                    }
                ],
            },
        ],
        "max_output_tokens": 140,
    }
    request = UrlRequest(
        "https://api.openai.com/v1/responses",
        data=json.dumps(request_payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    request_ssl_context = ssl.create_default_context(cafile=certifi.where()) if certifi else None
    with urlopen(request, timeout=20, context=request_ssl_context) as response:
        response_payload = json.loads(response.read().decode("utf-8"))

    parsed = parse_ai_json_object(openai_response_text(response_payload))
    if not parsed:
        raise ValueError("empty_ai_response")
    return {
        "title": str(parsed.get("title") or ("Today's growing weather" if language == "en" else "Dagens dyrkevær")).strip()[:80],
        "body": str(parsed.get("body") or "").strip()[:240],
        "tip": str(parsed.get("tip") or "").strip()[:220],
    }


def normalize_device_base_url(target: str) -> str:
    normalized = target.strip()
    if not normalized:
        raise ValueError("missing_target")
    if "://" not in normalized:
        normalized = f"http://{normalized}"

    parsed = urlsplit(normalized)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError("invalid_target_url")

    path = parsed.path.rstrip("/")
    if path.endswith("/sensor"):
        path = path[: -len("/sensor")]
    return urlunsplit((parsed.scheme, parsed.netloc, path or "", "", ""))


def push_device_settings(target: str, payload: dict[str, Any]) -> dict[str, Any]:
    device_base = normalize_device_base_url(target)
    body = urlencode(
        {
            "sample_time_soil_ms": str(payload["sample_time_soil_ms"]),
            "sample_time_light_ms": str(payload["sample_time_light_ms"]),
            "sample_time_air_ms": str(payload["sample_time_air_ms"]),
            "sample_time_cloud_ms": str(payload["sample_time_cloud_ms"]),
        }
    ).encode("utf-8")
    request = UrlRequest(
        f"{device_base}/device-settings",
        body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urlopen(request, timeout=4) as response:
        return json.loads(response.read().decode("utf-8"))


def is_viewer_authenticated(request: Request) -> bool:
    if bool(request.session.get("viewer_authenticated")):
        return True
    username = bearer_username(request)
    return bool(username)


def is_settings_authenticated(request: Request) -> bool:
    return bool(request.session.get("settings_authenticated"))


def is_admin_authenticated(request: Request) -> bool:
    return bool(request.session.get("is_admin"))


def require_viewer_page(request: Request) -> RedirectResponse | None:
    if is_viewer_authenticated(request):
        return None
    return RedirectResponse(url="/login", status_code=303)


def require_settings_page(request: Request) -> RedirectResponse | None:
    viewer_redirect = require_viewer_page(request)
    if viewer_redirect:
        return viewer_redirect
    if is_admin_authenticated(request):
        return None
    return RedirectResponse(url="/app", status_code=303)


def require_viewer_api(request: Request) -> JSONResponse | None:
    if is_viewer_authenticated(request):
        return None
    return JSONResponse(status_code=401, content={"ok": False, "error": "login_required"})


def require_settings_api(request: Request) -> JSONResponse | None:
    viewer_error = require_viewer_api(request)
    if viewer_error:
        return viewer_error
    if is_admin_authenticated(request):
        return None
    return JSONResponse(status_code=403, content={"ok": False, "error": "admin_required"})


def bearer_username(request: Request) -> str:
    authorization = request.headers.get("authorization", "").strip()
    if not authorization.lower().startswith("bearer "):
        return ""
    username = username_from_api_token(authorization[7:].strip())
    if not username:
        return ""
    user = find_app_user(username)
    if not user or not user["is_active"]:
        return ""
    return str(user["username"])


def current_username(request: Request) -> str:
    session_username = str(request.session.get("username", "")).strip()
    if session_username:
        return session_username
    return bearer_username(request)


def resolve_request_hub(request: Request) -> dict[str, Any]:
    username = current_username(request)
    if not username:
        raise ValueError("login_required")

    requested_hub_id = str(request.query_params.get("hub_id", "")).strip()
    if is_admin_authenticated(request) and requested_hub_id:
        requested_hub = find_hub(requested_hub_id)
        if not requested_hub:
            raise ValueError("hub_not_found")
        return requested_hub

    if not is_admin_authenticated(request):
        if requested_hub_id:
            requested_hub = find_hub_for_user(username, requested_hub_id)
            if not requested_hub:
                raise ValueError("hub_not_assigned")
            return requested_hub
        accessible_hub = primary_hub_for_user(username)
        return accessible_hub or create_hub_for_user(username)

    accessible_hub = primary_hub_for_user(username)
    if accessible_hub:
        return accessible_hub

    hubs = list_hubs()
    if not hubs:
        raise ValueError("hub_not_found")
    return hubs[0]


def hub_error_response(error_code: str) -> JSONResponse:
    status_code = 401 if error_code == "login_required" else 404 if error_code in {"hub_not_found", "hub_not_assigned"} else 400
    return JSONResponse(status_code=status_code, content={"ok": False, "error": error_code})


def template_auth_context(request: Request) -> dict[str, Any]:
    try:
        current_hub = resolve_request_hub(request) if is_viewer_authenticated(request) else None
    except ValueError:
        current_hub = None
    return {
        "current_username": current_username(request),
        "current_user_is_admin": is_admin_authenticated(request),
        "settings_unlocked": is_admin_authenticated(request),
        "current_hub_id": current_hub["hub_id"] if current_hub else "",
        "current_hub_name": current_hub["hub_name"] if current_hub else "",
    }


def session_auth_payload(request: Request) -> dict[str, Any]:
    username = current_username(request)
    user = find_app_user(username) if username else None
    try:
        hub = resolve_request_hub(request) if is_viewer_authenticated(request) else None
    except ValueError:
        hub = None
    user_hubs = list_hubs_for_user(username) if username and not is_admin_authenticated(request) else []
    return {
        "authenticated": is_viewer_authenticated(request),
        "username": username,
        "is_admin": is_admin_authenticated(request),
        "settings_unlocked": is_admin_authenticated(request),
        "user": {
            "username": user["username"],
            "full_name": user["full_name"],
            "phone": user["phone"],
            "email": user["email"],
            "is_active": user["is_active"],
            "is_admin": user["is_admin"],
            "email_verified": user["email_verified"],
        } if user else None,
        "hub": hub,
        "hubs": user_hubs,
        "api_token": issue_api_token(username) if user and is_viewer_authenticated(request) and not bool(user["is_admin"]) else "",
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Growly",
    description="Minimal Growly app shell for rebuilding from scratch.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(NATIVE_APP_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    same_site=SESSION_SAME_SITE,
    https_only=SESSION_HTTPS_ONLY,
)

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
for frontend_dist_dir in FRONTEND_DIST_CANDIDATES:
    if (frontend_dist_dir / "assets").exists():
        app.mount("/assets", StaticFiles(directory=frontend_dist_dir / "assets"), name="frontend-assets")
        break
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


def app_entry_response() -> FileResponse | JSONResponse:
    for frontend_dist_dir in FRONTEND_DIST_CANDIDATES:
        frontend_index = frontend_dist_dir / "index.html"
        if frontend_index.exists():
            return FileResponse(frontend_index)
    return JSONResponse(status_code=503, content={"ok": False, "error": "frontend_not_built"})


def authenticated_entry_redirect(request: Request) -> RedirectResponse:
    if is_admin_authenticated(request):
        return RedirectResponse(url="/settings", status_code=303)
    return RedirectResponse(url="/app", status_code=303)


@app.get("/")
async def landing_page(request: Request):
    user_is_authenticated = is_viewer_authenticated(request)
    if user_is_authenticated:
        return authenticated_entry_redirect(request)
    current_hub = None
    current_pairing = None
    return templates.TemplateResponse(
        "landing.html",
        {
            "request": request,
            "user_is_authenticated": user_is_authenticated,
            "active_hub": current_hub,
            "active_pairing": current_pairing,
            "hub_count": len(list_hubs()) if user_is_authenticated and is_admin_authenticated(request) else len(list_hubs_for_user(current_username(request))),
            "user_count": len(list_app_users()) if user_is_authenticated and is_admin_authenticated(request) else 0,
            **template_auth_context(request),
        },
    )


@app.get("/login")
async def login_page(request: Request):
    if is_viewer_authenticated(request):
        return authenticated_entry_redirect(request)
    return templates.TemplateResponse(
        "login.html",
        {
            "request": request,
            "title": "Logg inn",
            "heading": "Velkommen tilbake",
            "helper_text": "Logg inn for å se sensordataene dine.",
            "action": "/login",
            "submit_label": "Logg inn",
            "error": "",
            "show_username": True,
        },
    )


@app.get("/register")
async def register_page(request: Request):
    if is_viewer_authenticated(request):
        return authenticated_entry_redirect(request)
    return templates.TemplateResponse(
        "register.html",
        {
            "request": request,
            "error": "",
            "prefill_full_name": "",
            "prefill_phone": "",
            "prefill_email": "",
            "success": "",
        },
    )


@app.post("/register")
async def register_submit(
    request: Request,
    full_name: str = Form(...),
    phone: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    password_confirm: str = Form(...),
):
    normalized_full_name = full_name.strip()
    normalized_phone = phone.strip()
    normalized_email = email.strip().lower()
    normalized_username = normalized_email
    if password != password_confirm:
        return templates.TemplateResponse(
            "register.html",
            {
                "request": request,
                "error": "Passordene er ikke like.",
                "prefill_full_name": normalized_full_name,
                "prefill_phone": normalized_phone,
                "prefill_email": normalized_email,
                "success": "",
            },
            status_code=400,
        )

    try:
        user = create_app_user(
            normalized_username,
            password,
            is_admin=False,
            assign_hub=True,
            full_name=normalized_full_name,
            phone=normalized_phone,
            email=normalized_email,
            email_verified=False,
        )
    except ValueError as exc:
        error_map = {
            "missing_username": "Skriv inn e-postadresse.",
            "username_too_short": "E-postadressen virker for kort.",
            "missing_full_name": "Skriv inn navn.",
            "full_name_too_short": "Navnet må være minst 2 tegn.",
            "missing_phone": "Skriv inn telefonnummer.",
            "phone_too_short": "Telefonnummeret virker for kort.",
            "missing_email": "Skriv inn e-postadresse.",
            "invalid_email": "Skriv inn en gyldig e-postadresse.",
            "email_exists": "Denne e-postadressen er allerede i bruk.",
            "password_too_short": "Passordet må være minst 6 tegn.",
            "user_exists": "Denne e-postadressen er allerede i bruk.",
        }
        return templates.TemplateResponse(
            "register.html",
            {
                "request": request,
                "error": error_map.get(str(exc), "Kunne ikke opprette konto akkurat nå."),
                "prefill_full_name": normalized_full_name,
                "prefill_phone": normalized_phone,
                "prefill_email": normalized_email,
                "success": "",
            },
            status_code=400,
        )

    sent = send_email_verification(user)
    return templates.TemplateResponse(
        "register.html",
        {
            "request": request,
            "error": "" if sent else "Kontoen ble opprettet, men vi klarte ikke sende bekreftelsesmail akkurat nå.",
            "prefill_full_name": "",
            "prefill_phone": "",
            "prefill_email": "",
            "success": "Kontoen er opprettet. Sjekk e-posten din og bekreft kontoen før du logger inn." if sent else "",
        },
        status_code=200 if sent else 503,
    )


@app.get("/api/auth/session")
async def auth_session(request: Request):
    return {"ok": True, "session": session_auth_payload(request)}


@app.get("/app")
async def app_entry(request: Request):
    redirect = require_viewer_page(request)
    if redirect:
        return redirect
    if is_admin_authenticated(request):
        return RedirectResponse(url="/settings", status_code=303)
    return app_entry_response()


@app.get("/app/{path:path}")
async def app_deep_link(request: Request, path: str):
    redirect = require_viewer_page(request)
    if redirect:
        return redirect
    if is_admin_authenticated(request):
        return RedirectResponse(url="/settings", status_code=303)
    return app_entry_response()


@app.get("/verify-email/{token}")
async def verify_email(token: str):
    user = mark_email_verified(token)
    if not user:
        return verification_result_page(
            "Lenken virker ikke",
            "Bekreftelseslenken er allerede brukt, utløpt, eller ikke gyldig. Prøv å logge inn eller opprett kontoen på nytt.",
        )
    send_welcome_email(user)
    return verification_result_page(
        "Kontoen er bekreftet",
        "Takk, e-postadressen din er bekreftet. Du kan nå logge inn og begynne å sette opp Growly Garden.",
        "Logg inn",
    )


@app.post("/login")
async def login_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
):
    user = find_app_user(username.strip())
    if user and user["is_active"] and verify_password(password, user["password_hash"]):
        if not bool(user["is_admin"]) and not bool(user.get("email_verified")):
            return templates.TemplateResponse(
                "login.html",
                {
                    "request": request,
                    "title": "Logg inn",
                    "heading": "Velkommen tilbake",
                    "helper_text": "Logg inn for å se sensordataene dine.",
                    "action": "/login",
                    "submit_label": "Logg inn",
                    "error": "Bekreft e-postadressen din før du logger inn.",
                    "show_username": True,
                },
                status_code=403,
            )
        request.session["viewer_authenticated"] = True
        request.session["settings_authenticated"] = False
        request.session["is_admin"] = bool(user["is_admin"])
        request.session["username"] = user["username"]
        return authenticated_entry_redirect(request)

    return templates.TemplateResponse(
        "login.html",
        {
            "request": request,
            "title": "Logg inn",
            "heading": "Velkommen tilbake",
            "helper_text": "Logg inn for å se sensordataene dine.",
            "action": "/login",
            "submit_label": "Logg inn",
            "error": "Feil brukernavn eller passord.",
            "show_username": True,
        },
        status_code=401,
    )


@app.post("/api/auth/login")
async def auth_login(request: Request, payload: dict[str, Any]):
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))
    user = find_app_user(username)
    if not user or not user["is_active"] or not verify_password(password, user["password_hash"]):
        return JSONResponse(status_code=401, content={"ok": False, "error": "invalid_credentials"})
    if bool(user["is_admin"]):
        return JSONResponse(status_code=403, content={"ok": False, "error": "admin_web_only"})
    if not bool(user.get("email_verified")):
        return JSONResponse(status_code=403, content={"ok": False, "error": "email_not_verified"})

    request.session["viewer_authenticated"] = True
    request.session["settings_authenticated"] = False
    request.session["is_admin"] = bool(user["is_admin"])
    request.session["username"] = user["username"]
    return {"ok": True, "session": session_auth_payload(request)}


@app.post("/api/auth/register")
async def auth_register(request: Request, payload: dict[str, Any]):
    full_name = str(payload.get("full_name", "")).strip()
    phone = str(payload.get("phone", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    username = email
    password = str(payload.get("password", ""))
    password_confirm = str(payload.get("password_confirm", ""))

    if password != password_confirm:
        return JSONResponse(status_code=400, content={"ok": False, "error": "password_mismatch"})

    try:
        user = create_app_user(
            username,
            password,
            is_admin=False,
            assign_hub=True,
            full_name=full_name,
            phone=phone,
            email=email,
            email_verified=False,
        )
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})

    sent = send_email_verification(user)
    if not sent:
        return JSONResponse(status_code=503, content={"ok": False, "error": "verification_email_failed"})
    return {"ok": True, "session": None, "email_verification_required": True, "email": user["email"]}


@app.get("/settings-login")
async def settings_login_page(request: Request):
    viewer_redirect = require_viewer_page(request)
    if viewer_redirect:
        return viewer_redirect
    if not is_admin_authenticated(request):
        return RedirectResponse(url="/app", status_code=303)
    if is_settings_authenticated(request):
        return RedirectResponse(url="/settings", status_code=303)
    return templates.TemplateResponse(
        "login.html",
        {
            "request": request,
            "title": "Innstillinger",
            "heading": "Lås opp innstillinger",
            "helper_text": "Skriv inn innstillingspassord for å få tilgang til endringer.",
            "action": "/settings-login",
            "submit_label": "Åpne innstillinger",
            "error": "",
            "show_username": False,
        },
    )


@app.post("/settings-login")
async def settings_login_submit(
    request: Request,
    password: str = Form(...),
):
    viewer_redirect = require_viewer_page(request)
    if viewer_redirect:
        return viewer_redirect
    if not is_admin_authenticated(request):
        return RedirectResponse(url="/app", status_code=303)

    if password == SETTINGS_PASSWORD:
        request.session["settings_authenticated"] = True
        return RedirectResponse(url="/settings", status_code=303)

    return templates.TemplateResponse(
        "login.html",
        {
            "request": request,
            "title": "Innstillinger",
            "heading": "Lås opp innstillinger",
            "helper_text": "Skriv inn innstillingspassord for å få tilgang til endringer.",
            "action": "/settings-login",
            "submit_label": "Åpne innstillinger",
            "error": "Feil innstillingspassord.",
            "show_username": False,
        },
        status_code=401,
    )


@app.post("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/login", status_code=303)


@app.get("/monitor")
async def home(request: Request):
    redirect = require_settings_page(request)
    if redirect:
        return redirect
    hub = resolve_request_hub(request)
    settings = hub_settings(hub["hub_id"])
    return templates.TemplateResponse(
        "home.html",
        {
            "request": request,
            "default_sensor_url": settings["sensor_url"],
            **template_auth_context(request),
        },
    )


@app.get("/monitor-test")
async def monitor_test(request: Request):
    redirect = require_settings_page(request)
    if redirect:
        return redirect
    hub = resolve_request_hub(request)
    settings = hub_settings(hub["hub_id"])
    return templates.TemplateResponse(
        "greenhouse_test.html",
        {
            "request": request,
            "default_sensor_url": settings["sensor_url"],
            **template_auth_context(request),
        },
    )


@app.get("/settings")
async def settings(request: Request):
    redirect = require_settings_page(request)
    if redirect:
        return redirect
    hub = resolve_request_hub(request)
    settings_payload = hub_settings(hub["hub_id"])
    return templates.TemplateResponse(
        "settings.html",
        {
            "request": request,
            "default_sensor_url": settings_payload["sensor_url"],
            "sample_settings": settings_payload,
            "active_hub": hub,
            "storage_status": storage_status(),
            **template_auth_context(request),
        },
    )


@app.get("/users")
async def users_page(request: Request):
    redirect = require_settings_page(request)
    if redirect:
        return redirect
    hub = resolve_request_hub(request)
    return templates.TemplateResponse(
        "users.html",
        {
            "request": request,
            "active_hub": hub,
            "storage_status": storage_status(),
            **template_auth_context(request),
        },
    )


@app.get("/management")
async def management(request: Request):
    return RedirectResponse(url="/settings", status_code=303)


@app.get("/drivhus-test")
async def greenhouse_test(request: Request):
    redirect = require_settings_page(request)
    if redirect:
        return redirect
    hub = resolve_request_hub(request)
    settings = hub_settings(hub["hub_id"])
    return templates.TemplateResponse(
        "greenhouse_test.html",
        {
            "request": request,
            "default_sensor_url": settings["sensor_url"],
            **template_auth_context(request),
        },
    )


@app.get("/api/sensor")
async def sensor_proxy(request: Request, target: str | None = Query(default=None)):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    try:
        hub = resolve_request_hub(request)
    except ValueError as exc:
        return hub_error_response(str(exc))
    hub_id = str(hub["hub_id"])
    configured_target = normalize_sensor_url(hub_settings(hub_id).get("sensor_url", DEFAULT_SENSOR_URL))
    tried_targets: list[str] = []
    last_error = "connection_failed"

    try:
        candidate_targets = sensor_target_candidates(hub_id, target)
    except ValueError as exc:
        return JSONResponse(
            status_code=400,
            content={"ok": False, "error": str(exc), "target": str(target or "").strip()},
        )

    for candidate_target in candidate_targets:
        tried_targets.append(candidate_target)
        try:
            data = fetch_sensor_payload(candidate_target)
        except HTTPError as exc:
            last_error = f"sensor_http_{exc.code}"
            continue
        except URLError as exc:
            reason = getattr(exc, "reason", "connection_failed")
            last_error = str(reason)
            continue
        except json.JSONDecodeError:
            last_error = "invalid_sensor_json"
            continue

        if target is None and candidate_target != configured_target:
            save_hub_settings(hub_id, {"sensor_url": candidate_target})

        stored = store_sensor_sample({**data, "source": candidate_target}, hub_id)
        return {
            "ok": True,
            "hub_id": hub_id,
            "target": candidate_target,
            "configured_target": configured_target,
            "sensor": data,
            "stored": stored,
        }

    return JSONResponse(
        status_code=502,
        content={
            "ok": False,
            "error": last_error,
            "target": tried_targets[0] if tried_targets else configured_target,
            "configured_target": configured_target,
            "targets_tried": tried_targets,
        },
    )


@app.post("/api/sensor/ingest")
async def sensor_ingest(request: Request, payload: dict[str, Any]):
    hub_id = str(payload.get("hub_id") or request.headers.get("X-Growly-Hub-Id") or "").strip()
    if not hub_id:
        return JSONResponse(status_code=400, content={"ok": False, "error": "missing_hub_id"})
    try:
        ensure_device_hub(hub_id)
    except ValueError as exc:
        return JSONResponse(status_code=404, content={"ok": False, "error": str(exc)})
    stored = store_sensor_sample({**payload, "source": payload.get("source") or "growly_backend_ingest"}, hub_id)
    return {"ok": True, "hub_id": hub_id, "stored": stored}


@app.get("/api/history")
async def history(
    request: Request,
    metric: str,
    span: str = Query(default="hours"),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    limit: int = Query(default=240, ge=10, le=2000),
):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    try:
        hub = resolve_request_hub(request)
    except ValueError as exc:
        return hub_error_response(str(exc))
    hub_id = str(hub["hub_id"])
    source = "local"
    fallback_reason: str | None = None
    try:
        if supabase_enabled():
            history_rows = supabase_metric_history_by_span(hub_id, metric, span, limit, date_from=date_from, date_to=date_to)
            source = "supabase"
        else:
            history_rows = metric_history_by_span(hub_id, metric, span, limit, date_from=date_from, date_to=date_to)
    except ValueError:
        return JSONResponse(
            status_code=400,
            content={"ok": False, "error": "unsupported_history_request", "metric": metric, "span": span},
        )
    except (HTTPError, URLError, json.JSONDecodeError) as exc:
        history_rows = metric_history_by_span(hub_id, metric, span, limit, date_from=date_from, date_to=date_to)
        source = "local_fallback"
        fallback_reason = str(exc)

    return {
        "ok": True,
        "hub_id": hub_id,
        "metric": metric,
        "span": span,
        "date_from": date_from,
        "date_to": date_to,
        "source": source,
        "fallback_reason": fallback_reason,
        "points": history_rows,
    }


@app.get("/api/history-start")
async def history_start(request: Request, metric: str):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    try:
        hub = resolve_request_hub(request)
    except ValueError as exc:
        return hub_error_response(str(exc))
    hub_id = str(hub["hub_id"])
    source = "local"
    fallback_reason: str | None = None
    try:
        if supabase_enabled():
            recorded_at = supabase_metric_first_recorded_at(hub_id, metric)
            source = "supabase"
        else:
            recorded_at = local_metric_first_recorded_at(hub_id, metric)
    except ValueError:
        return JSONResponse(
            status_code=400,
            content={"ok": False, "error": "unsupported_metric", "metric": metric},
        )
    except (HTTPError, URLError, json.JSONDecodeError) as exc:
        recorded_at = local_metric_first_recorded_at(hub_id, metric)
        source = "local_fallback"
        fallback_reason = str(exc)

    return {
        "ok": True,
        "hub_id": hub_id,
        "metric": metric,
        "source": source,
        "fallback_reason": fallback_reason,
        "recorded_at": recorded_at,
    }


@app.get("/api/latest")
async def latest(request: Request):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    try:
        hub = resolve_request_hub(request)
    except ValueError as exc:
        return hub_error_response(str(exc))
    hub_id = str(hub["hub_id"])
    source = "local"
    fallback_reason: str | None = None
    try:
        if supabase_enabled():
            sample = supabase_latest_sample(hub_id)
            source = "supabase"
        else:
            sample = latest_sample(hub_id)
    except (HTTPError, URLError, json.JSONDecodeError) as exc:
        sample = latest_sample(hub_id)
        source = "local_fallback"
        fallback_reason = str(exc)
    return {"ok": True, "hub_id": hub_id, "sample": sample, "source": source, "fallback_reason": fallback_reason}


@app.get("/api/day-summary")
async def day_summary(request: Request):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    try:
        hub = resolve_request_hub(request)
    except ValueError as exc:
        return hub_error_response(str(exc))
    hub_id = str(hub["hub_id"])
    source = "local"
    fallback_reason: str | None = None
    try:
        if supabase_enabled():
            summary = supabase_day_summary(hub_id)
            source = "supabase"
        else:
            summary = local_day_summary(hub_id)
    except (HTTPError, URLError, json.JSONDecodeError) as exc:
        summary = local_day_summary(hub_id)
        source = "local_fallback"
        fallback_reason = str(exc)
    return {"ok": True, "hub_id": hub_id, "summary": summary, "source": source, "fallback_reason": fallback_reason}


@app.post("/api/ai/assistant")
async def ai_assistant(request: Request, payload: dict[str, Any]):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    language = app_language(payload.get("language"))
    question = str(payload.get("question") or "").strip()
    if len(question) > 900:
        return JSONResponse(status_code=400, content={"ok": False, "error": "question_too_long"})
    if not OPENAI_API_KEY:
        return JSONResponse(status_code=503, content={"ok": False, "error": "openai_key_missing"})
    try:
        image = clean_ai_image_payload(payload.get("image"))
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    if not question and not image:
        return JSONResponse(status_code=400, content={"ok": False, "error": "missing_question"})
    if not question and image:
        question = "Look at the plant photo and give short, safe advice." if language == "en" else "Se på plantebildet og gi korte, trygge råd."

    try:
        hub = resolve_request_hub(request)
    except ValueError as exc:
        return hub_error_response(str(exc))

    hub_id = str(hub["hub_id"])
    sensors_available = bool(hub.get("is_active"))
    latest_sample = ai_sample_context(hub_id) if sensors_available else None
    context = {
        "language": "English" if language == "en" else "Norwegian",
        "dato": datetime.now(ZoneInfo("Europe/Oslo")).date().isoformat(),
        "hub": {
            "hub_id": hub_id,
            "hub_name": hub.get("hub_name"),
            "online": sensors_available,
        },
        "sensors_available": sensors_available,
        "sensorer_tilgjengelig": sensors_available,
        "latest_measurement": latest_sample,
        "siste_maling": latest_sample,
        "plantekartotek_utdrag": ai_plant_context(language=language),
        "bruker_merknad": payload.get("context") if isinstance(payload.get("context"), dict) else {},
    }

    try:
        answer = ask_openai_growly(question, context, image, language)
    except HTTPError as exc:
        return JSONResponse(status_code=502, content={"ok": False, "error": f"openai_http_{exc.code}"})
    except (URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
        return JSONResponse(status_code=502, content={"ok": False, "error": str(exc) or "ai_unavailable"})

    return {"ok": True, "answer": answer, "model": OPENAI_MODEL}


@app.post("/api/customer-messages")
async def submit_customer_message(request: Request, payload: dict[str, Any]):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    if is_admin_authenticated(request):
        return JSONResponse(status_code=403, content={"ok": False, "error": "customer_required"})

    hub_id = ""
    try:
        hub = resolve_request_hub(request)
        hub_id = str(hub["hub_id"])
    except ValueError as exc:
        if str(exc) not in {"hub_not_assigned", "hub_not_found"}:
            return hub_error_response(str(exc))

    try:
        message = create_customer_message(current_username(request), hub_id, payload)
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    return {"ok": True, "message": message}


@app.get("/api/plant-profiles")
async def plant_profiles(request: Request, q: str = ""):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    return {"ok": True, "profiles": list_plant_profiles(q)}


@app.get("/api/plant-catalog")
async def plant_catalog(request: Request, q: str = "", lang: str = "no"):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    return {"ok": True, "items": list_plant_catalog(q, app_language(lang))}


@app.get("/api/plants")
async def get_plants(request: Request, background_tasks: BackgroundTasks, archived: bool = Query(False)):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    try:
        hub = resolve_request_hub(request)
    except ValueError as exc:
        return hub_error_response(str(exc))
    username = current_username(request)
    hub_id = str(hub["hub_id"])
    plants = list_user_plants(username, hub_id, include_archived=archived, archived_only=archived)
    if supabase_enabled():
        if not plants:
            best_effort_sync_user_plants(username, hub_id)
            plants = list_user_plants(username, hub_id, include_archived=archived, archived_only=archived)
        else:
            background_tasks.add_task(best_effort_sync_user_plants, username, hub_id)
    return {"ok": True, "plants": plants}


@app.post("/api/plants")
async def add_plant(request: Request, background_tasks: BackgroundTasks, payload: dict[str, Any]):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    try:
        hub = resolve_request_hub(request)
        username = current_username(request)
        hub_id = str(hub["hub_id"])
        plant = create_user_plant(username, hub_id, payload)
        background_tasks.add_task(best_effort_sync_user_plants, username, hub_id)
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    return {"ok": True, "plant": plant}


@app.patch("/api/plants/{plant_id}")
async def edit_plant(request: Request, plant_id: str, background_tasks: BackgroundTasks, payload: dict[str, Any]):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    try:
        hub = resolve_request_hub(request)
        username = current_username(request)
        hub_id = str(hub["hub_id"])
        plant = update_user_plant(username, hub_id, plant_id, payload)
        background_tasks.add_task(best_effort_sync_user_plants, username, hub_id)
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    return {"ok": True, "plant": plant}


@app.delete("/api/plants/{plant_id}")
async def archive_plant_api(request: Request, plant_id: str, background_tasks: BackgroundTasks):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    try:
        hub = resolve_request_hub(request)
        username = current_username(request)
        hub_id = str(hub["hub_id"])
        plant = update_user_plant(
            username,
            hub_id,
            plant_id,
            {"archived_at": utc_now_iso()},
        )
        background_tasks.add_task(best_effort_sync_user_plants, username, hub_id)
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    return {"ok": True, "plant": plant}


@app.get("/api/settings")
async def get_settings(request: Request):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    try:
        hub = resolve_request_hub(request)
    except ValueError as exc:
        return hub_error_response(str(exc))
    return {"ok": True, "settings": hub_settings(str(hub["hub_id"]))}


@app.patch("/api/settings")
async def patch_settings(request: Request, payload: dict[str, Any]):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    try:
        hub = resolve_request_hub(request)
        settings = save_hub_settings(str(hub["hub_id"]), payload)
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    return {"ok": True, "settings": settings}


@app.patch("/api/profile")
async def patch_profile(request: Request, payload: dict[str, Any]):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    username = current_username(request)
    if not username:
        return JSONResponse(status_code=401, content={"ok": False, "error": "login_required"})
    password = payload.get("password")
    try:
        user = update_app_user(
            username,
            password=None if password in (None, "") else str(password),
            full_name=None if payload.get("full_name") in (None, "") else str(payload.get("full_name")),
            phone=None if payload.get("phone") in (None, "") else str(payload.get("phone")),
            email=None if payload.get("email") in (None, "") else str(payload.get("email")),
        )
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    return {"ok": True, "user": user, "session": session_auth_payload(request)}


@app.get("/api/weather/address-search")
async def weather_address_search(request: Request, q: str = Query("", min_length=0)):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    if len(q.strip()) < 3:
        return {"ok": True, "matches": []}
    try:
        matches = fetch_address_matches(q)
    except HTTPError as exc:
        return JSONResponse(status_code=502, content={"ok": False, "error": f"address_http_{exc.code}"})
    except (URLError, TimeoutError, OSError, json.JSONDecodeError, ValueError) as exc:
        return JSONResponse(status_code=502, content={"ok": False, "error": str(exc) or "address_lookup_unavailable"})
    return {"ok": True, "matches": matches}


@app.get("/api/weather")
async def weather_forecast(request: Request):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    try:
        hub = resolve_request_hub(request)
    except ValueError as exc:
        return hub_error_response(str(exc))
    settings = hub_settings(str(hub["hub_id"]))
    lat = settings.get("weather_latitude")
    lon = settings.get("weather_longitude")
    if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        return JSONResponse(status_code=400, content={"ok": False, "error": "weather_location_missing"})
    try:
        forecast = fetch_met_weather_forecast(float(lat), float(lon))
    except HTTPError as exc:
        return JSONResponse(status_code=502, content={"ok": False, "error": f"weather_http_{exc.code}"})
    except (URLError, TimeoutError, OSError, json.JSONDecodeError, ValueError) as exc:
        return JSONResponse(status_code=502, content={"ok": False, "error": str(exc) or "weather_unavailable"})
    return {
        "ok": True,
        "hub_id": settings["hub_id"],
        "location": {
            "address": settings.get("weather_address") or settings.get("location_label") or settings.get("hub_name") or "",
            "latitude": lat,
            "longitude": lon,
        },
        "forecast": forecast,
    }


@app.get("/api/weather/daily-report")
async def weather_daily_report(request: Request, lang: str = "no"):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    language = app_language(lang)
    try:
        hub = resolve_request_hub(request)
    except ValueError as exc:
        return hub_error_response(str(exc))
    settings = hub_settings(str(hub["hub_id"]))
    lat = settings.get("weather_latitude")
    lon = settings.get("weather_longitude")
    if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        return JSONResponse(status_code=400, content={"ok": False, "error": "weather_location_missing"})

    try:
        forecast = fetch_met_weather_forecast(float(lat), float(lon))
    except HTTPError as exc:
        return JSONResponse(status_code=502, content={"ok": False, "error": f"weather_http_{exc.code}"})
    except (URLError, TimeoutError, OSError, json.JSONDecodeError, ValueError) as exc:
        return JSONResponse(status_code=502, content={"ok": False, "error": str(exc) or "weather_unavailable"})

    today_key = datetime.now(APP_TIMEZONE).date().isoformat()
    cache_key = f"{settings['hub_id']}:{today_key}:{language}"
    cached = WEATHER_REPORT_CACHE.get(cache_key)
    if cached:
        return {"ok": True, **cached}

    sample = ai_sample_context(str(hub["hub_id"]))
    try:
        plants = list_user_plants(current_username(request), str(hub["hub_id"]), include_archived=False, archived_only=False)
    except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError, ValueError):
        plants = []

    source = "ai"
    try:
        report = ask_openai_weather_report(
            forecast,
            {**hub, **settings},
            sample if isinstance(sample, dict) else None,
            plants,
            language,
        )
        if not report.get("body") or not report.get("tip"):
            raise ValueError("empty_ai_response")
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, ValueError):
        report = daily_weather_report_fallback(forecast, language)
        source = "local_fallback"

    payload = {
        "hub_id": settings["hub_id"],
        "source": source,
        "generated_at": utc_now_iso(),
        "report": report,
    }
    WEATHER_REPORT_CACHE[cache_key] = payload
    return {"ok": True, **payload}


@app.get("/api/users")
async def get_users(request: Request):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    return {"ok": True, "users": list_app_users()}


@app.get("/api/customer-messages")
async def get_customer_messages(request: Request):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    try:
        messages = list_customer_messages(status=request.query_params.get("status", ""))
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    return {"ok": True, "messages": messages}


@app.get("/api/users/{username}/customer-messages")
async def get_user_customer_messages(request: Request, username: str):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    if not find_app_user(username):
        return JSONResponse(status_code=404, content={"ok": False, "error": "user_not_found"})
    return {"ok": True, "messages": list_customer_messages(username, status="active")}


@app.patch("/api/customer-messages/{message_id}")
async def edit_customer_message(request: Request, message_id: int, payload: dict[str, Any]):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    try:
        message = update_customer_message_status(message_id, str(payload.get("status") or ""))
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    return {"ok": True, "message": message}


@app.delete("/api/customer-messages/{message_id}")
async def remove_customer_message(request: Request, message_id: int):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    try:
        message = delete_customer_message(message_id)
    except ValueError as exc:
        return JSONResponse(status_code=404, content={"ok": False, "error": str(exc)})
    return {"ok": True, "message": message}


@app.get("/api/hubs")
async def get_hubs(request: Request):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    if is_admin_authenticated(request):
        hubs = list_hubs()
    else:
        hubs = list_hubs_for_user(current_username(request))
    return {"ok": True, "hubs": hubs}


@app.get("/api/supabase/status")
async def get_supabase_status(request: Request):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    return {"ok": True, "status": supabase_core_readiness()}


@app.post("/api/supabase/sync-core")
async def sync_supabase_core(request: Request):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    try:
        result = sync_core_to_supabase()
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        return JSONResponse(status_code=400, content={"ok": False, "error": body or f"http_{exc.code}"})
    except (URLError, TimeoutError, OSError, json.JSONDecodeError, ValueError) as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    status_code = 200 if result.get("ok") else 400
    return JSONResponse(status_code=status_code, content=result)


@app.post("/api/hubs/{hub_id}/transfer-owner")
async def transfer_hub_owner_api(request: Request, hub_id: str, payload: dict[str, Any]):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    target_username = str(payload.get("username", "")).strip()
    replace_existing = bool(payload.get("replace_existing", False))
    if not target_username:
        return JSONResponse(status_code=400, content={"ok": False, "error": "missing_username"})
    try:
        hub = transfer_hub_owner(hub_id, target_username, replace_existing)
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    return {"ok": True, "hub": hub, "hubs": list_hubs(), "users": list_app_users()}


@app.delete("/api/hubs/{hub_id}")
async def delete_hub_api(request: Request, hub_id: str):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    try:
        delete_hub(hub_id)
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    return {"ok": True, "hubs": list_hubs(), "users": list_app_users()}


@app.post("/api/hubs/pairing-token")
async def create_hub_pairing_token(request: Request, payload: dict[str, Any] | None = None):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error

    payload = payload or {}
    target_username = current_username(request)
    if is_admin_authenticated(request):
        requested_username = str(payload.get("username", "")).strip()
        if requested_username:
            target_username = requested_username

    try:
        pairing = create_pairing_token(target_username)
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})

    return {"ok": True, "pairing": pairing}


@app.get("/api/hubs/pairing-token")
async def get_hub_pairing_token(request: Request):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error

    target_username = current_username(request)
    pairing = active_pairing_for_user(target_username)
    return {"ok": True, "pairing": pairing}


@app.post("/api/hubs/pair")
async def pair_hub(payload: dict[str, Any]):
    token = str(payload.get("pairing_token", "")).strip().upper()
    sensor_url = payload.get("sensor_url")
    local_ip = payload.get("local_ip")
    hub_id = str(payload.get("hub_id", "")).strip()

    if not token:
        return JSONResponse(status_code=400, content={"ok": False, "error": "missing_pairing_token"})

    try:
        hub = complete_pairing_token(
            token,
            None if sensor_url in (None, "") else str(sensor_url),
            None if local_ip in (None, "") else str(local_ip),
            None if not hub_id else hub_id,
        )
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})

    return {"ok": True, "hub": hub}


@app.get("/api/device/config")
async def get_device_config(hub_id: str = Query(""), version: str = Query("")):
    hub_id = hub_id.strip()
    if not hub_id:
        return JSONResponse(status_code=400, content={"ok": False, "error": "missing_hub_id"})
    try:
        ensure_device_hub(hub_id)
        return device_config_response(hub_id, version)
    except ValueError as exc:
        return JSONResponse(status_code=404, content={"ok": False, "error": str(exc)})


@app.post("/api/device/status")
async def update_device_status(payload: dict[str, Any]):
    hub_id = str(payload.get("hub_id", "")).strip()
    if not hub_id:
        return JSONResponse(status_code=400, content={"ok": False, "error": "missing_hub_id"})
    try:
        ensure_device_hub(hub_id, str(payload.get("local_ip") or ""))
    except ValueError as exc:
        return JSONResponse(status_code=404, content={"ok": False, "error": str(exc)})

    settings = update_hub_device_status(hub_id, payload)
    return {"ok": True, "server_time": utc_now_iso(), "settings": settings}


@app.post("/api/users")
async def add_user(request: Request, payload: dict[str, Any]):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    try:
        user = create_app_user(
            str(payload.get("username", "")),
            str(payload.get("password", "")),
            bool(payload.get("is_admin", False)),
            False,
            str(payload.get("full_name", payload.get("username", ""))),
            str(payload.get("phone", "")),
            str(payload.get("email", f"{str(payload.get('username', '')).strip().lower()}@growly.local")),
        )
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    return {"ok": True, "user": user, "users": list_app_users()}


@app.patch("/api/users/{username}")
async def edit_user(request: Request, username: str, payload: dict[str, Any]):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    password = payload.get("password")
    is_active = payload.get("is_active")
    is_admin = payload.get("is_admin")
    try:
        user = update_app_user(
            username,
            password=None if password in (None, "") else str(password),
            is_active=is_active if isinstance(is_active, bool) else None,
            is_admin=is_admin if isinstance(is_admin, bool) else None,
            full_name=None if payload.get("full_name") in (None, "") else str(payload.get("full_name")),
            phone=None if payload.get("phone") in (None, "") else str(payload.get("phone")),
            email=None if payload.get("email") in (None, "") else str(payload.get("email")),
        )
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    return {"ok": True, "user": user, "users": list_app_users()}


@app.post("/api/users/{username}/reset-password")
async def reset_user_password(request: Request, username: str):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    try:
        temporary_password = reset_app_user_password(username)
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    return {"ok": True, "password": temporary_password, "users": list_app_users()}


@app.delete("/api/users/{username}")
async def remove_user(request: Request, username: str):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    try:
        delete_app_user(username, current_username(request))
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    return {"ok": True, "users": list_app_users()}


@app.post("/api/settings")
async def update_settings(request: Request, payload: dict[str, Any]):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    try:
        hub = resolve_request_hub(request)
    except ValueError as exc:
        return hub_error_response(str(exc))
    settings = save_hub_settings(str(hub["hub_id"]), payload)
    return {"ok": True, "settings": settings}


@app.post("/api/device-settings")
async def update_device_settings(request: Request, payload: dict[str, Any]):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    try:
        hub = resolve_request_hub(request)
    except ValueError as exc:
        return hub_error_response(str(exc))
    target = str(payload.get("target", "")).strip()
    settings_payload = save_hub_settings(str(hub["hub_id"]), payload)
    if not target:
        return {
            "ok": True,
            "settings": settings_payload,
            "device_ok": False,
            "device_error": "missing_target",
            "target": "",
        }

    try:
        device_response = push_device_settings(target, settings_payload)
    except ValueError as exc:
        return {
            "ok": True,
            "settings": settings_payload,
            "device_ok": False,
            "device_error": str(exc),
            "target": target,
        }
    except HTTPError as exc:
        return {
            "ok": True,
            "settings": settings_payload,
            "device_ok": False,
            "device_error": f"device_http_{exc.code}",
            "target": target,
        }
    except URLError as exc:
        reason = getattr(exc, "reason", "device_connection_failed")
        return {
            "ok": True,
            "settings": settings_payload,
            "device_ok": False,
            "device_error": str(reason),
            "target": target,
        }
    except json.JSONDecodeError:
        return {
            "ok": True,
            "settings": settings_payload,
            "device_ok": False,
            "device_error": "invalid_device_settings_json",
            "target": target,
        }

    return {
        "ok": True,
        "settings": settings_payload,
        "device_ok": True,
        "device": device_response,
        "target": target,
    }
