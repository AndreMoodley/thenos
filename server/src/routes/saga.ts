// The Saga — purpose arcs over real training. Forge is server-authoritative and online-only
// (the client defers when offline); reading the saga always works from the synced snapshot.
// Chapters carry deterministic fallback prose from the moment they unlock; when a key is
// present they are lazily refined to Claude prose here — cached by promptHash, rate-limited,
// and always grounded in the stored unlockedBy event (invariant #13).

import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { badRequest, notFound, tooMany, wrap } from '../lib/http.js';
import { serializeSaga } from '../lib/serialize.js';
import { BEAT_SKELETON, type SagaEvent } from '../lib/sagaBeats.js';
import { SAGA_STYLES } from '../lib/sagaTemplates.js';
import { forgeArc, forgePromptHash, chapterProse, prosePromptHash } from '../lib/sagaForge.js';
import { advanceSaga, forgeContextFor } from '../lib/sagaEngine.js';

export const sagaRouter = Router();
sagaRouter.use(requireAuth);

const MIN_GAP_MS = 8_000; // soft per-practitioner rate limit on live model calls
const lastLiveCall = new Map<string, number>();

const styleKeys = SAGA_STYLES.map((s) => s.styleKey) as [string, ...string[]];

sagaRouter.get(
  '/styles',
  wrap(async (_req, res) => res.json({ styles: SAGA_STYLES })),
);

const profileSchema = z.object({
  currentSelf: z.string().min(1).max(400),
  higherSelf: z.string().min(1).max(400),
  outcome: z.string().min(1).max(400),
  obstacleCategory: z.enum(['social', 'food', 'media', 'argument', 'validation', 'doubt']),
  obstacleName: z.string().min(1).max(60),
  obstacleDetail: z.string().min(1).max(400),
  wardPlan: z.string().min(1).max(400),
  styleKey: z.enum(styleKeys).optional(),
});

// Absolute-set upsert ⇒ naturally idempotent — safe to replay from the offline queue.
sagaRouter.put(
  '/profile',
  wrap(async (req: AuthedRequest, res) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid soul profile');
    const pid = req.practitionerId!;
    const profile = await prisma.soulProfile.upsert({
      where: { practitionerId: pid },
      update: parsed.data,
      create: { practitionerId: pid, ...parsed.data },
    });
    res.json({ profile });
  }),
);

sagaRouter.post(
  '/forge',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ styleKey: z.enum(styleKeys).optional(), regenerate: z.boolean().default(false) });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('Invalid forge payload');
    const pid = req.practitionerId!;

    const profile = await prisma.soulProfile.findUnique({ where: { practitionerId: pid } });
    if (!profile) throw badRequest('The Mirror Rite comes first — set the soul profile');
    const styleKey = parsed.data.styleKey ?? profile.styleKey ?? 'murim';

    const ctx = await forgeContextFor(prisma, pid, styleKey);
    if (!ctx) throw badRequest('The Mirror Rite comes first — set the soul profile');
    const hash = forgePromptHash(ctx);

    const active = await prisma.saga.findFirst({
      where: { practitionerId: pid, status: 'active' },
      include: { chapters: { orderBy: { index: 'asc' } } },
    });
    // Idempotent forge: an identical context returns the saga already being written.
    if (active && active.promptHash === hash && !parsed.data.regenerate) {
      return res.json({ ...serializeSaga(active), reused: true });
    }
    if (active && !parsed.data.regenerate) {
      throw badRequest('A saga is already being written — reforge explicitly to begin anew');
    }

    const last = lastLiveCall.get(pid) ?? 0;
    if (Date.now() - last < MIN_GAP_MS) throw tooMany('The Forge needs a moment to cool');
    lastLiveCall.set(pid, Date.now());

    const { spec, source } = await forgeArc(ctx);

    const saga = await prisma.$transaction(async (tx) => {
      if (active) {
        // Additive-only: the old saga is archived, never altered or deleted.
        await tx.saga.update({ where: { id: active.id }, data: { status: 'archived' } });
      }
      if (parsed.data.styleKey && parsed.data.styleKey !== profile.styleKey) {
        await tx.soulProfile.update({ where: { practitionerId: pid }, data: { styleKey } });
      }
      const trial = await tx.trial.findFirst({ where: { practitionerId: pid, status: 'active' } });
      const created = await tx.saga.create({
        data: {
          practitionerId: pid,
          styleKey,
          title: spec.title,
          synopsis: spec.synopsis,
          demonName: spec.demonName,
          spec: BEAT_SKELETON as unknown as Prisma.InputJsonValue,
          promptHash: hash,
          source,
          trialId: trial?.id ?? null,
          chapters: {
            create: BEAT_SKELETON.map((b, i) => ({
              practitionerId: pid,
              index: i + 1,
              beatKey: b.beatKey,
              title: spec.chapters[i]!.title,
              tease: spec.chapters[i]!.tease,
              trigger: b.trigger as unknown as Prisma.InputJsonValue,
              optional: b.optional ?? false,
            })),
          },
        },
      });
      // Forging IS a real event — the Awakening opens the moment the saga exists.
      await advanceSaga(tx, pid, [{ kind: 'forged' }]);
      return created;
    });

    const full = await prisma.saga.findUniqueOrThrow({
      where: { id: saga.id },
      include: { chapters: { orderBy: { index: 'asc' } } },
    });
    res.status(201).json({ ...serializeSaga(full), reused: false });
  }),
);

