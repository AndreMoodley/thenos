// Dark-fantasy palette + tokens. Must still meet contrast targets (accessibility). RN-free constants.

export const colors = {
  void0: '#05060a', // deepest background
  void1: '#0b0e16',
  void2: '#131826',
  ink: '#e8ebf5', // primary text (contrast ≥ 7:1 on void0)
  inkDim: '#9aa3bd',
  inkFaint: '#5a607a',
  ki: '#7df9ff', // cyan — default aura
  gold: '#ffd76a',
  crimson: '#ff5470',
  white: '#f5f7ff',
  corruption: '#7a2330',
  success: '#39ff88',
  warn: '#ffb454',
  line: '#1c2230',
} as const;

// Aura palette by key (metrics → motion; cosmetics → palette).
export const AURA_COLORS: Record<string, string> = {
  ki: colors.ki,
  gold: colors.gold,
  crimson: colors.crimson,
  white: colors.white,
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radii = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

export const type = {
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 1, textTransform: 'uppercase' as const },
};

// Spring presets (Reanimated) — snappy over long eases (the juice spec).
export const springs = {
  snappy: { damping: 18, stiffness: 320, mass: 0.7 },
  soft: { damping: 22, stiffness: 180, mass: 0.9 },
  calm: { damping: 26, stiffness: 90, mass: 1 }, // reduce-motion variant
} as const;

export const TRANSITION_MS = 240; // ≤ 250ms space transitions
