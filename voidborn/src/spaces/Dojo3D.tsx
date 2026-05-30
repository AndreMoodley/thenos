// True-3D Dojo backdrop (R3F over expo-gl). On-demand rendering for a static room (battery), DRACO
// glTF when the model ships; until then a primitive baked-feel shrine. Falls back to 2.5D on error.
import React, { Component, Suspense, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber/native';
import { domainFor } from '../constants/domainConfig';
import { ParallaxDomain } from './ParallaxDomain';

class ThreeBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Shrine({ accent }: { accent: string }) {
  // Placeholder for the DRACO glTF dojo model. Baked-style lighting + an on-demand frameloop.
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 6, 4]} intensity={0.7} />
      <mesh rotation={[0.4, 0.6, 0]} position={[0, 0.2, 0]}>
        <icosahedronGeometry args={[1.1, 0]} />
        <meshStandardMaterial color={accent} metalness={0.3} roughness={0.4} wireframe />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.4, 0]}>
        <circleGeometry args={[4, 48]} />
        <meshStandardMaterial color="#0b0e16" />
      </mesh>
    </>
  );
}

export function Dojo3D({ domainKey }: { domainKey: string }) {
  const domain = domainFor(domainKey);
  return (
    <ThreeBoundary fallback={<ParallaxDomain domainKey={domainKey} />}>
      <Canvas
        // on-demand: only render when something invalidates (static room → battery friendly)
        frameloop="demand"
        camera={{ position: [0, 1.2, 5], fov: 50 }}
        style={{ flex: 1 }}
        gl={{ antialias: false }}
      >
        <color attach="background" args={[domain.parallax[0]?.color ?? '#05060a']} />
        <Suspense fallback={null}>
          <Shrine accent={domain.accent} />
        </Suspense>
      </Canvas>
    </ThreeBoundary>
  );
}
