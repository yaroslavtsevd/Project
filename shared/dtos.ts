/**
 * shared/dtos.ts
 * Спільні типи DTO — використовуються і фронтендом, і бекендом.
 * Зміни тут автоматично підхоплюються обома сторонами.
 *
 * Правила сумісності (v1):
 *  1. Забороняється перейменовувати або видаляти поля — це breaking change.
 *  2. Нові поля додаються лише як необов'язкові (?) або з дефолтом,
 *     щоб старий клієнт просто їх ігнорував.
 *  3. Breaking changes можливі тільки у новій версії /api/v2/ —
 *     не торкаючись /api/v1/.
 */

// ── Загальні моделі ───────────────────────────────────────────────────────────

export type SortDir = "asc" | "desc";

export type PollVisibility = "Public" | "Private";

export interface ListMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: ListMeta;
}

// ── Poll DTOs ─────────────────────────────────────────────────────────────────

export interface PollResponseDto {
  id: number;
  title: string;
  author: string;
  endDate: string;        // ISO date string "YYYY-MM-DD"
  visibility: PollVisibility;
  description: string;
  desc: string;           // alias для description (backward compat)
  createdAt: string;      // ISO datetime
  updatedAt: string;      // ISO datetime
  deletedAt: string | null;
}

export interface CreatePollRequestDto {
  title: string;
  author: string;
  endDate: string;
  visibility: PollVisibility;
  description?: string;
}

export interface UpdatePollRequestDto {
  title: string;
  author: string;
  endDate: string;
  visibility: PollVisibility;
  description: string;
}

export interface PatchPollRequestDto {
  title?: string;
  author?: string;
  endDate?: string;
  visibility?: PollVisibility;
  description?: string;
}

// ── Query params для GET /polls ───────────────────────────────────────────────

export interface PollListQuery {
  page?: number;
  pageSize?: number;
  sortBy?: "id" | "title" | "author" | "endDate" | "visibility" | "createdAt";
  sortDir?: SortDir;
  search?: string;
  visibility?: PollVisibility;
}

// ── Уніфікована помилка API (кидає apiClient) ─────────────────────────────────

export interface ApiError {
  status: number;    // 0 = мережа/CORS, 4xx/5xx = HTTP-відповідь
  code?: string;     // машинний код: "VALIDATION_ERROR", "NOT_FOUND", "CONFLICT" тощо
  message: string;
  details?: string;
  errors?: Record<string, string[]>;
}
