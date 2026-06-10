// THE QUEST LOG — the sworn trial's weekly system window + Binding Vows beneath. Phase banner,
// 7-day quest strip, in-place day panel ([Begin] prefills the QuickLog; [Move] re-lays a day),
// and the suggest-only Realignment banner (accept is the ONLY way a suggestion becomes plan —
// invariant #14). Everything is a sheet/panel: depth ≤ 1.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { colors, spacing, radii, type as typo } from '../src/constants/theme';
import { SpaceBackdrop } from '../src/spaces/SpaceBackdrop';
import { JuicyButton } from '../src/components/JuicyButton';
import { QuickLogSheet, type QuickLogPrefill } from '../src/components/QuickLogSheet';
import { TrialWizardSheet } from '../src/components/TrialWizardSheet';
import { useMetrics } from '../src/store/metrics';
import { useTrial } from '../src/store/trial';
import { api } from '../src/api/endpoints';
import type { PlannedSession, Vow } from '../src/api/types';
import { fire } from '../src/lib/juice';
import { useCinematic } from '../src/hooks/useCinematic';
import { PHASES, PLANNED_KINDS, DAY_NAMES, dayDiffUTC, isSameUTCDay, scheduledDateFor, utcMidnight, weekIndexFor } from '../src/constants/trials';

