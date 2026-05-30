// The Seven Realms — the progression engine. Realm and evolution stage are NEVER stored; both are
// computed from `hammerCount`. This is the canonical CLIENT contract and MUST match the server's
// `server/src/lib/realms.ts` (both are unit-tested against the same thresholds).

export interface Realm {
  index: number; // 1..7
  key: string;
  name: string;
  threshold: number; // cumulative hammerCount to enter
  sigil: string;
  stageLabel: string; // entity evolution stage name (embryo → divine)
}

export const REALMS: readonly Realm[] = [
  { index: 1, key: 'foundation', name: 'Foundation Realm', threshold: 0, sigil: '◈', stageLabel: 'Embryo' },
  { index: 2, key: 'ki_accumulation', name: 'Ki Accumulation', threshold: 1_500, sigil: '◈◈', stageLabel: 'Awakening' },
  { index: 3, key: 'ki_establishment', name: 'Ki Establishment', threshold: 4_000, sigil: '◈◈◈', stageLabel: 'Forming' },
  { index: 4, key: 'true_ki_awakening', name: 'True Ki Awakening', threshold: 9_000, sigil: '◈◈◈◈', stageLabel: 'Tempered' },
  { index: 5, key: 'transcendence', name: 'Transcendence — The Void', threshold: 18_000, sigil: '⟁', stageLabel: 'Ascendant' },
  { index: 6, key: 'evolutionary', name: 'Evolutionary Realm', threshold: 36_500, sigil: '⟁⟁', stageLabel: 'Sovereign' },
  { index: 7, key: 'divine_master', name: 'Divine Master', threshold: 73_000, sigil: '⟁⟁⟁', stageLabel: 'Divine self' },
] as const;

export interface RealmState {
  realm: Realm;
  stage: number; // == realm.index (1..7)
  hammerCount: number;
  originArtMastery: number; // hammerCount * 0.001
  nextThreshold: number | null;
  hammerToNext: number | null;
  progressToNext: number; // 0..1 within the current realm band
}

/** Pure: the realm/stage for a lifetime hammerCount. Always derived — never stored. */
export function realmForHammerCount(hammerCount: number): RealmState {
  const hc = Math.max(0, Math.floor(hammerCount || 0));
  let realm: Realm = REALMS[0]!;
  for (const r of REALMS) {
    if (hc >= r.threshold) realm = r;
    else break;
  }
  const next = REALMS[realm.index];
  const nextThreshold = next ? next.threshold : null;
  const hammerToNext = nextThreshold !== null ? Math.max(0, nextThreshold - hc) : null;
  const band = nextThreshold !== null ? nextThreshold - realm.threshold : 0;
  const progressToNext =
    nextThreshold !== null && band > 0 ? Math.min(1, (hc - realm.threshold) / band) : 1;

  return { realm, stage: realm.index, hammerCount: hc, originArtMastery: hc * 0.001, nextThreshold, hammerToNext, progressToNext };
}

/** Realms crossed by a hammerCount delta — drives ascension cinematics. */
export function realmsCrossed(before: number, after: number): Realm[] {
  if (after <= before) return [];
  return REALMS.filter((r) => r.threshold > before && r.threshold <= after);
}
