// 2.5D parallax backdrop for any domain — the always-available path (low tier / reduce-motion).
// Layered translucent planes drift slowly for depth, driven by the domain's palette.
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing, type SharedValue } from 'react-native-reanimated';
import { domainFor } from '../constants/domainConfig';

export function ParallaxDomain({ domainKey, reduceMotion }: { domainKey: string; reduceMotion?: boolean }) {
  const domain = domainFor(domainKey);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      drift.value = 0.5;
      return;
    }
    drift.value = withRepeat(withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduceMotion]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {domain.parallax.map((layer, idx) => (
        <ParallaxLayer key={idx} color={layer.color} depth={layer.depth} drift={drift} />
      ))}
      {/* subtle vignette toward the floor where the entity stands */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: domain.parallax[0]?.color, opacity: 0.0 }]} />
    </View>
  );
}

function ParallaxLayer({ color, depth, drift }: { color: string; depth: number; drift: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const amp = 6 + depth * 10;
    return { transform: [{ translateY: (drift.value - 0.5) * amp }, { translateX: (drift.value - 0.5) * amp * 0.5 }] };
  });
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: color, opacity: depth === 0 ? 1 : 0.5 - depth * 0.12, top: depth * 40, bottom: -depth * 40 },
        style,
      ]}
    />
  );
}
