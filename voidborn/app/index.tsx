// THE DOMAIN — the home hub. One subject (the entity) over its space; thumb-first actions below.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radii, type as typo } from '../src/constants/theme';
import { SpaceBackdrop } from '../src/spaces/SpaceBackdrop';
import { EntityView } from '../src/components/EntityView';
import { JuicyButton } from '../src/components/JuicyButton';
import { QuickLogSheet, type QuickLogPrefill } from '../src/components/QuickLogSheet';
import { QuestCard } from '../src/components/QuestCard';
import { useMetrics } from '../src/store/metrics';
import { useManifestation } from '../src/hooks/useManifestation';
import { api } from '../src/api/endpoints';
import { fire } from '../src/lib/juice';

export default function DomainScreen() {
  const p = useMetrics((s) => s.practitioner);
  const manifestation = useManifestation();
  const [logOpen, setLogOpen] = useState(false);
  const [prefill, setPrefill] = useState<QuickLogPrefill | null>(null);
  const [voice, setVoice] = useState<string | null>(null);

  // The Voice of the Void reflects on the daily return — grounded only in real data.
  useEffect(() => {
    let on = true;
    api.coach
      .reflect('return')
      .then((r) => on && setVoice(r.reflection))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);

  if (!p || !manifestation) return <View style={styles.fill} />;

  return (
    <View style={styles.fill}>
      <SpaceBackdrop domainKey={p.activeDomainKey} />

      {/* upper half — look at the being */}
      <View style={styles.stage}>
        <Pressable onPress={() => fire('tap')} accessibilityLabel="Your entity">
          <EntityView manifestation={manifestation} size={280} />
        </Pressable>
        {p.hammerToNext != null && (
          <Text style={styles.toNext}>
            {p.hammerToNext.toLocaleString()} to {nextRealmName(p.realm.index)}
          </Text>
        )}
      </View>

      {/* lower half — thumb-first actions */}
      <View style={styles.actions}>
        {voice && (
          <View style={styles.voice} accessibilityLabel="The Voice of the Void">
            <Text style={styles.voiceText}>“{voice}”</Text>
          </View>
        )}
        <QuestCard
          onBegin={(q) => {
            setPrefill(q);
            setLogOpen(true);
          }}
        />
        <JuicyButton
          label="Log training"
          action="log"
          onPress={() => {
            setPrefill(null);
            setLogOpen(true);
          }}
        />
      </View>

      <QuickLogSheet visible={logOpen} onClose={() => setLogOpen(false)} prefill={prefill} />
    </View>
  );
}

function nextRealmName(index: number): string {
  const names = ['Ki Accumulation', 'Ki Establishment', 'True Ki Awakening', 'Transcendence', 'Evolutionary Realm', 'Divine Master'];
  return names[index - 1] ?? 'the next realm';
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.void0 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  toNext: { ...typo.label, color: colors.inkDim },
  actions: { padding: spacing.lg, gap: spacing.md },
  voice: { backgroundColor: colors.void1, borderRadius: radii.md, padding: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.ki },
  voiceText: { ...typo.body, color: colors.ink, fontStyle: 'italic' },
});
