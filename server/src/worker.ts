import './env.js';
import { prisma } from './lib/prisma.js';
import { dispatchPending } from './lib/eventBus.js';
import { registerAll } from './subscribers/index.js';

// The relay process. Run separately from the API (`npm run worker`) so dispatch never blocks a
// request. In production this is the natural home for Graphile Worker (Postgres-native, SKIP
// LOCKED) — see docs/OSS_INTEGRATION_STACK.md; the polling loop below is the dependency-free
// stand-in that exercises the exact same dispatchPending relay.
registerAll();

const INTERVAL_MS = Number(process.env.OUTBOX_POLL_MS || 1000);

async function tick(): Promise<void> {
  try {
    const r = await dispatchPending(prisma);
    if (r.delivered || r.failed) {
      // eslint-disable-next-line no-console
      console.log(`[outbox] processed=${r.processed} delivered=${r.delivered} failed=${r.failed}`);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[outbox] dispatch error', err);
  }
}

// eslint-disable-next-line no-console
console.log(`VOIDBORN outbox relay started (poll ${INTERVAL_MS}ms)`);
setInterval(tick, INTERVAL_MS);
