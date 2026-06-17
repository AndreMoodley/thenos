import { z } from 'zod';

/**
 * The win condition for a Wagered-Ki bet, stored on the WagerEvent and evaluated SERVER-SIDE from
 * real logged data (audit C2 — settlement must never trust a client-supplied outcome). Dynamic by
 * design: bet on holding a streak of any length (7 / 30 / 90 / …), or on a concrete training goal
 * (a number of sessions, or a total rep/strike volume) within a chosen window of `days`.
 */
export const wagerCriterionSchema = z.discriminatedUnion('kind', [
  // Hold a streak of `days` days (the horizon is the same `days`).
  z.object({ kind: z.literal('streak'), days: z.number().int().min(1).max(3650) }),
  // Log at least `count` sessions within `days` days.
  z.object({ kind: z.literal('sessions'), count: z.number().int().min(1).max(100000), days: z.number().int().min(1).max(3650) }),
  // Accumulate at least `amount` total reps (strike amount) within `days` days.
  z.object({ kind: z.literal('strikes'), amount: z.number().int().min(1).max(100000000), days: z.number().int().min(1).max(3650) }),
]);
export type WagerCriterion = z.infer<typeof wagerCriterionSchema>;

/** Real, server-gathered facts for the wager window (since the wager started). */
export interface WagerFacts {
  streak: number;
  sessionsSinceStart: number;
  strikeAmountSinceStart: number;
}

export interface WagerVerdict {
  won: boolean;
  detail: string;
}

/** Days the practitioner committed to — drives the wager's resolve date. */
export function horizonDays(c: WagerCriterion): number {
  return c.days;
}

/**
 * Decide a wager from REAL facts. Pure + deterministic (unit-tested). This is the whole point of
 * the C2 fix: the outcome is derived here, never sent by the client.
 */
export function evaluateWager(c: WagerCriterion, f: WagerFacts): WagerVerdict {
  switch (c.kind) {
    case 'streak':
      return { won: f.streak >= c.days, detail: `streak ${f.streak}/${c.days} days held` };
    case 'sessions':
      return { won: f.sessionsSinceStart >= c.count, detail: `sessions ${f.sessionsSinceStart}/${c.count}` };
    case 'strikes':
      return { won: f.strikeAmountSinceStart >= c.amount, detail: `reps ${f.strikeAmountSinceStart}/${c.amount}` };
    default: {
      const _exhaustive: never = c;
      return { won: false, detail: `unknown criterion ${JSON.stringify(_exhaustive)}` };
    }
  }
}
