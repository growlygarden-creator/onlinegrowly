import { Capacitor } from "@capacitor/core";
import { LocalNotifications, type DeliveredNotificationSchema, type LocalNotificationSchema } from "@capacitor/local-notifications";
import { fetchPlants, fetchWeatherForecast, type GrowlyPlant, type WeatherForecast } from "./api";
import { currentAppLanguage, translate, type AppLanguage } from "./i18n";

const NOTIFICATION_ENABLED_KEY = "growly.notifications.enabled";
const NOTIFICATION_HISTORY_KEY = "growly.notifications.history";
const NOTIFICATION_SCHEDULE_KEY = "growly.notifications.scheduled";
const NOTIFICATION_PREFERENCES_KEY = "growly.notifications.preferences";
const NOTIFICATION_HISTORY_LIMIT = 80;
const MIN_NOTIFICATION_TIME = "10:00";
const MIN_NOTIFICATION_DELAY_MINUTES = 60;
const SUNSET_BUFFER_MINUTES = 15;
const MANAGED_NOTIFICATION_IDS = [
  11001,
  12001,
  13001,
  14001,
  14002,
  14003,
];

export type GrowlyNotificationStatus = "unsupported" | "off" | "prompt" | "granted" | "denied";
export type GrowlyNotificationSource = "received" | "opened" | "delivered" | "scheduled";
export type GrowlyNotificationHistoryItem = {
  uid: string;
  notificationId: number;
  title: string;
  body: string;
  type: string;
  route: string;
  occurredAt: string;
  capturedAt: string;
  readAt?: string;
  source: GrowlyNotificationSource;
};
export type GrowlyScheduledNotification = {
  notificationId: number;
  title: string;
  body: string;
  type: string;
  route: string;
  scheduledAt: string;
  repeats: boolean;
  every?: string;
};
export type GrowlyNotificationPreferences = {
  earliestTime: string;
  wateringTime: string;
  plantCheckTime: string;
  calendarTime: string;
  avoidAfterSunset: boolean;
};

const DEFAULT_NOTIFICATION_PREFERENCES: GrowlyNotificationPreferences = {
  earliestTime: MIN_NOTIFICATION_TIME,
  wateringTime: "10:00",
  plantCheckTime: "16:00",
  calendarTime: "10:30",
  avoidAfterSunset: true,
};

function isNotificationSupported(): boolean {
  return Capacitor.isNativePlatform();
}

function parseTimeParts(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return { hour, minute };
}

function minutesFromTime(value: string): number {
  const parts = parseTimeParts(value);
  return parts ? parts.hour * 60 + parts.minute : 0;
}

