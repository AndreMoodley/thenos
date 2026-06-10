import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { wrap, notFound } from '../lib/http.js';
import { REALMS } from '../lib/realms.js';

// Catalog of the anticipation set-pieces. Each carries a reduce-motion variant so the client can
// honor the OS setting (invariant #7): shortened/skipped cinematics, calm entity.
export const cinematicsRouter = Router();
cinematicsRouter.use(requireAuth);

const CINEMATICS = [
  { key: 'rebirth', kind: 'rive_oneshot', durationMs: 4200, reduceMotion: { durationMs: 900, mode: 'fade' }, haptic: 'heavy', stinger: 'rebirth' },
  { key: 'summon', kind: 'rive_oneshot', durationMs: 3000, reduceMotion: { durationMs: 700, mode: 'fade' }, haptic: 'success', stinger: 'summon' },
  { key: 'vow_flourish', kind: 'rive_oneshot', durationMs: 2200, reduceMotion: { durationMs: 500, mode: 'fade' }, haptic: 'success', stinger: 'vow' },
  // trials & saga set-pieces
  { key: 'trial_forged', kind: 'rive_oneshot', durationMs: 2600, reduceMotion: { durationMs: 600, mode: 'fade' }, haptic: 'success', stinger: 'vow' },
  { key: 'gate_clear', kind: 'rive_oneshot', durationMs: 2400, reduceMotion: { durationMs: 600, mode: 'fade' }, haptic: 'success', stinger: 'strike' },
  { key: 'chapter_unlock', kind: 'rive_oneshot', durationMs: 2400, reduceMotion: { durationMs: 600, mode: 'fade' }, haptic: 'success', stinger: 'vow' },
  { key: 'breakthrough_trial', kind: 'rive_oneshot', durationMs: 5200, reduceMotion: { durationMs: 1100, mode: 'fade' }, haptic: 'heavy', stinger: 'ascension' },
  // one ascension set-piece per realm crossing (2..7)
  ...REALMS.filter((r) => r.index >= 2).map((r) => ({
    key: `ascension_${r.key}`,
    kind: 'remotion',
    realm: r.index,
    durationMs: 5200,
    reduceMotion: { durationMs: 1100, mode: 'fade' },
    haptic: 'heavy',
    stinger: 'ascension',
  })),
];

cinematicsRouter.get('/', wrap(async (_req, res) => res.json({ cinematics: CINEMATICS })));

cinematicsRouter.get(
  '/:key',
  wrap(async (req, res) => {
    const c = CINEMATICS.find((x) => x.key === req.params.key);
    if (!c) throw notFound('Cinematic not found');
    res.json({ cinematic: c });
  }),
);
