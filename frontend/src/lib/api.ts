import { localizePlantCatalogItems } from "./plantCatalogLocalization";
import type { SeedActivityEntry, SeedCatalogEntry } from "./seedCatalog";

export type PairingInfo = {
  token: string;
  expires_at: string;
};

export type LatestSample = {
  recorded_at?: string | null;
  air_temperature?: number | null;
  air_humidity?: number | null;
  air_pressure?: number | null;
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

export type WeatherDay = {
  date: string;
  temperature_min: number | null;
  temperature_max: number | null;
  humidity_avg: number | null;
  wind_max: number | null;
  symbol_code: string;
};

export type WeatherHour = {
  time: string;
  air_temperature: number | null;
  relative_humidity: number | null;
  wind_speed: number | null;
  wind_from_direction: number | null;
  precipitation_amount: number | null;
  symbol_code: string;
};

export type WeatherForecast = {
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  forecast: {
    updated_at: string;
    now: {
      time: string;
      air_temperature: number | null;
      relative_humidity: number | null;
      wind_speed: number | null;
      symbol_code: string;
    } | null;
    hours: WeatherHour[];
    days: WeatherDay[];
  };
};

export type DailyWeatherReport = {
  title: string;
  body: string;
  tip: string;
  source?: "ai" | "local_fallback" | string;
  generated_at?: string;
};

export type MemoryDebugItem = {
  file: string;
  line: number;
  size_kb: number;
  count: number;
  size_diff_kb?: number;
  count_diff?: number;
};

export type MemoryDebugReport = {
  enabled: boolean;
  tracing: boolean;
  timestamp: string;
  rss_mb: number | null;
  python_traced_current_mb: number;
  python_traced_peak_mb: number;
  sensor_sample_writes: number;
  gc_counts: number[];
  gc_thresholds: number[];
  tracked_objects: number | null;
  cache_sizes: Record<string, number>;
  top_current: MemoryDebugItem[];
  top_growth_since_last_report: MemoryDebugItem[];
};

export type WeatherAddressMatch = {
  label: string;
  address: string;
  postal_code: string;
  place: string;
  latitude: number;
  longitude: number;
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

export type GrowlyPlant = {
  plant_id?: string;
  instanceId: string;
  profileId: string;
  profile_id?: string;
  variantId?: string | null;
  variant_id?: string | null;
  cultivarId?: string | null;
  cultivar_id?: string | null;
  catalogItemId?: string;
  catalog_item_id?: string;
  nickname: string;
  display_name?: string;
  location?: "greenhouse" | "outside" | string;
  location_label?: string;
  sowedAt?: string | null;
  sowed_at?: string | null;
  movedToGreenhouseAt?: string | null;
  moved_to_greenhouse_at?: string | null;
  hasSevenInOne: boolean;
  has_seven_in_one?: boolean;
  wateringEnabled: boolean;
  watering_enabled?: boolean;
  archivedAt?: string | null;
  archived_at?: string | null;
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
    email_verified?: boolean | number;
  } | null;
  hub: {
    hub_id: string;
    hub_name: string;
    location_label?: string;
    weather_address?: string;
    weather_latitude?: number | null;
    weather_longitude?: number | null;
    owner_username: string;
    is_active?: boolean | number;
    sensor_url: string;
    local_ip: string;
  } | null;
  hubs?: Array<{
    hub_id: string;
    hub_name: string;
    location_label?: string;
    weather_address?: string;
    weather_latitude?: number | null;
    weather_longitude?: number | null;
    owner_username: string;
    is_active?: boolean | number;
    sensor_url: string;
    local_ip: string;
    member_role?: string;
  }>;
};

export type GrowlyAssistantImage = {
  dataUrl: string;
  name?: string;
};

export type CustomerMessageCategory = "utfordring" | "forslag" | "tips" | "sporsmal" | "annet";

export type CustomerMessageConversationItem = {
  role: "assistant" | "user";
  text: string;
  imageName?: string;
};

type ApiError = {
  ok: false;
  error: string;
};

const REQUEST_TIMEOUT_MS = 3500;
const AUTH_REQUEST_TIMEOUT_MS = 30000;
const AI_REQUEST_TIMEOUT_MS = 18000;
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

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

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

function appendHubId(path: string, hubId?: string): string {
  const cleanHubId = (hubId || "").trim();
  if (!cleanHubId) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}hub_id=${encodeURIComponent(cleanHubId)}`;
}

export async function fetchSession(): Promise<AuthSession | null> {
  try {
    const response = await fetchWithTimeout(apiUrl("/api/auth/session"), {
      credentials: "include",
      cache: "no-store",
      headers: authHeaders(),
    }, AUTH_REQUEST_TIMEOUT_MS);
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
  }, AUTH_REQUEST_TIMEOUT_MS);

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
}): Promise<{
  session: AuthSession | null;
  email_verification_required?: boolean;
  email?: string;
}> {
  const response = await fetchWithTimeout(apiUrl("/api/auth/register"), {
    method: "POST",
    credentials: "include",
    headers: {
      ...authHeaders({ "Content-Type": "application/json" }),
    },
    body: JSON.stringify(payload),
  }, AUTH_REQUEST_TIMEOUT_MS);

  if (!response.ok) {
    const result = await parseJson<ApiError>(response);
    throw new Error(result.error);
  }

  const result = await parseJson<{
    ok: true;
    session: AuthSession | null;
    email_verification_required?: boolean;
    email?: string;
  }>(response);
  persistApiToken(result.session);
  return {
    session: result.session,
    email_verification_required: result.email_verification_required,
    email: result.email,
  };
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

export async function fetchLatestSample(hubId = ""): Promise<LatestSample | null> {
  try {
    const response = await fetchWithTimeout(apiUrl(appendHubId("/api/latest", hubId)), {
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

export async function fetchWeatherForecast(hubId = ""): Promise<WeatherForecast | null> {
  try {
    const response = await fetchWithTimeout(apiUrl(appendHubId("/api/weather", hubId)), {
      credentials: "include",
      cache: "no-store",
      headers: authHeaders(),
    }, 7000);
    if (!response.ok) {
      return null;
    }

    const result = await parseJson<{ ok: true } & WeatherForecast>(response);
    return {
      location: result.location,
      forecast: result.forecast,
    };
  } catch {
    return null;
  }
}

export async function fetchDailyWeatherReport(hubId = "", language = ""): Promise<DailyWeatherReport | null> {
  try {
    const path = language ? `/api/weather/daily-report?lang=${encodeURIComponent(language)}` : "/api/weather/daily-report";
    const response = await fetchWithTimeout(apiUrl(appendHubId(path, hubId)), {
      credentials: "include",
      cache: "no-store",
      headers: authHeaders(),
    }, AI_REQUEST_TIMEOUT_MS);
    if (!response.ok) {
      return null;
    }

    const result = await parseJson<{ ok: true; report: DailyWeatherReport; source?: string; generated_at?: string }>(response);
    if (!result.ok || !result.report) {
      return null;
    }
    return {
      ...result.report,
      source: result.source,
      generated_at: result.generated_at,
    };
  } catch {
    return null;
  }
}

export async function searchWeatherAddress(query: string): Promise<WeatherAddressMatch[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return [];
  }

  try {
    const params = new URLSearchParams({ q: trimmed });
    const response = await fetchWithTimeout(apiUrl(`/api/weather/address-search?${params.toString()}`), {
      credentials: "include",
      cache: "no-store",
      headers: authHeaders(),
    }, 7000);
    if (!response.ok) {
      return [];
    }

    const result = await parseJson<{ ok: true; matches: WeatherAddressMatch[] }>(response);
    return Array.isArray(result.matches) ? result.matches : [];
  } catch {
    return [];
  }
}

export async function fetchMemoryDebug(resetBaseline = true): Promise<MemoryDebugReport | null> {
  try {
    const params = new URLSearchParams({ reset_baseline: resetBaseline ? "true" : "false" });
    const response = await fetchWithTimeout(apiUrl(`/api/debug/memory?${params.toString()}`), {
      credentials: "include",
      cache: "no-store",
      headers: authHeaders(),
    }, 10000);
    if (!response.ok) {
      return null;
    }

    const result = await parseJson<{ ok: true; memory: MemoryDebugReport }>(response);
    return result.memory;
  } catch {
    return null;
  }
}

export async function saveHubSettings(payload: {
  location_label?: string;
  weather_address?: string;
  weather_latitude?: number | string | null;
  weather_longitude?: number | string | null;
  is_active?: boolean;
}): Promise<AuthSession["hub"] | null> {
  try {
    const response = await fetchWithTimeout(apiUrl("/api/settings"), {
      method: "PATCH",
      credentials: "include",
      headers: {
        ...authHeaders({ "Content-Type": "application/json" }),
      },
      body: JSON.stringify(payload),
    }, AUTH_REQUEST_TIMEOUT_MS);
    if (!response.ok) {
      return null;
    }

    const result = await parseJson<{ ok: true; settings: AuthSession["hub"] }>(response);
    return result.settings;
  } catch {
    return null;
  }
}

export async function updateProfile(payload: {
  full_name?: string;
  phone?: string;
  email?: string;
  password?: string;
}): Promise<AuthSession | null> {
  try {
    const response = await fetchWithTimeout(apiUrl("/api/profile"), {
      method: "PATCH",
      credentials: "include",
      headers: {
        ...authHeaders({ "Content-Type": "application/json" }),
      },
      body: JSON.stringify(payload),
    }, AUTH_REQUEST_TIMEOUT_MS);
    if (!response.ok) {
      return null;
    }

    const result = await parseJson<{ ok: true; session: AuthSession }>(response);
    return result.session;
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
  hubId?: string;
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

    if (params.hubId) {
      search.set("hub_id", params.hubId);
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

export async function fetchPlantCatalog(query = "", language = ""): Promise<PlantCatalogItem[]> {
  try {
    const search = new URLSearchParams();
    if (query.trim()) {
      search.set("q", query.trim());
    }
    if (language) {
      search.set("lang", language);
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
    return Array.isArray(result.items)
      ? localizePlantCatalogItems(result.items, language === "en" ? "en" : "no")
      : [];
  } catch {
    return [];
  }
}

export async function fetchPlants(hubId = "", archived = false): Promise<GrowlyPlant[]> {
  try {
    const path = archived ? "/api/plants?archived=true" : "/api/plants";
    const response = await fetchWithTimeout(apiUrl(appendHubId(path, hubId)), {
      credentials: "include",
      cache: "no-store",
      headers: authHeaders(),
    }, AUTH_REQUEST_TIMEOUT_MS);
    if (!response.ok) {
      return [];
    }

    const result = await parseJson<{ ok: true; plants: GrowlyPlant[] }>(response);
    return Array.isArray(result.plants) ? result.plants : [];
  } catch {
    return [];
  }
}

export async function fetchPlantHistory(hubId = ""): Promise<GrowlyPlant[]> {
  return fetchPlants(hubId, true);
}

export async function createPlant(payload: Partial<GrowlyPlant>, hubId = ""): Promise<GrowlyPlant | null> {
  try {
    const response = await fetchWithTimeout(apiUrl(appendHubId("/api/plants", hubId)), {
      method: "POST",
      credentials: "include",
      headers: {
        ...authHeaders({ "Content-Type": "application/json" }),
      },
      body: JSON.stringify(payload),
    }, AUTH_REQUEST_TIMEOUT_MS);
    if (!response.ok) {
      let error = `plant_create_http_${response.status}`;
      try {
        const result = await parseJson<ApiError>(response);
        error = result.error || error;
      } catch {
        // Keep status-based error when the response is not JSON.
      }
      throw new Error(error);
    }

    const result = await parseJson<{ ok: true; plant: GrowlyPlant }>(response);
    return result.plant ?? null;
  } catch (error) {
    throw error instanceof Error ? error : new Error("plant_create_failed");
  }
}

export async function updatePlant(plantId: string, payload: Partial<GrowlyPlant>, hubId = ""): Promise<GrowlyPlant | null> {
  try {
    const response = await fetchWithTimeout(apiUrl(appendHubId(`/api/plants/${encodeURIComponent(plantId)}`, hubId)), {
      method: "PATCH",
      credentials: "include",
      headers: {
        ...authHeaders({ "Content-Type": "application/json" }),
      },
      body: JSON.stringify(payload),
    }, AUTH_REQUEST_TIMEOUT_MS);
    if (!response.ok) {
      return null;
    }

    const result = await parseJson<{ ok: true; plant: GrowlyPlant }>(response);
    return result.plant ?? null;
  } catch {
    return null;
  }
}

export async function archivePlant(plantId: string, hubId = ""): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(apiUrl(appendHubId(`/api/plants/${encodeURIComponent(plantId)}`, hubId)), {
      method: "DELETE",
      credentials: "include",
      headers: authHeaders(),
    }, AUTH_REQUEST_TIMEOUT_MS);
    return response.ok;
  } catch {
    return false;
  }
}

export async function deletePlantHistoryEntry(plantId: string, hubId = ""): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(apiUrl(appendHubId(`/api/plant-history/${encodeURIComponent(plantId)}`, hubId)), {
      method: "DELETE",
      credentials: "include",
      headers: authHeaders(),
    }, AUTH_REQUEST_TIMEOUT_MS);
    return response.ok;
  } catch {
    return false;
  }
}

export type SeedCatalogResponse = {
  seeds: SeedCatalogEntry[];
  activities: SeedActivityEntry[];
};

export async function fetchSeedCatalog(hubId = ""): Promise<SeedCatalogResponse | null> {
  try {
    const response = await fetchWithTimeout(apiUrl(appendHubId("/api/seeds", hubId)), {
      credentials: "include",
      cache: "no-store",
      headers: authHeaders(),
    }, AUTH_REQUEST_TIMEOUT_MS);
    if (!response.ok) {
      return null;
    }

    const result = await parseJson<{ ok: true; seeds: SeedCatalogEntry[]; activities: SeedActivityEntry[] }>(response);
    return {
      seeds: Array.isArray(result.seeds) ? result.seeds : [],
      activities: Array.isArray(result.activities) ? result.activities : [],
    };
  } catch {
    return null;
  }
}

export async function createSeedEntry(payload: Partial<SeedCatalogEntry>, hubId = ""): Promise<SeedCatalogEntry | null> {
  try {
    const response = await fetchWithTimeout(apiUrl(appendHubId("/api/seeds", hubId)), {
      method: "POST",
      credentials: "include",
      headers: {
        ...authHeaders({ "Content-Type": "application/json" }),
      },
      body: JSON.stringify(payload),
    }, AUTH_REQUEST_TIMEOUT_MS);
    if (!response.ok) {
      return null;
    }

    const result = await parseJson<{ ok: true; seed: SeedCatalogEntry }>(response);
    return result.seed ?? null;
  } catch {
    return null;
  }
}

export async function updateSeedEntry(seedId: string, payload: Partial<SeedCatalogEntry>, hubId = ""): Promise<SeedCatalogEntry | null> {
  try {
    const response = await fetchWithTimeout(apiUrl(appendHubId(`/api/seeds/${encodeURIComponent(seedId)}`, hubId)), {
      method: "PATCH",
      credentials: "include",
      headers: {
        ...authHeaders({ "Content-Type": "application/json" }),
      },
      body: JSON.stringify(payload),
    }, AUTH_REQUEST_TIMEOUT_MS);
    if (!response.ok) {
      return null;
    }

    const result = await parseJson<{ ok: true; seed: SeedCatalogEntry }>(response);
    return result.seed ?? null;
  } catch {
    return null;
  }
}

export async function deleteSeedEntry(seedId: string, hubId = ""): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(apiUrl(appendHubId(`/api/seeds/${encodeURIComponent(seedId)}`, hubId)), {
      method: "DELETE",
      credentials: "include",
      headers: authHeaders(),
    }, AUTH_REQUEST_TIMEOUT_MS);
    return response.ok;
  } catch {
    return false;
  }
}

export async function createSeedActivity(payload: Partial<SeedActivityEntry>, hubId = ""): Promise<SeedActivityEntry | null> {
  try {
    const response = await fetchWithTimeout(apiUrl(appendHubId("/api/seed-activities", hubId)), {
      method: "POST",
      credentials: "include",
      headers: {
        ...authHeaders({ "Content-Type": "application/json" }),
      },
      body: JSON.stringify(payload),
    }, AUTH_REQUEST_TIMEOUT_MS);
    if (!response.ok) {
      return null;
    }

    const result = await parseJson<{ ok: true; activity: SeedActivityEntry }>(response);
    return result.activity ?? null;
  } catch {
    return null;
  }
}

export async function askGrowlyAssistant(
  question: string,
  image?: GrowlyAssistantImage | null,
  hubId = "",
  language = "",
): Promise<{ answer: string; model: string } | null> {
  try {
    const response = await fetchWithTimeout(apiUrl(appendHubId("/api/ai/assistant", hubId)), {
      method: "POST",
      credentials: "include",
      headers: {
        ...authHeaders({ "Content-Type": "application/json" }),
      },
      body: JSON.stringify({ question, image: image ?? null, language }),
    }, AI_REQUEST_TIMEOUT_MS);
    if (!response.ok) {
      let error = `ai_http_${response.status}`;
      try {
        const result = await parseJson<ApiError>(response);
        error = result.error || error;
      } catch {
        // Keep status-based error when the response is not JSON.
      }
      throw new Error(error);
    }

    const result = await parseJson<{ ok: true; answer: string; model: string }>(response);
    return result.ok ? { answer: result.answer, model: result.model } : null;
  } catch (error) {
    throw error instanceof Error ? error : new Error("ai_unavailable");
  }
}

export async function sendCustomerMessage(
  payload: {
    category: CustomerMessageCategory;
    title: string;
    message: string;
    conversation: CustomerMessageConversationItem[];
  },
  hubId = "",
): Promise<boolean> {
  const response = await fetchWithTimeout(apiUrl(appendHubId("/api/customer-messages", hubId)), {
    method: "POST",
    credentials: "include",
    headers: {
      ...authHeaders({ "Content-Type": "application/json" }),
    },
    body: JSON.stringify(payload),
  }, AUTH_REQUEST_TIMEOUT_MS);

  if (!response.ok) {
    const result = await parseJson<ApiError>(response);
    throw new Error(result.error);
  }

  const result = await parseJson<{ ok: true }>(response);
  return result.ok;
}
