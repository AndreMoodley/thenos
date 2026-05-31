// The hub shell. Providers + auth gate + the persistent chrome (TopStatus, BottomBar) + the cinematic
// overlay. Depth ≤ 1: spaces are swapped flat (router.replace) and reached by tap or horizontal swipe.
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { runOnJS } from 'react-native-reanimated';
import { colors, type as typo } from '../src/constants/theme';
import { useAuth } from '../src/store/auth';
import { useMetrics } from '../src/store/metrics';
import { useCharacterConfig } from '../src/store/characterConfig';
import { useOfflineSync } from '../src/hooks/useOfflineSync';
import { useAscensionWatcher } from '../src/hooks/useAscensionWatcher';
import { TopStatus } from '../src/components/TopStatus';
import { BottomBar, SPACES } from '../src/components/BottomBar';
import { CinematicOverlay } from '../src/components/CinematicOverlay';
import { fire } from '../src/lib/juice';

export default function RootLayout() {
  const hydrate = useAuth((s) => s.hydrate);
  const status = useAuth((s) => s.status);
  const segments = useSegments();
  const inRebirth = segments[0] === '(rebirth)';

  useEffect(() => {
    void hydrate();
  }, []);

  // Auth gate. Navigate imperatively in an effect — rendering <Redirect> during the auth gate
  // ping-pongs against the router on web (infinite re-render). One effect, fires on state change.
  const router = useRouter();
  useEffect(() => {
    if (status === 'unauthed' && !inRebirth) router.replace('/(rebirth)');
  }, [status, inRebirth]);

  const booting = status === 'idle' || status === 'loading';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.root}>
          {booting ? <Splash /> : <Shell inRebirth={inRebirth} authed={status === 'authed'} />}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Shell({ inRebirth, authed }: { inRebirth: boolean; authed: boolean }) {
  const showChrome = authed && !inRebirth;
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {showChrome && <AuthedEffects />}
      {showChrome && <TopStatus />}
      <SwipeBetweenSpaces enabled={showChrome}>
        <Slot />
      </SwipeBetweenSpaces>
      {showChrome && <BottomBar />}
      <CinematicOverlay />
    </SafeAreaView>
  );
}

/** Runs the authed-only effects: offline sync loop, ascension watcher, initial hydrate. */
function AuthedEffects() {
  useOfflineSync();
  useAscensionWatcher();
  const hydrateMetrics = useMetrics((s) => s.hydrate);
  const entity = useMetrics((s) => s.entity);
  const loadFromEnvelope = useCharacterConfig((s) => s.loadFromEnvelope);
  const loadPresets = useCharacterConfig((s) => s.loadPresets);

  useEffect(() => {
    void hydrateMetrics();
    void loadPresets();
  }, []);
  useEffect(() => {
    if (entity) loadFromEnvelope(entity);
  }, [entity]);
  return null;
}

/** Horizontal swipe between top-level spaces (secondary gesture; the bar is primary). */
function SwipeBetweenSpaces({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();

  const go = (dir: 1 | -1) => {
    const current = '/' + (segments[0] && segments[0] !== '(rebirth)' ? segments[0] : '');
    const idx = SPACES.findIndex((s) => s.route === (current === '/' ? '/' : current));
    const nextIdx = Math.min(SPACES.length - 1, Math.max(0, (idx < 0 ? 0 : idx) + dir));
    if (nextIdx !== idx) {
      fire('navigate');
      router.replace(SPACES[nextIdx]!.route as never);
    }
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      if (Math.abs(e.translationX) < 60) return;
      runOnJS(go)(e.translationX < 0 ? 1 : -1);
    });

  if (!enabled) return <View style={styles.body}>{children}</View>;
  return (
    <GestureDetector gesture={pan}>
      <View style={styles.body}>{children}</View>
    </GestureDetector>
  );
}

function Splash() {
  return (
    <View style={styles.splash}>
      <Text style={styles.brand}>VOIDBORN</Text>
      <ActivityIndicator color={colors.ki} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.void0 },
  body: { flex: 1 },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: colors.void0 },
  brand: { ...typo.display, color: colors.ink, letterSpacing: 4 },
});
