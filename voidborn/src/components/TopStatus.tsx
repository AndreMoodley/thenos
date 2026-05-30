import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, type as typo } from '../constants/theme';
import { RealmSigil } from './RealmSigil';
import { KiBar } from './KiBar';
import { useMetrics } from '../store/metrics';

/** Slim top chrome — realm sigil, ki bar, streak, crystals. Nothing competes with the entity. */
export function TopStatus({ online = true }: { online?: boolean }) {
  const p = useMetrics((s) => s.practitioner);
  const pending = useMetrics((s) => s.pendingCount);
  if (!p) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <RealmSigil realm={p.realm} stage={p.stage} />
        <View style={styles.right}>
          {p.streak > 0 && <Text style={styles.streak}>▲ {p.streak}d</Text>}
          <Text style={styles.crystals}>◆ {p.crystals}</Text>
          {(!online || pending > 0) && (
            <Text style={styles.sync} accessibilityLabel={online ? `${pending} changes syncing` : 'offline'}>
              {online ? `⟳ ${pending}` : 'offline'}
            </Text>
          )}
        </View>
      </View>
      <KiBar ki={p.ki} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  streak: { ...typo.label, color: colors.gold },
  crystals: { ...typo.label, color: colors.ki },
  sync: { ...typo.label, color: colors.inkFaint },
});