function timeFromMinutes(minutes: number): string {
  const safeMinutes = Math.min(23 * 60 + 59, Math.max(0, Math.round(minutes)));
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function normalizeTime(value: unknown, fallback: string): string {
  return typeof value === "string" && parseTimeParts(value) ? value : fallback;
}

function clampToEarliestTime(value: string, earliestTime: string): string {
  return timeFromMinutes(Math.max(minutesFromTime(value), minutesFromTime(earliestTime), minutesFromTime(MIN_NOTIFICATION_TIME)));
}

export function growlyNotificationPreferences(): GrowlyNotificationPreferences {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(NOTIFICATION_PREFERENCES_KEY) || "{}") as Partial<GrowlyNotificationPreferences>;
    const earliestTime = clampToEarliestTime(
      normalizeTime(parsed.earliestTime, DEFAULT_NOTIFICATION_PREFERENCES.earliestTime),
      MIN_NOTIFICATION_TIME,
    );
    return {
      earliestTime,
      wateringTime: clampToEarliestTime(normalizeTime(parsed.wateringTime, DEFAULT_NOTIFICATION_PREFERENCES.wateringTime), earliestTime),
      plantCheckTime: clampToEarliestTime(normalizeTime(parsed.plantCheckTime, DEFAULT_NOTIFICATION_PREFERENCES.plantCheckTime), earliestTime),
      calendarTime: clampToEarliestTime(normalizeTime(parsed.calendarTime, DEFAULT_NOTIFICATION_PREFERENCES.calendarTime), earliestTime),
      avoidAfterSunset: true,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function saveGrowlyNotificationPreferences(preferences: GrowlyNotificationPreferences): GrowlyNotificationPreferences {
  const earliestTime = clampToEarliestTime(preferences.earliestTime, MIN_NOTIFICATION_TIME);
  const normalized = {
    earliestTime,
    wateringTime: clampToEarliestTime(preferences.wateringTime, earliestTime),
    plantCheckTime: clampToEarliestTime(preferences.plantCheckTime, earliestTime),
    calendarTime: clampToEarliestTime(preferences.calendarTime, earliestTime),
    avoidAfterSunset: true,
  };
  try {
    window.localStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(normalized));
  } catch {
    // Storage is best effort in embedded contexts.
  }
  return normalized;
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

function sunTimeUtc(date: Date, latitude: number, longitude: number, isSunrise: boolean): number | null {
  const lngHour = longitude / 15;
  const t = dayOfYear(date) + ((isSunrise ? 6 : 18) - lngHour) / 24;
  const meanAnomaly = (0.9856 * t) - 3.289;
  let trueLongitude =
    meanAnomaly +
    (1.916 * Math.sin(meanAnomaly * Math.PI / 180)) +
    (0.020 * Math.sin(2 * meanAnomaly * Math.PI / 180)) +
    282.634;
  trueLongitude = (trueLongitude + 360) % 360;

  let rightAscension = Math.atan(0.91764 * Math.tan(trueLongitude * Math.PI / 180)) * 180 / Math.PI;
  rightAscension = (rightAscension + 360) % 360;
  rightAscension += Math.floor(trueLongitude / 90) * 90 - Math.floor(rightAscension / 90) * 90;
  rightAscension /= 15;

  const sinDeclination = 0.39782 * Math.sin(trueLongitude * Math.PI / 180);
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const cosHour =
    (Math.cos(90.833 * Math.PI / 180) - sinDeclination * Math.sin(latitude * Math.PI / 180)) /
    (cosDeclination * Math.cos(latitude * Math.PI / 180));
  if (cosHour > 1 || cosHour < -1) {
    return null;
  }

  const hourAngle = isSunrise ? 360 - Math.acos(cosHour) * 180 / Math.PI : Math.acos(cosHour) * 180 / Math.PI;
  const localMeanTime = hourAngle / 15 + rightAscension - 0.06571 * t - 6.622;
  return (localMeanTime - lngHour + 24) % 24;
}

function sunsetForDate(date: Date, latitude?: number, longitude?: number): Date | null {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }
  const sunsetUtc = sunTimeUtc(date, latitude, longitude, false);
  if (sunsetUtc === null) {
    return null;
  }
  const sunset = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
  sunset.setUTCMinutes(Math.round(sunsetUtc * 60));
  return sunset;
}

function notificationWindowEnd(baseDate: Date, weather: WeatherForecast | null, preferences: GrowlyNotificationPreferences): Date | null {
  if (!preferences.avoidAfterSunset) {
    return null;
  }
  const sunset = sunsetForDate(baseDate, weather?.location.latitude, weather?.location.longitude);
  if (!sunset) {
    return null;
  }
  const latest = new Date(sunset);
  latest.setMinutes(latest.getMinutes() - SUNSET_BUFFER_MINUTES);
  return latest;
}

function applyNotificationWindow(
  date: Date,
  weather: WeatherForecast | null,
  preferences: GrowlyNotificationPreferences,
): Date {
  const earliestParts = parseTimeParts(preferences.earliestTime) ?? parseTimeParts(MIN_NOTIFICATION_TIME)!;
  const adjusted = new Date(date);
  const earliest = new Date(date);
  earliest.setHours(earliestParts.hour, earliestParts.minute, 0, 0);
  if (adjusted.getTime() < earliest.getTime()) {
    adjusted.setTime(earliest.getTime());
  }

  const latest = notificationWindowEnd(adjusted, weather, preferences);
  if (latest && adjusted.getTime() > latest.getTime()) {
    const hardEarliest = new Date(date);
    const hardEarliestParts = parseTimeParts(MIN_NOTIFICATION_TIME)!;
    hardEarliest.setHours(hardEarliestParts.hour, hardEarliestParts.minute, 0, 0);
    if (latest.getTime() >= hardEarliest.getTime()) {
      adjusted.setTime(latest.getTime());
    }
  }
  return adjusted;
}

function nextTime(
  value: string,
  weather: WeatherForecast | null,
  preferences: GrowlyNotificationPreferences,
  minimumDelayMinutes = MIN_NOTIFICATION_DELAY_MINUTES,
): Date {
  const parts = parseTimeParts(clampToEarliestTime(value, preferences.earliestTime)) ?? parseTimeParts(MIN_NOTIFICATION_TIME)!;
  const date = new Date();
  date.setHours(parts.hour, parts.minute, 0, 0);
  const adjusted = applyNotificationWindow(date, weather, preferences);
  if (adjusted.getTime() !== date.getTime()) {
    date.setTime(adjusted.getTime());
  }
  if (date.getTime() <= Date.now() + minimumDelayMinutes * 60_000) {
    date.setDate(date.getDate() + 1);
    date.setTime(applyNotificationWindow(date, weather, preferences).getTime());
  }
  return date;
}

function dateAtTime(
  baseDate: Date,
  value: string,
  weather: WeatherForecast | null,
  preferences: GrowlyNotificationPreferences,
): Date {
  const parts = parseTimeParts(clampToEarliestTime(value, preferences.earliestTime)) ?? parseTimeParts(MIN_NOTIFICATION_TIME)!;
  const date = new Date(baseDate);
  date.setHours(parts.hour, parts.minute, 0, 0);
  date.setTime(applyNotificationWindow(date, weather, preferences).getTime());
  if (date.getTime() <= Date.now() + 15 * 60_000) {
    date.setDate(date.getDate() + 1);
    date.setTime(applyNotificationWindow(date, weather, preferences).getTime());
  }
  return date;
}

function notificationText(language: AppLanguage, key: Parameters<typeof translate>[1], values?: Parameters<typeof translate>[2]): string {
  return translate(language, key, values);
}

function plantDisplayName(plant: GrowlyPlant, language: AppLanguage): string {
  return plant.display_name || plant.nickname || plant.catalogItemId || plant.profileId || notificationText(language, "notifications.generated.plantFallback");
}

function notificationRoute(type: string): string {
  if (type === "calendar") {
    return "/kalender";
  }
  if (type === "watering" || type === "plant-check") {
    return "/drivhus";
  }
  return "/";
}

function notificationExtra(type: string): { type: string; route: string } {
  return { type, route: notificationRoute(type) };
}

function isGrowlyNotification(notification: LocalNotificationSchema | DeliveredNotificationSchema): boolean {
  return (
    MANAGED_NOTIFICATION_IDS.includes(notification.id) ||
    Boolean(typeForNotification(notification) && typeForNotification(notification) !== "system") ||
    notification.title.toLowerCase().includes("growly") ||
    notification.title.toLowerCase().includes("vanning") ||
    notification.title.toLowerCase().includes("plantesjekk")
  );
}

function hasNotificationForTypeOnDate(type: string, date: Date): boolean {
  const dateKey = localDateKey(date);
  return growlyNotificationHistory().some((notification) => (
    notification.type === type && localDateKey(new Date(notification.occurredAt)) === dateKey
  ));
}

function moveToNextUnsentDay(
  notification: LocalNotificationSchema,
  weather: WeatherForecast | null,
  preferences: GrowlyNotificationPreferences,
): LocalNotificationSchema {
  const scheduledAt = dateFromUnknown(notification.schedule?.at);
  if (!scheduledAt) {
    return notification;
  }

  const type = typeForNotification(notification);
  const nextDate = new Date(scheduledAt);
  while (hasNotificationForTypeOnDate(type, nextDate)) {
    nextDate.setDate(nextDate.getDate() + 1);
  }
  const adjustedDate = applyNotificationWindow(nextDate, weather, preferences);
  return {
    ...notification,
    schedule: {
      ...notification.schedule,
      at: adjustedDate,
    },
  };
}

function weatherAlertNotifications(weather: WeatherForecast | null, preferences: GrowlyNotificationPreferences): LocalNotificationSchema[] {
  if (!weather) {
    return [];
  }

  const language = currentAppLanguage();
  const notifications: LocalNotificationSchema[] = [];
  const days = weather.forecast.days ?? [];
  const hours = weather.forecast.hours ?? [];
  const frostDay = days.find((day) => typeof day.temperature_min === "number" && day.temperature_min <= 2);
  const heatDay = days.find((day) => typeof day.temperature_max === "number" && day.temperature_max >= 28);
  const windHour = hours.find((hour) => typeof hour.wind_speed === "number" && hour.wind_speed >= 10);

  if (frostDay) {
    notifications.push({
      id: 14001,
      title: notificationText(language, "notifications.generated.frostTitle"),
      body: notificationText(language, "notifications.generated.frostBody", { temperature: frostDay.temperature_min?.toFixed(0) ?? "" }),
      schedule: { at: dateAtTime(new Date(`${frostDay.date}T12:00:00`), preferences.plantCheckTime, weather, preferences) },
      extra: notificationExtra("weather-frost"),
    });
  }

  if (heatDay) {
    notifications.push({
      id: 14002,
      title: notificationText(language, "notifications.generated.heatTitle"),
      body: notificationText(language, "notifications.generated.heatBody", { temperature: heatDay.temperature_max?.toFixed(0) ?? "" }),
      schedule: { at: dateAtTime(new Date(`${heatDay.date}T12:00:00`), preferences.wateringTime, weather, preferences) },
      extra: notificationExtra("weather-heat"),
    });
  }

  if (windHour) {
    const windDate = new Date(windHour.time);
    notifications.push({
      id: 14003,
      title: notificationText(language, "notifications.generated.windTitle"),
      body: notificationText(language, "notifications.generated.windBody", { speed: windHour.wind_speed?.toFixed(1) ?? "" }),
      schedule: { at: dateAtTime(windDate, timeFromMinutes((windDate.getHours() - 2) * 60), weather, preferences) },
      extra: notificationExtra("weather-wind"),
    });
  }

  return notifications;
}

function recurringCareNotifications(
  plants: GrowlyPlant[],
  weather: WeatherForecast | null,
  preferences: GrowlyNotificationPreferences,
): LocalNotificationSchema[] {
  if (!plants.length) {
    return [];
  }

  const language = currentAppLanguage();
  const firstPlant = plantDisplayName(plants[0], language);
  const plantText = plants.length === 1
    ? firstPlant
    : notificationText(language, "notifications.generated.morePlants", { first: firstPlant, count: plants.length - 1 });
  return [
    {
      id: 11001,
      title: notificationText(language, "notifications.generated.wateringTitle"),
      body: notificationText(language, "notifications.generated.wateringBody", { plants: plantText }),
      schedule: { at: nextTime(preferences.wateringTime, weather, preferences), repeats: true, every: "day" },
      extra: notificationExtra("watering"),
    },
    {
      id: 12001,
      title: notificationText(language, "notifications.generated.plantCheckTitle"),
      body: notificationText(language, "notifications.generated.plantCheckBody"),
      schedule: { at: nextTime(preferences.plantCheckTime, weather, preferences), repeats: true, every: "day" },
      extra: notificationExtra("plant-check"),
    },
  ];
}

function calendarNotifications(weather: WeatherForecast | null, preferences: GrowlyNotificationPreferences): LocalNotificationSchema[] {
  const language = currentAppLanguage();
  return [
    {
      id: 13001,
      title: notificationText(language, "notifications.generated.calendarTitle"),
      body: notificationText(language, "notifications.generated.calendarBody"),
      schedule: { at: nextTime(preferences.calendarTime, weather, preferences), repeats: true, every: "week" },
      extra: notificationExtra("calendar"),
    },
  ];
}

function parseJsonArray<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(key: string, items: T[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Storage is best effort in embedded contexts.
  }
}

function dateFromUnknown(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function historyUid(notificationId: number, occurredAt: Date): string {
  return `${notificationId}-${localDateKey(occurredAt)}`;
}

function extraValue(extra: unknown, key: string): string | undefined {
  if (!extra || typeof extra !== "object") {
    return undefined;
  }
  const value = (extra as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function routeForNotification(notification: LocalNotificationSchema | DeliveredNotificationSchema): string {
  const route =
    extraValue("extra" in notification ? notification.extra : undefined, "route") ??
    extraValue("data" in notification ? notification.data : undefined, "route");
  if (route) {
    return route;
  }
  const type = typeForNotification(notification);
  return notificationRoute(type);
}

function typeForNotification(notification: LocalNotificationSchema | DeliveredNotificationSchema): string {
  return (
    extraValue("extra" in notification ? notification.extra : undefined, "type") ??
    extraValue("data" in notification ? notification.data : undefined, "type") ??
    "system"
  );
}

function mergeHistoryItem(item: GrowlyNotificationHistoryItem): void {
  const history = parseJsonArray<GrowlyNotificationHistoryItem>(NOTIFICATION_HISTORY_KEY);
  const existing = history.find((entry) => entry.uid === item.uid);
  const sourceRank: Record<GrowlyNotificationSource, number> = {
    scheduled: 0,
    delivered: 1,
    received: 2,
    opened: 3,
  };
  const nextItem = existing
    ? {
        ...existing,
        ...item,
        readAt: existing.readAt,
        source: sourceRank[item.source] > sourceRank[existing.source] ? item.source : existing.source,
      }
    : item;
  const nextHistory = [
    nextItem,
    ...history.filter((entry) => entry.uid !== item.uid),
  ]
    .sort((first, second) => new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime())
    .slice(0, NOTIFICATION_HISTORY_LIMIT);
  writeJsonArray(NOTIFICATION_HISTORY_KEY, nextHistory);
}

function recordScheduledDueNotification(notification: GrowlyScheduledNotification, occurredAt: Date): void {
  mergeHistoryItem({
    uid: historyUid(notification.notificationId, occurredAt),
    notificationId: notification.notificationId,
    title: notification.title,
    body: notification.body,
    type: notification.type,
    route: notification.route,
    occurredAt: occurredAt.toISOString(),
    capturedAt: new Date().toISOString(),
    source: "scheduled",
  });
}

function occurrenceDatesSince(notification: GrowlyScheduledNotification, now = new Date()): Date[] {
  const firstDate = dateFromUnknown(notification.scheduledAt);
  if (!firstDate || firstDate.getTime() > now.getTime()) {
    return [];
  }
  if (!notification.repeats) {
    return [firstDate];
  }
  const intervalDays = notification.every === "week" ? 7 : notification.every === "day" ? 1 : 0;
  if (!intervalDays) {
    return [firstDate];
  }
  const latest = new Date(firstDate);
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
  const elapsedIntervals = Math.floor((now.getTime() - firstDate.getTime()) / intervalMs);
  latest.setTime(firstDate.getTime() + elapsedIntervals * intervalMs);
  return [latest];
}

function scheduledSummary(notification: LocalNotificationSchema): GrowlyScheduledNotification | null {
  const scheduledAt = dateFromUnknown(notification.schedule?.at);
  if (!scheduledAt) {
    return null;
  }
  const type = typeForNotification(notification);
  return {
    notificationId: notification.id,
    title: notification.title,
    body: notification.body,
    type,
    route: routeForNotification(notification),
    scheduledAt: scheduledAt.toISOString(),
    repeats: notification.schedule?.repeats === true,
    every: notification.schedule?.every,
  };
}

function saveScheduledNotifications(notifications: LocalNotificationSchema[]): void {
  const scheduled = notifications
    .map(scheduledSummary)
    .filter((notification): notification is GrowlyScheduledNotification => notification !== null);
  writeJsonArray(NOTIFICATION_SCHEDULE_KEY, scheduled);
}

export function growlyNotificationHistory(): GrowlyNotificationHistoryItem[] {
  return parseJsonArray<GrowlyNotificationHistoryItem>(NOTIFICATION_HISTORY_KEY)
    .sort((first, second) => new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime());
}

export function growlyScheduledNotifications(): GrowlyScheduledNotification[] {
  const now = Date.now();
  return parseJsonArray<GrowlyScheduledNotification>(NOTIFICATION_SCHEDULE_KEY)
    .filter((notification) => new Date(notification.scheduledAt).getTime() > now)
    .sort((first, second) => new Date(first.scheduledAt).getTime() - new Date(second.scheduledAt).getTime());
}

export function unreadGrowlyNotificationCount(): number {
  return growlyNotificationHistory().filter((notification) => !notification.readAt).length;
}

export function markGrowlyNotificationsRead(): void {
  const readAt = new Date().toISOString();
  writeJsonArray(
    NOTIFICATION_HISTORY_KEY,
    growlyNotificationHistory().map((notification) => ({
      ...notification,
      readAt: notification.readAt ?? readAt,
    })),
  );
}

export function clearGrowlyNotificationHistory(): void {
  writeJsonArray(NOTIFICATION_HISTORY_KEY, []);
}

export function backfillDueGrowlyNotifications(): void {
  const scheduled = parseJsonArray<GrowlyScheduledNotification>(NOTIFICATION_SCHEDULE_KEY);
  const now = new Date();
  scheduled.forEach((notification) => {
    occurrenceDatesSince(notification, now).forEach((occurredAt) => {
      recordScheduledDueNotification(notification, occurredAt);
    });
  });
}

export function recordGrowlyNotificationDelivery(
  notification: LocalNotificationSchema | DeliveredNotificationSchema,
  source: GrowlyNotificationSource,
): void {
  const scheduledAt = dateFromUnknown("schedule" in notification ? notification.schedule?.at : undefined);
  const now = new Date();
  const occurredAt = scheduledAt && scheduledAt.getTime() <= now.getTime() + 5 * 60_000 ? scheduledAt : now;
  mergeHistoryItem({
    uid: historyUid(notification.id, occurredAt),
    notificationId: notification.id,
    title: notification.title,
    body: notification.body,
    type: typeForNotification(notification),
    route: routeForNotification(notification),
    occurredAt: occurredAt.toISOString(),
    capturedAt: now.toISOString(),
    source,
  });
}

export async function syncGrowlyNotificationHistory(): Promise<void> {
  backfillDueGrowlyNotifications();
  if (!isNotificationSupported()) {
    return;
  }
  const delivered = await LocalNotifications.getDeliveredNotifications();
  delivered.notifications
    .filter((notification) => MANAGED_NOTIFICATION_IDS.includes(notification.id))
    .forEach((notification) => recordGrowlyNotificationDelivery(notification, "delivered"));
}

export function growlyNotificationTargetRoute(notification: LocalNotificationSchema): string {
  return routeForNotification(notification);
}

export function growlyNotificationsEnabled(): boolean {
  try {
    return window.localStorage.getItem(NOTIFICATION_ENABLED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setGrowlyNotificationsEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(NOTIFICATION_ENABLED_KEY, enabled ? "true" : "false");
  } catch {
    // Storage is best effort in embedded contexts.
  }
}

export async function growlyNotificationStatus(): Promise<GrowlyNotificationStatus> {
  if (!isNotificationSupported()) {
    return "unsupported";
  }
  const permissions = await LocalNotifications.checkPermissions();
  if (permissions.display === "granted") {
    return growlyNotificationsEnabled() ? "granted" : "off";
  }
  if (permissions.display === "denied") {
    return "denied";
  }
  return growlyNotificationsEnabled() ? "prompt" : "off";
}

export async function cancelGrowlyNotifications(): Promise<void> {
  backfillDueGrowlyNotifications();
  if (!isNotificationSupported()) {
    setGrowlyNotificationsEnabled(false);
    saveScheduledNotifications([]);
    return;
  }
  await cancelPendingGrowlyNotifications();
  await removeDeliveredGrowlyNotifications();
  setGrowlyNotificationsEnabled(false);
  saveScheduledNotifications([]);
}

async function cancelPendingGrowlyNotifications(): Promise<void> {
  const ids = new Set(MANAGED_NOTIFICATION_IDS);
  try {
    const pending = await LocalNotifications.getPending();
    pending.notifications
      .filter(isGrowlyNotification)
      .forEach((notification) => ids.add(notification.id));
  } catch {
    // Pending lookup is best effort; the managed IDs still cover current Growly schedules.
  }
  await LocalNotifications.cancel({
    notifications: Array.from(ids).map((id) => ({ id })),
  });
}

async function removeDeliveredGrowlyNotifications(): Promise<void> {
  try {
    const delivered = await LocalNotifications.getDeliveredNotifications();
    const notifications = delivered.notifications.filter(isGrowlyNotification);
    if (notifications.length) {
      await LocalNotifications.removeDeliveredNotifications({ notifications });
    }
  } catch {
    // Removing visible notifications is best effort and should not block scheduling.
  }
}

export async function scheduleGrowlyNotifications(hubId = "", requestPermission = false): Promise<GrowlyNotificationStatus> {
  backfillDueGrowlyNotifications();
  if (!isNotificationSupported()) {
    setGrowlyNotificationsEnabled(false);
    saveScheduledNotifications([]);
    return "unsupported";
  }

  let permissions = await LocalNotifications.checkPermissions();
  if (permissions.display !== "granted" && requestPermission) {
    permissions = await LocalNotifications.requestPermissions();
  }
  if (permissions.display !== "granted") {
    setGrowlyNotificationsEnabled(false);
    saveScheduledNotifications([]);
    return permissions.display === "denied" ? "denied" : "prompt";
  }

  setGrowlyNotificationsEnabled(true);
  const preferences = growlyNotificationPreferences();
  const [plants, weather] = await Promise.all([
    fetchPlants(hubId),
    fetchWeatherForecast(hubId),
  ]);
  const notifications = [
    ...recurringCareNotifications(plants, weather, preferences),
    ...calendarNotifications(weather, preferences),
    ...weatherAlertNotifications(weather, preferences),
  ].map((notification) => moveToNextUnsentDay(notification, weather, preferences));

  await cancelPendingGrowlyNotifications();
  await removeDeliveredGrowlyNotifications();
  if (notifications.length) {
    await LocalNotifications.schedule({ notifications });
  }
  saveScheduledNotifications(notifications);
  return "granted";
}
