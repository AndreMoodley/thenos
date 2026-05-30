// Rive asset registry. The .riv binaries are AUTHORED ART (Rive editor) and are not in the repo yet
// — so this returns null for now and the entity renders its metric-reactive fallback. When an
// artist drops `void.riv` etc. into assets/rive/, uncomment the matching require and Rive takes over.
//
// (We must NOT statically `require()` a missing file — Metro would fail to bundle. Hence the registry.)
import type { FormKey } from '../constants/forms';

export function riveSource(_formKey: FormKey): number | null {
  // Once assets ship:
  // const map: Partial<Record<FormKey, number>> = {
  //   void: require('../../assets/rive/void.riv'),
  //   beast: require('../../assets/rive/beast.riv'),
  //   humanoid: require('../../assets/rive/humanoid.riv'),
  //   transcendent_heavenly: require('../../assets/rive/transcendent.riv'),
  // };
  // return map[_formKey] ?? null;
  return null;
}

export const STATE_MACHINE = 'EntityState'; // the SM authored inside each .riv
