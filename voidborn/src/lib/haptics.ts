// Haptics — part of the juice layer (invariant #9). Every meaningful action gets a haptic.
// Honors a global toggle (settings / reduce-motion can mute).
import * as Haptics from 'expo-haptics';

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'selection';

let enabled = true;
export const setHapticsEnabled = (v: boolean) => {
  enabled = v;
};

export function haptic(kind: HapticKind): void {
  if (!enabled) return;
  try {
    switch (kind) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'selection':
        Haptics.selectionAsync();
        break;
    }
  } catch {
    // haptics unavailable (web / unsupported device) — never throw from the juice layer
  }
}
