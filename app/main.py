from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import sqlite3
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request as UrlRequest, urlopen
from zoneinfo import ZoneInfo

from fastapi import FastAPI, Form, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware


BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
PREFERRED_DATA_DIR = Path(os.getenv("GROWLY_DATA_DIR", str(ROOT_DIR / "data")))
FALLBACK_DATA_DIR = Path("/tmp/growly-data")
DATA_DIR = PREFERRED_DATA_DIR
DB_PATH = DATA_DIR / "growly.db"
DEFAULT_SENSOR_URL = "http://192.168.0.133/sensor"
APP_USERNAME = os.getenv("APP_USERNAME", "growly")
APP_PASSWORD = os.getenv("APP_PASSWORD", "growly-view")
SETTINGS_PASSWORD = os.getenv("SETTINGS_PASSWORD", "growly-settings")
SESSION_SECRET = os.getenv("SESSION_SECRET", "growly-local-session-secret")
DEFAULT_VIEWER_USERNAME = os.getenv("DEFAULT_VIEWER_USERNAME", "Testuser")
DEFAULT_VIEWER_PASSWORD = os.getenv("DEFAULT_VIEWER_PASSWORD", "Growly2026")
SUPABASE_REST_ENDPOINT = os.getenv(
    "SUPABASE_REST_ENDPOINT",
    "https://ffxkxsclgiojrzmxvyuk.supabase.co/rest/v1/sensor_data",
)
SUPABASE_API_KEY = os.getenv(
    "SUPABASE_API_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmeGt4c2NsZ2lvanJ6bXh2eXVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzOTI1MzYsImV4cCI6MjA4OTk2ODUzNn0.yOtn_wNGOje0QAEdWYll8XJkojFANCxpmWd5F1eoPzA",
)
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
        "window": timedelta(days=3),
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
                password_hash TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                is_admin INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
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
        existing_user_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(app_users)").fetchall()
        }
        if "is_admin" not in existing_user_columns:
            connection.execute("ALTER TABLE app_users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0")
        for key, value in DEFAULT_APP_SETTINGS.items():
            connection.execute(
                """
                INSERT INTO app_settings (key, value)
                VALUES (?, ?)
                ON CONFLICT(key) DO NOTHING
                """,
                (key, str(value)),
            )
        existing_user = connection.execute(
            """
            SELECT username
            FROM app_users
            WHERE username = ?
            """,
            (APP_USERNAME,),
        ).fetchone()
        if not existing_user:
            now = utc_now_iso()
            connection.execute(
                """
                INSERT INTO app_users (username, password_hash, is_active, is_admin, created_at, updated_at)
                VALUES (?, ?, 1, 1, ?, ?)
                """,
                (APP_USERNAME, hash_password(APP_PASSWORD), now, now),
            )
        else:
            connection.execute(
                """
                UPDATE app_users
                SET is_admin = 1, updated_at = ?
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


def app_settings() -> dict[str, Any]:
    settings = DEFAULT_APP_SETTINGS.copy()
    with db_connection() as connection:
        rows = connection.execute(
            """
            SELECT key, value
            FROM app_settings
            """
        ).fetchall()

    for row in rows:
        key = row["key"]
        if key == "history_start_date" and not settings.get("history_start_at"):
            settings["history_start_at"] = normalize_history_start_at(row["value"])
            continue
        if key in settings:
            if key == "sensor_url":
                settings[key] = normalize_sensor_url(row["value"])
                continue
            if key == "history_start_at":
                settings[key] = normalize_history_start_at(row["value"])
                continue
            try:
                settings[key] = int(row["value"])
            except (TypeError, ValueError):
                settings[key] = DEFAULT_APP_SETTINGS[key]
    return settings


def save_app_settings(payload: dict[str, Any]) -> dict[str, Any]:
    current = app_settings()
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
        for key, value in updated.items():
            connection.execute(
                """
                INSERT INTO app_settings (key, value)
                VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                (key, str(value)),
            )
        connection.commit()

    return updated


