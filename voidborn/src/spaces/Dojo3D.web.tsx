// Web variant of the 3D dojo. @react-three/fiber/native + expo-gl are native GL bindings; on the web
// target (and in a headless browser without a GPU) we degrade to the 2.5D parallax domain — invariant
// #7: degrade fidelity, never function. The native Dojo3D.tsx (real R3F) is untouched.
import React from 'react';
import { ParallaxDomain } from './ParallaxDomain';

export function Dojo3D({ domainKey }: { domainKey: string }) {
  return <ParallaxDomain domainKey={domainKey} />;
}
