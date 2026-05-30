// The Voice of the Void — the AI coach, voiced THROUGH the entity.
// Supportive, never punitive, never diagnostic, and it NEVER invents data it wasn't given.
// Falls back to a deterministic, data-grounded reflection when ANTHROPIC_API_KEY is unset.

import Anthropic from '@anthropic-ai/sdk';
import crypto from 'node:crypto';
import { realmForHammerCount } from './realms.js';

export interface VoiceContext {
  occasion: 'rebirth' | 'ascension' | 'return' | 'oracle';
  name: string;
  hammerCount: number;
  ki: number;
  shadowLevel: number;
  streak: number;
  recentSessions: { modality: string; reps: number; occurredOn: string }[];
  recentLeaks: { category: string; cost: number }[];
  activeVows: { title: string; resolutionDate: string; type: string }[];
}

const SYSTEM = `You are the Voice of the Void in VOIDBORN — a presence that speaks THROUGH the player's evolving entity, never as a chatbot.
Rules you must never break:
- Be supportive and grounding. Never punitive, never shaming, never clinical or diagnostic.
- Reflect the player's own pattern back to them. You are their pattern speaking back, not an authority giving orders.
- Use ONLY the data provided. Never invent sessions, streaks, numbers, or events that are not in the context.
- 2–4 sentences. Second person. Quiet, mythic, calm. No emojis, no lists, no headers.`;

export function promptHashOf(ctx: VoiceContext): string {
  // Hash the meaningful inputs so identical situations reuse a cached reflection.
  const realm = realmForHammerCount(ctx.hammerCount).realm.key;
  const key = JSON.stringify({
    o: ctx.occasion,
    realm,
    ki: Math.round(ctx.ki / 10),
    sl: ctx.shadowLevel,
    st: ctx.streak,
    s: ctx.recentSessions.length,
    l: ctx.recentLeaks.map((l) => l.category).sort(),
    v: ctx.activeVows.map((v) => v.title).sort(),
  });
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 24);
}

function composeUserPrompt(ctx: VoiceContext): string {
  const r = realmForHammerCount(ctx.hammerCount);
  const lines = [
    `Occasion: ${ctx.occasion}`,
    `Practitioner: ${ctx.name}`,
    `Realm: ${r.realm.name} (stage ${r.stage}/7), hammerCount ${ctx.hammerCount}` +
      (r.hammerToNext !== null ? `, ${r.hammerToNext} to the next realm` : ', at the final realm'),
    `Ki integrity: ${ctx.ki}/100, shadow intensity ${ctx.shadowLevel}/5, streak ${ctx.streak} days`,
    `Recent sessions (${ctx.recentSessions.length}): ${
      ctx.recentSessions.map((s) => `${s.modality}×${s.reps}`).join(', ') || 'none logged recently'
    }`,
    `Recent ki leaks: ${ctx.recentLeaks.map((l) => `${l.category} (-${l.cost})`).join(', ') || 'none'}`,
    `Active vows: ${ctx.activeVows.map((v) => `${v.title} [${v.type}] due ${v.resolutionDate}`).join('; ') || 'none'}`,
    '',
    'Speak to them now, as the Void, about what this pattern shows. Ground every word in the data above.',
  ];
  return lines.join('\n');
}

/** Deterministic, data-grounded reflection used when no API key is present (or as a hard fallback). */
export function fallbackReflection(ctx: VoiceContext): string {
  const r = realmForHammerCount(ctx.hammerCount);
  const parts: string[] = [];
  if (ctx.occasion === 'rebirth') {
    parts.push(`You return to the ${r.realm.name}. Nothing here was given — it was struck into being.`);
  } else if (ctx.occasion === 'ascension') {
    parts.push(`You crossed into the ${r.realm.name}. The form you wear now, you earned strike by strike.`);
  } else {
    parts.push(`${ctx.streak >= 7 ? `${ctx.streak} days unbroken.` : 'You came back.'} I felt it.`);
  }
  if (ctx.recentSessions.length > 0) {
    parts.push(`I count ${ctx.recentSessions.length} recent session${ctx.recentSessions.length === 1 ? '' : 's'} in you — that is what moved the hammer.`);
  } else {
    parts.push(`The hammer has been quiet of late; it answers only to the next strike, whenever you choose it.`);
  }
  if (ctx.ki < 40 && ctx.recentLeaks.length > 0) {
    parts.push(`Your ki sits at ${ctx.ki}; the ${ctx.recentLeaks[0]!.category} drew on it. Seal what you can, gently.`);
  } else if (r.hammerToNext !== null) {
    parts.push(`${r.hammerToNext} more and the next realm opens.`);
  }
  return parts.slice(0, 4).join(' ');
}

export async function reflect(ctx: VoiceContext): Promise<{ body: string; source: 'claude' | 'fallback' }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { body: fallbackReflection(ctx), source: 'fallback' };
  try {
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: 'user', content: composeUserPrompt(ctx) }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return { body: text || fallbackReflection(ctx), source: text ? 'claude' : 'fallback' };
  } catch {
    // Never fail the request because the model is unreachable — reflect from real data instead.
    return { body: fallbackReflection(ctx), source: 'fallback' };
  }
}
