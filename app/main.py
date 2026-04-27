from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import ssl
import sqlite3
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request as UrlRequest, urlopen
from zoneinfo import ZoneInfo

from fastapi import FastAPI, Form, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

try:
    import certifi
except ImportError:  # pragma: no cover - production environments may rely on system certs.
    certifi = None


BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent


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

PREFERRED_DATA_DIR = Path(os.getenv("GROWLY_DATA_DIR", str(ROOT_DIR / "data")))
FALLBACK_DATA_DIR = Path("/tmp/growly-data")
DATA_DIR = PREFERRED_DATA_DIR
DB_PATH = DATA_DIR / "growly.db"
DEFAULT_SENSOR_URL = "http://192.168.0.133/sensor"
APP_USERNAME = os.getenv("APP_USERNAME", "growly")
APP_PASSWORD = os.getenv("APP_PASSWORD", "growly-view")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "Growly@Admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", APP_PASSWORD)
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


def storage_status() -> dict[str, Any]:
    preferred_path = str(PREFERRED_DATA_DIR)
    active_path = str(DATA_DIR)
    persistent = DATA_DIR == PREFERRED_DATA_DIR
    return {
        "persistent": persistent,
        "active_path": active_path,
        "preferred_path": preferred_path,
        "mode": "persistent" if persistent else "temporary",
        "message": (
            "Brukere og innstillinger lagres varig."
            if persistent
            else "Appen bruker midlertidig lagring nå. Brukere og innstillinger kan forsvinne ved deploy eller restart."
        ),
    }


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
        for key, value in DEFAULT_APP_SETTINGS.items():
            connection.execute(
                """
                INSERT INTO app_settings (key, value)
                VALUES (?, ?)
                ON CONFLICT(key) DO NOTHING
                """,
                (key, str(value)),
            )
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
                SET password_hash = ?, is_active = 1, is_admin = 1, updated_at = ?
                WHERE username = ?
                """,
                (hash_password(ADMIN_PASSWORD), utc_now_iso(), ADMIN_USERNAME),
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
        if not primary_hub:
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


def list_hubs() -> list[dict[str, Any]]:
    with db_connection() as connection:
        rows = connection.execute(
            """
            SELECT hub_id, hub_name, owner_username, is_active, sensor_url, local_ip,
                   sample_time_soil_ms, sample_time_light_ms, sample_time_air_ms,
                   sample_time_cloud_ms, history_start_at, created_at, updated_at
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
                   sample_time_cloud_ms, history_start_at, created_at, updated_at
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
                   sample_time_cloud_ms, history_start_at, created_at, updated_at
            FROM hubs
            WHERE owner_username = ?
            """,
            (username,),
        ).fetchone()
    return dict(row) if row else None


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
    if find_hub_by_owner(target_username):
        raise ValueError("hub_already_assigned")

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
    if find_hub_by_owner(target_username):
        raise ValueError("hub_already_assigned")

    now = utc_now_iso()
    effective_sensor_url = normalize_sensor_url(sensor_url or DEFAULT_APP_SETTINGS["sensor_url"])
    effective_local_ip = str(local_ip or "").strip()

    with db_connection() as connection:
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
                DEFAULT_APP_SETTINGS["sample_time_soil_ms"],
                DEFAULT_APP_SETTINGS["sample_time_light_ms"],
                DEFAULT_APP_SETTINGS["sample_time_air_ms"],
                DEFAULT_APP_SETTINGS["sample_time_cloud_ms"],
                DEFAULT_APP_SETTINGS["history_start_at"],
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
    with db_connection() as connection:
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
                username,
                username,
                DEFAULT_APP_SETTINGS["sensor_url"],
                "",
                DEFAULT_APP_SETTINGS["sample_time_soil_ms"],
                DEFAULT_APP_SETTINGS["sample_time_light_ms"],
                DEFAULT_APP_SETTINGS["sample_time_air_ms"],
                DEFAULT_APP_SETTINGS["sample_time_cloud_ms"],
                DEFAULT_APP_SETTINGS["history_start_at"],
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

    with db_connection() as connection:
        connection.execute(
            """
            UPDATE hubs
            SET hub_name = ?,
                sensor_url = ?,
                local_ip = ?,
                sample_time_soil_ms = ?,
                sample_time_light_ms = ?,
                sample_time_air_ms = ?,
                sample_time_cloud_ms = ?,
                history_start_at = ?,
                updated_at = ?
            WHERE hub_id = ?
            """,
            (
                updated["hub_name"],
                updated["sensor_url"],
                str(updated.get("local_ip", "") or "").strip(),
                updated["sample_time_soil_ms"],
                updated["sample_time_light_ms"],
                updated["sample_time_air_ms"],
                updated["sample_time_cloud_ms"],
                updated["history_start_at"],
                utc_now_iso(),
                hub_id,
            ),
        )
        connection.commit()

    return hub_settings(hub_id)


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
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT username, full_name, phone, email, password_hash, is_active, is_admin, created_at, updated_at
            FROM app_users
            WHERE username = ?
            """,
            (username,),
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
    normalized_username = username.strip()
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
    return bool(request.session.get("viewer_authenticated"))


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
    if is_admin_authenticated(request) or is_settings_authenticated(request):
        return None
    return RedirectResponse(url="/settings-login", status_code=303)


def require_viewer_api(request: Request) -> JSONResponse | None:
    if is_viewer_authenticated(request):
        return None
    return JSONResponse(status_code=401, content={"ok": False, "error": "login_required"})


def require_settings_api(request: Request) -> JSONResponse | None:
    viewer_error = require_viewer_api(request)
    if viewer_error:
        return viewer_error
    if is_admin_authenticated(request) or is_settings_authenticated(request):
        return None
    return JSONResponse(status_code=403, content={"ok": False, "error": "settings_password_required"})


def current_username(request: Request) -> str:
    return str(request.session.get("username", "")).strip()


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
        "settings_unlocked": is_admin_authenticated(request) or is_settings_authenticated(request),
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
        "settings_unlocked": is_admin_authenticated(request) or is_settings_authenticated(request),
        "user": {
            "username": user["username"],
            "full_name": user["full_name"],
            "phone": user["phone"],
            "email": user["email"],
            "is_active": user["is_active"],
            "is_admin": user["is_admin"],
        } if user else None,
        "hub": hub,
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
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.get("/")
async def landing_page(request: Request):
    user_is_authenticated = is_viewer_authenticated(request)
    current_hub = None
    current_pairing = None
    if user_is_authenticated:
        try:
            current_hub = resolve_request_hub(request)
        except ValueError:
            current_hub = None
        current_pairing = active_pairing_for_user(current_username(request))
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
        return RedirectResponse(url="/", status_code=303)
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
        return RedirectResponse(url="/", status_code=303)
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
            assign_hub=False,
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
    return RedirectResponse(url="/", status_code=303)


@app.get("/api/auth/session")
async def auth_session(request: Request):
    return {"ok": True, "session": session_auth_payload(request)}


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
        return RedirectResponse(url="/", status_code=303)

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
            assign_hub=False,
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
    redirect = require_viewer_page(request)
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
    redirect = require_viewer_page(request)
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


@app.get("/management")
async def management(request: Request):
    return RedirectResponse(url="/settings", status_code=303)


@app.get("/drivhus-test")
async def greenhouse_test(request: Request):
    redirect = require_viewer_page(request)
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
