// Swear a Trial — the in-place wizard (depth ≤ 1). Goal → ability → week shape → dials, then
// the server forges the whole path. Generation is server-authoritative (online-only, like
// gacha); the sheet says so plainly when offline instead of pretending.
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { colors, radii, spacing, type as typo } from '../constants/theme';
import { JuicyButton } from './JuicyButton';
import { useTrial } from '../store/trial';
import { useCinematic } from '../hooks/useCinematic';
import { fire } from '../lib/juice';
import { DAY_NAMES, VOLUME_DIAL_COPY, DIFFICULTY_DIAL_COPY } from '../constants/trials';

const MODALITIES = ['origin', 'pull', 'push', 'core', 'cardio'] as const;
const EXPERIENCE = [
  { key: 'novice', label: 'Novice' },
  { key: 'practiced', label: 'Practiced' },
  { key: 'seasoned', label: 'Seasoned' },
] as const;

export function TrialWizardSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const createTrial = useTrial((s) => s.createTrial);
  const play = useCinematic((s) => s.play);
  const [title, setTitle] = useState('');
  const [breakthrough, setBreakthrough] = useState(true);
  const [modality, setModality] = useState<(typeof MODALITIES)[number]>('origin');
  const [experience, setExperience] = useState<(typeof EXPERIENCE)[number]['key']>('practiced');
  const [baseline, setBaseline] = useState('100');
  const [perWeek, setPerWeek] = useState(4);
  const [pillarDay, setPillarDay] = useState(5);
  const [volume, setVolume] = useState(3);
  const [difficulty, setDifficulty] = useState(3);
  const [weeks, setWeeks] = useState('10');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!visible) return null;

  const submit = async () => {
    if (!title.trim()) {
      setError('Name the trial — a path needs a destination');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createTrial({
        title: title.trim(),
        goalKind: breakthrough ? 'breakthrough' : 'open_path',
        focusModality: modality,
        experience,
        ability: { baselineReps: Math.min(2000, Math.max(5, parseInt(baseline, 10) || 100)) },
        sessionsPerWeek: perWeek,
        pillarDay,
        volumeDial: volume,
        difficultyDial: difficulty,
        totalWeeks: Math.min(26, Math.max(4, parseInt(weeks, 10) || 10)),
      });
      fire('forge');
      play('trial_forged', { kind: 'trial', full: 2600, calm: 600 });
      onClose();
    } catch (e: any) {
      setError(
        e?.code === 'OFFLINE' || e?.status === 0
          ? 'The path is forged by the server — return when the connection holds'
          : (e?.message ?? 'The Forge faltered'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
      <Animated.View entering={SlideInDown.springify()} exiting={SlideOutDown} style={styles.sheet}>
        <ScrollView contentContainerStyle={{ gap: spacing.md }} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Swear a Trial</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What will be true at the end?"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
          />

          <View style={styles.row}>
            <Pressable onPress={() => setBreakthrough(true)} style={[styles.toggle, breakthrough && styles.toggleOn]}>
              <Text style={[styles.toggleText, breakthrough && styles.toggleTextOn]}>Breakthrough</Text>
            </Pressable>
            <Pressable onPress={() => setBreakthrough(false)} style={[styles.toggle, !breakthrough && styles.toggleOn]}>
              <Text style={[styles.toggleText, !breakthrough && styles.toggleTextOn]}>Open Path</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            {breakthrough
              ? 'A deadline-bound climb: Gathering → Tribulation → Quieting, ending at the Breakthrough Gate.'
              : 'A rolling maintenance block — hold the ground you took. It renews itself.'}
          </Text>

          <Text style={styles.section}>Discipline</Text>
          <Chips options={MODALITIES} value={modality} onPick={(m) => setModality(m)} />

          <Text style={styles.section}>Where you stand</Text>
          <Chips options={EXPERIENCE.map((e) => e.key)} labels={EXPERIENCE.map((e) => e.label)} value={experience} onPick={(e) => setExperience(e as never)} />
          <View style={styles.rowTight}>
            <Text style={styles.label}>A comfortable session today, in reps</Text>
            <TextInput value={baseline} onChangeText={setBaseline} keyboardType="number-pad" style={[styles.input, styles.numInput]} />
          </View>

          <Text style={styles.section}>The shape of your week</Text>
          <Stepper label="Sessions per week" value={perWeek} min={2} max={6} onChange={setPerWeek} />
          <Text style={styles.label}>Pillar Day — the long session anchors the week</Text>
          <Chips options={[0, 1, 2, 3, 4, 5, 6]} labels={[...DAY_NAMES]} value={pillarDay} onPick={(d) => setPillarDay(d)} />
          <View style={styles.rowTight}>
            <Text style={styles.label}>Weeks (4–26)</Text>
            <TextInput value={weeks} onChangeText={setWeeks} keyboardType="number-pad" style={[styles.input, styles.numInput]} />
          </View>

          <Stepper label={`Volume — ${VOLUME_DIAL_COPY[volume - 1]}`} value={volume} min={1} max={5} onChange={setVolume} />
          <Stepper label={`Difficulty — ${DIFFICULTY_DIAL_COPY[difficulty - 1]}`} value={difficulty} min={1} max={5} onChange={setDifficulty} />

          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            <JuicyButton label="Not yet" tone="ghost" onPress={onClose} style={{ flex: 1 }} />
            <JuicyButton label="Swear it" action="forge" disabled={busy} onPress={submit} style={{ flex: 1 }} />
          </View>
          <Text style={styles.hint}>The path opens on a Monday. Every quest is fulfilled only by real, logged training.</Text>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

function Chips<T extends string | number>({
  options,
  labels,
  value,
  onPick,
}: {
  options: readonly T[];
  labels?: readonly string[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o, i) => (
        <Pressable
          key={String(o)}
          onPress={() => {
            fire('tap');
            onPick(o);
          }}
          style={[styles.chip, value === o && styles.chipActive]}
          accessibilityState={{ selected: value === o }}
        >
          <Text style={[styles.chipText, value === o && styles.chipTextActive]}>{labels?.[i] ?? String(o)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.rowTight}>
      <Text style={[styles.label, { flex: 1 }]}>{label}</Text>
      <Pressable onPress={() => { fire('tap'); onChange(Math.max(min, value - 1)); }} style={styles.step} accessibilityLabel={`${label} down`}>
        <Text style={styles.stepText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable onPress={() => { fire('tap'); onChange(Math.min(max, value + 1)); }} style={styles.step} accessibilityLabel={`${label} up`}>
        <Text style={styles.stepText}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000a', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.void1, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, maxHeight: '88%' },
  title: { ...typo.title, color: colors.ink },
  section: { ...typo.label, color: colors.inkDim, marginTop: spacing.xs },
  label: { ...typo.body, color: colors.inkDim },
  hint: { ...typo.label, fontSize: 10, color: colors.inkFaint, textTransform: 'none', letterSpacing: 0 },
  input: { backgroundColor: colors.void2, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 12, color: colors.ink, fontSize: 15 },
  numInput: { width: 84, textAlign: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowTight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggle: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radii.sm, backgroundColor: colors.void2 },
  toggleOn: { backgroundColor: colors.ki },
  toggleText: { ...typo.label, color: colors.inkDim },
  toggleTextOn: { color: colors.void0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: colors.void2 },
  chipActive: { backgroundColor: colors.ki },
  chipText: { ...typo.label, color: colors.inkDim },
  chipTextActive: { color: colors.void0 },
  step: { width: 36, height: 36, borderRadius: radii.sm, backgroundColor: colors.void2, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.ink, fontSize: 18 },
  stepValue: { ...typo.body, color: colors.ink, fontWeight: '700', width: 24, textAlign: 'center' },
  error: { color: colors.crimson, ...typo.label },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
});
