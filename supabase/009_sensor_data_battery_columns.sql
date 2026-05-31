-- Add battery logging to each raw sensor sample.

alter table public.sensor_data
  add column if not exists battery_percent real,
  add column if not exists battery_voltage real;

create or replace view public.sensor_data_oslo as
select
  id,
  created_at,
  timezone('Europe/Oslo', created_at) as created_at_oslo,
  temperature,
  humidity,
  ph,
  conductivity,
  nitrogen,
  phosphorus,
  potassium,
  salinity,
  tds,
  lux,
  air_temperature,
  air_humidity,
  air_pressure,
  battery_percent,
  battery_voltage
from public.sensor_data
order by created_at desc;

notify pgrst, 'reload schema';
