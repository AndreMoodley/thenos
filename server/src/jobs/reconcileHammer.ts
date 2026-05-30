import '../env.js';
import { prisma } from '../lib/prisma.js';
import { recomputeHammerCount } from '../lib/reconcile.js';

/**
 * Nightly audit (invariant #2): recompute every practitioner's hammerCount from the append-only
 * StrikeEvent log and correct drift. Run via `npm run reconcile` or a scheduler (cron/EAS/queue).
 */
export async function reconcileAll(): Promise<{ scanned: number; corrected: number }> {
  const ids = await prisma.practitioner.findMany({ select: { id: true } });
  let corrected = 0;
  for (const { id } of ids) {
    const rec = await prisma.$transaction((tx) => recomputeHammerCount(tx, id));
    if (rec.drift !== 0) {
      corrected += 1;
      // eslint-disable-next-line no-console
      console.log(`reconciled ${id}: ${rec.before} → ${rec.after} (drift ${rec.drift})`);
    }
  }
  return { scanned: ids.length, corrected };
}

// Run directly (node/tsx src/jobs/reconcileHammer.ts)
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  reconcileAll()
    .then((r) => {
      // eslint-disable-next-line no-console
      console.log(`hammer reconcile complete — scanned ${r.scanned}, corrected ${r.corrected}`);
      return prisma.$disconnect();
    })
    .then(() => process.exit(0))
    .catch(async (e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
