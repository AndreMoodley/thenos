import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { unauthorized, forbidden } from '../lib/http.js';

export interface AuthedRequest extends Request {
  practitionerId?: string;
  role?: 'USER' | 'ADMIN';
}

function secret(): string {
  const s = process.env.JWT_SECRET;
  // Invariant #10: JWT_SECRET must be set before boot. index.ts asserts this at startup too.
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

export function signToken(payload: { sub: string; role: 'USER' | 'ADMIN'; ver: number }): string {
  const options: jwt.SignOptions = {
    algorithm: 'HS256',
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, secret(), options);
}

export function verifyToken(token: string): { sub: string; role: 'USER' | 'ADMIN'; ver?: number } {
  return jwt.verify(token, secret(), { algorithms: ['HS256'] }) as any;
}

function bearer(req: Request): string | null {
  const h = req.header('authorization') || req.header('Authorization');
  if (!h?.startsWith('Bearer ')) return null;
  return h.slice('Bearer '.length).trim() || null;
}

export async function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const token = bearer(req);
    if (!token) throw unauthorized('Missing bearer token');
    const { sub, role, ver } = verifyToken(token);
    // Revocation check (audit L1): the token's version must match the practitioner's current one.
    const me = await prisma.practitioner.findUnique({ where: { id: sub }, select: { tokenVersion: true } });
    if (!me) throw unauthorized('Unknown session');
    if ((ver ?? 0) !== me.tokenVersion) throw unauthorized('Session revoked — sign in again');
    req.practitionerId = sub;
    req.role = role;
    next();
  } catch (e: any) {
    if (e?.status) return next(e);
    next(unauthorized('Invalid or expired token'));
  }
}

export async function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction) {
  if (req.role === 'ADMIN') return next();
  // Defensive re-check against the DB in case the token predates a role change.
  const me = req.practitionerId
    ? await prisma.practitioner.findUnique({ where: { id: req.practitionerId }, select: { role: true } })
    : null;
  if (me?.role === 'ADMIN') return next();
  next(forbidden('Admin only'));
}
