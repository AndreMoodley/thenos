// THE MIRROR RITE — current self → higher self → the Inner Demon → the Ward → a style → forge.
// WOOP/MCII made playable: the wish (higher self) is deliberately contrasted with a NAMED inner
// obstacle (its nature = the KiLeak taxonomy), then bound to an if-then ward. Pure positive
// fantasy is broken on purpose — that is the research. Every step is skippable ("Walk on"):
// the rite can be taken later from the Chronicle. Renders in place (depth ≤ 1).
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { colors, radii, spacing, type as typo } from '../constants/theme';
import { JuicyButton } from './JuicyButton';
import { useSaga } from '../store/saga';
import { DEMON_NATURES } from '../constants/saga';
import { fire } from '../lib/juice';

const STEPS = ['now', 'higher', 'demon', 'ward', 'style'] as const;
type Step = (typeof STEPS)[number];

export function SagaOnboardingSheet({
  visible,
  onClose,
  onForged,
}: {
  visible: boolean;
  onClose: () => void;
  /** Called after the profile is saved and the forge fired (or deferred offline). */
  onForged?: (deferred: boolean) => void;
}) {
  const saveProfile = useSaga((s) => s.saveProfile);
  const forge = useSaga((s) => s.forge);
  const styles_ = useSaga((s) => s.styles);
  const [step, setStep] = useState<Step>('now');
  const [currentSelf, setCurrentSelf] = useState('');
  const [higherSelf, setHigherSelf] = useState('');
  const [outcome, setOutcome] = useState('');
  const [demonCategory, setDemonCategory] = useState<string>('doubt');
  const [demonName, setDemonName] = useState('');
  const [demonDetail, setDemonDetail] = useState('');
  const [wardIf, setWardIf] = useState('');
  const [wardThen, setWardThen] = useState('');
  const [styleKey, setStyleKey] = useState('murim');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!visible) return null;
  const idx = STEPS.indexOf(step);

  const next = () => {
    fire('tap');
    setStep(STEPS[Math.min(STEPS.length - 1, idx + 1)]!);
  };
  const back = () => {
    fire('tap');
    setStep(STEPS[Math.max(0, idx - 1)]!);
  };

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveProfile({
        currentSelf: currentSelf.trim() || 'one who has not yet named themselves',
        higherSelf: higherSelf.trim() || 'the self the entity is becoming',
        outcome: outcome.trim() || 'a body and will that keep their word',
        obstacleCategory: demonCategory,
        obstacleName: demonName.trim() || 'The Unnamed',
        obstacleDetail: demonDetail.trim() || 'it stirs when the day goes quiet',
        wardPlan:
          wardIf.trim() && wardThen.trim()
            ? `If ${wardIf.trim()}, I will ${wardThen.trim()}`
            : 'If the demon stirs, I will begin the smallest possible rep',
        styleKey,
      });
      const { deferred } = await forge(styleKey);
      fire('forge');
      onForged?.(deferred);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'The mirror clouded — try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={s.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
      <Animated.View entering={SlideInDown.springify()} exiting={SlideOutDown} style={s.sheet}>
        <ScrollView contentContainerStyle={{ gap: spacing.md }} showsVerticalScrollIndicator={false}>
          <Text style={s.rite}>THE MIRROR RITE · {idx + 1}/{STEPS.length}</Text>

          {step === 'now' && (
            <>
              <Text style={s.q}>Who stands here now?</Text>
              <Text style={s.hint}>Honestly. The rite only works on the truth.</Text>
              <TextInput value={currentSelf} onChangeText={setCurrentSelf} placeholder="a tired scroller · a desk-bound doubter · someone starting over…" placeholderTextColor={colors.inkFaint} style={s.input} multiline />
            </>
          )}

          {step === 'higher' && (
            <>
              <Text style={s.q}>Who does the Void show you?</Text>
              <Text style={s.hint}>Your entity IS this self — every strike you log renders it more real.</Text>
              <TextInput value={higherSelf} onChangeText={setHigherSelf} placeholder="the unshakeable dawn-runner · the iron-backed climber…" placeholderTextColor={colors.inkFaint} style={s.input} multiline />
              <Text style={s.q2}>And the best outcome, if nothing stops you?</Text>
              <TextInput value={outcome} onChangeText={setOutcome} placeholder="crossing the line with breath to spare…" placeholderTextColor={colors.inkFaint} style={s.input} multiline />
            </>
          )}

          {step === 'demon' && (
            <>
              <Text style={s.q}>Name your Inner Demon.</Text>
              <Text style={s.hint}>The wish alone changes nothing — the obstacle must be named to be fought. It becomes your saga's antagonist.</Text>
              <View style={s.chips}>
                {DEMON_NATURES.map((d) => (
                  <Pressable key={d.category} onPress={() => { fire('tap'); setDemonCategory(d.category); }} style={[s.chip, demonCategory === d.category && s.chipActive]}>
                    <Text style={[s.chipText, demonCategory === d.category && s.chipTextActive]}>{d.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.hint}>{DEMON_NATURES.find((d) => d.category === demonCategory)?.hint}</Text>
              <TextInput value={demonName} onChangeText={setDemonName} placeholder='Give it a name — "The Hollow Scroll"…' placeholderTextColor={colors.inkFaint} style={s.input} />
              <TextInput value={demonDetail} onChangeText={setDemonDetail} placeholder="When does it stir? How does it win?" placeholderTextColor={colors.inkFaint} style={s.input} multiline />
            </>
          )}

          {step === 'ward' && (
            <>
              <Text style={s.q}>Forge the Ward.</Text>
              <Text style={s.hint}>An if-then bound in advance beats willpower in the moment. This is the blade you'll already be holding.</Text>
              <View style={s.wardRow}>
                <Text style={s.wardWord}>If</Text>
                <TextInput value={wardIf} onChangeText={setWardIf} placeholder="I reach for the feed after 9pm" placeholderTextColor={colors.inkFaint} style={[s.input, { flex: 1 }]} />
              </View>
              <View style={s.wardRow}>
                <Text style={s.wardWord}>I will</Text>
                <TextInput value={wardThen} onChangeText={setWardThen} placeholder="begin ten breaths instead" placeholderTextColor={colors.inkFaint} style={[s.input, { flex: 1 }]} />
              </View>
            </>
          )}

          {step === 'style' && (
            <>
              <Text style={s.q}>Choose the telling.</Text>
              <Text style={s.hint}>The Saga Forge writes your arc in this voice. The story only ever follows what you actually do — reforge anytime.</Text>
              {styles_.map((st) => (
                <Pressable key={st.styleKey} onPress={() => { fire('tap'); setStyleKey(st.styleKey); }} style={[s.styleCard, styleKey === st.styleKey && s.styleCardOn]}>
                  <Text style={s.styleName}>{st.name}</Text>
                  <Text style={s.styleDesc}>{st.descriptor}</Text>
                </Pressable>
              ))}
            </>
          )}

          {error && <Text style={s.error}>{error}</Text>}
          <View style={s.actions}>
            {idx > 0 ? <JuicyButton label="Back" tone="ghost" onPress={back} style={{ flex: 1 }} /> : <JuicyButton label="Walk on — shape it later" tone="ghost" onPress={onClose} style={{ flex: 1 }} />}
            {step !== 'style' ? (
              <JuicyButton label="Continue" onPress={next} style={{ flex: 1 }} />
            ) : (
              <JuicyButton label="Forge my saga" action="forge" disabled={busy} onPress={finish} style={{ flex: 1 }} />
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000a', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.void1, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, maxHeight: '88%' },
  rite: { ...typo.label, color: colors.inkFaint },
  q: { ...typo.title, color: colors.ink },
  q2: { ...typo.body, color: colors.ink, fontWeight: '700', marginTop: spacing.xs },
  hint: { ...typo.body, color: colors.inkDim },
  input: { backgroundColor: colors.void2, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 12, color: colors.ink, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: colors.void2 },
  chipActive: { backgroundColor: colors.crimson },
  chipText: { ...typo.label, color: colors.inkDim },
  chipTextActive: { color: colors.void0 },
  wardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wardWord: { ...typo.body, color: colors.ki, fontWeight: '700', width: 44 },
  styleCard: { backgroundColor: colors.void2, borderRadius: radii.md, padding: spacing.md, gap: 4 },
  styleCardOn: { borderWidth: 1, borderColor: colors.ki },
  styleName: { ...typo.body, color: colors.ink, fontWeight: '700' },
  styleDesc: { ...typo.body, color: colors.inkDim, fontSize: 13 },
  error: { color: colors.crimson, ...typo.label },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
});
