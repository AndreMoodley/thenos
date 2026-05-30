// The living entity wrapper. Logic lives INSIDE the .riv state machines; this component only pushes
// live inputs and selects the stage artboard. When no .riv is bundled (art not shipped) or Rive
// errors, it degrades to the metric-reactive FallbackEntity. Reduce-motion ⇒ calm (autoplay off).
import React, { Component, useEffect, useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import Rive, { type RiveRef, Fit } from 'rive-react-native';
import { FallbackEntity } from './FallbackEntity';
import { riveSource, STATE_MACHINE } from './riveSources';
import type { Manifestation } from '../manifestation/types';
import type { FormKey } from '../constants/forms';

class RiveBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function RiveEntity({ manifestation, reduceMotion, size = 240 }: { manifestation: Manifestation; reduceMotion?: boolean; size?: number }) {
  const ref = useRef<RiveRef>(null);
  const source = riveSource(manifestation.formKey as FormKey);
  const i = manifestation.riveInputs;

  // Push live metrics into the state machine whenever they change (the bridge → Rive inputs).
  useEffect(() => {
    const r = ref.current;
    if (!r || !source) return;
    try {
      r.setInputState(STATE_MACHINE, 'ki', i.ki);
      r.setInputState(STATE_MACHINE, 'shadowLevel', i.shadowLevel);
      r.setInputState(STATE_MACHINE, 'streak', i.streak);
      r.setInputState(STATE_MACHINE, 'realm', i.realm);
      r.setInputState(STATE_MACHINE, 'mastery', i.mastery);
      r.setInputState(STATE_MACHINE, 'corruption', i.corruption);
      if (reduceMotion) r.pause();
      else r.play();
    } catch {
      /* SM input mismatch — boundary will fall back on hard errors */
    }
  }, [source, i.ki, i.shadowLevel, i.streak, i.realm, i.mastery, i.corruption, reduceMotion]);

  const fallback = <FallbackEntity inputs={i} reduceMotion={reduceMotion} size={size} />;
  if (!source) return fallback;

  return (
    <View style={{ width: size, height: size }}>
      <RiveBoundary fallback={fallback}>
        <Rive
          ref={ref}
          source={source}
          artboardName={manifestation.artboard}
          stateMachineName={STATE_MACHINE}
          autoplay={!reduceMotion}
          fit={Fit.Contain}
          style={{ width: size, height: size }}
        />
      </RiveBoundary>
    </View>
  );
}
