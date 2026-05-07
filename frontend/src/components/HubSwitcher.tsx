import type { AuthSession } from "../lib/api";

type HubSwitcherProps = {
  session: AuthSession;
  selectedHubId: string;
  onSelectHub: (hubId: string) => void;
};

export function HubSwitcher({ session, selectedHubId, onSelectHub }: HubSwitcherProps) {
  const hubs = session.hubs ?? [];
  if (hubs.length <= 1) {
    return null;
  }

  const selectedHub = hubs.find((hub) => hub.hub_id === selectedHubId) ?? hubs[0];

  return (
    <div className="hub-switcher" aria-label="Velg hub">
      <span>
        <small>Aktiv hub</small>
        <strong>{selectedHub.location_label || selectedHub.hub_name}</strong>
      </span>
      <select
        value={selectedHub.hub_id}
        onChange={(event) => onSelectHub(event.target.value)}
        aria-label="Velg aktiv hub"
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
