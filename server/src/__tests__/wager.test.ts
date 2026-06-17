import { describe, it, expect } from 'vitest';
import { evaluateWager, wagerCriterionSchema, horizonDays } from '../lib/wager.js';

const facts = (over: Partial<{ streak: number; sessionsSinceStart: number; strikeAmountSinceStart: number }> = {}) => ({
  streak: 0,
  sessionsSinceStart: 0,
  strikeAmountSinceStart: 0,
  ...over,
});

describe('evaluateWager — server-derived outcome (audit C2)', () => {
  it('streak: wins iff the chosen streak length held (dynamic 7/30/90/…)', () => {
    expect(evaluateWager({ kind: 'streak', days: 7 }, facts({ streak: 7 })).won).toBe(true);
    expect(evaluateWager({ kind: 'streak', days: 30 }, facts({ streak: 29 })).won).toBe(false);
    expect(evaluateWager({ kind: 'streak', days: 30 }, facts({ streak: 30 })).won).toBe(true);
    expect(evaluateWager({ kind: 'streak', days: 90 }, facts({ streak: 120 })).won).toBe(true);
  });

  it('sessions goal: wins iff enough sessions logged in the window', () => {
    expect(evaluateWager({ kind: 'sessions', count: 20, days: 30 }, facts({ sessionsSinceStart: 20 })).won).toBe(true);
    expect(evaluateWager({ kind: 'sessions', count: 20, days: 30 }, facts({ sessionsSinceStart: 19 })).won).toBe(false);
  });

  it('strikes goal: wins iff enough total reps in the window', () => {
    expect(evaluateWager({ kind: 'strikes', amount: 5000, days: 30 }, facts({ strikeAmountSinceStart: 5000 })).won).toBe(true);
    expect(evaluateWager({ kind: 'strikes', amount: 5000, days: 30 }, facts({ strikeAmountSinceStart: 4999 })).won).toBe(false);
  });

  it('horizon drives the resolve window', () => {
    expect(horizonDays({ kind: 'streak', days: 90 })).toBe(90);
    expect(horizonDays({ kind: 'sessions', count: 10, days: 14 })).toBe(14);
  });

  it('validates criteria via Zod (rejects junk / missing fields)', () => {
    expect(wagerCriterionSchema.safeParse({ kind: 'streak', days: 7 }).success).toBe(true);
    expect(wagerCriterionSchema.safeParse({ kind: 'streak' }).success).toBe(false);
    expect(wagerCriterionSchema.safeParse({ kind: 'nonsense' }).success).toBe(false);
    expect(wagerCriterionSchema.safeParse({ kind: 'streak', days: 0 }).success).toBe(false);
  });
});
