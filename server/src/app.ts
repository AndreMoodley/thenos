import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { Prisma } from '@prisma/client';
import { HttpError } from './lib/http.js';
import { authRouter } from './routes/auth.js';
import { practitionerRouter } from './routes/practitioner.js';
import { sessionsRouter } from './routes/sessions.js';
import { vowsRouter } from './routes/vows.js';
import { trialsRouter } from './routes/trials.js';
import { sagaRouter } from './routes/saga.js';
import { entityRouter } from './routes/entity.js';
import { spacesRouter } from './routes/spaces.js';
import { cosmeticsRouter } from './routes/cosmetics.js';
import { presetsRouter } from './routes/presets.js';
import { companionsRouter } from './routes/companions.js';
import { coachRouter } from './routes/coach.js';
import { syncRouter } from './routes/sync.js';
import { premiumRouter } from './routes/premium.js';
import { cinematicsRouter } from './routes/cinematics.js';
import { adminRouter } from './routes/admin.js';

export function createApp() {
  const app = express();

  const origins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  app.use(cors(origins.length ? { origin: origins } : {})); // dev: reflect origin
  app.use(express.json({ limit: '1mb' }));

  // Health — no auth. (Invariant gate: curl :4000/health → { ok: true })
  app.get('/health', (_req, res) => res.json({ ok: true, service: 'voidborn', time: new Date().toISOString() }));

  // Routes mount DIRECTLY — no /api prefix (invariant #4).
  app.use('/auth', authRouter);
  app.use('/practitioner', practitionerRouter);
  app.use('/sessions', sessionsRouter);
  app.use('/vows', vowsRouter);
  app.use('/trials', trialsRouter);
  app.use('/saga', sagaRouter);
  app.use('/entity', entityRouter);
  app.use('/spaces', spacesRouter);
  app.use('/cosmetics', cosmeticsRouter);
  app.use('/manifestation-presets', presetsRouter);
  app.use('/companions', companionsRouter);
  app.use('/coach', coachRouter);
  app.use('/sync', syncRouter);
  app.use('/premium', premiumRouter);
  app.use('/cinematics', cinematicsRouter);
  app.use('/admin', adminRouter);

  app.use((_req, res) => res.status(404).json({ error: 'NotFound' }));

  // Error handler — maps HttpError, Zod, and Prisma known errors to clean responses.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, code: err.code });
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Already exists', code: 'UNIQUE' });
      if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'InternalServerError' });
  });

  return app;
}
