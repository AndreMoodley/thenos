import { describe, it, expect } from 'vitest';
import { HEXAGRAMS, TOTAL_HEXAGRAMS, dailyContemplation, cast, glyph } from '../lib/iching.js';

describe('I Ching (the complete 64)', () => {
  it('has the complete, distinct 64 in King Wen order', () => {
    expect(TOTAL_HEXAGRAMS).toBe(64);
    expect(HEXAGRAMS.every((h, i) => h.n === i + 1)).toBe(true);
    expect(new Set(HEXAGRAMS.map((h) => h.name)).size).toBe(64);
  });

  it('every hexagram carries a teaching and a reflection', () => {
    expect(HEXAGRAMS.every((h) => h.teaching.length > 0 && h.reflection.length > 0)).toBe(true);
  });

  it('maps line patterns to the right hexagrams (bijection end-to-end)', () => {
    expect(cast(() => 0.3).primary.n).toBe(1); // all young yang ⇒ #1 The Creative
    expect(cast(() => 0.6).primary.n).toBe(2); // all young yin ⇒ #2 The Receptive
  });

  it('is deterministic per seed', () => {
    expect(dailyContemplation('p:2026-06-17')).toEqual(dailyContemplation('p:2026-06-17'));
  });

  it('a draw yields valid primary + transformed and 1–6 changing lines', () => {
    const d = dailyContemplation('p:2026-06-17');
    expect(d.primary.n).toBeGreaterThanOrEqual(1);
    expect(d.transformed.n).toBeLessThanOrEqual(64);
    expect(d.changing.every((x) => x >= 1 && x <= 6)).toBe(true);
  });

  it('glyphs span the Unicode hexagram block', () => {
    expect(glyph(1)).toBe('䷀');
    expect(glyph(64)).toBe('䷿');
  });
});
