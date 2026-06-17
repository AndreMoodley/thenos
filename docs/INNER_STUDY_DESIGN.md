# VOIDBORN — The Inner Study (Meditation via the I Ching)

**Date:** 2026-06-17
**Premise (the user's intent):** *to train the mind, one studies.* The body is trained by strikes (`hammerCount` → realms); the **mind** is trained by **contemplation** — sitting with a teaching and reflecting on how thought shapes what unfolds. Grounded in a complete work of art, the **I Ching (Book of Changes)**, and woven in so **subtly it creates no friction**.

## 1. Design principles (the anti-friction contract)
- **Subtle, never a chore.** No new mandatory flow, no nag. It rides the mechanics that already exist: **Stillness/Recovery** (`reps:0`), the **Temporal Anchor** (daily ritual), the `ki` integrity bar, and the **Voice of the Void**. A practitioner who ignores it loses nothing; a practitioner who leans in deepens.
- **Mind ≠ body, by the invariants.** Meditation is a `reps:0` act: **no `StrikeEvent`, no `hammerCount`, no realm change** (Invariants #1–#3). It strengthens the *mind* axis — `ki` (integrity/clarity) and an accruing **wisdom** (count of contemplations) — never the body's ascension. The two axes are parallel: *strengthen body and mind.*
- **Once a day, like the oracle.** The I Ching is consulted with intention, not spammed. The day's hexagram is **deterministic per practitioner per UTC day** — re-opening shows the same teaching to *sit with*, which is both thematically right and a natural anti-faucet (no reroll grind, the first sitting of the day restores `ki`, later sittings are reflection-only).
- **"Thoughts affect reality" is the mechanic, not a slogan.** The I Ching's heart is the **changing lines**: a present situation (the primary hexagram) and where intention is carrying it (the **transformed** hexagram). Surfacing both *is* the lesson — your attention now shapes the outcome.

## 2. The mechanic
- Each UTC day the server derives a **daily contemplation** from a seed (`practitionerId + date`): cast six lines (the 3-coin distribution — 1/8 old-yin, 3/8 young-yang, 3/8 young-yin, 1/8 old-yang), yielding a **primary hexagram**, its **changing lines**, and the **transformed hexagram**.
- The practitioner **meditates** (a single tap from the home/Dojo, or as a Stillness session): they sit with the hexagram's teaching + a short *thought-shapes-reality* reflection, optionally journal a line, and the act:
  - restores a little **`ki`** (clarity) — first sitting of the day only, capped at 100;
  - logs an append-only **`Contemplation`** (the study record — the mind's analogue of `StrikeEvent`);
  - counts as **presence** (deepens the **Bond**, holds the streak) — body *or* mind both count as showing up;
  - emits a **`Contemplated`** domain event so the bus carries it onward (coach, saga, Bond) with no new coupling.
- **Wisdom** (cumulative contemplations) is **derived by counting** the log — never stored — mirroring "realm-from-hammerCount." It unlocks nothing that confers power (kept honest, like the Bond); it is the visible depth of a studied mind.

## 3. Where it surfaces (subtlety in the UI — client work, planned)
- **The Dojo (home):** beneath "Today's Quest," a quiet **"Today's Contemplation"** line — the hexagram glyph (`䷀`–`䷿`) + name. One tap to sit. That's the entire footprint. No badge, no red dot.
- **The Voice of the Void** may, on the daily return, weave the day's hexagram into its reflection (it already composes context → Claude). Occasion: `oracle`/`return`.
- **The Chronicle** can, much later, show a faint "studied N hexagrams" line. Optional.
- Reduce-motion/`device-tier` unaffected (it's text + a glyph).

## 4. Data & API (additive)
- **`Contemplation`** (append-only): `practitionerId`, `hexagram Int`, `changing Int[]`, `transformed Int`, `note String?`, `kiGain Int`, `createdAt`. Indexed by `[practitionerId, createdAt]`.
- **`lib/iching.ts`** (pure, server): the complete 64 hexagrams (King Wen order, trigrams, glyph, concise original teaching + reflection), a deterministic `dailyContemplation(seed)`, and a `cast(rng)` for future intention-led castings. Verified by a **bijection check** (the 64 trigram patterns map 1:1 onto 0–63).
- **API:** `POST /practitioner/me/meditate { note? }` (daily; `reps:0`-semantics; returns the hexagram + teaching + transformed + `kiGain` + `alreadyToday`); `GET /practitioner/me/contemplation` (today's hexagram + whether sat + lifetime count). Both Bearer-auth, server-authoritative.
- **Event:** `Contemplated { practitionerId, hexagram, occurredOn }` → Bond presence subscriber (extended) + future coach/saga consumers.

## 5. Invariants & safety (pre-checked)
- #1 nothing stored that should be computed (wisdom = count); #2 `StrikeEvent` untouched (meditation never strikes); #3 `reps:0` ⇒ no strike — honored by construction; #6 server-authoritative (the cast is server-side & deterministic); #8 additive-only, **not** gacha (no RNG reward, no currency minted). `ki` change is capped 0–100 and once-per-day, so there is **no clarity faucet**.
- **No friction:** opt-in, daily, single-tap, ignorable; no streak *punishment* for skipping meditation (only strikes/anchor hold the streak today — meditation *adds* presence, never gates it).

## 6. Copyright note
The I Ching is an ancient public-domain work; modern translations are not. All teachings here are **concise original paraphrases** of each hexagram's classical sense — no copyrighted translation is reproduced.

## 7. Build order
1. `lib/iching.ts` (64 hexagrams + pure cast/daily) — verify the bijection. *(this increment)*
2. `Contemplation` model + migration + `Contemplated` event. *(this increment)*
3. `/me/meditate` + `/me/contemplation` + Bond presence on `Contemplated`. *(this increment)*
4. Audit + fixes. *(this increment)*
5. Client: the one-line "Today's Contemplation" on the Dojo + the sit sheet; coach occasion. *(planned, needs a dev build)*
