// In-place quick-log sheet (depth ≤ 1 — renders over the Domain, never a new screen). Log a strike,
// take a stillness (reps:0, no strike), or seal ki. Optimistic; the entity reacts instantly.
// A quest prefill links the real session to its PlannedSession — the link never strikes (#12).
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { colors, radii, spacing, type as typo } from '../constants/theme';
import { JuicyButton } from './JuicyButton';
import { useMetrics } from '../store/metrics';
import { fire } from '../lib/juice';

const MODALITIES = ['origin', 'pull', 'push', 'core', 'cardio', 'recovery'] as const;

export interface QuickLogPrefill {
  plannedSessionId: string;
  modality: string;
  reps: number; // targetReps; 0 ⇒ stillness quest
  title?: string;
}

export function QuickLogSheet({
  visible,
  onClose,
  prefill,
}: {
  visible: boolean;
  onClose: () => void;
  prefill?: QuickLogPrefill | null;
}) {
  const logStrike = useMetrics((s) => s.logStrike);
  const seal = useMetrics((s) => s.seal);
  const [modality, setModality] = useState<(typeof MODALITIES)[number]>('origin');
  const [reps, setReps] = useState('20');
  const [busy, setBusy] = useState(false);

  // A quest prefill pins the sheet to its target — opening "Begin" means beginning THAT quest.
  useEffect(() => {
    if (visible && prefill) {
      setModality((MODALITIES.includes(prefill.modality as never) ? prefill.modality : 'origin') as (typeof MODALITIES)[number]);
      setReps(String(prefill.reps));
    }
  }, [visible, prefill?.plannedSessionId]);

  if (!visible) return null;
  const isRecovery = modality === 'recovery' || (prefill ? prefill.reps === 0 : false);

  const submit = async () => {
    setBusy(true);
    try {
      // recovery ⇒ reps:0 ⇒ no strike (invariant #3)
      await logStrike({
        modality,
        reps: isRecovery ? 0 : Math.max(0, parseInt(reps, 10) || 0),
        plannedSessionId: prefill?.plannedSessionId,
      });
      if (prefill) fire('questComplete');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
      <Animated.View entering={SlideInDown.springify()} exiting={SlideOutDown} style={styles.sheet}>
        <Text style={styles.title}>{prefill?.title ? `Quest — ${prefill.title}` : 'Log training'}</Text>

        <View style={styles.chips}>
          {MODALITIES.map((m) => (
            <Pressable
              key={m}
              onPress={() => {
                fire('tap');
                setModality(m);
              }}
              style={[styles.chip, modality === m && styles.chipActive]}
              accessibilityState={{ selected: modality === m }}
            >
              <Text style={[styles.chipText, modality === m && styles.chipTextActive]}>{m}</Text>
            </Pressable>
          ))}
        </View>

        {!isRecovery ? (
          <View style={styles.repsRow}>
            <Text style={styles.repsLabel}>Reps</Text>
            <TextInput
              value={reps}
              onChangeText={setReps}
              keyboardType="number-pad"
              style={styles.repsInput}
              accessibilityLabel="Repetitions"
            />
          </View>
        ) : (
          <Text style={styles.stillness}>Stillness seals ki and never strikes — recovery is part of the work.</Text>
        )}

        <View style={styles.actions}>
          <JuicyButton label="Seal ki +5" tone="ghost" action="seal" onPress={() => seal(5)} style={{ flex: 1 }} />
          <JuicyButton
            label={isRecovery ? 'Take stillness' : 'Strike'}
            action="log"
            disabled={busy}
            onPress={submit}
            style={{ flex: 1 }}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000a', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.void1, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  title: { ...typo.title, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: colors.void2 },
  chipActive: { backgroundColor: colors.ki },
  chipText: { ...typo.label, color: colors.inkDim },
  chipTextActive: { color: colors.void0 },
  repsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  repsLabel: { ...typo.label, color: colors.inkDim },
  repsInput: { flex: 1, backgroundColor: colors.void2, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.ink, fontSize: 18 },
  stillness: { ...typo.body, color: colors.inkDim },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});
