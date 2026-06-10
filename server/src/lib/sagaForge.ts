// The Saga Forge — AI flavor for the saga, never AI structure (invariant #13).
// Mirrors lib/voice.ts exactly: promptHash for caching, strict validation, and a
// deterministic, data-grounded fallback at every seam so the saga works keyless/offline.
// The model writes forward-looking myth; the ONLY history it may reference is in the context.

import Anthropic from '@anthropic-ai/sdk';
import crypto from 'node:crypto';
import { z } from 'zod';
import { BEAT_SKELETON, type BeatSkeleton, type SagaEvent } from './sagaBeats.js';
import {
  templateArc,
  templateChapterProse,
  styleByKey,
  type ArcSpec,
  type SoulProfileLike,
} from './sagaTemplates.js';

export interface ForgeContext {
  name: string;
  styleKey: string;
  profile: SoulProfileLike;
  trial?: { title: string; totalWeeks: number; focusModality: string; goalKind: string } | null;
  realmName: string;
  skeleton: readonly BeatSkeleton[];
}

export const arcSpecSchema: z.ZodType<ArcSpec> = z.object({
  title: z.string().min(1).max(80),
  synopsis: z.string().min(1).max(600),
  demonName: z.string().min(1).max(60),
  chapters: z
    .array(
      z.object({
        beatKey: z.string().min(1).max(40),
        title: z.string().min(1).max(80),
        tease: z.string().min(1).max(200),
      }),
    )
    .min(1)
    .max(BEAT_SKELETON.length),
});

const FORGE_SYSTEM = `You are the Saga Forge of VOIDBORN — you write the myth of a real person's real training, in the diction of manhwa and isekai.
Rules you must never break:
- You write FORWARD-LOOKING myth: titles, teases, a synopsis. The only history you may reference is what is given in the context. Never invent past sessions, streaks, numbers, or events.
- The antagonist is the practitioner's own named inner obstacle. Never invent a different villain.
- Supportive and mythic, never punitive, never shaming, never clinical.
- Respond with STRICT JSON only (no code fences, no commentary) matching:
  { "title": string<=80, "synopsis": string<=600, "demonName": string<=60,
    "chapters": [{ "beatKey": string, "title": string<=80, "tease": string<=200 }] }
- One chapter object per beatKey you are given, in the same order. Do not add, remove, or rename beatKeys.`;

export function forgePromptHash(ctx: ForgeContext): string {
  const key = JSON.stringify({
    s: ctx.styleKey,
    hs: ctx.profile.higherSelf,
    cs: ctx.profile.currentSelf,
    ob: [ctx.profile.obstacleCategory, ctx.profile.obstacleName],
    t: ctx.trial ? [ctx.trial.title, ctx.trial.totalWeeks, ctx.trial.goalKind] : null,
    r: ctx.realmName,
    b: ctx.skeleton.map((b) => b.beatKey),
  });
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 24);
}

function composeForgePrompt(ctx: ForgeContext): string {
  const style = styleByKey(ctx.styleKey);
  return [
    `Style: ${style.name} — ${style.diction}`,
    `Practitioner: ${ctx.name}`,
    `Current self (their words): ${ctx.profile.currentSelf}`,
    `Higher self they are becoming (the entity embodies this): ${ctx.profile.higherSelf}`,
    `Best imagined outcome: ${ctx.profile.outcome}`,
    `Inner obstacle (the antagonist): "${ctx.profile.obstacleName}" — nature: ${ctx.profile.obstacleCategory}; how it stirs: ${ctx.profile.obstacleDetail}`,
    `Their ward against it (if-then): ${ctx.profile.wardPlan}`,
    ctx.trial
      ? `Sworn trial pacing the arc: "${ctx.trial.title}" — ${ctx.trial.totalWeeks} weeks of ${ctx.trial.focusModality} (${ctx.trial.goalKind}).`
      : 'No trial sworn yet — the arc opens before the path is laid.',
    `Current realm (already earned, the only past you may reference): ${ctx.realmName}`,
    '',
    `Write the arc as JSON for these beatKeys, in order: ${ctx.skeleton.map((b) => b.beatKey).join(', ')}.`,
  ].join('\n');
}

/** Deterministic authored arc — the keyless floor. Always validates against arcSpecSchema. */
export function fallbackArc(ctx: ForgeContext): ArcSpec {
  return templateArc(ctx.styleKey, ctx.profile, ctx.skeleton);
}

