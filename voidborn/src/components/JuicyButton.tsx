// A pressable that springs on touch and fires the juice layer (haptic + audio). Never blocks input.
import React from 'react';
import { Pressable, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, radii, springs, type as typo } from '../constants/theme';
import { fire, type JuiceAction } from '../lib/juice';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function JuicyButton({
  label,
  onPress,
  action = 'tap',
  tone = 'primary',
  disabled,
  style,
  children,
}: {
  label?: string;
  onPress?: () => void;
  action?: JuiceAction;
  tone?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.95, springs.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, springs.snappy);
      }}
      onPress={() => {
        if (disabled) return;
        fire(action);
        onPress?.();
      }}
      style={[styles.base, styles[tone], disabled && styles.disabled, aStyle, style]}
    >
      {children ?? <Text style={[styles.label, tone === 'ghost' && { color: colors.ink }]}>{label}</Text>}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.ki },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  danger: { backgroundColor: colors.crimson },
  disabled: { opacity: 0.4 },
  label: { ...typo.body, color: colors.void0, fontWeight: '700' },
});
