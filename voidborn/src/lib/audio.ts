// Audio juice — a short cue per action + per-domain ambient soundscapes (expo-audio).
//
// NOTE: `expo-audio` replaces the spec's `expo-av`, which is removed in SDK 54+ (see docs/TOOLCHAIN).
// The cue/soundscape ASSET BINARIES are not in the repo (they are authored audio). Each entry below
// points at where its file will live; until the assets ship, playback no-ops gracefully.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export type CueKey = 'tap' | 'equip' | 'seal' | 'strike' | 'vow' | 'ascension' | 'summon' | 'swipe' | 'rebirth';

// Asset map. Wrapped so a missing file degrades to a no-op rather than crashing the juice layer.
function cueSource(_key: CueKey): number | null {
  try {
    // Example once assets ship:
    //   const map = { tap: require('../../assets/audio/tap.m4a'), ... } as Record<CueKey, number>;
    //   return map[_key] ?? null;
    return null;
  } catch {
    return null;
  }
}

let muted = false;
export const setAudioMuted = (v: boolean) => {
  muted = v;
};

const players = new Map<CueKey, AudioPlayer>();
let soundscape: AudioPlayer | null = null;
let initialized = false;

async function ensureInit() {
  if (initialized) return;
  initialized = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false });
  } catch {
    /* audio mode unavailable */
  }
}

export function playCue(key: CueKey): void {
  if (muted) return;
  const src = cueSource(key);
  if (src == null) return; // asset not shipped yet
  void ensureInit();
  try {
    let player = players.get(key);
    if (!player) {
      player = createAudioPlayer(src);
      players.set(key, player);
    }
    player.seekTo(0);
    player.play();
  } catch {
    /* never throw from juice */
  }
}

export function startSoundscape(_domainKey: string): void {
  if (muted) return;
  // Per-domain ambient loop is bundled in the Domain Pack IAP (no streaming). No-ops until assets ship.
}

export function stopSoundscape(): void {
  try {
    soundscape?.pause();
    soundscape = null;
  } catch {
    /* noop */
  }
}
