export type ApiErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500;

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: ApiErrorStatus = 400,
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static notFound(entity: string, code?: string) {
    return new ApiError(code ?? `${entity.toUpperCase()}_NOT_FOUND`, `${entity} not found`, 404);
  }

  static conflict(code: string, message: string) {
    return new ApiError(code, message, 409);
  }

  static validation(message: string, fields?: Record<string, string>) {
    return new ApiError('VALIDATION_ERROR', message, 422, fields);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError('FORBIDDEN', message, 403);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError('UNAUTHORIZED', message, 401);
  }
}
