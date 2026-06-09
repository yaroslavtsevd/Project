const BACKEND_URL = "http://localhost:3000";

const isSameOrigin =
  typeof window !== "undefined" && window.location.origin === BACKEND_URL;

export const API_BASE_URL: string = isSameOrigin
  ? "/api/v1"
  : `${BACKEND_URL}/api/v1`;

/** Таймаут запиту за замовчуванням (мс) */
export const DEFAULT_TIMEOUT_MS = 12_000;

/** Максимальна кількість retry-спроб */
export const MAX_RETRY_ATTEMPTS = 3;
