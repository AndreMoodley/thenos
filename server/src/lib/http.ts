import type { Response } from 'express';
import { ZodError } from 'zod';

/** A thrown error carrying an HTTP status — caught by the error middleware. */
export class HttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (m: string, code?: string) => new HttpError(400, m, code);
export const unauthorized = (m = 'Unauthorized') => new HttpError(401, m);
export const forbidden = (m = 'Forbidden') => new HttpError(403, m);
export const notFound = (m = 'Not found') => new HttpError(404, m);
export const conflict = (m: string, code?: string) => new HttpError(409, m, code);
export const tooMany = (m = 'Too many requests') => new HttpError(429, m);

/** Wrap an async route so thrown errors reach the error middleware. */
export function wrap<T extends (...a: any[]) => Promise<any>>(fn: T) {
  return (req: any, res: any, next: any) => fn(req, res, next).catch(next);
}

export function sendZodError(res: Response, err: ZodError) {
  return res.status(400).json({
    error: 'ValidationError',
    issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}
