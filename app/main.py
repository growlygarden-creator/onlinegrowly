from contextlib import asynccontextmanager
import base64
import csv
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import shutil
import ssl
import sqlite3
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request as UrlRequest, urlopen
from zoneinfo import ZoneInfo

from fastapi import FastAPI, Form, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
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
DEFAULT_SENSOR_URL = "http://192.168.0.133/sensor"
APP_USERNAME = os.getenv("APP_USERNAME", "growly")
APP_PASSWORD = os.getenv("APP_PASSWORD", "growly-view")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "Growly@Admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", APP_PASSWORD)
ACTIVE_FIRMWARE_VERSION = os.getenv("ACTIVE_FIRMWARE_VERSION", "").strip()
ACTIVE_FIRMWARE_URL = os.getenv("ACTIVE_FIRMWARE_URL", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4-mini").strip()
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


def seed_guide_for_profile(profile_id: str, category: str, family: str) -> dict[str, str]:
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
        return guides[profile_id]
    if "varmeelskende" in family:
        return {
            "sow": "Så inne i mars-april.",
            "start": "Forkultiveres inne med varme og godt lys.",
            "repot": "Pottes om når røttene fyller potten.",
            "plant_out": "Flyttes til drivhus fra mai-juni.",
            "harvest": "Høstes når frukt eller blader er modne.",
        }
    if "rot" in family or "knoll" in family:
        return {
            "sow": "Så direkte fra april-juni.",
            "start": "Forkultivering er sjelden nødvendig.",
            "repot": "Unngå mye ompotting, røtter liker ro.",
            "plant_out": "Dyrkes direkte i dyp og løs jord.",
            "harvest": "Høstes når røttene har ønsket størrelse.",
        }
    if "blad" in family or "kål" in family or category == "grønnsak":
        return {
            "sow": "Så inne eller direkte fra mars-juli.",
            "start": "Kan forkultiveres for jevnere start.",
            "repot": "Pottes/plantes om når småplantene er robuste.",
            "plant_out": "Trives best i kjølig til mildt drivhusklima.",
            "harvest": "Høstes fortløpende eller når hodet er utviklet.",
        }
    if category == "urt":
        return {
            "sow": "Så inne fra mars-mai.",
            "start": "Startes lyst og jevnt fuktig.",
            "repot": "Pottes om når planten har god rotklump.",
            "plant_out": "Kan stå i drivhus, potte eller varm krok.",
            "harvest": "Høstes jevnlig ved å klippe skudd/topper.",
        }
    if category in {"blomst", "bær", "frukt"}:
        return {
            "sow": "Start inne vår eller plant som småplante etter behov.",
            "start": "Gi lys, moderat varme og jevn fukt.",
            "repot": "Pottes om når røttene fyller potten.",
            "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
            "harvest": "Følg blomstring/fruktsetting gjennom sesongen.",
        }
    return {
        "sow": "Såtid avhenger av sort og dyrkingsmål.",
        "start": "Start lyst, jevnt fuktig og uten temperatursjokk.",
        "repot": "Pottes om når røttene fyller potten.",
        "plant_out": "Flyttes videre når planten er robust.",
        "harvest": "Følg utviklingen gjennom sesongen.",
    }


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


def db_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def ensure_data_dir() -> None:
    global DATA_DIR, DB_PATH
    try:
        PREFERRED_DATA_DIR.mkdir(parents=True, exist_ok=True)
        DATA_DIR = PREFERRED_DATA_DIR
    except PermissionError:
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
    preferred_is_mount = DATA_DIR.exists() and os.path.ismount(DATA_DIR)
    persistent = DATA_DIR == PREFERRED_DATA_DIR and (not render_runtime or preferred_is_mount)
    if persistent:
        message = "Brukere og innstillinger lagres varig."
    elif render_runtime and DATA_DIR == PREFERRED_DATA_DIR and not preferred_is_mount:
        message = (
            "Render kjører uten mountet persistent disk på denne stien. "
            "Brukere og innstillinger kan nullstilles ved deploy eller restart."
        )
    else:
        message = "Appen bruker midlertidig lagring nå. Brukere og innstillinger kan forsvinne ved deploy eller restart."
    return {
        "persistent": persistent,
        "active_path": active_path,
        "preferred_path": preferred_path,
        "preferred_is_mount": preferred_is_mount,
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
                owner_username TEXT UNIQUE NOT NULL,
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
        existing_hub_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(hubs)").fetchall()
        }
        if "local_ip" not in existing_hub_columns:
            connection.execute("ALTER TABLE hubs ADD COLUMN local_ip TEXT NOT NULL DEFAULT ''")
        hub_column_defaults = {
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
                INSERT INTO app_users (username, password_hash, is_active, is_admin, created_at, updated_at)
                VALUES (?, ?, 1, 1, ?, ?)
                """,
                (ADMIN_USERNAME, hash_password(ADMIN_PASSWORD), now, now),
            )
        else:
            connection.execute(
                """
                UPDATE app_users
                SET is_active = 1, is_admin = 1, updated_at = ?
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
                    SET is_active = 1, is_admin = 0, updated_at = ?
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
                INSERT INTO app_users (username, password_hash, is_active, is_admin, created_at, updated_at)
                VALUES (?, ?, 1, 0, ?, ?)
                """,
                (DEFAULT_VIEWER_USERNAME, hash_password(DEFAULT_VIEWER_PASSWORD), now, now),
            )
        else:
            connection.execute(
                """
                UPDATE app_users
                SET is_active = 1, is_admin = 0, updated_at = ?
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
            SELECT hub_id, hub_name, owner_username, is_active, sensor_url, local_ip,
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
            SELECT hub_id, hub_name, owner_username, is_active, sensor_url, local_ip,
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
            SELECT hub_id, hub_name, owner_username, is_active, sensor_url, local_ip,
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


def list_plant_catalog(query: str = "") -> list[dict[str, Any]]:
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
        item = {
            "id": profile["profile_id"],
            "kind": "base",
            "profile_id": profile["profile_id"],
            "variant_id": None,
            "cultivar_id": None,
            "name": profile["name"],
            "display_name": profile["name"],
            "subtitle": profile["family"],
            "family": profile["family"],
            "icon": profile["icon"],
            "tone": profile["tone"],
            "ranges": profile["ranges"],
            "notes": profile.get("climate_note") or profile.get("watering_short") or "",
            "watering": profile.get("watering_short") or "",
            "seed_guide": seed_guide_for_profile(str(profile["profile_id"]), str(profile.get("category") or ""), str(profile.get("family") or "")),
            "category": profile.get("category") or "",
            "latin_name": profile.get("latin_name") or "",
        }
        if matches(item):
            items.append(item)

    for variant in variants.values():
        base = profiles.get(str(variant["base_plant_id"]))
        if not base:
            continue
        item = {
            "id": variant["variant_id"],
            "kind": "variant",
            "profile_id": base["profile_id"],
            "variant_id": variant["variant_id"],
            "cultivar_id": None,
            "name": variant["norsk_navn"],
            "display_name": variant["norsk_navn"],
            "subtitle": f"{base['name']} · {variant['variant_type']}",
            "family": base["family"],
            "icon": base["icon"],
            "tone": base["tone"],
            "ranges": adjusted_ranges(base["ranges"], variant),
            "notes": variant.get("notes") or "",
            "watering": base.get("watering_short") or "",
            "seed_guide": seed_guide_for_profile(str(base["profile_id"]), str(base.get("category") or ""), str(base.get("family") or "")),
            "category": base.get("category") or "",
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
        item = {
            "id": cultivar_item["cultivar_id"],
            "kind": "cultivar",
            "profile_id": base["profile_id"],
            "variant_id": cultivar_item["variant_id"],
            "cultivar_id": cultivar_item["cultivar_id"],
            "name": cultivar_item["norsk_navn"],
            "display_name": cultivar_item["norsk_navn"],
            "subtitle": f"{base['name']} · {variant['norsk_navn'] if variant else cultivar_item['cultivar_name']}",
            "family": base["family"],
            "icon": base["icon"],
            "tone": base["tone"],
            "ranges": adjusted_ranges(base["ranges"], variant),
            "notes": cultivar_item.get("notes") or (variant.get("notes") if variant else ""),
            "watering": base.get("watering_short") or "",
            "seed_guide": seed_guide_for_profile(str(base["profile_id"]), str(base.get("category") or ""), str(base.get("family") or "")),
            "category": base.get("category") or "",
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
    return pairing or {}


def complete_pairing_token(
    token: str,
    sensor_url: str | None = None,
    local_ip: str | None = None,
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
    existing_hub = find_hub_by_owner(target_username)

    with db_connection() as connection:
        if existing_hub:
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
        connection.execute(
            """
            UPDATE pairing_tokens
            SET used_at = ?, paired_hub_id = ?
            WHERE token = ?
            """,
            (now, hub_id, pairing["token"]),
        )
        connection.commit()

    return find_hub(hub_id) or {}


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
        connection.commit()
    return find_hub(hub_id) or {}


def ensure_device_hub(hub_id: str, local_ip: str | None = None) -> dict[str, Any]:
    hub_id = hub_id.strip()
    existing_hub = find_hub(hub_id)
    if existing_hub:
        return existing_hub
    if not is_valid_hub_id(hub_id):
        raise ValueError("hub_not_found")

    now = utc_now_iso()
    global_settings = global_app_settings()
    clean_ip = str(local_ip or "").strip()
    with db_connection() as connection:
        owner_username = default_hub_owner_username(connection)
        owner_hub = connection.execute(
            """
            SELECT hub_id
            FROM hubs
            WHERE owner_username = ?
            LIMIT 1
            """,
            (owner_username,),
        ).fetchone()
        if owner_hub:
            connection.execute(
                """
                UPDATE hubs
                SET hub_id = ?,
                    hub_name = ?,
                    is_active = 1,
                    local_ip = ?,
                    sample_time_soil_ms = ?,
                    sample_time_light_ms = ?,
                    sample_time_air_ms = ?,
                    sample_time_cloud_ms = ?,
                    config_updated_at = ?,
                    device_status_at = ?,
                    device_status_message = ?,
                    updated_at = ?
                WHERE owner_username = ?
                """,
                (
                    hub_id,
                    owner_username,
                    clean_ip,
                    global_settings["sample_time_soil_ms"],
                    global_settings["sample_time_light_ms"],
                    global_settings["sample_time_air_ms"],
                    global_settings["sample_time_cloud_ms"],
                    now,
                    now,
                    "Gjenopprettet fra fysisk hub",
                    now,
                    owner_username,
                ),
            )
            connection.commit()
            return find_hub(hub_id) or {}

        connection.execute(
            """
            INSERT INTO hubs (
                hub_id, hub_name, owner_username, is_active, sensor_url, local_ip,
                sample_time_soil_ms, sample_time_light_ms, sample_time_air_ms,
                sample_time_cloud_ms, history_start_at, config_revision,
                config_updated_at, device_status_at, device_status_message,
                created_at, updated_at
            ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
            """,
            (
                hub_id,
                owner_username,
                owner_username,
                global_settings["sensor_url"],
                clean_ip,
                global_settings["sample_time_soil_ms"],
                global_settings["sample_time_light_ms"],
                global_settings["sample_time_air_ms"],
                global_settings["sample_time_cloud_ms"],
                global_settings["history_start_at"],
                now,
                now,
                "Gjenopprettet fra fysisk hub",
                now,
                now,
            ),
        )
        connection.commit()

    return find_hub(hub_id) or {}


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
                sensor_url = ?,
                local_ip = ?,
                history_start_at = ?,
                config_updated_at = ?,
                updated_at = ?
            WHERE hub_id = ?
            """,
            (
                updated["hub_name"],
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

    return hub_settings(hub_id)


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
    return hub_settings(hub_id)


def device_config_response(hub_id: str, current_version: str = "") -> dict[str, Any]:
    settings = hub_settings(hub_id)
    latest_version = ACTIVE_FIRMWARE_VERSION
    firmware_url = ACTIVE_FIRMWARE_URL
    update_available = (
        bool(latest_version)
        and bool(firmware_url)
        and latest_version != str(current_version or "").strip()
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
                   u.is_active, u.is_admin, u.created_at, u.updated_at,
                   h.hub_id, h.hub_name, h.owner_username
            FROM app_users u
            LEFT JOIN hubs h ON h.owner_username = u.username
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
            SELECT username, full_name, phone, email, password_hash, is_active, is_admin, created_at, updated_at
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
    assign_hub: bool = True,
    full_name: str = "",
    phone: str = "",
    email: str = "",
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
    with db_connection() as connection:
        connection.execute(
            """
            INSERT INTO app_users (
                username, full_name, phone, email, password_hash,
                is_active, is_admin, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
            """,
            (
                normalized_username,
                normalized_full_name,
                normalized_phone,
                normalized_email,
                hash_password(password),
                1 if is_admin else 0,
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
    return {
        "username": user["username"],
        "full_name": user["full_name"],
        "phone": user["phone"],
        "email": user["email"],
        "is_active": user["is_active"],
        "is_admin": user["is_admin"],
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

    if is_admin is False and not find_hub_by_owner(username):
        create_hub_for_user(username)

    updated = find_app_user(username)
    assigned_hub = find_hub_by_owner(username)
    return {
        "username": updated["username"],
        "full_name": updated["full_name"],
        "phone": updated["phone"],
        "email": updated["email"],
        "is_active": updated["is_active"],
        "is_admin": updated["is_admin"],
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

        hub = connection.execute(
            """
            SELECT hub_id
            FROM hubs
            WHERE owner_username = ?
            """,
            (username,),
        ).fetchone()
        hub_id = str(hub["hub_id"]) if hub and hub["hub_id"] else ""

        if hub_id:
            connection.execute(
                """
                DELETE FROM sensor_samples
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
            DELETE FROM pairing_tokens
            WHERE target_username = ?
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


def reset_app_user_password(username: str) -> str:
    user = find_app_user(username)
    if not user:
        raise ValueError("user_not_found")

    temporary_password = f"Growly-{secrets.token_urlsafe(6)}"
    update_app_user(username, password=temporary_password)
    return temporary_password


def normalized_sensor_payload(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = {
        "recorded_at": utc_now_iso(),
        "source": str(payload.get("source", "unknown")),
        "valid": 1 if payload.get("valid", False) else 0,
        "error": str(payload.get("error", "")),
    }
    for metric in METRIC_KEYS:
        value = payload.get(metric)
        normalized[metric] = None if value is None else float(value)
    return normalized


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


def ai_plant_context(limit: int = 10) -> list[dict[str, Any]]:
    plants: list[dict[str, Any]] = []
    for item in list_plant_catalog("")[:limit]:
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


def ask_openai_growly(question: str, context: dict[str, Any], image: dict[str, str] | None = None) -> str:
    if not OPENAI_API_KEY:
        raise ValueError("openai_key_missing")

    user_content: list[dict[str, Any]] = [
        {
            "type": "input_text",
            "text": json.dumps(
                {
                    "sporsmal": question,
                    "growly_kontekst": context,
                    "bilde": image["name"] if image else None,
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
                        "text": (
                            "Du er Growly Dyrkeassistent, en rolig norsk hageassistent for drivhus. "
                            "Svar ekstremt kort, konkret og handlingsorientert på norsk. "
                            "Bruk maks 3 punkter, maks 18 ord per punkt. "
                            "Ikke bruk Markdown, fet tekst, overskrifter, nummererte lange lister eller forklaringsavsnitt. "
                            "Start hvert punkt med et tydelig verb. "
                            "Bruk sensordata og plantekrav når de finnes. "
                            "Hvis brukeren sender bilde, vurder synlige tegn på planten og foreslå trygg neste handling. "
                            "Hvis data mangler, si det tydelig i ett kort punkt. "
                            "Ikke gi bastante sykdomsdiagnoser; gi sannsynlige årsaker og trygge tiltak."
                        ),
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
    return bool(SUPABASE_REST_ENDPOINT and SUPABASE_API_KEY)


def supabase_request_url(params: dict[str, str]) -> str:
    return f"{SUPABASE_REST_ENDPOINT}?{urlencode(params)}"


def fetch_supabase_rows(params: dict[str, str]) -> list[dict[str, Any]]:
    request = UrlRequest(
        supabase_request_url(params),
        headers={
            "apikey": SUPABASE_API_KEY,
            "Authorization": f"Bearer {SUPABASE_API_KEY}",
            "Accept": "application/json",
        },
        method="GET",
    )
    ssl_context = ssl.create_default_context(cafile=certifi.where()) if certifi else None
    with urlopen(request, timeout=8, context=ssl_context) as response:
        payload = response.read().decode("utf-8")
        data = json.loads(payload)
        return data if isinstance(data, list) else []


def supabase_latest_sample(hub_id: str) -> dict[str, Any] | None:
    params = {
        "select": "created_at,temperature,humidity,ph,conductivity,nitrogen,phosphorus,potassium,salinity,tds,lux,air_temperature,air_humidity,air_pressure",
        "order": "created_at.desc",
        "limit": "1",
    }
    global_start = history_start_iso(hub_id)
    if global_start:
        params["created_at"] = f"gte.{global_start}"
    rows = fetch_supabase_rows(params)
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
    rows = fetch_supabase_rows(
        {
            "select": f"created_at,{metric}",
            "created_at": f"gte.{since_dt.isoformat()}",
            f"{metric}": "not.is.null",
            "and": f"(created_at.lt.{until_dt.isoformat()})",
            "order": "created_at.asc",
            "limit": str(limit * 8),
        }
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

        latest_rows = fetch_supabase_rows(latest_params)
        if latest_rows and latest_rows[0].get("created_at"):
            latest_dt = parse_iso_datetime(str(latest_rows[0]["created_at"]))
            if latest_dt:
                until_dt = latest_dt + timedelta(seconds=1)
                since_dt = until_dt - config["window"]
                global_start_dt = parse_iso_datetime(history_start_iso(hub_id))
                if global_start_dt and since_dt < global_start_dt:
                    since_dt = global_start_dt
                rows = fetch_supabase_rows(
                    {
                        "select": f"created_at,{metric}",
                        "created_at": f"gte.{since_dt.isoformat()}",
                        f"{metric}": "not.is.null",
                        "and": f"(created_at.lt.{until_dt.isoformat()})",
                        "order": "created_at.asc",
                        "limit": str(limit * 8),
                    }
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
    rows = fetch_supabase_rows(params)
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
    rows = fetch_supabase_rows(
        {
            "select": "created_at,temperature,humidity,ph,conductivity,nitrogen,phosphorus,potassium,salinity,tds,lux,air_temperature,air_humidity,air_pressure",
            "created_at": f"gte.{since}",
            "and": f"(created_at.lt.{until})",
            "order": "created_at.asc",
            "limit": "5000",
        }
    )
    return day_summary_from_rows(rows)


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
        owned_hub = find_hub_by_owner(username)
        if not owned_hub:
            raise ValueError("hub_not_assigned")
        return owned_hub

    owned_hub = find_hub_by_owner(username)
    if owned_hub:
        return owned_hub

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
        } if user else None,
        "hub": hub,
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
            "hub_count": len(list_hubs()) if user_is_authenticated and is_admin_authenticated(request) else (1 if current_hub else 0),
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
            },
            status_code=400,
        )

    request.session["viewer_authenticated"] = True
    request.session["settings_authenticated"] = False
    request.session["is_admin"] = bool(user["is_admin"])
    request.session["username"] = user["username"]
    return authenticated_entry_redirect(request)


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


@app.post("/login")
async def login_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
):
    user = find_app_user(username.strip())
    if user and user["is_active"] and verify_password(password, user["password_hash"]):
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
        )
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})

    request.session["viewer_authenticated"] = True
    request.session["settings_authenticated"] = False
    request.session["is_admin"] = bool(user["is_admin"])
    request.session["username"] = user["username"]
    return {"ok": True, "session": session_auth_payload(request)}


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
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    try:
        hub = resolve_request_hub(request)
    except ValueError as exc:
        return hub_error_response(str(exc))
    stored = store_sensor_sample(payload, str(hub["hub_id"]))
    return {"ok": True, "stored": stored}


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
        question = "Se på plantebildet og gi korte, trygge råd."

    try:
        hub = resolve_request_hub(request)
    except ValueError as exc:
        return hub_error_response(str(exc))

    hub_id = str(hub["hub_id"])
    context = {
        "dato": datetime.now(ZoneInfo("Europe/Oslo")).date().isoformat(),
        "hub": {
            "hub_id": hub_id,
            "hub_name": hub.get("hub_name"),
            "online": bool(hub.get("is_active")),
        },
        "siste_maling": ai_sample_context(hub_id),
        "plantekartotek_utdrag": ai_plant_context(),
        "bruker_merknad": payload.get("context") if isinstance(payload.get("context"), dict) else {},
    }

    try:
        answer = ask_openai_growly(question, context, image)
    except HTTPError as exc:
        return JSONResponse(status_code=502, content={"ok": False, "error": f"openai_http_{exc.code}"})
    except (URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
        return JSONResponse(status_code=502, content={"ok": False, "error": str(exc) or "ai_unavailable"})

    return {"ok": True, "answer": answer, "model": OPENAI_MODEL}


@app.get("/api/plant-profiles")
async def plant_profiles(request: Request, q: str = ""):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    return {"ok": True, "profiles": list_plant_profiles(q)}


@app.get("/api/plant-catalog")
async def plant_catalog(request: Request, q: str = ""):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    return {"ok": True, "items": list_plant_catalog(q)}


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


@app.get("/api/users")
async def get_users(request: Request):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    return {"ok": True, "users": list_app_users()}


@app.get("/api/hubs")
async def get_hubs(request: Request):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    if is_admin_authenticated(request):
        hubs = list_hubs()
    else:
        hub = find_hub_by_owner(current_username(request))
        hubs = [hub] if hub else []
    return {"ok": True, "hubs": hubs}


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

    if not token:
        return JSONResponse(status_code=400, content={"ok": False, "error": "missing_pairing_token"})

    try:
        hub = complete_pairing_token(
            token,
            None if sensor_url in (None, "") else str(sensor_url),
            None if local_ip in (None, "") else str(local_ip),
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
            True,
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
