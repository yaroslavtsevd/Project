/**
 * dtos.ts — копія shared/dtos.ts для фронтенду.
 * Джерело правди: ../shared/dtos.ts
 * Ці типи синхронізовані з бекендом вручну (або через OpenAPI-генерацію).
 *
 * Правила сумісності DTO (v1) — людською мовою:
 *
 * 1. НЕ перейменовуй і НЕ видаляй поля, які використовує фронтенд.
 *    Наприклад, якщо фронтенд читає `title` — не можна змінювати на `name`.
 *    Порушення = breaking change → весь UI перестає відображати дані.
 *
 * 2. Нові поля додавай як необов'язкові (?) або з дефолтним значенням.
 *    Старий фронтенд просто ігнорує нові поля — нічого не ламається.
 *
 * 3. Breaking changes (перейменування, видалення, зміна типу) — тільки в /api/v2/.
 *    /api/v1/ залишається стабільним назавжди.
 */

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

export interface PollResponseDto {
  id: number;
  title: string;
  author: string;
  endDate: string;
  visibility: PollVisibility;
  description: string;
  desc: string;
  createdAt: string;
  updatedAt: string;
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

export interface PollListQuery {
  page?: number;
  pageSize?: number;
  sortBy?: "id" | "title" | "author" | "endDate" | "visibility" | "createdAt";
  sortDir?: SortDir;
  search?: string;
  visibility?: PollVisibility;
}

export interface ApiError {
  status: number;
  code?: string;        // наприклад: "VALIDATION_ERROR", "NOT_FOUND", "CONFLICT"
  message: string;
  details?: string;
  errors?: Record<string, string[]>;
}