def history_start_iso() -> str | None:
    start_at = normalize_history_start_at(app_settings().get("history_start_at", ""))
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
    since: datetime | None,
    until: datetime | None,
) -> tuple[datetime, datetime]:
    now_utc = datetime.now(timezone.utc)
    start_dt = since or now_utc - timedelta(days=3)
    end_dt = until or now_utc

    global_start = parse_iso_datetime(history_start_iso())
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
            SELECT username, is_active, is_admin, created_at, updated_at
            FROM app_users
            ORDER BY username COLLATE NOCASE ASC
            """
        ).fetchall()
    return [dict(row) for row in rows]


def find_app_user(username: str) -> dict[str, Any] | None:
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT username, password_hash, is_active, is_admin, created_at, updated_at
            FROM app_users
            WHERE username = ?
            """,
            (username,),
        ).fetchone()
    return dict(row) if row else None


def create_app_user(username: str, password: str, is_admin: bool = False) -> dict[str, Any]:
    normalized_username = username.strip()
    if not normalized_username:
        raise ValueError("missing_username")
    if len(normalized_username) < 3:
        raise ValueError("username_too_short")
    if len(password) < 6:
        raise ValueError("password_too_short")
    if find_app_user(normalized_username):
        raise ValueError("user_exists")

    now = utc_now_iso()
    with db_connection() as connection:
        connection.execute(
            """
            INSERT INTO app_users (username, password_hash, is_active, is_admin, created_at, updated_at)
            VALUES (?, ?, 1, ?, ?, ?)
            """,
            (normalized_username, hash_password(password), 1 if is_admin else 0, now, now),
        )
        connection.commit()
    return {"username": normalized_username, "is_active": 1, "is_admin": 1 if is_admin else 0, "created_at": now, "updated_at": now}


