// Reduce-motion (invariant #7). OS setting ⇒ calm entity state + shortened/skipped cinematics.
// Degrade fidelity, never function.
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

let cached = false;
AccessibilityInfo.isReduceMotionEnabled?.()
  .then((v) => {
    cached = v;
  })
  .catch(() => {});

/** Non-reactive read (for imperative paths like cinematic duration selection). */
export const reduceMotionEnabled = () => cached;

/** Reactive hook — re-renders when the OS setting changes. */
export function useReduceMotion(): boolean {
  const [value, setValue] = useState(cached);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => {
        if (mounted) {
          cached = v;
          setValue(v);
        }
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      cached = v;
      setValue(v);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return value;
}

/** Pick a cinematic duration: full vs the calm/shortened variant. */
export const cinematicDuration = (full: number, calm: number, reduce: boolean) => (reduce ? calm : full);
