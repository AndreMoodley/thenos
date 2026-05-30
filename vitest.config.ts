import { defineConfig } from 'vitest/config';

// Runs ONLY the app's pure, runtime-agnostic logic (no React Native imports in this graph).
// The native app (screens, Rive, R3F) is verified by `tsc` + a dev build, not here.
export default defineConfig({
  // Bypass the app's expo-extending tsconfig (the app's deps aren't installed in this minimal,
  // pure-logic harness — by design). A string tsconfigRaw makes vite skip tsconfig discovery.
  esbuild: { tsconfigRaw: '{}' },
  test: {
    include: ['voidborn/src/**/*.test.ts'],
    environment: 'node',
  },
});
