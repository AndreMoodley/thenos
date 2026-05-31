// Web variant of the entity wrapper. rive-react-native is native-only, so on web we always render
// the metric-reactive FallbackEntity (pure RN/Reanimated → works headless in a browser). The native
// RiveEntity.tsx is untouched; Metro resolves this .web file only for the web target.
import React from 'react';
import { FallbackEntity } from './FallbackEntity';
import type { Manifestation } from '../manifestation/types';

export function RiveEntity({ manifestation, reduceMotion, size = 240 }: { manifestation: Manifestation; reduceMotion?: boolean; size?: number }) {
  return <FallbackEntity inputs={manifestation.riveInputs} reduceMotion={reduceMotion} size={size} />;
}
