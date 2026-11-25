import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const VisualScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });
  const exit = interpolate(frame, [durationInFrames - 22, durationInFrames], [1, 0], { extrapolateLeft: 'clamp' });
  const glow = 0.45 + Math.sin(frame / 12) * 0.2;
  const bar = interpolate(frame, [10, 50], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#05070d', color: '#eef8ff', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <AbsoluteFill style={{ background: `radial-gradient(55% 55% at 50% 42%, rgba(18,224,200,${glow * 0.18}), transparent 70%)` }} />
      <AbsoluteFill style={{ opacity: exit, display: 'grid', placeItems: 'center' }}>
        <div style={{ transform: `translateY(${(1 - enter) * 34}px)`, textAlign: 'center' }}>
          <div style={{ font: '600 12px ui-monospace, monospace', letterSpacing: '.18em', color: '#12e0c8', marginBottom: 18 }}>REMOTION · RENDER REAL</div>
          <div style={{ fontSize: 92, fontWeight: 800, letterSpacing: '-0.055em', lineHeight: 0.95 }}>Visual Engine</div>
          <div style={{ height: 2, width: 360 * bar, background: 'linear-gradient(90deg,#12e0c8,#ffb454)', margin: '24px auto 0' }} />
          <div style={{ marginTop: 18, fontSize: 16, color: '#a9c2d2' }}>{Math.round(enter * 100)}% · frame {frame}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