export default function CalendarScreen() {
  const p = useMetrics((s) => s.practitioner);
  const vows = useMetrics((s) => s.vows);
  const trial = useTrial((s) => s.trial);
  const [now, setNow] = useState(Date.now());
  const [adding, setAdding] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [vowsOpen, setVowsOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [prefill, setPrefill] = useState<QuickLogPrefill | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // The Meridian Reading is a daily ritual — server-limited to one new proposal per day.
  useEffect(() => {
    const t = useTrial.getState().trial;
    if (t && t.status === 'active') {
      api.trials
        .checkRealignments(t.id)
        .then(() => useTrial.getState().refresh())
        .catch(() => {});
    }
  }, [trial?.id]);

  const active = useMemo(() => vows.filter((v) => v.status === 'active' && v.vowSubtype !== 'trial'), [vows]);

  return (
    <View style={styles.fill}>
      <SpaceBackdrop domainKey={p?.activeDomainKey ?? 'dojo'} allow3D={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Quest Log</Text>

        {trial && trial.status === 'active' ? (
          <TrialPanel
            now={now}
            onBegin={(q) => {
              setPrefill(q);
              setLogOpen(true);
            }}
          />
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No trial sworn</Text>
            <Text style={styles.empty}>A goal becomes a path: weeks, quests, gates — generated around your life, fulfilled only by real training.</Text>
            <JuicyButton label="Swear a Trial" action="forge" onPress={() => setWizardOpen(true)} />
          </View>
        )}

        <Pressable onPress={() => { fire('tap'); setVowsOpen(!vowsOpen); }} style={styles.sectionRow}>
          <Text style={styles.section}>Binding Vows</Text>
          <Text style={styles.sectionToggle}>{vowsOpen ? '▾' : '▸'}</Text>
        </Pressable>
        {vowsOpen && (
          <>
            {active.length === 0 && <Text style={styles.empty}>No vows bound. The Void rewards the kept word.</Text>}
            {active.map((v) => (
              <VowCard key={v.id} vow={v} now={now} />
            ))}
            {adding ? <NewVow onDone={() => setAdding(false)} /> : <JuicyButton label="Bind a vow" tone="ghost" onPress={() => setAdding(true)} />}
          </>
        )}
      </ScrollView>

      <TrialWizardSheet visible={wizardOpen} onClose={() => setWizardOpen(false)} />
      <QuickLogSheet visible={logOpen} onClose={() => setLogOpen(false)} prefill={prefill} />
    </View>
  );
}

// ── the sworn trial: phase banner, week strip, day panel, realignment consent ──

function TrialPanel({ now, onBegin }: { now: number; onBegin: (q: QuickLogPrefill) => void }) {
  const trial = useTrial((s) => s.trial)!;
  const quests = useTrial((s) => s.plannedSessions);
  const realignments = useTrial((s) => s.realignments);
  const play = useCinematic((s) => s.play);
  const start = new Date(trial.startDate);
  const today = new Date(now);
  const liveWeek = Math.min(Math.max(weekIndexFor(start, today), 0), trial.totalWeeks - 1);
  const [week, setWeek] = useState(liveWeek);
  const [selectedDay, setSelectedDay] = useState<Date>(utcMidnight(today));
  const [movingId, setMovingId] = useState<string | null>(null);

  const span = trial.phasePlan.find((s) => week >= s.firstWeek && week <= s.lastWeek);
  const phase = span ? PHASES[span.phaseKey] : null;
  const end = scheduledDateFor(start, trial.totalWeeks - 1, 6);
  const daysLeft = Math.max(0, dayDiffUTC(end, today));
  const dayQuests = quests
    .filter((q) => isSameUTCDay(new Date(q.scheduledOn), selectedDay))
    .sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn));

  const accept = async (rid: string) => {
    fire('vowComplete');
    await useTrial.getState().acceptRealignment(rid);
  };
  const dismiss = async (rid: string) => {
    fire('tap');
    await useTrial.getState().dismissRealignment(rid);
  };
  const complete = async () => {
    const { flourish } = await useTrial.getState().completeTrial();
    fire('ascension');
    if (flourish) play('breakthrough_trial', { kind: 'trial', full: 5200, calm: 1100 });
    await useMetrics.getState().hydrate();
  };

  return (
    <View style={{ gap: spacing.md }}>
      {/* phase banner */}
      <View style={[styles.card, styles.phaseCard]}>
        <View style={styles.cardHead}>
          <Text style={styles.phaseSigil}>{phase?.sigil ?? '◌'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{trial.title}</Text>
            <Text style={styles.phaseMeta}>
              {phase?.name ?? 'Beyond the plan'} · Week {Math.min(week, trial.totalWeeks - 1) + 1} of {trial.totalWeeks}
              {trial.goalKind === 'breakthrough' ? ` · ${daysLeft}d to the Breakthrough Gate` : ' · the Open Path'}
            </Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, Math.round(((liveWeek + 1) / trial.totalWeeks) * 100))}%` }]} />
        </View>
        {phase && <Text style={styles.phaseBlurb}>{phase.blurb}</Text>}
      </View>

      {/* the Meridian Reading — suggest-only; consent is the only mutation */}
      {realignments
        .filter((r) => r.status === 'proposed')
        .map((r) => (
          <View key={r.id} style={[styles.card, styles.realign]}>
            <Text style={styles.realignTitle}>The Meridian Reading</Text>
            <Text style={styles.realignReason}>{r.reason}</Text>
            <View style={styles.cardActions}>
              <JuicyButton label="Accept" onPress={() => accept(r.id)} style={{ flex: 1 }} />
              <JuicyButton label="Dismiss" tone="ghost" onPress={() => dismiss(r.id)} style={{ flex: 1 }} />
            </View>
          </View>
        ))}

      {/* week strip */}
      <View style={styles.weekHead}>
        <Pressable onPress={() => { fire('tap'); setWeek(Math.max(0, week - 1)); }} accessibilityLabel="Previous week">
          <Text style={styles.weekArrow}>◀</Text>
        </Pressable>
        <Text style={styles.weekLabel}>Week {week + 1}{week === liveWeek ? ' — now' : ''}</Text>
        <Pressable onPress={() => { fire('tap'); setWeek(Math.min(trial.totalWeeks - 1, week + 1)); }} accessibilityLabel="Next week">
          <Text style={styles.weekArrow}>▶</Text>
        </Pressable>
      </View>
      <View style={styles.strip}>
        {DAY_NAMES.map((name, dow) => {
          const day = scheduledDateFor(start, week, dow);
          const dayQs = quests.filter((q) => isSameUTCDay(new Date(q.scheduledOn), day));
          const fulfilled = dayQs.length > 0 && dayQs.every((q) => q.fulfilledBySessionId);
          const missed = dayQs.some((q) => !q.fulfilledBySessionId) && dayDiffUTC(day, today) < 0;
          const isToday = isSameUTCDay(day, today);
          const selected = isSameUTCDay(day, selectedDay);
          return (
            <Pressable
              key={dow}
              onPress={() => { fire('tap'); setSelectedDay(day); setMovingId(null); }}
              style={[styles.dayChip, selected && styles.dayChipSel, isToday && styles.dayChipToday]}
              accessibilityLabel={`${name}, ${dayQs.length} quests`}
            >
              <Text style={[styles.dayName, selected && styles.dayNameSel]}>{name}</Text>
              <Text style={[styles.dayGlyphs, missed && { color: colors.crimson }, fulfilled && { color: colors.success }]}>
                {dayQs.length === 0 ? '·' : dayQs.map((q) => PLANNED_KINDS[q.kind].glyph).join('')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* day panel */}
      {dayQuests.length === 0 ? (
        <Text style={styles.empty}>A rest day. The path holds.</Text>
      ) : (
        dayQuests.map((q) => (
          <QuestRow
            key={q.id}
            quest={q}
            today={today}
            trialStart={start}
            moving={movingId === q.id}
            onToggleMove={() => setMovingId(movingId === q.id ? null : q.id)}
            onBegin={onBegin}
          />
        ))
      )}

      {/* trial footer */}
      <View style={styles.cardActions}>
        {liveWeek >= trial.totalWeeks - 1 && (
          <JuicyButton label="Cross the final gate" action="vowComplete" onPress={complete} style={{ flex: 2 }} />
        )}
        <JuicyButton
          label="Release the trial"
          tone="ghost"
          onPress={async () => {
            await api.trials.abandon(trial.id).catch(() => {});
            fire('tap');
            await useMetrics.getState().hydrate();
          }}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

function QuestRow({
  quest,
  today,
  trialStart,
  moving,
  onToggleMove,
  onBegin,
}: {
  quest: PlannedSession;
  today: Date;
  trialStart: Date;
  moving: boolean;
  onToggleMove: () => void;
  onBegin: (q: QuickLogPrefill) => void;
}) {
  const kind = PLANNED_KINDS[quest.kind];
  const done = !!quest.fulfilledBySessionId;
  const past = dayDiffUTC(new Date(quest.scheduledOn), today) < 0;
  const fromWeek = weekIndexFor(trialStart, new Date(quest.scheduledOn));

  // Move targets: the next 10 days that stay within the quest's week or one adjacent (server-verified too).
  const targets: Date[] = [];
  for (let i = 0; i < 10 && targets.length < 7; i++) {
    const d = new Date(utcMidnight(today).getTime() + i * 86_400_000);
    if (isSameUTCDay(d, new Date(quest.scheduledOn))) continue;
    if (Math.abs(weekIndexFor(trialStart, d) - fromWeek) <= 1 && dayDiffUTC(d, trialStart) >= 0) targets.push(d);
  }

  return (
    <View style={[styles.card, done && { opacity: 0.65 }]}>
      <View style={styles.cardHead}>
        <Text style={[styles.questGlyph, quest.kind === 'gate' && { color: colors.gold }]}>{kind.glyph}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{quest.title}</Text>
          <Text style={styles.questMeta}>
            {kind.label} · {quest.modality}
            {quest.targetReps > 0 ? ` × ${quest.targetReps}` : ''}
            {done ? '  ·  fulfilled ◼' : past ? '  ·  slipped' : ''}
          </Text>
        </View>
      </View>
      {!done && (
        <View style={styles.cardActions}>
          <JuicyButton
            label={quest.targetReps === 0 ? 'Take stillness' : 'Begin'}
            action="log"
            onPress={() => onBegin({ plannedSessionId: quest.id, modality: quest.modality, reps: quest.targetReps, title: quest.title })}
            style={{ flex: 1 }}
          />
          <JuicyButton label={moving ? 'Keep day' : 'Move'} tone="ghost" onPress={onToggleMove} style={{ flex: 1 }} />
        </View>
      )}
      {!done && moving && (
        <View style={styles.moveRow}>
          {targets.map((d) => (
            <Pressable
              key={d.toISOString()}
              onPress={async () => {
                fire('tap');
                await useTrial.getState().moveSession(quest.id, d);
                onToggleMove();
              }}
              style={styles.moveChip}
            >
              <Text style={styles.moveChipText}>
                {DAY_NAMES[(dayDiffUTC(d, trialStart) % 7 + 7) % 7]} {d.getUTCDate()}
              </Text>
            </Pressable>
          ))}
          {targets.length === 0 && <Text style={styles.empty}>No room to move — its week has passed.</Text>}
        </View>
      )}
    </View>
  );
}

// ── binding vows (preserved beneath the trial) ──

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
  phaseCard: { borderLeftWidth: 2, borderLeftColor: colors.ki },
  phaseSigil: { color: colors.ki, fontSize: 24 },
  phaseMeta: { ...typo.label, fontSize: 10, color: colors.inkDim },
  phaseBlurb: { ...typo.body, color: colors.inkDim, fontSize: 13 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: colors.void2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: colors.ki },
  realign: { borderLeftWidth: 2, borderLeftColor: colors.warn },
  realignTitle: { ...typo.label, color: colors.warn },
  realignReason: { ...typo.body, color: colors.ink },
  weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekArrow: { color: colors.inkDim, fontSize: 16, padding: spacing.sm },
  weekLabel: { ...typo.label, color: colors.ink },
  strip: { flexDirection: 'row', gap: 4 },
  dayChip: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.void1, gap: 2 },
  dayChipSel: { backgroundColor: colors.void2, borderWidth: 1, borderColor: colors.ki },
  dayChipToday: { borderBottomWidth: 2, borderBottomColor: colors.gold },
  dayName: { ...typo.label, fontSize: 9, color: colors.inkDim },
  dayNameSel: { color: colors.ink },
  dayGlyphs: { color: colors.inkDim, fontSize: 12 },
  questGlyph: { color: colors.ki, fontSize: 20 },
  questMeta: { ...typo.label, fontSize: 10, color: colors.inkDim },
  moveRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  moveChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: colors.void2 },
  moveChipText: { ...typo.label, fontSize: 10, color: colors.ink },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  section: { ...typo.label, color: colors.inkDim },
  sectionToggle: { color: colors.inkDim },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle: { ...typo.body, color: colors.ink, fontWeight: '700', flex: 1 },
  major: { borderLeftWidth: 2, borderLeftColor: colors.gold },
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
