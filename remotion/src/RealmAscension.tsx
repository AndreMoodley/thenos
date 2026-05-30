// Crossing a realm threshold — the entity evolves a stage and the space matures. Charge → burst.
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const RealmAscension: React.FC<{ realmName: string; sigil: string; stage: number }> = ({ realmName, sigil, stage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rise = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const flash = interpolate(frame, [50, 60, 75], [0, 1, 0], { extrapolateRight: 'clamp' });
  const sigilScale = 0.6 + rise * 0.8;
  const textOpacity = interpolate(frame, [70, 100], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#05060a', alignItems: 'center', justifyContent: 'center' }}>
      <AbsoluteFill style={{ backgroundColor: '#7df9ff', opacity: flash * 0.5 }} />
      <div style={{ transform: `scale(${sigilScale})`, color: '#ffd76a', fontSize: 180, textShadow: '0 0 40px #ffd76a', fontFamily: 'sans-serif' }}>{sigil}</div>
      <div style={{ position: 'absolute', bottom: 420, color: '#e8ebf5', fontSize: 56, fontWeight: 800, letterSpacing: 3, opacity: textOpacity, fontFamily: 'sans-serif' }}>{realmName}</div>
      <div style={{ position: 'absolute', bottom: 360, color: '#9aa3bd', fontSize: 28, opacity: textOpacity, fontFamily: 'sans-serif' }}>Stage {stage} of 7</div>
    </AbsoluteFill>
  );
};
