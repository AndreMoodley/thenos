// Form lines — the "species" axis (the realm is the "stage" axis). Only `activeFormKey` is stored;
// the stage within a form is computed. Each form ships one Rive artboard per stage (1..7).

export type FormKey = 'void' | 'beast' | 'humanoid' | 'transcendent_heavenly';
export type FormTier = 'free' | 'premium' | 'transcendent';

export interface FormLine {
  key: FormKey;
  name: string;
  tier: FormTier;
  riv: string; // asset under assets/rive
  /** stage index (1..7) → Rive artboard name */
  artboards: Record<number, string>;
  /** Rive state-machine inputs the metric bridge pushes */
  inputs: readonly string[];
  blurb: string;
}

const STAGE_LABELS = ['Embryo', 'Awakening', 'Forming', 'Tempered', 'Ascendant', 'Sovereign', 'Divine'] as const;
const artboards = (prefix: string): Record<number, string> =>
  Object.fromEntries(STAGE_LABELS.map((l, i) => [i + 1, `${prefix}_${l}`]));

export const ENTITY_INPUTS = ['ki', 'shadowLevel', 'streak', 'realm', 'mastery', 'corruption'] as const;

export const FORM_LINES: Record<FormKey, FormLine> = {
  void: {
    key: 'void',
    name: 'Void',
    tier: 'free',
    riv: 'void.riv',
    artboards: artboards('Void'),
    inputs: ENTITY_INPUTS,
    blurb: 'The formless, abstract origin — a permanent, valid choice, not a placeholder.',
  },
  beast: {
    key: 'beast',
    name: 'Beast',
    tier: 'premium',
    riv: 'beast.riv',
    artboards: artboards('Beast'),
    inputs: ENTITY_INPUTS,
    blurb: 'A creature companion that evolves from hatchling to apex spirit.',
  },
  humanoid: {
    key: 'humanoid',
    name: 'Humanoid',
    tier: 'premium',
    riv: 'humanoid.riv',
    artboards: artboards('Humanoid'),
    inputs: ENTITY_INPUTS,
    blurb: 'A figure form — the ascended self made manifest.',
  },
  transcendent_heavenly: {
    key: 'transcendent_heavenly',
    name: 'Transcendent',
    tier: 'transcendent',
    riv: 'transcendent.riv',
    artboards: artboards('Transcendent'),
    inputs: ENTITY_INPUTS,
    blurb: 'Earned only by passing a Heavenly Restriction. Proof, not cosmetic.',
  },
};

export const FREE_FORM: FormKey = 'void';
export const isFormOwned = (key: FormKey, owned: readonly string[]): boolean =>
  key === FREE_FORM || owned.includes(key);
