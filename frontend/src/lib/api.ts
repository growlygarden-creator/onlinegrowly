export type PairingInfo = {
  token: string;
  expires_at: string;
};

export type LatestSample = {
  recorded_at?: string | null;
  air_temperature?: number | null;
  air_humidity?: number | null;
  humidity?: number | null;
  temperature?: number | null;
  ph?: number | null;
  conductivity?: number | null;
  nitrogen?: number | null;
  phosphorus?: number | null;
  potassium?: number | null;
  salinity?: number | null;
  tds?: number | null;
  lux?: number | null;
  valid?: number | boolean | null;
};

export type HistoryPoint = {
  recorded_at: string;
  value: number;
};

export type HistoryResponse = {
  ok: true;
  metric: string;
  points: HistoryPoint[];
};

export type PlantRange = {
  optimal: [number, number];
  caution: [number, number];
};

export type PlantCatalogItem = {
  id: string;
  kind: "base" | "variant" | "cultivar";
  profile_id: string;
  variant_id: string | null;
  cultivar_id: string | null;
  name: string;
  display_name: string;
  subtitle: string;
  family: string;
  icon: string;
  tone: "tomato" | "cucumber" | "basil" | "leafy" | "berry" | "pepper";
  ranges: {
    airTemperature: PlantRange;
    airHumidity: PlantRange;
    soilHumidity: PlantRange;
    soilTemperature: PlantRange;
    ph: PlantRange;
    lux: PlantRange;
  };
  notes: string;
  watering: string;
  seed_guide?: {
    sow: string;
    start: string;
    repot: string;
    plant_out: string;
    harvest: string;
  };
  category: string;
  latin_name: string;
};

const DEFAULT_NATIVE_API_BASE = "https://onlinegrowly.onrender.com";
const API_BASE_URL = (() => {
  const configuredBase = (import.meta.env.VITE_API_BASE_URL || "").trim();
  if (configuredBase) {
    return configuredBase.replace(/\/$/, "");
  }

  if (window.location.protocol === "capacitor:") {
    return DEFAULT_NATIVE_API_BASE;
  }

  return "";
})();

export type AuthSession = {
  authenticated: boolean;
  username: string;
  is_admin: boolean;
  settings_unlocked: boolean;
  api_token?: string;
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

const REQUEST_TIMEOUT_MS = 3500;
const API_AUTH_TOKEN_KEY = "growly.apiToken";

async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

function apiUrl(path: string): string {
  if (!API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

function storedApiToken(): string {
  try {
    return window.localStorage.getItem(API_AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function persistApiToken(session: AuthSession | null): void {
  try {
    if (session?.api_token) {
      window.localStorage.setItem(API_AUTH_TOKEN_KEY, session.api_token);
      return;
    }
    window.localStorage.removeItem(API_AUTH_TOKEN_KEY);
  } catch {
    // localStorage can be unavailable in some embedded contexts.
  }
}

function authHeaders(headers?: HeadersInit): HeadersInit {
  const token = storedApiToken();
  if (!token) {
    return headers ?? {};
  }

  return {
    ...(headers ?? {}),
    Authorization: `Bearer ${token}`,
  };
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("backend_unavailable");
    }

    throw new Error("backend_unavailable");
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function fetchSession(): Promise<AuthSession | null> {
  try {
    const response = await fetchWithTimeout(apiUrl("/api/auth/session"), {
      credentials: "include",
      cache: "no-store",
      headers: authHeaders(),
    });
    if (!response.ok) {
      return null;
    }

    const result = await parseJson<{ ok: true; session: AuthSession }>(response);
    if (result.session?.authenticated) {
      persistApiToken(result.session);
    }
    return result.session;
  } catch {
    return null;
  }
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const response = await fetchWithTimeout(apiUrl("/api/auth/login"), {
    method: "POST",
    credentials: "include",
    headers: {
      ...authHeaders({ "Content-Type": "application/json" }),
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const result = await parseJson<ApiError>(response);
    throw new Error(result.error);
  }

  const result = await parseJson<{ ok: true; session: AuthSession }>(response);
  persistApiToken(result.session);
  return result.session;
}

export async function registerAccount(payload: {
  full_name: string;
  phone: string;
  email: string;
  password: string;
  password_confirm: string;
}): Promise<AuthSession> {
  const response = await fetchWithTimeout(apiUrl("/api/auth/register"), {
    method: "POST",
    credentials: "include",
    headers: {
      ...authHeaders({ "Content-Type": "application/json" }),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const result = await parseJson<ApiError>(response);
    throw new Error(result.error);
  }

  const result = await parseJson<{ ok: true; session: AuthSession }>(response);
  persistApiToken(result.session);
  return result.session;
}

export async function logout(): Promise<void> {
  persistApiToken(null);
  await fetchWithTimeout(apiUrl("/logout"), {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
  });
}

export async function fetchActivePairing(): Promise<PairingInfo | null> {
  try {
    const response = await fetchWithTimeout(apiUrl("/api/hubs/pairing-token"), {
      credentials: "include",
      cache: "no-store",
      headers: authHeaders(),
    });
    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.pairing ?? null;
  } catch {
    return null;
  }
}

export async function createPairing(): Promise<PairingInfo | null> {
  try {
    const response = await fetchWithTimeout(apiUrl("/api/hubs/pairing-token"), {
      method: "POST",
      credentials: "include",
      headers: {
        ...authHeaders({ "Content-Type": "application/json" }),
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.pairing ?? null;
  } catch {
    return null;
  }
}

export async function fetchLatestSample(): Promise<LatestSample | null> {
  try {
    const response = await fetchWithTimeout(apiUrl("/api/latest"), {
      credentials: "include",
      cache: "no-store",
      headers: authHeaders(),
    });
    if (!response.ok) {
      return null;
    }

    const result = await parseJson<{ ok: true; sample: LatestSample | null }>(response);
    return result.sample ?? null;
  } catch {
    return null;
  }
}

export async function fetchMetricHistory(params: {
  metric: string;
  span: "minutes" | "hours" | "days";
  limit: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<HistoryResponse | null> {
  try {
    const search = new URLSearchParams({
      metric: params.metric,
      span: params.span,
      limit: String(params.limit),
    });

    if (params.dateFrom) {
      search.set("date_from", params.dateFrom);
    }

    if (params.dateTo) {
      search.set("date_to", params.dateTo);
    }

    const response = await fetchWithTimeout(apiUrl(`/api/history?${search.toString()}`), {
      credentials: "include",
      cache: "no-store",
      headers: authHeaders(),
    });
    if (!response.ok) {
      return null;
    }

    const result = await parseJson<HistoryResponse>(response);
    return result.ok ? result : null;
  } catch {
    return null;
  }
}

export async function fetchPlantCatalog(query = ""): Promise<PlantCatalogItem[]> {
  try {
    const search = new URLSearchParams();
    if (query.trim()) {
      search.set("q", query.trim());
    }

    const response = await fetchWithTimeout(apiUrl(`/api/plant-catalog${search.toString() ? `?${search.toString()}` : ""}`), {
      credentials: "include",
      cache: "no-store",
      headers: authHeaders(),
    });
    if (!response.ok) {
      return [];
    }

    const result = await parseJson<{ ok: true; items: PlantCatalogItem[] }>(response);
    return Array.isArray(result.items) ? result.items : [];
  } catch {
    return [];
  }
}
