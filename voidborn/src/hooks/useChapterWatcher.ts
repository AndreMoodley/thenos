// Watches for saga chapters opened by real events (set by metrics.syncNow from flush results)
// and turns the Chronicle's page: success haptic + the chapter_unlock set-piece. Reduce-motion
// shortens it to a calm fade (invariant #7).
import { useEffect } from 'react';
import { useSaga } from '../store/saga';
import { useCinematic } from './useCinematic';
import { fire } from '../lib/juice';

export function useChapterWatcher(): void {
  const last = useSaga((s) => s.lastChapterUnlock);
  const clear = useSaga((s) => s.clearChapterUnlock);
  const play = useCinematic((s) => s.play);

  useEffect(() => {
    if (!last) return;
    fire('chapter');
    play('chapter_unlock', { kind: 'chapter', full: 2400, calm: 600 });
    // Pull the freshly written prose (and any lazy Claude refinement) for the Chronicle.
    void useSaga.getState().refresh();
    clear();
  }, [last?.id]);
}
