# VOIDBORN — The Inner Study: Audit

**Date:** 2026-06-17
**Scope:** the meditation feature — `lib/iching.ts`, `Contemplation` model, `Contemplated` event, `/me/meditate` + `/me/contemplation`, Bond presence extension. Design: `INNER_STUDY_DESIGN.md`.

## Invariant compliance — clean
- **#1 (nothing computed is stored):** "wisdom" is the **count** of `Contemplation` rows (derived), like realm-from-hammerCount. ✅
- **#2 (`StrikeEvent` is the source of truth):** meditation creates **no** `StrikeEvent` and never changes `hammerCount` — the body axis is untouched. ✅
- **#3 (`reps:0` ⇒ no strike):** meditation is a `reps:0` act by construction; it cannot strike. ✅
- **#6 (server-authoritative):** the day's hexagram is **server-derived deterministically** (`dailyContemplation(practitionerId:date)`); `ki`/contemplation writes are server-side. ✅
- **#8 (additive-only; gacha is the *only* RNG):** the cast is a **deterministic daily** draw (not a randomized *reward*), mints no currency and grants no item — so it is **not** gacha. Purely additive. ✅

## Abuse / exploit checks
| Vector | Result |
|---|---|
| **Clarity (`ki`) faucet** | First sitting of the day restores ≤ 8 `ki` (clamped 0–100); repeats the same day restore **0**. No faucet. ✅ |
| **Wisdom inflation** | At most **one** `Contemplation` row per UTC day. ✅ |
| **Presence/Bond inflation** | `Contemplated` is emitted only on the first sitting; the Bond subscriber is itself day-guarded. ✅ |
| **`note` field** | Length-capped (Zod `.max(500)`), stored as data (never executed). ✅ |
| **Rate** | Daily-capped action + the global P0 rate limiter. ✅ |

## Finding (fixed) — F1: the daily-once guard was not race-safe
**Was:** "find today's row, else insert" — two concurrent `/me/meditate` calls could both pass the check and each grant `ki` + a row (minor: one extra +8 `ki`, +1 wisdom).
**Fix:** a **unique `@@unique([practitionerId, day])`** on `Contemplation` (a `day` = UTC-midnight column) makes the second insert fail; the route catches the `P2002` and returns the already-meditated response gracefully. Now exactly one contemplation per day even under concurrency. (Schema + migration `20260617104120_inner_study` updated.)

## Anti-friction (the user's hard requirement) — met
- **Opt-in, once a day, single tap, fully ignorable.** Skipping meditation costs nothing — only strikes/anchor hold the streak; meditation **adds** presence, never gates it.
- **No nag, no badge.** Surfacing is one quiet "Today's Contemplation" line on the Domain (client work, planned), backed by `GET /me/contemplation`.
- **Subtle by reuse:** it rides the existing `ki`/Stillness/Bond systems and the event bus — no parallel realm, no new mandatory flow.

## Verification (headless)
- **Parse-check:** all changed modules pass `node --experimental-strip-types --check`.
- **I Ching library — 11/11** (real module): 64 distinct hexagrams in King Wen order, the **trigram→pattern bijection self-checks at load**, bit→hexagram mapping (all-yang ⇒ #1, all-yin ⇒ #2), determinism, and the **changing-line frequency ≈ 1/4** (0.255 over 12k lines). Vitest `iching.test.ts` for CI.
- **Meditation logic — 4/4** (port): first sit restores up to the cap, repeats restore 0.

## Remaining (planned)
- **Client surfacing:** the "Today's Contemplation" line + the sit sheet (glyph, teaching, the *thought-shapes-reality* reflection, the primary→transformed change), and a `oracle`/`return` **Voice of the Void** occasion that weaves the day's hexagram in. Needs a dev build.
- **Optional:** allow an intention-led **cast** (the `cast(rng)` already exists) for "ask the oracle a question," server-RNG, still once-metered.

Validate on your machine: `npm run generate && npm run migrate && npm run typecheck && npm test` (migration `20260617104120_inner_study` creates `Contemplation` with the daily unique).
