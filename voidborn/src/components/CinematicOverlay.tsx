// Renders the active anticipation set-piece (Rebirth/Ascension/Summon) full-screen, over everything.
// Auto-dismisses (store timer); tap to skip. Reduce-motion ⇒ shortened/calm (handled in useCinematic).
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors, type as typo } from '../constants/theme';
import { useCinematic } from '../hooks/useCinematic';
import { useManifestation } from '../hooks/useManifestation';
import { EntityView } from './EntityView';

const TITLES: Record<string, string> = {
  rebirth: 'You are reborn',
  ascension: 'You ascend',
  summon: 'A spirit answers',
  vow_flourish: 'A vow, kept',
};

export function CinematicOverlay() {
  const active = useCinematic((s) => s.active);
  const skip = useCinematic((s) => s.skip);
  const manifestation = useManifestation();
  if (!active) return null;

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.fill}>
      <Pressable style={StyleSheet.absoluteFill} onPress={skip} accessibilityLabel="Skip" accessibilityRole="button" />
      <View style={styles.center} pointerEvents="none">
        {manifestation && <EntityView manifestation={manifestation} size={300} />}
        <Text style={styles.title}>{TITLES[active.kind] ?? 'The Void stirs'}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.void0, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  center: { alignItems: 'center', gap: 24 },
  title: { ...typo.display, color: colors.ink, letterSpacing: 1 },
});
