-- Premium seed catalog and sowing/grafting log.
-- Run after 003_enable_rls_core.sql.

create table if not exists public.growly_seed_entries (
  seed_id uuid primary key default gen_random_uuid(),
  hub_id text not null references public.growly_hubs(hub_id) on delete cascade,
  owner_username text not null references public.growly_users(username) on delete cascade,
  code text not null,
  name text not null,
  variety text not null default '',
  category text not null default 'annet',
  origin text not null default 'egne',
  year_label text not null default '',
  harvest_date date,
  source text not null default '',
  stock text not null default 'ukjent',
  germination text not null default 'ukjent',
  location text not null default '',
  notes text not null default '',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growly_seed_entries_category_check
    check (category in ('gronnsak', 'urt', 'blomst', 'frukt', 'bar', 'annet')),
  constraint growly_seed_entries_origin_check
    check (origin in ('kjopt', 'egne', 'fatt', 'byttet')),
  constraint growly_seed_entries_stock_check
    check (stock in ('mye', 'lite', 'tom', 'ukjent')),
  constraint growly_seed_entries_germination_check
    check (germination in ('ukjent', 'god', 'middels', 'darlig', 'test'))
);

create table if not exists public.growly_seed_activities (
  activity_id uuid primary key default gen_random_uuid(),
  seed_id uuid not null references public.growly_seed_entries(seed_id) on delete cascade,
  hub_id text not null references public.growly_hubs(hub_id) on delete cascade,
  owner_username text not null references public.growly_users(username) on delete cascade,
  seed_code text not null default '',
  seed_name text not null default '',
  activity_type text not null default 'sadd',
  activity_date date not null,
  quantity text not null default '',
  placement text not null default '',
  status text not null default 'planlagt',
  rootstock text not null default '',
  scion text not null default '',
  notes text not null default '',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growly_seed_activities_type_check
    check (activity_type in ('sadd', 'podet', 'spiretest')),
  constraint growly_seed_activities_status_check
    check (status in ('planlagt', 'ikke_spirt', 'spirt', 'plantet_ut', 'mislykket', 'hostet', 'vellykket'))
);

create index if not exists growly_seed_entries_owner_hub_idx
  on public.growly_seed_entries (owner_username, hub_id, deleted_at, code);

create unique index if not exists growly_seed_entries_owner_hub_code_active_idx
  on public.growly_seed_entries (owner_username, hub_id, code)
  where deleted_at is null;

create index if not exists growly_seed_activities_owner_hub_idx
  on public.growly_seed_activities (owner_username, hub_id, deleted_at, activity_date desc);

create index if not exists growly_seed_activities_seed_id_idx
  on public.growly_seed_activities (seed_id);

alter table public.growly_seed_entries enable row level security;
alter table public.growly_seed_activities enable row level security;

revoke all on table public.growly_seed_entries from anon, authenticated;
revoke all on table public.growly_seed_activities from anon, authenticated;

grant select, insert, update, delete on table public.growly_seed_entries to service_role;
grant select, insert, update, delete on table public.growly_seed_activities to service_role;

notify pgrst, 'reload schema';
