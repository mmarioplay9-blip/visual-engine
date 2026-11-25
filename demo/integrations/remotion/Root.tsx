import React from 'react';
import { Composition } from 'remotion';
import { VisualScene } from './Scene';

export const RemotionRoot: React.FC = () => (
  <Composition id="VisualScene" component={VisualScene} durationInFrames={90} fps={30} width={1280} height={720} />
);
