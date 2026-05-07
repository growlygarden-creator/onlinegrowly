-- Fields used by the Growly app plant cards.
-- Run after 003_enable_rls_core.sql.

alter table public.growly_plants
  add column if not exists catalog_item_id text,
  add column if not exists variant_id text,
  add column if not exists cultivar_id text,
  add column if not exists has_seven_in_one boolean not null default false,
  add column if not exists watering_enabled boolean not null default false;

create index if not exists growly_plants_owner_hub_active_idx
  on public.growly_plants (owner_username, hub_id, archived_at);

notify pgrst, 'reload schema';
