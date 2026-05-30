// THE CALENDAR — Binding Vows on a timeline with LIVE countdowns. Keep/break + progressions resolve
// in place (depth ≤ 1). Major vow kept ⇒ Trophy + one-time evolution flourish.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { colors, spacing, radii, type as typo } from '../src/constants/theme';
import { SpaceBackdrop } from '../src/spaces/SpaceBackdrop';
import { JuicyButton } from '../src/components/JuicyButton';
import { useMetrics } from '../src/store/metrics';
import { api } from '../src/api/endpoints';
import type { Vow } from '../src/api/types';
import { fire } from '../src/lib/juice';
import { useCinematic } from '../src/hooks/useCinematic';

export default function CalendarScreen() {
  const p = useMetrics((s) => s.practitioner);
  const vows = useMetrics((s) => s.vows);
  const [now, setNow] = useState(Date.now());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const active = useMemo(() => vows.filter((v) => v.status === 'active'), [vows]);

  return (
    <View style={styles.fill}>
      <SpaceBackdrop domainKey={p?.activeDomainKey ?? 'dojo'} allow3D={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Binding Vows</Text>
        {active.length === 0 && <Text style={styles.empty}>No vows bound. The Void rewards the kept word.</Text>}
        {active.map((v) => (
          <VowCard key={v.id} vow={v} now={now} />
        ))}
        {adding ? <NewVow onDone={() => setAdding(false)} /> : <JuicyButton label="Bind a vow" tone="ghost" onPress={() => setAdding(true)} />}
      </ScrollView>
    </View>
  );
}

function VowCard({ vow, now }: { vow: Vow; now: number }) {
  const reload = useMetrics((s) => s.hydrate);
  const play = useCinematic((s) => s.play);
  const remaining = new Date(vow.resolutionDate).getTime() - now;

  const keep = async () => {
    const { flourish } = await api.vows.keep(vow.id);
    fire('vowComplete');
    if (flourish) play('vow_flourish', { kind: 'vow_flourish', full: 2200, calm: 500 });
    await reload();
  };
  const brk = async () => {
    await api.vows.break(vow.id);
    fire('tap');
    await reload();
  };
  const toggle = async (pid: string, completed: boolean) => {
    await api.vows.toggleProgression(vow.id, pid, completed);
    fire('tap');
    await reload();
  };

  return (
    <View style={[styles.card, vow.type === 'major' && styles.major]}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{vow.title}</Text>
        <Text style={[styles.badge, vow.type === 'major' ? styles.badgeMajor : styles.badgeMinor]}>{vow.type}</Text>
      </View>
      <Text style={[styles.countdown, remaining < 0 && { color: colors.crimson }]}>{formatCountdown(remaining)}</Text>
      {vow.progressions.map((pr) => (
        <Pressable key={pr.id} style={styles.prog} onPress={() => toggle(pr.id, !pr.completed)}>
          <Text style={styles.progBox}>{pr.completed ? '◼' : '◻'}</Text>
          <Text style={[styles.progText, pr.completed && styles.progDone]}>{pr.text}</Text>
        </Pressable>
      ))}
      <View style={styles.cardActions}>
        <JuicyButton label="Kept" action="vowComplete" onPress={keep} style={{ flex: 1 }} />
        <JuicyButton label="Broke" tone="danger" onPress={brk} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function NewVow({ onDone }: { onDone: () => void }) {
  const reload = useMetrics((s) => s.hydrate);
  const [title, setTitle] = useState('');
  const [major, setMajor] = useState(true);
  const [days, setDays] = useState('14');

  const submit = async () => {
    if (!title.trim()) return;
    const resolutionDate = new Date(Date.now() + (parseInt(days, 10) || 14) * 86400000).toISOString();
    await api.vows.create({ title: title.trim(), type: major ? 'major' : 'minor', resolutionDate });
    fire('tap');
    await reload();
    onDone();
  };

  return (
    <View style={styles.card}>
      <TextInput value={title} onChangeText={setTitle} placeholder="What do you vow?" placeholderTextColor={colors.inkFaint} style={styles.input} />
      <View style={styles.row}>
        <Pressable onPress={() => setMajor(!major)} style={[styles.toggle, major && styles.toggleOn]}>
          <Text style={styles.toggleText}>{major ? 'Major' : 'Minor'}</Text>
        </Pressable>
        <TextInput value={days} onChangeText={setDays} keyboardType="number-pad" style={[styles.input, { width: 70 }]} />
        <Text style={styles.daysLabel}>days</Text>
      </View>
      <View style={styles.cardActions}>
        <JuicyButton label="Cancel" tone="ghost" onPress={onDone} style={{ flex: 1 }} />
        <JuicyButton label="Bind" onPress={submit} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function formatCountdown(ms: number): string {
  if (ms < 0) return 'Resolution passed — resolve it';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h to resolution`;
  return `${h}h ${m}m ${s}s to resolution`;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.void0 },
  scroll: { padding: spacing.lg, gap: spacing.md },
  h1: { ...typo.title, color: colors.ink },
  empty: { ...typo.body, color: colors.inkDim },
  card: { backgroundColor: colors.void1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  major: { borderLeftWidth: 2, borderLeftColor: colors.gold },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...typo.body, color: colors.ink, fontWeight: '700', flex: 1 },
  badge: { ...typo.label, fontSize: 9, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill, overflow: 'hidden' },
  badgeMajor: { backgroundColor: colors.gold, color: colors.void0 },
  badgeMinor: { backgroundColor: colors.void2, color: colors.inkDim },
  countdown: { ...typo.label, color: colors.ki },
  prog: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progBox: { color: colors.ki, fontSize: 14 },
  progText: { ...typo.body, color: colors.inkDim, flex: 1 },
  progDone: { textDecorationLine: 'line-through', color: colors.inkFaint },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { backgroundColor: colors.void2, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.ink },
  toggle: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.sm, backgroundColor: colors.void2 },
  toggleOn: { backgroundColor: colors.ki },
  toggleText: { ...typo.label, color: colors.void0 },
  daysLabel: { ...typo.label, color: colors.inkDim },
});
