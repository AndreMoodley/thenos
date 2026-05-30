// Load .env (Node 22 native) before anything reads process.env. Imported first by entrypoints.
try {
  // @ts-ignore - available on Node 20.12+/22
  process.loadEnvFile?.();
} catch {
  // no .env file present (e.g. real env vars injected by the platform) — that's fine
}

// Invariant #10: JWT_SECRET must be set before boot.
export function assertBootEnv() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set — refusing to boot (invariant #10).');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — refusing to boot.');
  }
}
