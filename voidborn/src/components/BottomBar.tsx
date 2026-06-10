// The sacred bar — four destinations, always visible, thumb-reachable, one tap to anywhere. Uses
// router.replace to keep the hub FLAT (depth ≤ 1, invariant #9). Never scrolls away.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, type as typo } from '../constants/theme';
import { fire } from '../lib/juice';

export const SPACES = [
  { route: '/', label: 'Domain', glyph: '◉' },
  { route: '/calendar', label: 'Quest Log', glyph: '◷' },
  { route: '/trophy-hall', label: 'Chronicle', glyph: '♛' },
  { route: '/chamber', label: 'Manifestation', glyph: '✦' },
] as const;

export function BottomBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {SPACES.map((s) => {
        const active = pathname === s.route || (s.route !== '/' && pathname.startsWith(s.route));
        return (
          <Pressable
            key={s.route}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={s.label}
            style={styles.tab}
            onPress={() => {
              fire('navigate');
              if (!active) router.replace(s.route as never);
            }}
          >
            <Text style={[styles.glyph, active && styles.activeGlyph]}>{s.glyph}</Text>
            <Text style={[styles.label, active && styles.activeLabel]}>{s.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.void1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  glyph: { color: colors.inkFaint, fontSize: 20 },
  activeGlyph: { color: colors.ki },
  label: { ...typo.label, fontSize: 9, color: colors.inkFaint },
  activeLabel: { color: colors.ink },
});
