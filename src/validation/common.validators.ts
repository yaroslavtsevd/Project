import type { ErrorDetail } from "../errors/ApiError.js";

export function asObject(body: unknown): Record<string, unknown> | null {
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

export function requiredString(
  obj: Record<string, unknown>,
  field: string,
  errors: ErrorDetail[],
  min = 1,
  max = 255,
): string {
  const value = obj[field];
  if (typeof value !== "string") {
    errors.push({ field, message: `${field} is required and must be a string` });
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    errors.push({ field, message: `${field} length must be between ${min} and ${max}` });
  }
  return trimmed;
}

export function optionalString(
  obj: Record<string, unknown>,
  field: string,
  errors: ErrorDetail[],
  max = 255,
): string | undefined {
  const value = obj[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    errors.push({ field, message: `${field} must be a string` });
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > max) errors.push({ field, message: `${field} length must be <= ${max}` });
  return trimmed;
}

export function requiredNumber(
  obj: Record<string, unknown>,
  field: string,
  errors: ErrorDetail[],
  min = 1,
): number {
  const value = obj[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    errors.push({ field, message: `${field} is required and must be an integer >= ${min}` });
    return 0;
  }
  return value;
}

export function optionalNumber(
  obj: Record<string, unknown>,
  field: string,
  errors: ErrorDetail[],
  min = 1,
): number | undefined {
  const value = obj[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    errors.push({ field, message: `${field} must be an integer >= ${min}` });
    return undefined;
  }
  return value;
}

export function requiredEnum<T extends string>(
  obj: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
  errors: ErrorDetail[],
): T {
  const value = obj[field];
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    errors.push({ field, message: `${field} must be one of: ${allowed.join(", ")}` });
    return allowed[0] as T;
  }
  return value as T;
}

export function optionalEnum<T extends string>(
  obj: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
  errors: ErrorDetail[],
): T | undefined {
  const value = obj[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    errors.push({ field, message: `${field} must be one of: ${allowed.join(", ")}` });
    return undefined;
  }
  return value as T;
}

function isValidDateOnlyWithFourDigitYear(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function requiredIsoDate(
  obj: Record<string, unknown>,
  field: string,
  errors: ErrorDetail[],
): string {
  const value = requiredString(obj, field, errors, 10, 10);
  if (value && !isValidDateOnlyWithFourDigitYear(value)) {
    errors.push({
      field,
      message: `${field} must be a valid date in YYYY-MM-DD format with a four-digit year`,
    });
  }
  return value;
}

export function optionalIsoDate(
  obj: Record<string, unknown>,
  field: string,
  errors: ErrorDetail[],
): string | undefined {
  const value = optionalString(obj, field, errors, 10);
  if (value && !isValidDateOnlyWithFourDigitYear(value)) {
    errors.push({
      field,
      message: `${field} must be a valid date in YYYY-MM-DD format with a four-digit year`,
    });
  }
  return value;
}

export function requiredStringArray(
  obj: Record<string, unknown>,
  field: string,
  errors: ErrorDetail[],
  minItems = 0,
): string[] {
  const value = obj[field];
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim() === "") ||
    value.length < minItems
  ) {
    errors.push({
      field,
      message: `${field} must be an array of non-empty strings with at least ${minItems} item(s)`,
    });
    return [];
  }
  return value.map((item) => String(item).trim());
}

export function optionalStringArray(
  obj: Record<string, unknown>,
  field: string,
  errors: ErrorDetail[],
): string[] | undefined {
  const value = obj[field];
  if (value === undefined || value === null) return undefined;
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim() === "")
  ) {
    errors.push({ field, message: `${field} must be an array of non-empty strings` });
    return undefined;
  }
  return value.map((item) => String(item).trim());
}

export function answerValue(
  obj: Record<string, unknown>,
  field: string,
  errors: ErrorDetail[],
): string | string[] {
  const value = obj[field];
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim() !== "")
  ) {
    return value.map((item) => String(item).trim());
  }
  errors.push({
    field,
    message: `${field} must be a non-empty string or array of non-empty strings`,
  });
  return "";
}

export function optionalAnswerValue(
  obj: Record<string, unknown>,
  field: string,
  errors: ErrorDetail[],
): string | string[] | undefined {
  if (obj[field] === undefined || obj[field] === null) return undefined;
  return answerValue(obj, field, errors);
}

export function rejectEmptyPatch(obj: Record<string, unknown>, errors: ErrorDetail[]): void {
  if (Object.keys(obj).length === 0) {
    errors.push({ message: "PATCH body must contain at least one field" });
  }
}
