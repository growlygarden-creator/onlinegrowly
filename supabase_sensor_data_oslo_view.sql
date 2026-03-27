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
  air_pressure
from public.sensor_data
order by created_at desc;
