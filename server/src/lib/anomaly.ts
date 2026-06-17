// Pure anomaly scoring for a logged strike (audit H3 — "evolution is spoofable via unverified
// reps"). The research lesson (Strava, STEPN) is to score each effort against what "normal" looks
// like for THIS user and flag outliers server-side. VOIDBORN's append-only StrikeEvent log is
// exactly that substrate. This is non-blocking (flag, never reject) and deliberately conservative
// to avoid punishing real progress; thresholds are tunable and get calibrated in Phase 4.

export interface AnomalyResult {
  score: number; // amount relative to the personal baseline (≈ how many × the usual)
  flagged: boolean;
  reason: string | null;
}

const MIN_HISTORY = 5; // below this we only apply the absolute ceiling (cold start)
const HARD_CEILING = 5000; // a single-session amount implausible across disciplines
const FLOOR = 50; // never flag small sessions (early users, light days)
const RATIO = 8; // amount > RATIO × personal median ⇒ suspicious

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/**
 * Score a strike against the practitioner's recent strike amounts. Pure + deterministic (unit
 * tested). `history` excludes the current strike. Returns a relative score and a conservative
 * flagged verdict: an absolute ceiling always applies; a personal-baseline check applies once
 * there's enough history and the amount is meaningfully large.
 */
export function scoreStrike(history: number[], amount: number): AnomalyResult {
  const reasons: string[] = [];
  if (amount >= HARD_CEILING) reasons.push(`amount ${amount} ≥ hard ceiling ${HARD_CEILING}`);

  const med = median(history);
  if (history.length >= MIN_HISTORY && amount > FLOOR && med > 0 && amount > RATIO * med) {
    reasons.push(`amount ${amount} > ${RATIO}× personal median ${med}`);
  }

  const score = med > 0 ? amount / med : amount / FLOOR;
  return { score: Number(score.toFixed(2)), flagged: reasons.length > 0, reason: reasons.join('; ') || null };
}
