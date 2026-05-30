// Offline-first sync (invariant #6). Detects connectivity, flushes the queue on reconnect and when
// the app returns to the foreground, and reports pending-mutation count for the UI.
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { ping } from '../api/client';
import { useMetrics } from '../store/metrics';

export function useOfflineSync(): { online: boolean; pendingCount: number } {
  const [online, setOnline] = useState(true);
  const pendingCount = useMetrics((s) => s.pendingCount);

  useEffect(() => {
    let mounted = true;
    let wasOffline = false;

    const check = async () => {
      const ok = await ping();
      if (!mounted) return;
      setOnline(ok);
      if (ok) {
        await useMetrics.getState().syncNow();
        if (wasOffline) await useMetrics.getState().hydrate(); // pull authoritative state after reconnect
        wasOffline = false;
      } else {
        wasOffline = true;
      }
    };

    void check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void check();
    });
    const timer = setInterval(check, 30_000);
    return () => {
      mounted = false;
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  return { online, pendingCount };
}