/** Refine at most one fallback chapter to Claude prose — cached by promptHash, never re-rolled. */
async function refineOneChapter(pid: string, sagaId: string): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) return;
  const last = lastLiveCall.get(pid) ?? 0;
  if (Date.now() - last < MIN_GAP_MS) return;
  const ch = await prisma.sagaChapter.findFirst({
    where: { sagaId, unlockedAt: { not: null }, proseSource: 'fallback' },
    orderBy: { index: 'asc' },
  });
  if (!ch || !ch.unlockedBy) return;
  const saga = await prisma.saga.findUnique({ where: { id: sagaId }, select: { styleKey: true } });
  const ctx = await forgeContextFor(prisma, pid, saga?.styleKey ?? 'murim');
  if (!ctx) return;
  const ev = ch.unlockedBy as unknown as SagaEvent;
  const hash = prosePromptHash(ctx, ch, ev);
  if (ch.promptHash === hash) return; // this exact refinement was already attempted
  lastLiveCall.set(pid, Date.now());
  const { prose, source } = await chapterProse(ctx, ch, ev);
  if (source === 'claude') {
    await prisma.sagaChapter.update({ where: { id: ch.id }, data: { prose, proseSource: 'claude', promptHash: hash } });
  } else {
    await prisma.sagaChapter.update({ where: { id: ch.id }, data: { promptHash: hash } });
  }
}

sagaRouter.get(
  '/state',
  wrap(async (req: AuthedRequest, res) => {
    const pid = req.practitionerId!;
    const [profile, saga] = await Promise.all([
      prisma.soulProfile.findUnique({ where: { practitionerId: pid } }),
      prisma.saga.findFirst({
        where: { practitionerId: pid, status: { in: ['active', 'completed'] } },
        orderBy: { createdAt: 'desc' },
        include: { chapters: { orderBy: { index: 'asc' } } },
      }),
    ]);
    if (saga) {
      await refineOneChapter(pid, saga.id).catch(() => {});
      const fresh = await prisma.saga.findUniqueOrThrow({
        where: { id: saga.id },
        include: { chapters: { orderBy: { index: 'asc' } } },
      });
      return res.json({ profile, ...serializeSaga(fresh), styles: SAGA_STYLES });
    }
    res.json({ profile, saga: null, chapters: [], nextTease: null, styles: SAGA_STYLES });
  }),
);

sagaRouter.get(
  '/chapters/:id',
  wrap(async (req: AuthedRequest, res) => {
    const pid = req.practitionerId!;
    const ch = await prisma.sagaChapter.findUnique({ where: { id: req.params.id } });
    if (!ch || ch.practitionerId !== pid) throw notFound('Chapter not found');
    if (!ch.unlockedAt) {
      // A locked chapter shows only its tease — the story cannot be read ahead of the work.
      return res.json({ chapter: { id: ch.id, index: ch.index, beatKey: ch.beatKey, title: ch.title, tease: ch.tease, optional: ch.optional, unlockedAt: null } });
    }
    await refineOneChapter(pid, ch.sagaId).catch(() => {});
    const fresh = await prisma.sagaChapter.findUniqueOrThrow({ where: { id: ch.id } });
    res.json({ chapter: fresh });
  }),
);
