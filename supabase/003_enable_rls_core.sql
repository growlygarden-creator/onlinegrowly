-- Lock down Growly Garden core tables.
-- Run after 002_growly_core_schema.sql and after Render has SUPABASE_SERVICE_ROLE_KEY.

alter table public.growly_users enable row level security;
alter table public.growly_hubs enable row level security;
alter table public.growly_hub_members enable row level security;
alter table public.growly_pairing_tokens enable row level security;
alter table public.growly_plants enable row level security;
alter table public.growly_plant_events enable row level security;

revoke all on table public.growly_users from anon, authenticated;
revoke all on table public.growly_hubs from anon, authenticated;
revoke all on table public.growly_hub_members from anon, authenticated;
revoke all on table public.growly_pairing_tokens from anon, authenticated;
revoke all on table public.growly_plants from anon, authenticated;
revoke all on table public.growly_plant_events from anon, authenticated;

grant select, insert, update, delete on table public.growly_users to service_role;
grant select, insert, update, delete on table public.growly_hubs to service_role;
grant select, insert, update, delete on table public.growly_hub_members to service_role;
grant select, insert, update, delete on table public.growly_pairing_tokens to service_role;
grant select, insert, update, delete on table public.growly_plants to service_role;
grant select, insert, update, delete on table public.growly_plant_events to service_role;

notify pgrst, 'reload schema';
