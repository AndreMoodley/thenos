// Device tier → graceful degradation (invariant #7). High/mid render true-3D spaces (R3F);
// low falls back to 2.5D parallax. There is no legacy renderer — the low path is Rive-over-2.5D.
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useReduceMotion } from './reduceMotion';

export type DeviceTier = 'low' | 'mid' | 'high';

let override: DeviceTier | null = null;
export const setDeviceTierOverride = (t: DeviceTier | null) => {
  override = t;
};

/**
 * Coarse heuristic. A production build refines this with `expo-device` (total memory / model year)
 * and a one-time perf probe of the first frame. Until then we default conservatively to 'mid'.
 */
export function detectDeviceTier(): DeviceTier {
  if (override) return override;
  if (Platform.OS === 'web') return 'high';
  return 'mid';
}

export interface Capabilities {
  tier: DeviceTier;
  /** render spaces in true-3D (R3F) vs 2.5D parallax */
  use3D: boolean;
  /** cap the entity/particle work */
  maxParticles: number;
}

export function capabilitiesFor(tier: DeviceTier, reduceMotion: boolean): Capabilities {
  const use3D = tier !== 'low' && !reduceMotion;
  return {
    tier,
    use3D,
    maxParticles: tier === 'high' ? 64 : tier === 'mid' ? 24 : 8,
  };
}

export function useCapabilities(): Capabilities {
  const reduceMotion = useReduceMotion();
  const [tier, setTier] = useState<DeviceTier>(detectDeviceTier());
  useEffect(() => setTier(detectDeviceTier()), []);
  return capabilitiesFor(tier, reduceMotion);
}