def update_app_user(username: str, password: str | None = None, is_active: bool | None = None, is_admin: bool | None = None) -> dict[str, Any]:
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

    if is_active is not None:
        updates.append("is_active = ?")
        values.append(1 if is_active else 0)

    if is_admin is not None:
        updates.append("is_admin = ?")
        values.append(1 if is_admin else 0)

    if not updates:
        return {
            "username": user["username"],
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

    updated = find_app_user(username)
    return {
        "username": updated["username"],
        "is_active": updated["is_active"],
        "is_admin": updated["is_admin"],
        "created_at": updated["created_at"],
        "updated_at": updated["updated_at"],
    }


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


def store_sensor_sample(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = normalized_sensor_payload(payload)
    with db_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO sensor_samples (
                recorded_at, source, valid, error, humidity, temperature, ph,
                conductivity, nitrogen, phosphorus, potassium, salinity, tds,
                air_temperature, air_humidity, air_pressure, lux
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            ),
        )
        connection.commit()
        normalized["id"] = cursor.lastrowid
    return normalized


def latest_sample() -> dict[str, Any] | None:
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM sensor_samples
            ORDER BY id DESC
            LIMIT 1
            """
        ).fetchone()
    return dict(row) if row else None


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
    since_dt, until_dt = clamp_history_window(requested_since, requested_until)
    bucket_seconds = config["bucket_seconds"]
    custom_window = bool(date_from or date_to)

    with db_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT recorded_at, {metric} AS value, valid
            FROM sensor_samples
            WHERE {metric} IS NOT NULL
              AND recorded_at >= ?
              AND recorded_at < ?
            ORDER BY recorded_at ASC
            LIMIT ?
            """,
            (since_dt.isoformat(), until_dt.isoformat(), limit * 8),
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
    with urlopen(request, timeout=8) as response:
        payload = response.read().decode("utf-8")
        data = json.loads(payload)
        return data if isinstance(data, list) else []


def supabase_latest_sample() -> dict[str, Any] | None:
    params = {
        "select": "created_at,temperature,humidity,ph,conductivity,nitrogen,phosphorus,potassium,salinity,tds,lux,air_temperature,air_humidity,air_pressure",
        "order": "created_at.desc",
        "limit": "1",
    }
    global_start = history_start_iso()
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
    since_dt, until_dt = clamp_history_window(requested_since, requested_until)
    custom_window = bool(date_from or date_to)
    rows = fetch_supabase_rows(
        {
            "select": f"created_at,{metric}",
            "created_at": f"gte.{since_dt.isoformat()}",
            f"{metric}": "not.is.null",
            "and": f"(created_at.lt.{until_dt.isoformat()})",
            "order": "created_at.asc",
            "limit": str(limit),
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


def local_metric_first_recorded_at(metric: str) -> str | None:
    if metric not in METRIC_KEYS:
        raise ValueError("unsupported_metric")
    global_start = history_start_iso()
    with db_connection() as connection:
        if global_start:
            row = connection.execute(
                f"""
                SELECT recorded_at
                FROM sensor_samples
                WHERE {metric} IS NOT NULL
                  AND recorded_at >= ?
                ORDER BY recorded_at ASC
                LIMIT 1
                """,
                (global_start,),
            ).fetchone()
        else:
            row = connection.execute(
                f"""
                SELECT recorded_at
                FROM sensor_samples
                WHERE {metric} IS NOT NULL
                ORDER BY recorded_at ASC
                LIMIT 1
                """
            ).fetchone()
    return row["recorded_at"] if row else None


def supabase_metric_first_recorded_at(metric: str) -> str | None:
    if metric not in METRIC_KEYS:
        raise ValueError("unsupported_metric")
    params = {
        "select": "created_at",
        f"{metric}": "not.is.null",
        "order": "created_at.asc",
        "limit": "1",
    }
    global_start = history_start_iso()
    if global_start:
        params["created_at"] = f"gte.{global_start}"
    rows = fetch_supabase_rows(params)
    if not rows:
        return None
    return rows[0].get("created_at")


def today_window_iso() -> tuple[str, str]:
    now_local = datetime.now(APP_TIMEZONE)
    start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    end_local = start_local + timedelta(days=1)
    since_dt, until_dt = clamp_history_window(
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


def supabase_day_summary() -> dict[str, dict[str, float | None]]:
    since, until = today_window_iso()
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


def local_day_summary() -> dict[str, dict[str, float | None]]:
    since, until = today_window_iso()
    with db_connection() as connection:
        rows = connection.execute(
            """
            SELECT air_temperature, air_humidity, air_pressure, lux, humidity, temperature, ph,
                   conductivity, nitrogen, phosphorus, potassium, salinity, tds
            FROM sensor_samples
            WHERE recorded_at >= ? AND recorded_at < ?
            ORDER BY recorded_at ASC
            """,
            (since, until),
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


def template_auth_context(request: Request) -> dict[str, Any]:
    return {
        "current_username": request.session.get("username", ""),
        "current_user_is_admin": is_admin_authenticated(request),
        "settings_unlocked": is_admin_authenticated(request) or is_settings_authenticated(request),
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
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET, same_site="lax")

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.get("/")
async def landing_page(request: Request):
    redirect = require_viewer_page(request)
    if redirect:
        return redirect
    return templates.TemplateResponse(
        "landing.html",
        {
            "request": request,
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
    settings = app_settings()
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
    settings = app_settings()
    return templates.TemplateResponse(
        "monitor_test.html",
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
    settings_payload = app_settings()
    return templates.TemplateResponse(
        "settings.html",
        {
            "request": request,
            "default_sensor_url": settings_payload["sensor_url"],
            "sample_settings": settings_payload,
            "storage_status": storage_status(),
            **template_auth_context(request),
        },
    )


@app.get("/drivhus-test")
async def greenhouse_test(request: Request):
    redirect = require_viewer_page(request)
    if redirect:
        return redirect
    settings = app_settings()
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
    resolved_target = normalize_sensor_url(target or app_settings().get("sensor_url", DEFAULT_SENSOR_URL))
    try:
        data = fetch_sensor_payload(resolved_target)
    except HTTPError as exc:
        return JSONResponse(
            status_code=502,
            content={"ok": False, "error": f"sensor_http_{exc.code}", "target": resolved_target},
        )
    except URLError as exc:
        reason = getattr(exc, "reason", "connection_failed")
        return JSONResponse(
            status_code=502,
            content={"ok": False, "error": str(reason), "target": resolved_target},
        )
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=502,
            content={"ok": False, "error": "invalid_sensor_json", "target": resolved_target},
        )

    stored = store_sensor_sample({**data, "source": resolved_target})
    return {"ok": True, "target": resolved_target, "sensor": data, "stored": stored}


@app.post("/api/sensor/ingest")
async def sensor_ingest(request: Request, payload: dict[str, Any]):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    stored = store_sensor_sample(payload)
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
    source = "local"
    fallback_reason: str | None = None
    try:
        if supabase_enabled():
            history_rows = supabase_metric_history_by_span(metric, span, limit, date_from=date_from, date_to=date_to)
            source = "supabase"
        else:
            history_rows = metric_history_by_span(metric, span, limit, date_from=date_from, date_to=date_to)
    except ValueError:
        return JSONResponse(
            status_code=400,
            content={"ok": False, "error": "unsupported_history_request", "metric": metric, "span": span},
        )
    except (HTTPError, URLError, json.JSONDecodeError) as exc:
        history_rows = metric_history_by_span(metric, span, limit, date_from=date_from, date_to=date_to)
        source = "local_fallback"
        fallback_reason = str(exc)

    return {
        "ok": True,
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
    source = "local"
    fallback_reason: str | None = None
    try:
        if supabase_enabled():
            recorded_at = supabase_metric_first_recorded_at(metric)
            source = "supabase"
        else:
            recorded_at = local_metric_first_recorded_at(metric)
    except ValueError:
        return JSONResponse(
            status_code=400,
            content={"ok": False, "error": "unsupported_metric", "metric": metric},
        )
    except (HTTPError, URLError, json.JSONDecodeError) as exc:
        recorded_at = local_metric_first_recorded_at(metric)
        source = "local_fallback"
        fallback_reason = str(exc)

    return {
        "ok": True,
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
    source = "local"
    fallback_reason: str | None = None
    try:
        if supabase_enabled():
            sample = supabase_latest_sample()
            source = "supabase"
        else:
            sample = latest_sample()
    except (HTTPError, URLError, json.JSONDecodeError) as exc:
        sample = latest_sample()
        source = "local_fallback"
        fallback_reason = str(exc)
    return {"ok": True, "sample": sample, "source": source, "fallback_reason": fallback_reason}


@app.get("/api/day-summary")
async def day_summary(request: Request):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    source = "local"
    fallback_reason: str | None = None
    try:
        if supabase_enabled():
            summary = supabase_day_summary()
            source = "supabase"
        else:
            summary = local_day_summary()
    except (HTTPError, URLError, json.JSONDecodeError) as exc:
        summary = local_day_summary()
        source = "local_fallback"
        fallback_reason = str(exc)
    return {"ok": True, "summary": summary, "source": source, "fallback_reason": fallback_reason}


@app.get("/api/settings")
async def get_settings(request: Request):
    auth_error = require_viewer_api(request)
    if auth_error:
        return auth_error
    return {"ok": True, "settings": app_settings()}


@app.get("/api/users")
async def get_users(request: Request):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    return {"ok": True, "users": list_app_users()}


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
        )
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    return {"ok": True, "user": user, "users": list_app_users()}


@app.post("/api/settings")
async def update_settings(request: Request, payload: dict[str, Any]):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    settings = save_app_settings(payload)
    return {"ok": True, "settings": settings}


@app.post("/api/device-settings")
async def update_device_settings(request: Request, payload: dict[str, Any]):
    auth_error = require_settings_api(request)
    if auth_error:
        return auth_error
    target = str(payload.get("target", "")).strip()
    settings_payload = save_app_settings(payload)
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
