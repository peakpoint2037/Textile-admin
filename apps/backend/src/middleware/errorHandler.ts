import type { ErrorHandler } from 'hono';
import { ZodError } from 'zod';
import type { ApiError as ApiErrorBody } from '@textile-admin/shared';
import { ApiError } from '../utils/apiError.js';

function fieldsFromZodError(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const path = issue.path.join('.') || '(root)';
    if (!fields[path]) fields[path] = issue.message;
  }
  return fields;
}

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ApiError) {
    const body: ApiErrorBody = {
      success: false,
      error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) },
    };
    return c.json(body, err.status);
  }

  if (err instanceof ZodError) {
    const body: ApiErrorBody = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        fields: fieldsFromZodError(err),
      },
    };
    return c.json(body, 422);
  }

  console.error('Unhandled error:', err);
  const body: ApiErrorBody = {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  };
  return c.json(body, 500);
};
