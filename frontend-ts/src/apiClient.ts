import { API_BASE_URL, DEFAULT_TIMEOUT_MS, MAX_RETRY_ATTEMPTS } from "./config.js";
import type {
  ApiError,
  CreatePollRequestDto,
  ListResponse,
  PollListQuery,
  PollResponseDto,
  UpdatePollRequestDto,
} from "./dtos.js";



let currentController: AbortController | null = null;


export function cancelCurrentRequest(): void {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
}


interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 30_000; // 30 секунд

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function invalidatePollCache(): void {
  for (const key of cache.keys()) {
    if (key.startsWith("/polls")) cache.delete(key);
  }
}


async function request<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  attempt = 1,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const controller = new AbortController();
  currentController = controller;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, { ...options, signal: controller.signal });
  } catch (e: unknown) {
    clearTimeout(timeoutId);
    currentController = null;

    const err = e as { name?: string; message?: string };

    if (
      err?.name !== "AbortError" &&
      attempt < MAX_RETRY_ATTEMPTS &&
      options.method === undefined 
    ) {
      await sleep(500 * attempt);
      return request<T>(path, options, timeoutMs, attempt + 1);
    }

    const apiErr: ApiError = {
      status: 0,
      message:
        err?.name === "AbortError"
          ? "Запит скасовано або перевищено таймаут"
          : "Помилка мережі або CORS",
      details: err?.message ?? String(e),
    };
    throw apiErr;
  } finally {
    clearTimeout(timeoutId);
    currentController = null;
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  const rawText = await response.text();

  if (response.ok) {
    if (!rawText) return null as unknown as T;
    try {
      return JSON.parse(rawText) as T;
    } catch {
      return rawText as unknown as T;
    }
  }

  // ── Retry для 429 (Too Many Requests) і 503 (Service Unavailable) ─────────
  if (
    (response.status === 429 || response.status === 503) &&
    attempt < MAX_RETRY_ATTEMPTS
  ) {
    const retryAfter = Number(response.headers.get("Retry-After") ?? 1);
    await sleep(Math.max(retryAfter * 1000, 1000 * attempt));
    return request<T>(path, options, timeoutMs, attempt + 1);
  }

  let payload: Record<string, unknown> | null = null;
  try {
    payload = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : null;
  } catch {
    /* залишаємо rawText */
  }

  const errBody = (payload?.["error"] ?? payload) as Record<string, unknown> | null;

  const apiErr: ApiError = {
    status: response.status,
    code: (errBody?.["code"] as string) ?? undefined,
    message:
      (errBody?.["message"] as string) ??
      (errBody?.["title"] as string) ??
      `HTTP помилка ${response.status}`,
    details: buildDetails(errBody, rawText, response.status),
    errors: (errBody?.["errors"] as Record<string, string[]>) ?? undefined,
  };
  throw apiErr;
}

function buildDetails(
  body: Record<string, unknown> | null,
  rawText: string,
  status: number,
): string {
  if (body?.["details"]) {
    const d = body["details"];
    if (Array.isArray(d))
      return d
        .map((item: unknown) => {
          const i = item as Record<string, string>;
          return i.field ? `${i.field}: ${i.message}` : i.message ?? String(item);
        })
        .join("; ");
    return String(d);
  }
  return (body?.["detail"] as string) ?? rawText ?? `HTTP ${status}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}


function buildQuery(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}


export async function getPollList(
  query: PollListQuery = {},
): Promise<ListResponse<PollResponseDto>> {
  const qs = buildQuery({
    page: query.page,
    pageSize: query.pageSize,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
    search: query.search,
    visibility: query.visibility,
  });

  const cacheKey = `/polls${qs}`;
  const cached = getCached<ListResponse<PollResponseDto>>(cacheKey);
  if (cached) return cached;

  const result = await request<ListResponse<PollResponseDto>>(`/polls${qs}`);
  setCached(cacheKey, result);
  return result;
}


export async function getPollById(id: number): Promise<PollResponseDto> {
  return request<PollResponseDto>(`/polls/${encodeURIComponent(id)}`);
}


export async function createPoll(
  dto: CreatePollRequestDto,
): Promise<PollResponseDto> {
  const result = await request<PollResponseDto>("/polls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  invalidatePollCache();
  return result;
}


export async function updatePoll(
  id: number,
  dto: UpdatePollRequestDto,
): Promise<PollResponseDto> {
  const result = await request<PollResponseDto>(
    `/polls/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    },
  );
  invalidatePollCache();
  return result;
}


export async function deletePoll(id: number): Promise<null> {
  const result = await request<null>(`/polls/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  invalidatePollCache();
  return result;
}
