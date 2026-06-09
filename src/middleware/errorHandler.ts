import type { ErrorRequestHandler } from "express";
import { ApiError } from "../errors/ApiError.js";

export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof Error) {
    const msg = err.message;

    if (msg.includes("UNIQUE constraint failed")) {
      return res.status(409).json({
        error: { code: "CONFLICT", message: "Unique constraint violation", details: [{ message: msg }] },
      });
    }

    if (msg.includes("NOT NULL constraint failed") || msg.includes("CHECK constraint failed")) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid data", details: [{ message: msg }] },
      });
    }

    if (msg.includes("FOREIGN KEY constraint failed")) {
      return res.status(409).json({
        error: { code: "CONFLICT", message: "Foreign key constraint violation", details: [{ message: msg }] },
      });
    }
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({
    error: { code: "INTERNAL_SERVER_ERROR", message: "Unexpected server error", details: null },
  });
};
