// "The void coalesces and your entity is born." Anticipation (charge-up) → payoff (burst).
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Rebirth: React.FC<{ name: string }> = ({ name }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // charge-up: a point of light gathers, then bursts into the entity
  const gather = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: 'clamp' });
  const burst = spring({ frame: frame - 60, fps, config: { damping: 12, stiffness: 200 } });
  const size = 40 + gather * 120 + burst * 240;
  const glow = 10 + burst * 60;
  const titleOpacity = interpolate(frame, [80, 110], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#05060a', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size,
          background: 'radial-gradient(circle, #7df9ff 0%, #1b6f7a 70%, transparent 100%)',
          boxShadow: `0 0 ${glow}px #7df9ff`,
        }}
      />
      <div style={{ position: 'absolute', bottom: 360, color: '#e8ebf5', fontSize: 64, fontWeight: 800, letterSpacing: 6, opacity: titleOpacity, fontFamily: 'sans-serif' }}>
        {name.toUpperCase()} IS REBORN
      </div>
    </AbsoluteFill>
  );
};
