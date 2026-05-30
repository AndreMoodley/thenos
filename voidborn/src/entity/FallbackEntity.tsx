// Metric-reactive fallback entity. Renders until the authored .riv art ships, and reads exactly like
// the real entity will: ki → brightness, shadowLevel → spread/pulse, streak≥7 → bonus orbit,
// mastery → glow, corruption → desaturated/red. Pure Reanimated; honors reduce-motion (calm).
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing, cancelAnimation } from 'react-native-reanimated';
import { colors } from '../constants/theme';
import type { RiveInputs } from '../manifestation/types';

export function FallbackEntity({ inputs, reduceMotion, size = 220 }: { inputs: RiveInputs; reduceMotion?: boolean; size?: number }) {
  const pulse = useSharedValue(0);
  const orbit = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0.5;
      orbit.value = 0;
      return;
    }
    // pulse rate rises with shadowLevel (1..5)
    const period = 2600 - inputs.shadowLevel * 280;
    pulse.value = withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true);
    if (inputs.streakBonus) orbit.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(orbit);
    };
  }, [inputs.shadowLevel, inputs.streakBonus, reduceMotion]);

  const auraTint = inputs.corruption ? colors.corruption : colors.ki;
  const brightness = 0.35 + (inputs.ki / 100) * 0.65; // ki → eye/aura brightness
  const glow = Math.min(28, 6 + inputs.mastery * 1.4); // mastery → glow radius

  const coreStyle = useAnimatedStyle(() => {
    const s = 1 + pulse.value * (0.04 + inputs.shadowLevel * 0.015);
    return { transform: [{ scale: s }], opacity: brightness };
  });
  const auraStyle = useAnimatedStyle(() => {
    const spread = 1 + pulse.value * (0.12 + inputs.shadowLevel * 0.03);
    return { transform: [{ scale: spread }], opacity: 0.18 + pulse.value * 0.12 };
  });
  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${orbit.value * 360}deg` }] }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]} accessibilityRole="image" accessibilityLabel="Your Void entity, reacting to your training">
      <Animated.View style={[styles.aura, { width: size, height: size, borderRadius: size / 2, backgroundColor: auraTint }, auraStyle]} />
      <Animated.View
        style={[
          styles.core,
          {
            width: size * 0.52,
            height: size * 0.52,
            borderRadius: size * 0.26,
            backgroundColor: auraTint,
            shadowColor: auraTint,
            shadowRadius: glow,
            shadowOpacity: 0.9,
            elevation: glow,
          },
          coreStyle,
        ]}
      />
      {inputs.streakBonus && (
        <Animated.View style={[styles.orbitTrack, { width: size * 0.86, height: size * 0.86 }, orbitStyle]}>
          <View style={[styles.orbiter, { backgroundColor: colors.gold }]} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  aura: { position: 'absolute' },
  core: { position: 'absolute' },
  orbitTrack: { position: 'absolute', alignItems: 'center' },
  orbiter: { width: 12, height: 12, borderRadius: 6, position: 'absolute', top: -2 },
});
