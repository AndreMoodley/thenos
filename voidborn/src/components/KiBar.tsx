import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, radii, springs } from '../constants/theme';

/** Ki integrity bar (0–100). Springs to new values; pulses on seal at the call site. */
export function KiBar({ ki, material }: { ki: number; material?: string }) {
  const w = useSharedValue(ki);
  useEffect(() => {
    w.value = withSpring(Math.max(0, Math.min(100, ki)), springs.soft);
  }, [ki]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  const tint = ki < 30 ? colors.crimson : ki < 60 ? colors.gold : colors.ki;

  return (
    <View style={styles.wrap} accessibilityLabel={`Ki ${ki} of 100${material ? `, ${material}` : ''}`}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: tint }, fill]} />
      </View>
      <Text style={styles.value}>{ki}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { flex: 1, height: 6, backgroundColor: colors.void2, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
  value: { color: colors.inkDim, fontSize: 11, width: 24, textAlign: 'right' },
});
