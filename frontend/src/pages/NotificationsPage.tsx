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

const notificationTypeLabels: Record<string, string> = {
  watering: "Vanning",
  "plant-check": "Plantesjekk",
  calendar: "Kalender",
  "weather-frost": "Kald natt",
  "weather-heat": "Varme",
  "weather-wind": "Vind",
  system: "Growly",
};

const notificationSourceLabels: Record<string, string> = {
  received: "Mottatt",
  opened: "Åpnet",
  delivered: "Levert",
  scheduled: "Planlagt",
};

function formatNotificationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Ukjent tid";
  }
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const time = date.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === today.toDateString()) {
    return `I dag ${time}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `I går ${time}`;
  }
  return date.toLocaleDateString("nb-NO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function notificationLabel(type: string): string {
  return notificationTypeLabels[type] ?? "Growly";
}

function sourceLabel(source: string): string {
  return notificationSourceLabels[source] ?? "Lagret";
}

export function NotificationsPage() {
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
          <p className="section-kicker">Varsler</p>
          <h1>Varsler</h1>
          <p>Siste beskjeder fra Growly og neste planlagte påminnelser.</p>
        </div>
        <Link className="icon-button" to="/" aria-label="Tilbake til start">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </Link>
      </section>

      <section className="notification-summary-grid">
        <article className="soft-card notification-summary-card">
          <span>Lagret</span>
          <strong>{history.length}</strong>
          <small>{history.length === 1 ? "varsel" : "varsler"}</small>
        </article>
        <article className="soft-card notification-summary-card">
          <span>Kommende</span>
          <strong>{upcoming.length}</strong>
          <small>{upcoming.length === 1 ? "påminnelse" : "påminnelser"}</small>
        </article>
      </section>

      <section className="settings-section">
        <div className="notification-section-head">
          <div>
            <p className="section-kicker">Historikk</p>
            <h2>Siste varsler</h2>
          </div>
          {history.length ? (
            <button className="text-action" type="button" onClick={handleClearHistory}>
              Tøm
            </button>
          ) : null}
        </div>
        {loading ? (
          <article className="soft-card notification-empty-card">
            <strong>Laster varsler...</strong>
            <span>Henter siste Growly-beskjeder.</span>
          </article>
        ) : history.length ? (
          <div className="notification-log-list">
            {history.map((notification) => (
              <article className="soft-card notification-log-item" key={notification.uid}>
                <span className="notification-log-dot" aria-hidden="true" />
                <div className="notification-log-content">
                  <div className="notification-log-title">
                    <strong>{notification.title}</strong>
                    <time>{formatNotificationTime(notification.occurredAt)}</time>
                  </div>
                  <p>{notification.body}</p>
                  <div className="notification-log-meta">
                    <span>{notificationLabel(notification.type)}</span>
                    <span>{sourceLabel(notification.source)}</span>
                    <Link to={notification.route}>Åpne</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <article className="soft-card notification-empty-card">
            <strong>Ingen varsler lagret ennå</strong>
            <span>Nye Growly-varsler dukker opp her etter hvert.</span>
          </article>
        )}
      </section>

      <section className="settings-section">
        <div className="notification-section-head">
          <div>
            <p className="section-kicker">Planlagt</p>
            <h2>Neste påminnelser</h2>
          </div>
        </div>
        {upcoming.length ? (
          <div className="notification-upcoming-list">
            {upcoming.slice(0, 5).map((notification) => (
              <article className="soft-card notification-upcoming-item" key={`${notification.notificationId}-${notification.scheduledAt}`}>
                <span>
                  <small>{notificationLabel(notification.type)}</small>
                  <strong>{notification.title}</strong>
                </span>
                <time>{formatNotificationTime(notification.scheduledAt)}</time>
              </article>
            ))}
          </div>
        ) : (
          <article className="soft-card notification-empty-card">
            <strong>Ingen kommende påminnelser</strong>
            <span>Aktiver varsler i innstillingene når du vil ha Growly-påminnelser.</span>
          </article>
        )}
      </section>
    </main>
  );
}
