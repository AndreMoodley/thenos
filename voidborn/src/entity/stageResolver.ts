// Pure mapping from lifetime effort to the entity's evolution stage + the Rive inputs that drive
// its motion. No React Native imports — unit-tested directly.

import { realmForHammerCount, type RealmState } from '../constants/realms';
import type { RiveInputs } from '../manifestation/types';

export interface EntityStage {
  stage: number; // 1..7 == realm index
  label: string; // Embryo … Divine self
  sigil: string;
  realm: RealmState;
}

export function entityStage(hammerCount: number): EntityStage {
  const realm = realmForHammerCount(hammerCount);
  return { stage: realm.stage, label: realm.realm.stageLabel, sigil: realm.realm.sigil, realm };
}

export interface LiveState {
  hammerCount: number;
  ki: number;
  shadowLevel: number;
  streak: number;
  corrupted?: boolean;
}

/** Pure: live practitioner state → the numeric inputs pushed into the Rive state machine. */
export function bridgeInputs(s: LiveState): RiveInputs {
  const realm = realmForHammerCount(s.hammerCount);
  return {
    realm: realm.stage,
    ki: clamp(s.ki, 0, 100),
    shadowLevel: clamp(s.shadowLevel, 1, 5),
    streak: Math.max(0, s.streak),
    streakBonus: s.streak >= 7,
    mastery: realm.originArtMastery,
    corruption: s.corrupted ? 1 : 0,
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
