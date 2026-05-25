-- Hub-level visibility toggle for the 7-in-1 diagnostic sensor.
-- Run after 009_soil_sensor_schedule.sql.

alter table public.growly_hubs
  add column if not exists diagnostic_sensor_enabled boolean not null default true;

notify pgrst, 'reload schema';
