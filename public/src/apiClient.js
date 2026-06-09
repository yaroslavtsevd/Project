/**
 * apiClient.js — HTTP-клієнт з підтримкою авторизації (Bearer token).
 *
 * Токен зберігається в sessionStorage (очищається при закритті вкладки).
 * Кожен запит автоматично додає заголовок Authorization: Bearer <token>.
 */

import { API_BASE_URL } from "./config.js";

// ── Token storage ─────────────────────────────────────────────────────────────

const TOKEN_KEY = "session_token";
const USER_KEY  = "session_user";

export function saveSession(token, user) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) ?? null;
}

export function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!getToken();
}

// ── Base request ──────────────────────────────────────────────────────────────

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  // Attach auth header if we have a token
  const token = getToken();
  const headers = {
    ...(options.headers ?? {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (e) {
    throw { status: 0, message: "Помилка мережі або CORS", details: e?.message || String(e) };
  }

  if (response.status === 204) return null;

  const rawText = await response.text();

  if (response.ok) {
    if (!rawText) return null;
    try { return JSON.parse(rawText); } catch { return rawText; }
  }

  let errPayload = null;
  try { errPayload = rawText ? JSON.parse(rawText) : null; } catch { /* */ }

  const errObj = errPayload?.error ?? errPayload;
  throw {
    status: response.status,
    message: errObj?.message || errObj?.title || `HTTP помилка ${response.status}`,
    details: errObj?.details
      ? errObj.details.map((d) => (d.field ? `${d.field}: ${d.message}` : d.message)).join("; ")
      : (errObj?.detail ?? rawText ?? `HTTP ${response.status}`),
    errors: errObj?.errors ?? null,
  };
}

// ── Auth API ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/login
 * @returns {{ token, user: { id, name, email, role } }}
 */
export async function apiLogin(email, password) {
  const res = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const { token, user } = res.data;
  saveSession(token, user);
  return user;
}

/**
 * POST /api/v1/auth/register
 */
export async function apiRegister(name, email, password) {
  const res = await request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return res.data;
}

/**
 * POST /api/v1/auth/logout
 */
export async function apiLogout() {
  try {
    await request("/auth/logout", { method: "POST" });
  } catch { /* best effort */ }
  clearSession();
}

// ── Polls API ─────────────────────────────────────────────────────────────────

export async function getPollList() {
  const data = await request("/polls");
  return Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
}

export async function getPollById(id) {
  return await request(`/polls/${encodeURIComponent(id)}`);
}

export async function createPoll(dto) {
  return await request("/polls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
}

export async function updatePoll(id, dto) {
  return await request(`/polls/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
}

export async function deletePoll(id) {
  return await request(`/polls/${encodeURIComponent(id)}`, { method: "DELETE" });
}
