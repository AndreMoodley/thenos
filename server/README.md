# VOIDBORN server

Node + Express + Prisma + PostgreSQL. **Server-authoritative** for currency (Void Crystals),
ownership/entitlements, and all gacha/pity. Routes mount directly — **no `/api` prefix** (invariant #4).

## Run

```bash
cp .env.example .env          # set JWT_SECRET (required before boot — invariant #10) + DATABASE_URL
npm install
npx prisma migrate dev        # apply migrations on a fresh DB
npm run seed                  # catalog + demo + admin accounts
npm run dev                   # http://localhost:4000  →  curl :4000/health → { ok: true }
npm test                      # vitest: realms thresholds + gacha pity/rates
npm run reconcile             # nightly hammerCount ↔ StrikeEvent audit (invariant #2)
```

Seeded accounts: `demo@voidborn.app / voidborn123` · `admin@voidborn.app / voidbornadmin`.

## Invariants enforced here

1. **No stored realm/stage/look.** `hammerCount` is stored; realm/stage are computed in `lib/realms.ts`
   and returned by `/entity/me`. There is no `realm`/`stage` column.
2. **`StrikeEvent` is append-only and is the source of truth.** `hammerCount` is a reconcilable cache
   (`lib/reconcile.ts`, `jobs/reconcileHammer.ts`, `POST /admin/recompute-hammer/:id`).
3. **`reps:0` ⇒ no `StrikeEvent`** (`lib/metrics.ts` / `lib/sessionLog.ts`).
4. **No `/api` prefix; Bearer JWT** (`middleware/auth.ts`).
6. **Offline-first, server-authoritative.** `POST /sync/flush` replays effort idempotently by
   `clientId`; currency/ownership/gacha are never accepted from the queue.
8. **Cosmetics/forms/spaces = direct purchases; companions are the only RNG** (`lib/gacha.ts`,
   disclosed rates + server pity), additive-only.

## Route map (`src/app.ts`)

`/auth` · `/practitioner` · `/sessions` · `/vows` · `/entity` · `/spaces` · `/cosmetics` ·
`/manifestation-presets` · `/companions` · `/coach` · `/sync` · `/premium` · `/cinematics` · `/admin`

The Voice of the Void (`/coach/reflect`) calls Claude when `ANTHROPIC_API_KEY` is set and otherwise
returns a deterministic, **data-grounded** fallback (it never invents data). Stripe (Soul Escrow) is
stubbed at the payment boundary; the wager/escrow state machine is real.

> Deviations from the spec letter, with rationale: `bcryptjs` (pure-JS, no native build) in place of
> `bcrypt`; `activeFormKey` lives only on `Practitioner` (not duplicated on `PractitionerEntity`) to
> keep a single source of truth. See `docs/STATUS.md`.
