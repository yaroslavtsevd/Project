import type { ListQuery, SortDir } from "../models/common.model.js";

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function getPositiveInt(value: unknown, fallback: number, max: number): number {
  if (typeof value !== "string") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function parseListQuery(query: Record<string, unknown>): ListQuery {
  const sortDirRaw = getString(query.sortDir) ?? getString(query.order);
  const sortDir: SortDir = sortDirRaw === "desc" ? "desc" : "asc";

  const result: ListQuery = {
    page: getPositiveInt(query.page, 1, 100000),
    pageSize: getPositiveInt(query.pageSize, 10, 100),
    sortDir,
    includeDeleted: query.includeDeleted === "true",
  };
  const sortBy = getString(query.sortBy) ?? getString(query.sort);
  const search = getString(query.search);
  if (sortBy !== undefined) result.sortBy = sortBy;
  if (search !== undefined) result.search = search;
  return result;
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function compareValues(a: string | number, b: string | number, sortDir: SortDir): number {
  const result =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), "uk");
  return sortDir === "desc" ? -result : result;
}
