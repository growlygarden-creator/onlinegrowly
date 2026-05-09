import { Capacitor } from "@capacitor/core";
import { LocalNotifications, type DeliveredNotificationSchema, type LocalNotificationSchema } from "@capacitor/local-notifications";
import { fetchPlants, fetchWeatherForecast, type GrowlyPlant, type WeatherForecast } from "./api";

const NOTIFICATION_ENABLED_KEY = "growly.notifications.enabled";
const NOTIFICATION_HISTORY_KEY = "growly.notifications.history";
const NOTIFICATION_SCHEDULE_KEY = "growly.notifications.scheduled";
const NOTIFICATION_HISTORY_LIMIT = 80;
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

function isNotificationSupported(): boolean {
  return Capacitor.isNativePlatform();
}

function nextTime(hour: number, minute: number, minimumDelayMinutes = 15): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() <= Date.now() + minimumDelayMinutes * 60_000) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function dateAtTime(baseDate: Date, hour: number, minute: number): Date {
  const date = new Date(baseDate);
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() <= Date.now() + 15 * 60_000) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function plantDisplayName(plant: GrowlyPlant): string {
  return plant.display_name || plant.nickname || plant.catalogItemId || plant.profileId || "planten";
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

function weatherAlertNotifications(weather: WeatherForecast | null): LocalNotificationSchema[] {
  if (!weather) {
    return [];
  }

  const notifications: LocalNotificationSchema[] = [];
  const days = weather.forecast.days ?? [];
  const hours = weather.forecast.hours ?? [];
  const frostDay = days.find((day) => typeof day.temperature_min === "number" && day.temperature_min <= 2);
  const heatDay = days.find((day) => typeof day.temperature_max === "number" && day.temperature_max >= 28);
  const windHour = hours.find((hour) => typeof hour.wind_speed === "number" && hour.wind_speed >= 10);

  if (frostDay) {
    notifications.push({
      id: 14001,
      title: "Fare for kald natt",
      body: `Laveste temperatur er meldt rundt ${frostDay.temperature_min?.toFixed(0)}°C. Dekk eller flytt varme planter i tide.`,
      schedule: { at: dateAtTime(new Date(`${frostDay.date}T12:00:00`), 18, 30) },
      extra: notificationExtra("weather-frost"),
    });
  }

  if (heatDay) {
    notifications.push({
      id: 14002,
      title: "Sterk varme i vente",
      body: `Det kan bli rundt ${heatDay.temperature_max?.toFixed(0)}°C. Planlegg lufting, skygge og rolig vanning.`,
      schedule: { at: dateAtTime(new Date(`${heatDay.date}T12:00:00`), 8, 30) },
      extra: notificationExtra("weather-heat"),
    });
  }

  if (windHour) {
    const windDate = new Date(windHour.time);
    notifications.push({
      id: 14003,
      title: "Vind å følge med på",
      body: `Vinden kan komme opp i ${windHour.wind_speed?.toFixed(1)} m/s. Sikre lette potter og luft forsiktig.`,
      schedule: { at: dateAtTime(windDate, Math.max(7, windDate.getHours() - 2), 0) },
      extra: notificationExtra("weather-wind"),
    });
  }

  return notifications;
}

function recurringCareNotifications(plants: GrowlyPlant[]): LocalNotificationSchema[] {
  if (!plants.length) {
    return [];
  }

  const firstPlant = plantDisplayName(plants[0]);
  const plantText = plants.length === 1 ? firstPlant : `${firstPlant} og ${plants.length - 1} til`;
  return [
    {
      id: 11001,
      title: "Påminnelse om vanning",
      body: `Sjekk jordfukt og potter for ${plantText}. Vann rolig hvis jorda kjennes tørr.`,
      schedule: { at: nextTime(9, 0), repeats: true, every: "day" },
      extra: notificationExtra("watering"),
    },
    {
      id: 12001,
      title: "Plantesjekk",
      body: "Se raskt over nye skudd, bladundersider og blomster. Små tegn er lettest å rette tidlig.",
      schedule: { at: nextTime(18, 0), repeats: true, every: "day" },
      extra: notificationExtra("plant-check"),
    },
  ];
}

function calendarNotifications(): LocalNotificationSchema[] {
  return [
    {
      id: 13001,
      title: "Kalender og såoppgaver",
      body: "Sjekk ukens så-, flytte- og oppfølgingsoppgaver i Growly-kalenderen.",
      schedule: { at: nextTime(8, 30), repeats: true, every: "week" },
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
  await LocalNotifications.cancel({
    notifications: MANAGED_NOTIFICATION_IDS.map((id) => ({ id })),
  });
  setGrowlyNotificationsEnabled(false);
  saveScheduledNotifications([]);
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
  const [plants, weather] = await Promise.all([
    fetchPlants(hubId),
    fetchWeatherForecast(hubId),
  ]);
  const notifications = [
    ...recurringCareNotifications(plants),
    ...calendarNotifications(),
    ...weatherAlertNotifications(weather),
  ];

  await LocalNotifications.cancel({
    notifications: MANAGED_NOTIFICATION_IDS.map((id) => ({ id })),
  });
  if (notifications.length) {
    await LocalNotifications.schedule({ notifications });
  }
  saveScheduledNotifications(notifications);
  return "granted";
}
