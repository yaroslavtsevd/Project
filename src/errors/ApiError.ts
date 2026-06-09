export interface ErrorDetail {
  field?: string;
  message: string;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: ErrorDetail[] | null;

  constructor(status: number, code: string, message: string, details: ErrorDetail[] | null = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details: ErrorDetail[] | null = null): ApiError {
    return new ApiError(400, "VALIDATION_ERROR", message, details);
  }

  static notFound(message: string): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, "CONFLICT", message);
  }
}
