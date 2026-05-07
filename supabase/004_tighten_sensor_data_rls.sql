-- Tighten sensor_data RLS while current ESP32 firmware still posts directly to Supabase.
-- This removes the overly broad WITH CHECK (true) policy and only accepts known active Growly hubs.

create or replace function public.is_active_growly_hub(candidate_hub_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.growly_hubs
    where hub_id = candidate_hub_id
      and is_active = true
  );
$$;

revoke all on function public.is_active_growly_hub(text) from public;
grant execute on function public.is_active_growly_hub(text) to anon;
grant execute on function public.is_active_growly_hub(text) to service_role;

drop policy if exists "Allow anon insert sensor_data" on public.sensor_data;
drop policy if exists "Allow anon insert sensor data" on public.sensor_data;

create policy "Allow anon insert known Growly hub sensor_data"
on public.sensor_data
for insert
to anon
with check (
  hub_id is not null
  and public.is_active_growly_hub(hub_id)
);

grant insert on table public.sensor_data to anon;
grant select, insert, update, delete on table public.sensor_data to service_role;

notify pgrst, 'reload schema';
