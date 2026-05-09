import { NavLink } from "react-router-dom";
import { useI18n, type TranslationKey } from "../lib/i18n";

type Tab = {
  labelKey: TranslationKey;
  shortLabelKey?: TranslationKey;
  to: string;
  icon: (props: { className?: string }) => JSX.Element;
};

const tabs: Tab[] = [
  {
    labelKey: "nav.start",
    to: "/",
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 3.1 3 10.3v10.2c0 .8.7 1.5 1.5 1.5H9v-6.4c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3V22h4.5c.8 0 1.5-.7 1.5-1.5V10.3l-9-7.2Z"
        />
      </svg>
    ),
  },
  {
    labelKey: "nav.calendar",
    to: "/kalender",
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M7 3.5v3M17 3.5v3M4.5 9h15M6.5 5.5h11A2.5 2.5 0 0 1 20 8v9.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5V8a2.5 2.5 0 0 1 2.5-2.5ZM8 12.5h.1M12 12.5h.1M16 12.5h.1M8 16h.1M12 16h.1"
        />
      </svg>
    ),
  },
  {
    labelKey: "nav.plants",
    to: "/drivhus",
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M4 20V11.4L12 5l8 6.4V20M7.5 20v-6.5h9V20M3 20h18M12 5v15"
        />
      </svg>
    ),
  },
  {
    labelKey: "nav.catalog",
    shortLabelKey: "nav.catalogShort",
    to: "/kartotek",
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16V4.5Zm0 0v11.2A3.3 3.3 0 0 0 8.3 19M8.5 8h6M8.5 11.5h7"
        />
      </svg>
    ),
  },
  {
    labelKey: "nav.settings",
    to: "/settings",
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M19.4 13a7.8 7.8 0 0 0 0-2l2-1.5a.9.9 0 0 0 .3-1.1l-1.9-3.3a.9.9 0 0 0-1-.4l-2.4 1a8 8 0 0 0-1.7-1L14.3 2a.9.9 0 0 0-.9-.7h-3.8a.9.9 0 0 0-.9.7L8.3 4.7a8 8 0 0 0-1.7 1l-2.4-1a.9.9 0 0 0-1 .4L1.3 8.4a.9.9 0 0 0 .3 1.1l2 1.5a7.8 7.8 0 0 0 0 2l-2 1.5a.9.9 0 0 0-.3 1.1l1.9 3.3c.2.4.7.6 1 .4l2.4-1a8 8 0 0 0 1.7 1l.4 2.7c.1.4.5.7.9.7h3.8c.4 0 .8-.3.9-.7l.4-2.7a8 8 0 0 0 1.7-1l2.4 1c.4.2.8 0 1-.4l1.9-3.3a.9.9 0 0 0-.3-1.1l-2-1.5ZM11.5 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
        />
      </svg>
    ),
  },
];

export function BottomNav() {
  const { t } = useI18n();

  return (
    <nav className="bottom-nav" aria-label={t("nav.aria")}>
      {tabs.map((tab) => {
        const label = t(tab.labelKey);
        const shortLabel = tab.shortLabelKey ? t(tab.shortLabelKey) : label;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `bottom-nav__item${isActive ? " is-active" : ""}`}
            end={tab.to === "/"}
          >
            <tab.icon className="bottom-nav__icon" />
            <span className="bottom-nav__label bottom-nav__label--full">{label}</span>
            <span className="bottom-nav__label bottom-nav__label--short">{shortLabel}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
