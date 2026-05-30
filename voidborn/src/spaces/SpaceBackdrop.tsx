// Chooses the render path for a space's backdrop: true-3D (R3F) on capable devices, 2.5D parallax
// otherwise (invariant #7 — degrade fidelity, never function). Renders absolute-fill; the SCREEN
// composes the entity on top (invariant #5 — the two are coupled only by the screen).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useCapabilities } from '../lib/deviceTier';
import { useReduceMotion } from '../lib/reduceMotion';
import { ParallaxDomain } from './ParallaxDomain';
import { Dojo3D } from './Dojo3D';

export function SpaceBackdrop({ domainKey, allow3D = true }: { domainKey: string; allow3D?: boolean }) {
  const caps = useCapabilities();
  const reduceMotion = useReduceMotion();
  const use3D = allow3D && caps.use3D;

  return (
    <View style={StyleSheet.absoluteFill}>
      {use3D ? <Dojo3D domainKey={domainKey} /> : <ParallaxDomain domainKey={domainKey} reduceMotion={reduceMotion} />}
    </View>
  );
}
