import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, type as typo } from '../constants/theme';
import type { RealmRef } from '../api/types';

/** Slim realm marker: sigil + name + stage (computed, never stored). */
export function RealmSigil({ realm, stage }: { realm: RealmRef; stage: number }) {
  return (
    <View style={styles.row} accessibilityLabel={`${realm.name}, stage ${stage} of 7`}>
      <Text style={styles.sigil}>{realm.sigil}</Text>
      <View>
        <Text style={styles.name}>{realm.name}</Text>
        <Text style={styles.stage}>
          {realm.stageLabel} · {stage}/7
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sigil: { color: colors.ki, fontSize: 18 },
  name: { ...typo.label, color: colors.ink },
  stage: { color: colors.inkDim, fontSize: 11 },
});
