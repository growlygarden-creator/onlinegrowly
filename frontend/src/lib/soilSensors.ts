import type { SoilSensor } from "./api";

function isMacLike(value: string): boolean {
  return /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(value.trim());
}

function isGenericSoilSensorName(value: string): boolean {
  const name = value.trim();
  return /^soil sensor(?:\s+\d+)?$/i.test(name) || /^soil_id_\d+$/i.test(name);
}

export function soilSensorDisplayName(sensor: SoilSensor, index = 0): string {
  const name = (sensor.sensor_name || "").trim();
  if (name && !isMacLike(name) && !isGenericSoilSensorName(name)) {
    return name;
  }

  return `sensor ${index + 1}`;
}

export function soilSensorTechnicalLabel(sensor: SoilSensor): string {
  return sensor.mac_address ? `MAC ${sensor.mac_address}` : `Intern ID ${sensor.sensor_id}`;
}
