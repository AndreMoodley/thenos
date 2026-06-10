// REBIRTH — onboarding + the birth set-piece. You are returning to a being, not opening a tool.
// After signup the MIRROR RITE runs in place (current self → higher self → Inner Demon → Ward →
// style → forge), then the trial wizard, then the birth beat. Every step is skippable — both
// rites can be taken later from the Chronicle and the Quest Log.
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors, spacing, radii, type as typo } from '../../src/constants/theme';
import { SpaceBackdrop } from '../../src/spaces/SpaceBackdrop';
import { FallbackEntity } from '../../src/entity/FallbackEntity';
import { JuicyButton } from '../../src/components/JuicyButton';
import { SagaOnboardingSheet } from '../../src/components/SagaOnboardingSheet';
import { TrialWizardSheet } from '../../src/components/TrialWizardSheet';
import { useAuth } from '../../src/store/auth';
import { fire } from '../../src/lib/juice';
import { reduceMotionEnabled, cinematicDuration } from '../../src/lib/reduceMotion';

// A nascent embryo at the Foundation Realm — full ki, calm.
const NEWBORN_INPUTS = { realm: 1, ki: 100, shadowLevel: 1, streak: 0, streakBonus: false, mastery: 0, corruption: 0 };

type Phase = 'form' | 'rite' | 'trial' | 'born';

export default function RebirthScreen() {
  const router = useRouter();
  const signup = useAuth((s) => s.signup);
  const login = useAuth((s) => s.login);
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string | null>(null);

  const beBorn = () => {
    // The void coalesces — a short birth beat, then the Domain.
    setPhase('born');
    fire('rebirth');
    const ms = cinematicDuration(1500, 400, reduceMotionEnabled());
    setTimeout(() => router.replace('/'), ms);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') {
        await signup(email.trim(), password, name.trim() || undefined);
        // The Mirror Rite first: the entity should be born already knowing who it is becoming.
        setPhase('rite');
        setBusy(false);
      } else {
        await login(email.trim(), password);
        router.replace('/');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
      setBusy(false);
    }
  };

  const useDemo = () => {
    setMode('login');
    setEmail('demo@voidborn.app');
    setPassword('voidborn123');
  };

  return (
    <View style={styles.fill}>
      <SpaceBackdrop domainKey="dojo" allow3D={false} />

      {phase === 'born' ? (
        <Animated.View entering={FadeIn} style={styles.center}>
          <FallbackEntity inputs={NEWBORN_INPUTS} size={300} />
          <Text style={styles.born}>You are reborn.</Text>
        </Animated.View>
      ) : phase !== 'form' ? (
        <View style={styles.center}>
          <FallbackEntity inputs={NEWBORN_INPUTS} size={220} />
          <Text style={styles.tagline}>The void holds its breath…</Text>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
          <FallbackEntity inputs={NEWBORN_INPUTS} size={180} />
          <Text style={styles.brand}>VOIDBORN</Text>
          <Text style={styles.tagline}>Real training is the only fuel. Beauty is purchasable; ascension is earned.</Text>

          <View style={styles.form}>
            {mode === 'signup' && (
              <TextInput style={styles.input} placeholder="Name (optional)" placeholderTextColor={colors.inkFaint} value={name} onChangeText={setName} autoCapitalize="words" />
            )}
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.inkFaint} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.inkFaint} value={password} onChangeText={setPassword} secureTextEntry />
            {error && <Text style={styles.error}>{error}</Text>}
            <JuicyButton label={mode === 'signup' ? 'Be reborn' : 'Return'} action="rebirth" disabled={busy} onPress={submit} />
            <Pressable onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
              <Text style={styles.switch}>{mode === 'signup' ? 'Already have an entity? Return' : 'New here? Be reborn'}</Text>
            </Pressable>
            <Pressable onPress={useDemo}>
              <Text style={styles.demo}>Use the demo adept</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* The Mirror Rite — skippable; closing it walks on to the trial wizard, then birth. */}
      <SagaOnboardingSheet
        visible={phase === 'rite'}
        onClose={() => setPhase('trial')}
        onForged={() => setPhase('trial')}
      />
      <TrialWizardSheet visible={phase === 'trial'} onClose={beBorn} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.void0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  brand: { ...typo.display, color: colors.ink, letterSpacing: 4 },
  tagline: { ...typo.body, color: colors.inkDim, textAlign: 'center', maxWidth: 320 },
  born: { ...typo.title, color: colors.ink, marginTop: spacing.lg },
  form: { width: '100%', maxWidth: 360, gap: spacing.sm, marginTop: spacing.lg },
  input: { backgroundColor: colors.void1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 14, color: colors.ink, fontSize: 16 },
  error: { color: colors.crimson, ...typo.label },
  switch: { color: colors.ki, textAlign: 'center', marginTop: spacing.sm, ...typo.label },
  demo: { color: colors.inkFaint, textAlign: 'center', ...typo.label },
});
