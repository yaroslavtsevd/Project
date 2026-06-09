/**
 * config.js — єдине місце для налаштування адреси бекенду.
 *
 * Якщо фронтенд відкрито з того самого порту (Express static, localhost:3000)
 * — використовується відносний шлях /api/v1, щоб не було CORS.
 * Якщо фронтенд на окремому порту (5500, 5173) — абсолютний URL бекенду.
 *
 * Змінювати тільки BACKEND_URL при зміні порту бекенду.
 */
const BACKEND_URL = "http://localhost:3000";

const isSameOrigin = window.location.origin === BACKEND_URL;

export const API_BASE_URL = isSameOrigin
  ? "/api/v1"
  : `${BACKEND_URL}/api/v1`;
