import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  clearGrowlyNotificationHistory,
  growlyNotificationHistory,
  growlyScheduledNotifications,
  markGrowlyNotificationsRead,
  syncGrowlyNotificationHistory,
  type GrowlyNotificationHistoryItem,
  type GrowlyScheduledNotification,
} from "../lib/notifications";
import { useI18n, type AppLanguage, type TranslationKey } from "../lib/i18n";

const notificationTypeLabels: Record<string, TranslationKey> = {
  watering: "notifications.type.watering",
  "plant-check": "notifications.type.plantCheck",
  calendar: "notifications.type.calendar",
  "weather-frost": "notifications.type.weatherFrost",
  "weather-heat": "notifications.type.weatherHeat",
  "weather-wind": "notifications.type.weatherWind",
  "soil-battery": "notifications.type.soilBattery",
};

const notificationSourceLabels: Record<string, TranslationKey> = {
  received: "notifications.source.received",
  opened: "notifications.source.opened",
  delivered: "notifications.source.delivered",
  scheduled: "notifications.source.scheduled",
};

function formatNotificationTime(value: string, language: AppLanguage, t: ReturnType<typeof useI18n>["t"]): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("notifications.time.unknown");
  }
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const locale = language === "no" ? "nb-NO" : "en-US";
  const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === today.toDateString()) {
    return t("notifications.time.today", { time });
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return t("notifications.time.yesterday", { time });
  }
  return date.toLocaleDateString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function notificationLabel(type: string, t: ReturnType<typeof useI18n>["t"]): string {
  return notificationTypeLabels[type] ? t(notificationTypeLabels[type]) : "Growly";
}

function sourceLabel(source: string, t: ReturnType<typeof useI18n>["t"]): string {
  return notificationSourceLabels[source] ? t(notificationSourceLabels[source]) : t("notifications.source.saved");
}

export function NotificationsPage() {
  const { language, t } = useI18n();
  const [history, setHistory] = useState<GrowlyNotificationHistoryItem[]>([]);
  const [upcoming, setUpcoming] = useState<GrowlyScheduledNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadNotifications() {
      setLoading(true);
      await syncGrowlyNotificationHistory().catch(() => undefined);
      if (cancelled) {
        return;
      }
      setHistory(growlyNotificationHistory());
      setUpcoming(growlyScheduledNotifications());
      markGrowlyNotificationsRead();
      setLoading(false);
    }
    loadNotifications();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleClearHistory() {
    clearGrowlyNotificationHistory();
    setHistory([]);
  }

  return (
    <main className="page-shell app-page notifications-page">
      <section className="screen-header">
        <div>
          <p className="section-kicker">{t("notifications.title")}</p>
          <h1>{t("notifications.title")}</h1>
          <p>{t("notifications.subtitle")}</p>
        </div>
        <Link className="icon-button" to="/" aria-label={t("notifications.backAria")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </Link>
      </section>

      <section className="notification-summary-grid">
        <article className="soft-card notification-summary-card">
          <span>{t("notifications.saved")}</span>
          <strong>{history.length}</strong>
          <small>{history.length === 1 ? t("notifications.notificationSingular") : t("notifications.notificationPlural")}</small>
        </article>
        <article className="soft-card notification-summary-card">
          <span>{t("notifications.upcoming")}</span>
          <strong>{upcoming.length}</strong>
          <small>{upcoming.length === 1 ? t("notifications.reminderSingular") : t("notifications.reminderPlural")}</small>
        </article>
      </section>

      <section className="settings-section">
        <div className="notification-section-head">
          <div>
            <p className="section-kicker">{t("notifications.history")}</p>
            <h2>{t("notifications.latest")}</h2>
          </div>
          {history.length ? (
            <button className="text-action" type="button" onClick={handleClearHistory}>
              {t("notifications.clear")}
            </button>
          ) : null}
        </div>
        {loading ? (
          <article className="soft-card notification-empty-card">
            <strong>{t("notifications.loadingTitle")}</strong>
            <span>{t("notifications.loadingBody")}</span>
          </article>
        ) : history.length ? (
          <div className="notification-log-list">
            {history.map((notification) => (
              <article className="soft-card notification-log-item" key={notification.uid}>
                <span className="notification-log-dot" aria-hidden="true" />
                <div className="notification-log-content">
                  <div className="notification-log-title">
                    <strong>{notification.title}</strong>
                    <time>{formatNotificationTime(notification.occurredAt, language, t)}</time>
                  </div>
                  <p>{notification.body}</p>
                  <div className="notification-log-meta">
                    <span>{notificationLabel(notification.type, t)}</span>
                    <span>{sourceLabel(notification.source, t)}</span>
                    <Link to={notification.route}>{t("notifications.open")}</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <article className="soft-card notification-empty-card">
            <strong>{t("notifications.emptyHistoryTitle")}</strong>
            <span>{t("notifications.emptyHistoryBody")}</span>
          </article>
        )}
      </section>

      <section className="settings-section">
        <div className="notification-section-head">
          <div>
            <p className="section-kicker">{t("notifications.scheduled")}</p>
            <h2>{t("notifications.nextReminders")}</h2>
          </div>
        </div>
        {upcoming.length ? (
          <div className="notification-upcoming-list">
            {upcoming.slice(0, 5).map((notification) => (
              <article className="soft-card notification-upcoming-item" key={`${notification.notificationId}-${notification.scheduledAt}`}>
                <span>
                  <small>{notificationLabel(notification.type, t)}</small>
                  <strong>{notification.title}</strong>
                </span>
                <time>{formatNotificationTime(notification.scheduledAt, language, t)}</time>
              </article>
            ))}
          </div>
        ) : (
          <article className="soft-card notification-empty-card">
            <strong>{t("notifications.emptyUpcomingTitle")}</strong>
            <span>{t("notifications.emptyUpcomingBody")}</span>
          </article>
        )}
      </section>
    </main>
  );
}