/**
 * Force the authored skeleton onto whatever the model returned: chapters are re-keyed by
 * beatKey in skeleton order, missing beats fall back to the template. AI can flavor the
 * arc; it can never bend its spine.
 */
export function mergeWithSkeleton(ctx: ForgeContext, candidate: ArcSpec): ArcSpec {
  const floor = fallbackArc(ctx);
  const byBeat = new Map(candidate.chapters.map((c) => [c.beatKey, c]));
  return {
    title: candidate.title.slice(0, 80),
    synopsis: candidate.synopsis.slice(0, 600),
    demonName: (candidate.demonName || ctx.profile.obstacleName).slice(0, 60),
    chapters: ctx.skeleton.map((b, i) => {
      const got = byBeat.get(b.beatKey);
      const fb = floor.chapters[i]!;
      return {
        beatKey: b.beatKey,
        title: (got?.title ?? fb.title).slice(0, 80),
        tease: (got?.tease ?? fb.tease).slice(0, 200),
      };
    }),
  };
}

export async function forgeArc(ctx: ForgeContext): Promise<{ spec: ArcSpec; source: 'claude' | 'fallback' }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { spec: fallbackArc(ctx), source: 'fallback' };
  try {
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
      max_tokens: 1200,
      system: FORGE_SYSTEM,
      messages: [{ role: 'user', content: composeForgePrompt(ctx) }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    const parsed = arcSpecSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return { spec: fallbackArc(ctx), source: 'fallback' };
    return { spec: mergeWithSkeleton(ctx, parsed.data), source: 'claude' };
  } catch {
    return { spec: fallbackArc(ctx), source: 'fallback' };
  }
}

// ── chapter prose (written at unlock, grounded in the unlocking event) ──

export interface ChapterLike {
  beatKey: string;
  title: string;
  tease: string;
}

export function fallbackChapterProse(ctx: ForgeContext, ch: ChapterLike, ev: SagaEvent): string {
  return templateChapterProse(ctx.profile, ch.beatKey, ev, {
    realmName: ctx.realmName,
    trialTitle: ctx.trial?.title,
    totalWeeks: ctx.trial?.totalWeeks,
  });
}

const PROSE_SYSTEM = `You are the Saga Forge of VOIDBORN, writing ONE short chapter of a real person's training myth, in manhwa/isekai diction.
Rules you must never break:
- Ground the chapter ONLY in the unlocking event and context you are given. Never invent sessions, numbers, streaks, or history.
- The antagonist is the practitioner's own named inner obstacle. Supportive and mythic, never punitive.
- 3–5 sentences of prose. Second person. No JSON, no lists, no headers, no emojis.`;

export function prosePromptHash(ctx: ForgeContext, ch: ChapterLike, ev: SagaEvent): string {
  const key = JSON.stringify({ s: ctx.styleKey, b: ch.beatKey, t: ch.title, e: ev, r: ctx.realmName });
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 24);
}

export async function chapterProse(
  ctx: ForgeContext,
  ch: ChapterLike,
  ev: SagaEvent,
): Promise<{ prose: string; source: 'claude' | 'fallback' }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { prose: fallbackChapterProse(ctx, ch, ev), source: 'fallback' };
  try {
    const style = styleByKey(ctx.styleKey);
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
      max_tokens: 400,
      system: PROSE_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            `Style: ${style.name} — ${style.diction}`,
            `Chapter: "${ch.title}" (beat: ${ch.beatKey}). Its locked tease was: ${ch.tease}`,
            `The REAL event that just unlocked it: ${JSON.stringify(ev)}`,
            `Practitioner higher self: ${ctx.profile.higherSelf}; inner obstacle: "${ctx.profile.obstacleName}" (${ctx.profile.obstacleCategory}).`,
            `Current realm: ${ctx.realmName}.${ctx.trial ? ` Sworn trial: "${ctx.trial.title}" (${ctx.trial.totalWeeks} weeks).` : ''}`,
            '',
            'Write the chapter now.',
          ].join('\n'),
        },
      ],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return text
      ? { prose: text, source: 'claude' }
      : { prose: fallbackChapterProse(ctx, ch, ev), source: 'fallback' };
  } catch {
    return { prose: fallbackChapterProse(ctx, ch, ev), source: 'fallback' };
  }
}
