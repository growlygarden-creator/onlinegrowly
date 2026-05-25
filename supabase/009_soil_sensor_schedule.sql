-- Hub-level schedule and battery thresholds for ESP-NOW soil sensors.
-- Run after 008_soil_sensors.sql.

alter table public.growly_hubs
  add column if not exists soil_sensor_day_interval_ms integer not null default 1800000,
  add column if not exists soil_sensor_night_interval_ms integer not null default 3600000,
  add column if not exists soil_sensor_day_start text not null default '07:00',
  add column if not exists soil_sensor_night_start text not null default '22:00',
  add column if not exists soil_sensor_battery_warning_percent integer not null default 30,
  add column if not exists soil_sensor_battery_critical_percent integer not null default 15;

notify pgrst, 'reload schema';
