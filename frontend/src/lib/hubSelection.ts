import type { AuthSession } from "./api";

const HUB_SELECTION_STORAGE_KEY = "growly.selectedHub";

function userHubStorageKey(username: string): string {
  return `${HUB_SELECTION_STORAGE_KEY}.${username || "anonymous"}`;
}

export function selectedHubIdForSession(session: AuthSession | null): string {
  const hubs = session?.hubs ?? [];
  const username = session?.username || "";
  if (!hubs.length) {
    return "";
  }

  try {
    const storedHubId = window.localStorage.getItem(userHubStorageKey(username)) || "";
    if (storedHubId && hubs.some((hub) => hub.hub_id === storedHubId)) {
      return storedHubId;
    }
  } catch {
    // Fall back to the active session hub when storage is unavailable.
  }

  return session?.hub?.hub_id || hubs[0]?.hub_id || "";
}

export function persistSelectedHubId(session: AuthSession | null, hubId: string): void {
  const username = session?.username || "";
  if (!username || !hubId) {
    return;
  }

  try {
    window.localStorage.setItem(userHubStorageKey(username), hubId);
  } catch {
    // Ignore storage errors in embedded browser contexts.
  }
}

export function sessionWithSelectedHub(session: AuthSession, hubId: string): AuthSession {
  const hubs = session.hubs ?? [];
  const selectedHub = hubs.find((hub) => hub.hub_id === hubId) ?? session.hub;
  return {
    ...session,
    hub: selectedHub ?? null,
  };
}
