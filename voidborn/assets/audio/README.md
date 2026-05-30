# assets/audio — the juice soundscape (authored audio)

Short per-action cues + per-domain ambient loops, played by `src/lib/audio.ts` (`expo-audio`).
Bundled (no streaming). Until they ship, playback no-ops gracefully (haptics still fire).

## Action cues (short, < 400ms)
`tap.m4a` · `equip.m4a` · `seal.m4a` · `strike.m4a` · `vow.m4a` · `ascension.m4a` · `summon.m4a` ·
`swipe.m4a` · `rebirth.m4a`

Wire them into `cueSource()` in `src/lib/audio.ts`.

## Soundscapes (looping ambient, per Domain Pack — part of the IAP)
`dojo_ambient` · `frozen_ambient` · `ember_ambient` · `abyssal_ambient` · `jade_ambient` · `storm_ambient`

Keyed by `domainConfig.soundscapeKey`; started via `startSoundscape(domainKey)`.
