# VOIDBORN — The Honest Economy (currency = cosmetics only; commitment = intrinsic)

**Date:** 2026-06-17
**Premise (the user's intent):** tie **Void Crystals only to the entity's cosmetics**, and let the Heavenly Restriction (and every commitment) **fall on the user intrinsically** — *"you are only delaying your own growth; you harm yourself by not answering truthfully."* This is a self-improvement app: the reward must be the growth, not the currency.

## 1. Why this is the *correct* design (the research)
- **The overjustification effect:** giving an expected external reward (money, prizes, points) for an already-intrinsically-rewarding act **reduces** intrinsic motivation — motivational "crowding out." Sustainable drive comes from **autonomy, competence, relatedness** (Self-Determination Theory), not extrinsic payouts ([Decision Lab](https://thedecisionlab.com/biases/overjustification-effect); [Wikipedia](https://en.wikipedia.org/wiki/Overjustification_effect)). ⇒ **Do not reward training with currency.** The reward is real growth, reflected truthfully.
- **Cosmetics-only is the trust-building monetization:** players spend on **self-expression and identity**, not power; paying and non-paying compete equally, which builds goodwill; transparency (clear what you buy) is the first principle ([Daydreamsoft](https://www.daydreamsoft.com/blog/ethical-monetization-system-design-earning-revenue-without-losing-player-trust); [Wayline on predatory monetization](https://www.wayline.io/blog/predatory-monetization-mobile-gaming)). ⇒ **Crystals buy looks, never advantage.** (Caveat from the research: cosmetics-only is harder to *sustain* — so identity IAP breadth, e.g. forms/spaces/lineages, carries revenue; none of it is progression.)
- **Commitment devices work — when the stake is your word, not a jackpot.** StickK/Beeminder show stakes raise follow-through, but the durable version aligns with identity ("I am someone who shows up") rather than a payout to win. ⇒ commitments are **forfeit-only / intrinsic**, never a reward you can mint.

## 2. The dissolving of the C2 exploit
The audit's C2 (client declares `won`/`success` → infinite crystals, free Transcendent form) **doesn't need a guard — it needs the incentive removed.** Once nothing exploitable is on offer:
- **There is no currency to double** (commitments stake nothing and pay nothing).
- **The Transcendent form is earned**, derived from real logged work, not a claimed boolean.
- Lying to the app only **fools yourself** — your body and mind don't actually change. *The only cheat code is showing up.*

## 3. What changed (implemented this increment)
| Mechanic | Before | After |
|---|---|---|
| **Void Crystals** | staked & doubled in wagers | **cosmetics/identity only** — never staked, won, or tied to progression |
| **Wagered-Ki** | stake N crystals → win 2N | a **stake-free Focus**: a self-chosen criterion, **server-derived** outcome, **no payout** — the reward is the kept word (a `WagerSettled` event for the saga/coach to honour) |
| **Heavenly Restriction** | client `success` → grants the Transcendent form | success is **derived from real logged data** (same dynamic criterion as the Focus); the form is **earned**, never claimed. Optional real-money is a *separate, optional* forfeit-to-accountability — never in-app currency, never a reward |
| **Cleanse (corruption)** | instant clear (was effectively free) | **earned** — only after the Penance Protocol (7 full sessions); never purchased |

All four use the **server-side `evaluateWager` over real `StrikeEvent`/`VoidSession`** (from `lib/wager.ts`) and emit `WagerSettled`. No client-declared outcomes anywhere.

## 4. Invariants & ethos
- Currency is **consumable, server-authoritative, cosmetic** (Invariant #6/monetization) — now *strictly* so.
- Progression (`hammerCount`, realm, the mind axis) remains **earned, never bought** (#2). With currency fully decoupled, that promise is airtight.
- **Healthy, not punitive:** failing a Focus costs nothing (no currency, no streak break) — it simply isn't a win. The Restriction Scar remains an honest mark, cleansed by real penance, never by payment.

## 5. Follow-ups (planned)
- **Verify the Transcendent form via the evidence tiers (P4)** so "earned" is also "proven," not just self-reported over the window.
- A `WagerSettled` consumer: a saga **"kept your word"** beat / a coach reflection (intrinsic acknowledgement — autonomy/competence, not a payout).
- Rename the `/wager-ki/*` routes to `/focus/*` on the next client pass (kept for now to avoid breaking the app).

### Sources
- Overjustification effect — The Decision Lab: https://thedecisionlab.com/biases/overjustification-effect
- Overjustification effect — Wikipedia: https://en.wikipedia.org/wiki/Overjustification_effect
- Ethical monetization (cosmetics-only, transparency) — Daydreamsoft: https://www.daydreamsoft.com/blog/ethical-monetization-system-design-earning-revenue-without-losing-player-trust
- Predatory monetization & player trust — Wayline: https://www.wayline.io/blog/predatory-monetization-mobile-gaming
