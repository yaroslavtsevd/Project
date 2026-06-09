export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type SortDir = "asc" | "desc";

export interface ListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir: SortDir;
  search?: string;
  includeDeleted: boolean;
}

export interface ListMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: ListMeta;
}
