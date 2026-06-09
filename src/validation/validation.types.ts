import type { RequestHandler } from "express";
import { ApiError, type ErrorDetail } from "../errors/ApiError.js";

export type Validator<T> = (body: unknown) => { value: T | null; errors: ErrorDetail[] };

export function validationMiddleware<T>(validator: Validator<T>): RequestHandler {
  return (req, _res, next) => {
    const result = validator(req.body);
    if (result.errors.length > 0 || result.value === null) {
      return next(ApiError.badRequest("Invalid request body", result.errors));
    }
    req.body = result.value;
    return next();
  };
}
