import { defineConfig } from 'vitest/config';

// Server unit tests (pure logic: realms thresholds + gacha pity/rates). A local config so running
// from server/ doesn't pick up the repo-root harness config.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
