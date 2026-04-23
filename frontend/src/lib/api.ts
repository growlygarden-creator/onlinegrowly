export type PairingInfo = {
  token: string;
  expires_at: string;
};

export type AuthSession = {
  authenticated: boolean;
  username: string;
  is_admin: boolean;
  settings_unlocked: boolean;
  user: {
    username: string;
    full_name: string;
    phone: string;
    email: string;
    is_active: boolean;
    is_admin: boolean;
  } | null;
  hub: {
    hub_id: string;
    hub_name: string;
    owner_username: string;
    sensor_url: string;
    local_ip: string;
  } | null;
};

type ApiError = {
  ok: false;
  error: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function fetchSession(): Promise<AuthSession | null> {
  const response = await fetch("/api/auth/session", {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  const result = await parseJson<{ ok: true; session: AuthSession }>(response);
  return result.session;
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const result = await parseJson<ApiError>(response);
    throw new Error(result.error);
  }

  const result = await parseJson<{ ok: true; session: AuthSession }>(response);
  return result.session;
}

export async function registerAccount(payload: {
  full_name: string;
  phone: string;
  email: string;
  username: string;
  password: string;
  password_confirm: string;
}): Promise<AuthSession> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const result = await parseJson<ApiError>(response);
    throw new Error(result.error);
  }

  const result = await parseJson<{ ok: true; session: AuthSession }>(response);
  return result.session;
}

export async function logout(): Promise<void> {
  await fetch("/logout", {
    method: "POST",
    credentials: "include",
  });
}

export async function fetchActivePairing(): Promise<PairingInfo | null> {
  const response = await fetch("/api/hubs/pairing-token", {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  return result.pairing ?? null;
}

export async function createPairing(): Promise<PairingInfo | null> {
  const response = await fetch("/api/hubs/pairing-token", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  return result.pairing ?? null;
}
