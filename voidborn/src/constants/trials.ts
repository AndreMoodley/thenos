// Trial display vocabulary + UTC-day helpers. The day math MUST mirror the server's UTC
// convention (server/src/lib/metrics.ts dayDiff / protocol.ts) — the documented seam for
// week boundaries. RN-free constants.

import type { PhaseKey, PlannedKind } from '../api/types';

export const PHASES: Record<PhaseKey, { name: string; sigil: string; blurb: string }> = {
  gathering: { name: 'The Gathering', sigil: '◌', blurb: 'Roots first. Volume builds gently; the climb is being earned.' },
  tribulation: { name: 'The Tribulation', sigil: '⟁', blurb: 'The key block. It gets heavier because it matters.' },
  quieting: { name: 'The Quieting', sigil: '◦', blurb: 'Volume falls away; the edge stays. The breath before the gate.' },
};

export const PLANNED_KINDS: Record<PlannedKind, { label: string; glyph: string; blurb: string }> = {
  flow: { label: 'Flow', glyph: '〜', blurb: 'An easy session — most of the path is walked, not fought.' },
  surge: { label: 'Surge', glyph: '⚡', blurb: 'A quality session. Sharp, deliberate, brief.' },
  pillar: { label: 'Pillar', glyph: '▮', blurb: 'The long session your week is built around.' },
  gate: { label: 'Gate', glyph: '⛩', blurb: 'An assessment. The week holds a door; this opens it.' },
  stillness: { label: 'Stillness', glyph: '◦', blurb: 'Recovery. Seals ki, never strikes — part of the work.' },
};

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const; // 0 = Monday

export const VOLUME_DIAL_COPY = ['Whisper', 'Soft', 'Steady', 'Heavy', 'Iron'] as const; // 1..5
export const DIFFICULTY_DIAL_COPY = ['Gentle', 'Mild', 'Honed', 'Sharp', 'Merciless'] as const; // 1..5

const DAY_MS = 86_400_000;

/** UTC midnight of a date — quests live on UTC days (mirrors the server). */
export function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** UTC calendar-day difference (a-b), mirroring server metrics.dayDiff. */
export function dayDiffUTC(a: Date, b: Date): number {
  return Math.round((utcMidnight(a).getTime() - utcMidnight(b).getTime()) / DAY_MS);
}

export function isSameUTCDay(a: Date, b: Date): boolean {
  return dayDiffUTC(a, b) === 0;
}

/** 0-based plan week containing `on` (mirrors server protocol.weekIndexFor). */
export function weekIndexFor(startDate: Date, on: Date): number {
  return Math.floor(dayDiffUTC(on, startDate) / 7);
}

/** The UTC date of (weekIndex, dayOfWeek 0=Mon) within a trial (mirrors the server). */
export function scheduledDateFor(startDate: Date, weekIndex: number, dayOfWeek: number): Date {
  return new Date(utcMidnight(startDate).getTime() + (weekIndex * 7 + dayOfWeek) * DAY_MS);
}
