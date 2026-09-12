export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode = 500, code = "INTERNAL_SERVER_ERROR", details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required to access this resource") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions to perform this action") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource", identifier?: string) {
    super(
      identifier ? `${resource} with ID '${identifier}' not found` : `${resource} not found`,
      404,
      "NOT_FOUND"
    );
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource state has changed or duplicate record exists") {
    super(message, 409, "CONFLICT");
  }
}
