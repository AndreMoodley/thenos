import React from 'react';
import { RiveEntity } from '../entity/RiveEntity';
import { useReduceMotion } from '../lib/reduceMotion';
import type { Manifestation } from '../manifestation/types';

/** The entity, composed by the screen on top of a space. Render split lives here (invariant #5). */
export function EntityView({ manifestation, size = 240 }: { manifestation: Manifestation; size?: number }) {
  const reduceMotion = useReduceMotion();
  return <RiveEntity manifestation={manifestation} reduceMotion={reduceMotion} size={size} />;
}
