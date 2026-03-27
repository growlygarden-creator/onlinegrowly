alter table public.sensor_data
add column if not exists air_temperature double precision,
add column if not exists air_humidity double precision,
add column if not exists air_pressure double precision;
