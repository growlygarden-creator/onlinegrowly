-- Growly Garden core product schema.
-- Run after 001_sensor_data_hub_id.sql.

create table if not exists public.growly_users (
  username text primary key,
  full_name text not null default '',
  phone text not null default '',
  email text not null default '',
  is_active boolean not null default true,
  is_admin boolean not null default false,
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.growly_hubs (
  hub_id text primary key,
  hub_name text not null,
  location_label text not null default '',
  owner_username text not null references public.growly_users(username) on delete cascade,
  is_active boolean not null default true,
  sensor_url text not null default '',
  local_ip text not null default '',
  sample_time_soil_ms integer not null default 120000,
  sample_time_light_ms integer not null default 60000,
  sample_time_air_ms integer not null default 60000,
  sample_time_cloud_ms integer not null default 60000,
  history_start_at timestamptz,
  config_revision integer not null default 1,
  config_updated_at timestamptz,
  config_applied_revision integer not null default 0,
  config_applied_at timestamptz,
  config_applied_settings_json jsonb not null default '{}'::jsonb,
  device_status_at timestamptz,
  device_status_message text not null default '',
  device_firmware_version text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.growly_hub_members (
  hub_id text not null references public.growly_hubs(hub_id) on delete cascade,
  username text not null references public.growly_users(username) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (hub_id, username)
);

create table if not exists public.growly_pairing_tokens (
  token text primary key,
  target_username text not null references public.growly_users(username) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  paired_hub_id text references public.growly_hubs(hub_id) on delete set null
);

create table if not exists public.growly_plants (
  plant_id uuid primary key default gen_random_uuid(),
  hub_id text not null references public.growly_hubs(hub_id) on delete cascade,
  owner_username text not null references public.growly_users(username) on delete cascade,
  profile_id text not null,
  display_name text not null,
  location_label text not null default '',
  sowed_at date,
  moved_to_greenhouse_at date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.growly_plant_events (
  event_id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.growly_plants(plant_id) on delete cascade,
  hub_id text not null references public.growly_hubs(hub_id) on delete cascade,
  event_type text not null,
  event_at timestamptz not null default now(),
  notes text not null default '',
  metadata jsonb not null default '{}'::jsonb
);

alter table public.sensor_data
  add column if not exists hub_id text;

create index if not exists sensor_data_hub_id_created_at_idx
  on public.sensor_data (hub_id, created_at desc);

create index if not exists growly_hub_members_username_idx
  on public.growly_hub_members (username);

create index if not exists growly_plants_hub_id_idx
  on public.growly_plants (hub_id);

create index if not exists growly_plant_events_hub_id_event_at_idx
  on public.growly_plant_events (hub_id, event_at desc);
