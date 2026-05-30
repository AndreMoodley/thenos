// THE TROPHY HALL — a monument to accumulated will. Ascensions (realm sigils), kept major vows as
// trophies, streak record. A half-filled hall is productively uncomfortable (Zeigarnik).
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, radii, type as typo } from '../src/constants/theme';
import { SpaceBackdrop } from '../src/spaces/SpaceBackdrop';
import { useMetrics } from '../src/store/metrics';
import { REALMS } from '../src/constants/realms';

export default function TrophyHallScreen() {
  const p = useMetrics((s) => s.practitioner);
  const vows = useMetrics((s) => s.vows);
  const keptMajor = vows.filter((v) => v.status === 'kept' && v.type === 'major');
  const stage = p?.stage ?? 1;

  return (
    <View style={styles.fill}>
      <SpaceBackdrop domainKey={p?.activeDomainKey ?? 'dojo'} allow3D={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Trophy Hall</Text>

        <Text style={styles.section}>Ascensions</Text>
        <View style={styles.shrines}>
          {REALMS.map((r) => {
            const achieved = stage >= r.index;
            return (
              <View key={r.key} style={[styles.shrine, achieved ? styles.shrineOn : styles.shrineOff]}>
                <Text style={[styles.shrineSigil, !achieved && { color: colors.inkFaint }]}>{r.sigil}</Text>
                <Text style={[styles.shrineName, !achieved && { color: colors.inkFaint }]}>{r.stageLabel}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.section}>Trophies — kept major vows</Text>
        {keptMajor.length === 0 ? (
          <Text style={styles.empty}>No trophies yet. Keep a major vow to raise one here.</Text>
        ) : (
          keptMajor.map((v) => (
            <View key={v.id} style={styles.trophy}>
              <Text style={styles.trophyGlyph}>♛</Text>
              <Text style={styles.trophyText}>{v.title}</Text>
            </View>
          ))
        )}

        <Text style={styles.section}>Records</Text>
        <View style={styles.record}>
          <Text style={styles.recordLabel}>Current streak</Text>
          <Text style={styles.recordValue}>{p?.streak ?? 0} days</Text>
        </View>
        <View style={styles.record}>
          <Text style={styles.recordLabel}>Lifetime strikes (hammerCount)</Text>
          <Text style={styles.recordValue}>{(p?.hammerCount ?? 0).toLocaleString()}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.void0 },
  scroll: { padding: spacing.lg, gap: spacing.md },
  h1: { ...typo.title, color: colors.ink },
  section: { ...typo.label, color: colors.inkDim, marginTop: spacing.md },
  shrines: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  shrine: { width: 80, alignItems: 'center', padding: spacing.sm, borderRadius: radii.md, gap: 4 },
  shrineOn: { backgroundColor: colors.void1, borderWidth: 1, borderColor: colors.ki },
  shrineOff: { backgroundColor: colors.void1, opacity: 0.5 },
  shrineSigil: { color: colors.ki, fontSize: 20 },
  shrineName: { ...typo.label, fontSize: 9, color: colors.ink },
  empty: { ...typo.body, color: colors.inkDim },
  trophy: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.void1, padding: spacing.md, borderRadius: radii.md, borderLeftWidth: 2, borderLeftColor: colors.gold },
  trophyGlyph: { color: colors.gold, fontSize: 22 },
  trophyText: { ...typo.body, color: colors.ink, flex: 1 },
  record: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.void1, padding: spacing.md, borderRadius: radii.md },
  recordLabel: { ...typo.body, color: colors.inkDim },
  recordValue: { ...typo.body, color: colors.ink, fontWeight: '700' },
});
