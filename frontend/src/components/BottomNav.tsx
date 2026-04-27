import { NavLink } from "react-router-dom";

type Tab = {
  label: string;
  to: string;
  icon: (props: { className?: string }) => JSX.Element;
};

const tabs: Tab[] = [
  {
    label: "Start",
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
    label: "Planter",
    to: "/drivhus",
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2c.3 0 .6.1.8.3l8.7 7.1c.3.2.5.6.5 1v9.7c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-9.7c0-.4.2-.8.5-1l8.7-7.1c.2-.2.5-.3.8-.3Zm0 2.4-8 6.6V20h6v-5.8c0-.6.4-1 1-1h2c.6 0 1 .4 1 1V20h6v-9l-8-6.6Z"
        />
        <path fill="currentColor" d="M8 12.2h8v1.6H8z" />
      </svg>
    ),
  },
  {
    label: "Dyrkelogg",
    to: "/kalender",
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm12 8H5v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10Z"
        />
        <path fill="currentColor" d="M7 12.5h3v3H7z" />
      </svg>
    ),
  },
  {
    label: "Innstillinger",
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
  return (
    <nav className="bottom-nav" aria-label="Hovedmeny">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `bottom-nav__item${isActive ? " is-active" : ""}`}
          end={tab.to === "/"}
        >
          <tab.icon className="bottom-nav__icon" />
          <span className="bottom-nav__label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
