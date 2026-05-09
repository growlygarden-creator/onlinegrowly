import type { AuthSession } from "../lib/api";
import { useI18n } from "../lib/i18n";

type HubSwitcherProps = {
  session: AuthSession;
  selectedHubId: string;
  onSelectHub: (hubId: string) => void;
};

export function HubSwitcher({ session, selectedHubId, onSelectHub }: HubSwitcherProps) {
  const { t } = useI18n();
  const hubs = session.hubs ?? [];
  if (hubs.length <= 1) {
    return null;
  }

  const selectedHub = hubs.find((hub) => hub.hub_id === selectedHubId) ?? hubs[0];

  return (
    <div className="hub-switcher" aria-label={t("hubSwitcher.aria")}>
      <span>
        <small>{t("hubSwitcher.active")}</small>
        <strong>{selectedHub.location_label || selectedHub.hub_name}</strong>
      </span>
      <select
        value={selectedHub.hub_id}
        onChange={(event) => onSelectHub(event.target.value)}
        aria-label={t("hubSwitcher.selectAria")}
      >
        {hubs.map((hub) => (
          <option key={hub.hub_id} value={hub.hub_id}>
            {hub.location_label || hub.hub_name}
          </option>
        ))}
      </select>
    </div>
  );
}
