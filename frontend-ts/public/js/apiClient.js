/**
 * apiClient.ts — типобезпечний HTTP-шар.
 *
 * Реалізує:
 *  - AbortController з авто-таймаутом (DEFAULT_TIMEOUT_MS)
 *  - Кнопка «Скасувати запит» (cancelCurrentRequest)
 *  - Retry лише для безпечних статусів 429 / 503 (MAX_RETRY_ATTEMPTS)
 *  - Кешування GET /polls (інвалідується після create/update/delete)
 *  - Уніфікований формат помилки ApiError
 *  - Пагінація / фільтрація / сортування через query params
 */
import { API_BASE_URL, DEFAULT_TIMEOUT_MS, MAX_RETRY_ATTEMPTS } from "./config.js";
// ── Скасування запиту ─────────────────────────────────────────────────────────
let currentController = null;
/** Скасувати поточний активний запит (наприклад, натисканням кнопки «Скасувати»). */
export function cancelCurrentRequest() {
    if (currentController) {
        currentController.abort();
        currentController = null;
    }
}
const cache = new Map();
const CACHE_TTL_MS = 30000; // 30 секунд
function getCached(key) {
    const entry = cache.get(key);
    if (!entry)
        return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}
function setCached(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
}
/** Інвалідувати весь кеш опитувань (після create/update/delete). */
export function invalidatePollCache() {
    for (const key of cache.keys()) {
        if (key.startsWith("/polls"))
            cache.delete(key);
    }
}
// ── Внутрішня функція запиту ──────────────────────────────────────────────────
async function request(path, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS, attempt = 1) {
    const url = `${API_BASE_URL}${path}`;
    // AbortController: таймаут + зовнішнє скасування
    const controller = new AbortController();
    currentController = controller;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
        response = await fetch(url, { ...options, signal: controller.signal });
    }
    catch (e) {
        clearTimeout(timeoutId);
        currentController = null;
        const err = e;
        // Retry для тимчасових мережевих збоїв (не для AbortError)
        if (err?.name !== "AbortError" &&
            attempt < MAX_RETRY_ATTEMPTS &&
            options.method === undefined // тільки GET (безпечний метод)
        ) {
            await sleep(500 * attempt);
            return request(path, options, timeoutMs, attempt + 1);
        }
        const apiErr = {
            status: 0,
            message: err?.name === "AbortError"
                ? "Запит скасовано або перевищено таймаут"
                : "Помилка мережі або CORS",
            details: err?.message ?? String(e),
        };
        throw apiErr;
    }
    finally {
        clearTimeout(timeoutId);
        currentController = null;
    }
    // ── 204 No Content ────────────────────────────────────────────────────────
    if (response.status === 204) {
        return null;
    }
    // Читаємо тіло один раз як текст — безпечніше, ніж одразу json()
    const rawText = await response.text();
    // ── Успішна відповідь ─────────────────────────────────────────────────────
    if (response.ok) {
        if (!rawText)
            return null;
        try {
            return JSON.parse(rawText);
        }
        catch {
            return rawText;
        }
    }
    // ── Retry для 429 (Too Many Requests) і 503 (Service Unavailable) ─────────
    if ((response.status === 429 || response.status === 503) &&
        attempt < MAX_RETRY_ATTEMPTS) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? 1);
        await sleep(Math.max(retryAfter * 1000, 1000 * attempt));
        return request(path, options, timeoutMs, attempt + 1);
    }
    // ── Помилка HTTP ──────────────────────────────────────────────────────────
    let payload = null;
    try {
        payload = rawText ? JSON.parse(rawText) : null;
    }
    catch {
        /* залишаємо rawText */
    }
    const errBody = (payload?.["error"] ?? payload);
    const apiErr = {
        status: response.status,
        code: errBody?.["code"] ?? undefined,
        message: errBody?.["message"] ??
            errBody?.["title"] ??
            `HTTP помилка ${response.status}`,
        details: buildDetails(errBody, rawText, response.status),
        errors: errBody?.["errors"] ?? undefined,
    };
    throw apiErr;
}
function buildDetails(body, rawText, status) {
    if (body?.["details"]) {
        const d = body["details"];
        if (Array.isArray(d))
            return d
                .map((item) => {
                const i = item;
                return i.field ? `${i.field}: ${i.message}` : i.message ?? String(item);
            })
                .join("; ");
        return String(d);
    }
    return body?.["detail"] ?? rawText ?? `HTTP ${status}`;
}
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
// ── Побудова query string ─────────────────────────────────────────────────────
function buildQuery(params) {
    const parts = [];
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "" && v !== null) {
            parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
        }
    }
    return parts.length ? `?${parts.join("&")}` : "";
}
// ── Публічний API ─────────────────────────────────────────────────────────────
/**
 * GET /api/v1/polls
 * Підтримує пагінацію, сортування, фільтрацію через query params.
 * Результати кешуються на 30 с; кеш інвалідується після мутацій.
 */
export async function getPollList(query = {}) {
    const qs = buildQuery({
        page: query.page,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
        search: query.search,
        visibility: query.visibility,
    });
    const cacheKey = `/polls${qs}`;
    const cached = getCached(cacheKey);
    if (cached)
        return cached;
    const result = await request(`/polls${qs}`);
    setCached(cacheKey, result);
    return result;
}
/**
 * GET /api/v1/polls/:id
 */
export async function getPollById(id) {
    return request(`/polls/${encodeURIComponent(id)}`);
}
/**
 * POST /api/v1/polls
 */
export async function createPoll(dto) {
    const result = await request("/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
    });
    invalidatePollCache();
    return result;
}
/**
 * PUT /api/v1/polls/:id
 */
export async function updatePoll(id, dto) {
    const result = await request(`/polls/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
    });
    invalidatePollCache();
    return result;
}
/**
 * DELETE /api/v1/polls/:id
 */
export async function deletePoll(id) {
    const result = await request(`/polls/${encodeURIComponent(id)}`, {
        method: "DELETE",
    });
    invalidatePollCache();
    return result;
}
