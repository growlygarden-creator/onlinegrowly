alter table public.sensor_data
  add column if not exists hub_id text;

create index if not exists sensor_data_hub_id_created_at_idx
  on public.sensor_data (hub_id, created_at desc);

update public.sensor_data
set hub_id = 'growly-hub-003'
where hub_id is null;
