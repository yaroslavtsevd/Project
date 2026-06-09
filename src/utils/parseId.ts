import { ApiError } from "../errors/ApiError.js";

export function parseId(value: string | undefined): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw ApiError.badRequest("Invalid route parameter", [
      { field: "id", message: "id must be a positive integer" },
    ]);
  }
  return id;
}
