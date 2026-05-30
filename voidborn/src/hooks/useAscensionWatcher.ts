// Watches for realm crossings (set optimistically by metrics.logStrike) and fires the ascension
// set-piece: heavy haptic + cinematic, refresh the computed stage, and let the Void reflect.
import { useEffect } from 'react';
import { useMetrics } from '../store/metrics';
import { useCinematic } from './useCinematic';
import { fire } from '../lib/juice';
import { api } from '../api/endpoints';

export function useAscensionWatcher(): void {
  const last = useMetrics((s) => s.lastAscension);
  const clear = useMetrics((s) => s.clearAscension);
  const play = useCinematic((s) => s.play);

  useEffect(() => {
    if (!last) return;
    fire('ascension');
    play(`ascension_${last.key}`, { kind: 'ascension', full: 5200, calm: 1100 });
    // The stage is computed server-side; refresh the envelope so the entity evolves its silhouette.
    void useMetrics.getState().refreshEntity();
    // The Void reflects on what was crossed (grounded in real data; never punitive).
    api.coach.reflect('ascension').catch(() => {});
    clear();
  }, [last?.index]);
}
