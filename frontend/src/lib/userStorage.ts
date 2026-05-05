import type { AuthSession } from "./api";

function storageScope(session: AuthSession | null): string {
  const username = session?.username || session?.user?.username || "anonymous";
  const hubId = session?.hub?.hub_id || "no-hub";
  return `${encodeURIComponent(username)}.${encodeURIComponent(hubId)}`;
}

export function userStorageKey(baseKey: string, session: AuthSession | null): string {
  return `${baseKey}.${storageScope(session)}`;
}

export function readUserArray<T>(baseKey: string, session: AuthSession | null): T[] {
  try {
    const raw = window.localStorage.getItem(userStorageKey(baseKey, session));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeUserArray<T>(baseKey: string, session: AuthSession | null, value: T[]): void {
  window.localStorage.setItem(userStorageKey(baseKey, session), JSON.stringify(value));
}
