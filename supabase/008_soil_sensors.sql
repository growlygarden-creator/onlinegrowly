-- Growly soil sensor nodes paired through the hub over ESP-NOW.
-- Run after 002_growly_core_schema.sql and 003_enable_rls_core.sql.

create table if not exists public.growly_soil_sensors (
  sensor_id text primary key,
  hub_id text not null references public.growly_hubs(hub_id) on delete cascade,
  owner_username text not null references public.growly_users(username) on delete cascade,
  sensor_name text not null default 'Soil sensor',
  sensor_type text not null default 'diymore_012592',
  mac_address text not null default '',
  plant_id text not null default '',
  firmware_version text not null default '',
  battery_percent real,
  battery_voltage real,
  wifi_rssi_dbm real,
  sleep_plan_seconds integer,
  sleep_plan_warning_percent integer,
  sleep_plan_critical_percent integer,
  sleep_plan_confirmed_at timestamptz,
  last_seen_at timestamptz,
  last_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.growly_soil_sensors
  add column if not exists wifi_rssi_dbm real,
  add column if not exists sleep_plan_seconds integer,
  add column if not exists sleep_plan_warning_percent integer,
  add column if not exists sleep_plan_critical_percent integer,
  add column if not exists sleep_plan_confirmed_at timestamptz;

create table if not exists public.growly_soil_sensor_pairing_sessions (
  session_id text primary key,
  hub_id text not null references public.growly_hubs(hub_id) on delete cascade,
  owner_username text not null references public.growly_users(username) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  status text not null default 'active',
  paired_sensor_id text references public.growly_soil_sensors(sensor_id) on delete set null,
  last_error text not null default ''
);

alter table public.sensor_data
  add column if not exists sensor_id text;

create index if not exists growly_soil_sensors_hub_idx
  on public.growly_soil_sensors (hub_id, updated_at desc);

create index if not exists growly_soil_pairing_hub_status_idx
  on public.growly_soil_sensor_pairing_sessions (hub_id, status, expires_at desc);

create index if not exists sensor_data_sensor_id_created_at_idx
  on public.sensor_data (sensor_id, created_at desc);

alter table public.growly_soil_sensors enable row level security;
alter table public.growly_soil_sensor_pairing_sessions enable row level security;

revoke all on table public.growly_soil_sensors from anon, authenticated;
revoke all on table public.growly_soil_sensor_pairing_sessions from anon, authenticated;

grant select, insert, update, delete on table public.growly_soil_sensors to service_role;
grant select, insert, update, delete on table public.growly_soil_sensor_pairing_sessions to service_role;

notify pgrst, 'reload schema';
