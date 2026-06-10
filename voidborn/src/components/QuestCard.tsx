// Today's Quest — the System Window's daily line, surfaced in the Domain between the Voice
// and the log button. Renders nothing when no quest is scheduled today (no clutter).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, type as typo } from '../constants/theme';
import { JuicyButton } from './JuicyButton';
import { useTrial } from '../store/trial';
import { PLANNED_KINDS, PHASES } from '../constants/trials';
import type { QuickLogPrefill } from './QuickLogSheet';

export function QuestCard({ onBegin }: { onBegin: (prefill: QuickLogPrefill) => void }) {
  const trial = useTrial((s) => s.trial);
  // Subscribe to the quest list so the card re-derives after fulfillment/moves.
  useTrial((s) => s.plannedSessions);
  const quest = useTrial.getState().todayQuest();
  if (!trial || !quest) return null;

  const kind = PLANNED_KINDS[quest.kind];
  const phase = trial.currentPhase ? PHASES[trial.currentPhase] : null;

  return (
    <View style={styles.card} accessibilityLabel="Today's quest">
      <View style={styles.head}>
        <Text style={styles.glyph}>{kind.glyph}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{quest.title}</Text>
          <Text style={styles.meta}>
            {kind.label} · {quest.modality}
            {quest.targetReps > 0 ? ` × ${quest.targetReps}` : ''}
            {phase ? `  ·  ${phase.sigil} ${phase.name}` : ''}
          </Text>
        </View>
      </View>
      <JuicyButton
        label={quest.targetReps === 0 ? 'Take stillness' : 'Begin'}
        action="log"
        onPress={() => onBegin({ plannedSessionId: quest.id, modality: quest.modality, reps: quest.targetReps, title: quest.title })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.void1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm, borderLeftWidth: 2, borderLeftColor: colors.gold },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  glyph: { color: colors.gold, fontSize: 22 },
  title: { ...typo.body, color: colors.ink, fontWeight: '700' },
  meta: { ...typo.label, fontSize: 10, color: colors.inkDim },
});
