import { describe, it, expect } from 'vitest';
import { arcSpecSchema, fallbackArc, mergeWithSkeleton, fallbackChapterProse, type ForgeContext } from '../lib/sagaForge.js';
import { BEAT_SKELETON } from '../lib/sagaBeats.js';
import { SAGA_STYLES } from '../lib/sagaTemplates.js';

const LEAKS = ['social', 'food', 'media', 'argument', 'validation', 'doubt'] as const;

const ctx = (styleKey: string, obstacleCategory: string): ForgeContext => ({
  name: 'Adept',
  styleKey,
  profile: {
    currentSelf: 'a tired scroller',
    higherSelf: 'the unshakeable dawn-runner',
    outcome: 'crossing the finish line with breath to spare',
    obstacleCategory,
    obstacleName: 'The Hollow Scroll',
    obstacleDetail: 'it stirs after 9pm, glowing softly',
    wardPlan: 'If I reach for the feed after 9pm, I begin ten breaths',
  },
  trial: { title: 'Crest the Iron Mile', totalWeeks: 10, focusModality: 'cardio', goalKind: 'breakthrough' },
  realmName: 'Ki Establishment',
  skeleton: BEAT_SKELETON,
});

describe('sagaForge — AI flavors, never bends the spine (invariant #13)', () => {
  it('fallback arcs validate against the schema for every style × every inner-demon nature', () => {
    for (const style of SAGA_STYLES) {
      for (const leak of LEAKS) {
        const spec = fallbackArc(ctx(style.styleKey, leak));
        const parsed = arcSpecSchema.safeParse(spec);
        expect(parsed.success, `${style.styleKey} × ${leak}`).toBe(true);
        expect(spec.chapters.map((c) => c.beatKey)).toEqual(BEAT_SKELETON.map((b) => b.beatKey));
        expect(spec.demonName).toBe('The Hollow Scroll');
      }
    }
  });

  it('an unknown style falls back to a valid arc rather than failing', () => {
    const spec = fallbackArc(ctx('unheard_of_style', 'media'));
    expect(arcSpecSchema.safeParse(spec).success).toBe(true);
  });

  it('mergeWithSkeleton restores authored order against adversarial model output', () => {
    const c = ctx('murim', 'media');
    const adversarial = {
      title: 'A'.repeat(500), // oversized
      synopsis: 'The model got creative.',
      demonName: '', // dropped the demon
      chapters: [
        { beatKey: 'breakthrough', title: 'Skip to the end', tease: 'no' }, // reordered
        { beatKey: 'invented_beat', title: 'New structure!', tease: 'no' }, // invented
        { beatKey: 'awakening', title: 'A fine awakening', tease: 'kept' },
      ],
    };
    const merged = mergeWithSkeleton(c, adversarial as never);
    expect(arcSpecSchema.safeParse(merged).success).toBe(true);
    expect(merged.chapters.map((x) => x.beatKey)).toEqual(BEAT_SKELETON.map((b) => b.beatKey));
    expect(merged.chapters[0]!.title).toBe('A fine awakening'); // AI flavor kept where valid
    expect(merged.chapters[1]!.title).not.toBe('New structure!'); // invented beat discarded
    expect(merged.demonName).toBe('The Hollow Scroll'); // the demon cannot be erased
    expect(merged.title.length).toBeLessThanOrEqual(80);
  });

  it('fallback prose is grounded in the real unlocking event', () => {
    const c = ctx('isekai', 'media');
    const ch = { beatKey: 'hidden_master', title: 'The NPC Who Was More', tease: '…' };
    const prose = fallbackChapterProse(c, ch, { kind: 'streak_reached', days: 9 });
    expect(prose).toContain('9 days');
    const back = fallbackChapterProse(c, { ...ch, beatKey: 'regression' }, { kind: 'returned_after_gap', gapDays: 11 });
    expect(back).toContain('11 days');
    const broke = fallbackChapterProse(c, { ...ch, beatKey: 'breakthrough' }, { kind: 'realm_crossed', realmIndex: 4 });
    expect(broke).toContain('Ki Establishment');
  });
});
