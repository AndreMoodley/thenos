// THE CHRONICLE — the story of the ascent, then the monuments beneath it. Your saga reads as
// manhwa episode cards: unlocked chapters expand their prose IN PLACE; locked ones show only a
// tease, with the next chapter highlighted (Zeigarnik). Chapters open ONLY from real logged
// events — the story follows the facts. Turning Points and the old Trophy Hall (Ascensions,
// Trophies, Records) fold in below as Monuments. Route unchanged; depth ≤ 1.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radii, type as typo } from '../src/constants/theme';
import { SpaceBackdrop } from '../src/spaces/SpaceBackdrop';
import { JuicyButton } from '../src/components/JuicyButton';
import { SagaOnboardingSheet } from '../src/components/SagaOnboardingSheet';
import { useMetrics } from '../src/store/metrics';
import { useSaga } from '../src/store/saga';
import { useTrial } from '../src/store/trial';
import { REALMS } from '../src/constants/realms';
import { BEAT_LABELS } from '../src/constants/saga';
import type { SagaChapter } from '../src/api/types';
import { fire } from '../src/lib/juice';

export default function ChronicleScreen() {
  const p = useMetrics((s) => s.practitioner);
  const vows = useMetrics((s) => s.vows);
  const saga = useSaga((s) => s.saga);
  const chapters = useSaga((s) => s.chapters);
  const nextTease = useSaga((s) => s.nextTease);
  const trial = useTrial((s) => s.trial);
  const [riteOpen, setRiteOpen] = useState(false);
  const [openChapter, setOpenChapter] = useState<string | null>(null);

  // Pull lazy Claude prose refinements when the Chronicle is actually read.
  useEffect(() => {
    void useSaga.getState().refresh();
  }, []);

  const keptMajor = vows.filter((v) => v.status === 'kept' && v.type === 'major');
  const stage = p?.stage ?? 1;
  const nextLockedId = chapters.find((c) => !c.unlockedAt && !c.optional)?.id ?? null;

  return (
    <View style={styles.fill}>
      <SpaceBackdrop domainKey={p?.activeDomainKey ?? 'dojo'} allow3D={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>The Chronicle</Text>

        {saga ? (
          <View style={[styles.card, styles.sagaCard]}>
            <Text style={styles.sagaTitle}>{saga.title}</Text>
            <Text style={styles.sagaSynopsis}>{saga.synopsis}</Text>
            <Text style={styles.sagaMeta}>
              Antagonist: {saga.demonName} · {saga.styleKey}
              {saga.status === 'completed' ? ' · COMPLETE' : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No saga forged</Text>
            <Text style={styles.empty}>
              Take the Mirror Rite: name who you are, who you are becoming, and the Inner Demon between them — the Forge writes your arc from it.
            </Text>
            <JuicyButton label="Take the Mirror Rite" action="forge" onPress={() => setRiteOpen(true)} />
          </View>
        )}

        {chapters.length > 0 && (
          <>
            <Text style={styles.section}>Chapters</Text>
            {chapters.map((c) => (
              <ChapterCard
                key={c.id}
                chapter={c}
                isNext={c.id === nextLockedId}
                expanded={openChapter === c.id}
                onToggle={() => {
                  fire('tap');
                  setOpenChapter(openChapter === c.id ? null : c.id);
                }}
              />
            ))}
            {nextTease && (
              <Text style={styles.nextHint}>
                Next: “{nextTease.title}” — the Chronicle only turns on what you actually do.
              </Text>
            )}
            {saga && (
              <JuicyButton
                label="Reforge the saga"
                tone="ghost"
                onPress={() => setRiteOpen(true)}
              />
            )}
          </>
        )}

        <Text style={styles.section}>Turning Points</Text>
        <View style={styles.timeline}>
          {REALMS.filter((r) => stage >= r.index).map((r) => (
            <View key={r.key} style={styles.turn}>
              <Text style={styles.turnSigil}>{r.sigil}</Text>
              <Text style={styles.turnText}>Crossed into the {r.name}</Text>
            </View>
          ))}
          {trial && trial.currentPhase && trial.status === 'active' && (
            <View style={styles.turn}>
              <Text style={[styles.turnSigil, { color: colors.gold }]}>⛩</Text>
              <Text style={styles.turnText}>
                “{trial.title}” — week {Math.min(trial.currentWeekIndex, trial.totalWeeks - 1) + 1} of {trial.totalWeeks}
              </Text>
            </View>
          )}
          {keptMajor.map((v) => (
            <View key={v.id} style={styles.turn}>
              <Text style={[styles.turnSigil, { color: colors.gold }]}>♛</Text>
              <Text style={styles.turnText}>Kept: {v.title}</Text>
            </View>
          ))}
        </View>

        {/* ── Monuments — the Trophy Hall, folded in ── */}
        <Text style={styles.section}>Monuments — Ascensions</Text>
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

        <Text style={styles.section}>Monuments — Trophies</Text>
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

      <SagaOnboardingSheet visible={riteOpen} onClose={() => setRiteOpen(false)} />
    </View>
  );
}

function ChapterCard({
  chapter,
  isNext,
  expanded,
  onToggle,
}: {
  chapter: SagaChapter;
  isNext: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const open = !!chapter.unlockedAt;
  return (
    <Pressable
      onPress={open ? onToggle : undefined}
      style={[styles.chapter, !open && styles.chapterLocked, isNext && styles.chapterNext]}
      accessibilityLabel={`Chapter ${chapter.index}: ${chapter.title}${open ? '' : ', locked'}`}
    >
      <View style={styles.chapterHead}>
        <Text style={[styles.chapterIndex, !open && { color: colors.inkFaint }]}>{open ? '◼' : isNext ? '▸' : '◻'} {chapter.index}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.chapterTitle, !open && { color: colors.inkDim }]}>{chapter.title}</Text>
          <Text style={styles.chapterBeat}>{BEAT_LABELS[chapter.beatKey] ?? chapter.beatKey}{isNext ? ' · NEXT' : ''}</Text>
        </View>
      </View>
      {!open && <Text style={styles.chapterTease}>{chapter.tease}</Text>}
      {open && expanded && !!chapter.prose && <Text style={styles.chapterProse}>{chapter.prose}</Text>}
      {open && !expanded && <Text style={styles.chapterTease}>Tap to read</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.void0 },
  scroll: { padding: spacing.lg, gap: spacing.md },
  h1: { ...typo.title, color: colors.ink },
  section: { ...typo.label, color: colors.inkDim, marginTop: spacing.md },
  empty: { ...typo.body, color: colors.inkDim },
  card: { backgroundColor: colors.void1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  cardTitle: { ...typo.body, color: colors.ink, fontWeight: '700' },
  sagaCard: { borderLeftWidth: 2, borderLeftColor: colors.ki },
  sagaTitle: { ...typo.title, color: colors.ink, fontSize: 18 },
  sagaSynopsis: { ...typo.body, color: colors.inkDim, fontStyle: 'italic' },
  sagaMeta: { ...typo.label, fontSize: 10, color: colors.inkFaint },
  chapter: { backgroundColor: colors.void1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  chapterLocked: { opacity: 0.6 },
  chapterNext: { opacity: 1, borderWidth: 1, borderColor: colors.gold },
  chapterHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chapterIndex: { ...typo.label, color: colors.ki, width: 36 },
  chapterTitle: { ...typo.body, color: colors.ink, fontWeight: '700' },
  chapterBeat: { ...typo.label, fontSize: 9, color: colors.inkFaint },
  chapterTease: { ...typo.body, fontSize: 13, color: colors.inkFaint, fontStyle: 'italic' },
  chapterProse: { ...typo.body, color: colors.inkDim, lineHeight: 22 },
  nextHint: { ...typo.label, fontSize: 10, color: colors.inkFaint, textTransform: 'none', letterSpacing: 0 },
  timeline: { gap: spacing.sm },
  turn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.void1, padding: spacing.sm, borderRadius: radii.sm },
  turnSigil: { color: colors.ki, fontSize: 16, width: 24, textAlign: 'center' },
  turnText: { ...typo.body, fontSize: 13, color: colors.inkDim, flex: 1 },
  shrines: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  shrine: { width: 80, alignItems: 'center', padding: spacing.sm, borderRadius: radii.md, gap: 4 },
  shrineOn: { backgroundColor: colors.void1, borderWidth: 1, borderColor: colors.ki },
  shrineOff: { backgroundColor: colors.void1, opacity: 0.5 },
  shrineSigil: { color: colors.ki, fontSize: 20 },
  shrineName: { ...typo.label, fontSize: 9, color: colors.ink },
  trophy: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.void1, padding: spacing.md, borderRadius: radii.md, borderLeftWidth: 2, borderLeftColor: colors.gold },
  trophyGlyph: { color: colors.gold, fontSize: 22 },
  trophyText: { ...typo.body, color: colors.ink, flex: 1 },
  record: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.void1, padding: spacing.md, borderRadius: radii.md },
  recordLabel: { ...typo.body, color: colors.inkDim },
  recordValue: { ...typo.body, color: colors.ink, fontWeight: '700' },
});
