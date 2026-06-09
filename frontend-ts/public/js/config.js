/**
 * config.ts — єдина точка конфігурації адреси бекенду.
 *
 * Якщо фронтенд відкрито з того самого порту, що й бекенд (Express static) —
 * використовуємо відносний шлях /api/v1 щоб уникнути CORS.
 * Якщо фронтенд на окремому порту (5500, 5173) — абсолютний URL.
 */
const BACKEND_URL = "http://localhost:3000";
const isSameOrigin = typeof window !== "undefined" && window.location.origin === BACKEND_URL;
export const API_BASE_URL = isSameOrigin
    ? "/api/v1"
    : `${BACKEND_URL}/api/v1`;
/** Таймаут запиту за замовчуванням (мс) */
export const DEFAULT_TIMEOUT_MS = 12000;
/** Максимальна кількість retry-спроб */
export const MAX_RETRY_ATTEMPTS = 3;
