# VOIDBORN — Research-Backed Fix & Build Playbook

**Date:** 2026-06-16
**Companion to:** `docs/SECURITY_AUDIT.md` (the weaknesses) and `README.md` / `CLAUDE.md` (the design).
**Purpose:** Pull external best-practice — from live-service game security, move-to-earn economies, fitness anti-cheat, commitment-contract apps, and ethical gamification — and map it directly onto the audit's findings (to **fix**) and VOIDBORN's existing strengths (to **amplify**). Every technique is cited.

The audit's one-line theme was: *the server takes the client's word for money, outcomes, and effort.* Almost everything below is one principle applied five ways: **the client sends inputs; the server owns outcomes.**

---

## Part A — Close the trust boundary (fixes C1, C2, H1, H2, H3, M1, M2)

### 1. Server-authoritative state is the whole game (C1, C2, H3)
The single most repeated lesson in competitive/live-service game engineering: the server owns currency, progression, and any consequential state; **the client sends inputs, never outcomes.** A cheat-modified client must not be able to override server logic, which is why damage, currency, and progression are computed server-side while the client only submits intent ([AccelByte](https://accelbyte.io/blog/server-authoritative-logic-to-prevent-cheating)). In Unity/RN-style apps the classic failure mode is exactly VOIDBORN's: economies and progression are "tightly coupled to client-side state," so attackers manipulate currency and progression flags in memory or over the wire ([Promon](https://promon.io/security-news/mobile-game-security-in-unity-and-unreal-reducing-cheat-roi-at-runtime); [Ostorlab](https://blog.ostorlab.co/mobile-game-security.html)).

**Apply to VOIDBORN:**
- **C2 (escrow self-settlement):** `won`/`success` must be *derived* from server-held facts (the vow's criteria evaluated against `VoidSession`/`StrikeEvent`), never read from the request body. The client may *request* settlement; the server *decides* it.
- **C1 (entitlement/crystal grants):** treat `/premium/reconcile` as "tell me what you bought and I'll verify," not "tell me what to grant."
- This is a *reinforcement* of your own Invariant #6 — the architecture already says currency/entitlements/gacha are server-authoritative; these endpoints are simply the leaks.

### 2. Validate purchases against the store, server-to-server (C1)
RevenueCat's own guidance: **validate the subscription/entitlement on your backend** and confirm the user is a paying customer before unlocking content — send `transactionIdentifier` + `productIdentifier` + `appUserId` to your server, then confirm against RevenueCat's API, and use **webhooks and/or the Verify Receipt API** for real-time, tamper-resistant truth ([RevenueCat: validate on backend](https://community.revenuecat.com/general-questions-7/how-do-i-validate-purchases-on-the-backend-2512); [RevenueCat Webhooks docs](https://www.revenuecat.com/docs/integrations/webhooks)). Critically, **verify the webhook's `Authorization` header on every notification** ([RevenueCat webhook best practices](https://community.revenuecat.com/general-questions-7/best-practices-on-handling-webhooks-5054)).

**Apply to VOIDBORN (C1):** `/premium/reconcile` should accept only a verified RevenueCat customer-info payload (or fire only from a signature-/header-verified webhook), then grant *exactly* what the verified entitlements say. Crystal amounts come from the verified product, not the request. This closes the "grant me anything" hole without re-architecting `grantEntitlement`.

### 3. Idempotency keys, the Stripe way (M1, M2)
Stripe's pattern is the industry reference for safe retries: the **client generates a UUIDv4 idempotency key** per mutating request; the server stores the first result keyed by it and **replays the stored response** for any repeat — and a **unique DB constraint is the safety net** even if the cache misses ([Stripe: Idempotent requests](https://docs.stripe.com/api/idempotent_requests); [Stripe blog](https://stripe.com/blog/idempotency); [brandur.org](https://brandur.org/idempotency-keys)). Only POSTs need it; GET/DELETE are idempotent by definition.

**Apply to VOIDBORN:**
- **M2:** make `clientId` **required** on `POST /sessions` and `/practitioner/me/strike` (you already enforce it on the offline queue and have the `@@unique([practitionerId, clientId])` net — just extend it to the online path).
- **M1:** give `seal` and `anchor` in `/sync/flush` the same `(practitioner, clientId)` dedupe the `session`/`leak` mutations already have. Your event-sourced design makes this a small change, not a rewrite.

### 4. Throttle everything that authenticates or mints (H1)
OWASP's Credential-Stuffing / Authentication cheat sheets: **login throttling** (cap attempts, add delay after failures), **IP-based mitigation** tuned by reputation/geolocation, and **MFA** as the single highest-impact control (Microsoft: MFA stops ~99.9% of account-compromise attacks); where MFA isn't viable, **layer** the lesser defenses ([OWASP Credential Stuffing](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html); [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)).

**Apply to VOIDBORN (H1):** add `express-rate-limit` + `helmet`; strict per-IP+account limits on `/auth/*`; per-user budgets on `/sessions`, `/strike`, and `/companions/summon`. You already have the `tooMany`/429 helper — it's just not wired to auth.

### 5. The move-to-earn cautionary tale: cheating *is* an economy attack (H2, H3)
STEPN is the closest analogue to VOIDBORN's "effort → reward" loop, and its hardest lesson is blunt: **rampant cheating collapses the economy.** Cheaters who fake motion/GPS earn fast and cash out, inflating then deflating the currency for everyone ([Tokenist](https://tokenist.com/stepn-will-use-ai-to-detect-cheaters-on-move-to-earn-platform/); [Coinfomania](https://coinfomania.com/stepn-anti-cheating-system/)). Their answer, **SMAC**, is a machine-learning system over GPS + motion-sensor + movement-consistency data that flags unrealistic speeds, spoofing, and irregular patterns ([STEPN: SMAC](https://stepnofficial.medium.com/smac-stepn-model-for-anti-cheating-a36bc1d6ecb0)). And step-counters are trivially gamed by hand-shaking/automation if you only trust the raw signal ([TestDevLab](https://www.testdevlab.com/blog/testing-fitness-apps-can-you-cheat-the-algorithm)).

**Apply to VOIDBORN (H2, H3):**
- **H3:** add realistic per-session and per-day rep ceilings by modality and reject far-past/future `occurredOn`. You can't perfectly verify self-report, but you can make 73,000-in-one-POST impossible.
- **H2:** treat the free Lesser-summon faucet as an inflation vector — daily caps/cooldowns, currency **sinks**, and monitoring are the standard economy controls ([fyclabs on virtual economies](https://fyclabs.com/landing-pages/in-game-currency-virtual-economies/)).

### 6. Anomaly-detection over the event log — your strength, weaponized (H3)
Strava faced the same "self-reported activity" problem and solved it **server-side**: a model trained on millions of historical activities learns what "normal" looks like, **auto-flags suspicious efforts**, and **withholds them from leaderboards until verified** — a cleanup removed 2.3M e-bike and 1.6M vehicle activities ([Bikerumor](https://bikerumor.com/strava-uses-new-maching-learning-models-to-catch-cheaters/); [road.cc](https://road.cc/content/news/strava-automatically-flag-suspicious-activities-301759); [TechCrunch](https://techcrunch.com/2024/05/16/strava-taps-ai-to-weed-out-leaderboard-cheats-unveils-family-plan-dark-mode-and-more)).

**Apply to VOIDBORN (H3, and a strength):** your **append-only `StrikeEvent` log is exactly the substrate Strava needs and most apps lack.** A lightweight server job can score each strike against the user's own history (and population norms) and flag outliers for a soft "unverified" state rather than letting them silently mint realm progress. This is the highest-leverage *upgrade* available because it builds on Invariant #2 you already shipped.

---

## Part B — The real-money escrow deserves its own bar (C2, Heavenly Restriction)

Commitment-contract apps are the precedent for VOIDBORN's Soul Escrow, and they split exactly on the audited weakness — **who decides whether you succeeded.**

- **StickK** charges your card and sends the money to a chosen recipient on failure, and leans on a **referee** (a real person) to confirm the outcome — i.e. verification is *external to the user* ([Accountablo roundup](https://www.accountablo.com/blog/apps-that-charge-you-money); [Beeminder vs StickK](https://help.beeminder.com/article/49-why-should-i-use-beeminder-over-stickk)).
- **Beeminder** is more automated: you either self-report a number **or connect a device/app to auto-report**, it draws a "Bright Red Line," and you pay an **escalating** pledge when you derail ([Beeminder overview](https://www.beeminder.com/overview); [Beeminder FAQ](https://www.beeminder.com/faq)). The escalation (stakes rise after each failure) is the engagement engine; the **auto-data integration is the integrity engine.**

**Apply to VOIDBORN (C2):**
1. **Never settle from a client boolean.** Success = server-evaluated criteria over `VoidSession`/`StrikeEvent`/trial cadence (Beeminder's "connect a source of truth" model), optionally plus a **referee/witness** for higher stakes (StickK's model — your "Vow Witness" companion is already this idea).
2. **Escalating, capped stakes** map cleanly onto your Wagered-Ki and Heavenly-Restriction tiers.
3. **Regulatory caution:** real-money "wager on yourself" mechanics are gambling-adjacent and platform-policy-sensitive. Keep the *forfeit* framing (StickK/Beeminder style — you lose a stake, you don't win others' money), document it, and keep it server-settled and auditable.

---

## Part C — Build on the strengths (amplify what's already right)

### 1. Event sourcing is a moat, not just a safeguard
You already have what Strava/STEPN had to retrofit: an **append-only, reconcilable source of truth.** Beyond tamper-evidence (Invariant #2), it's the foundation for anomaly detection (Part A.6), for honest commitment-contract evaluation (Part B), and for the Voice-of-the-Void coach "never inventing data." **Lean into it:** every new consequential mechanic should derive from the log, never from a stored boolean.

### 2. Use Health data as corroboration, not just cosmetics
Apple **prohibits writing inaccurate/spoofed data into HealthKit**, gates all access behind explicit user permission, and stores it in a protected data class ([Apple: protecting health data](https://support.apple.com/guide/security/protecting-access-to-users-health-data-sec88be9900f/web); [App Store health requirements](https://blog.dashsdk.com/app-store-requirements-for-health-apps/)). Your **Reactive Auras already read Apple Health / Health Connect** — extend that pipe to *corroborate* strikes (e.g., a workout/active-energy signal that supports a logged session), raising the cost of pure fabrication.
> Caveat: HealthKit can still be written by *other* apps, so treat Health as **strong corroboration, not cryptographic proof** — combine with the rep ceilings and anomaly scoring above.

### 3. Your ethical-gamification instincts match the best-in-class — go further
The retention research validates VOIDBORN's design choices and warns where they can curdle:
- **Loss aversion is the master lever.** Duolingo built every system around it and lifted next-day retention from **12% → 55%** ([StriveCloud](https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo); [Yu-kai Chou on streak design](https://yukaichou.com/gamification-study/master-the-art-of-streak-design-for-short-term-engagement-and-long-term-success/)). Your **Corruption/streak/Dormant** systems are this lever — keep them, but keep them *humane*.
- **Measure the real thing, not sessions.** The ethical line is whether you measure progress or just engagement; Duolingo optimizes "Time Spent Learning Well" and still lands on [deceptive.design](https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame) for pushy reminders/energy pressure. VOIDBORN's equivalent is to keep tying reward to **logged training**, not app-opens — your **verified-only ranking** (a feat must be proven to place, so the board can't reward grinding or spoofing), "supportive never punitive" coach, and **Dormant (not punitive) neglect state** keep it on the right side. (See `docs/PRACTITIONER_SHOWCASE_DESIGN.md` for the healthy-leaderboard design.)
- **The metaphor must fit the goal.** Finch's nurturing-pet metaphor outperforms Habitica's RPG metaphor precisely because *caring for the pet == caring for yourself* ([Deconstructor of Fun on Finch](https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl)). VOIDBORN's "you **are** the entity you raise" is the same tight metaphor-goal fit — protect it; don't let cosmetics dilute the "this is me ascending" read.
- **Plan for the 12-week cliff.** Gamified habit trackers improve 4–8 week consistency, but only ~22% sustain past 12 weeks **without coaching or peer support** ([same Finch analysis]). Your **Voice of the Void coach** and roadmap **Sects** are exactly the supports that close that gap — prioritize them as retention infrastructure, not flavor. (Finch's D1/D7 of ~54%/37% is the bar.)

---

## At-a-glance: technique → where it lands

| Audit item | External pattern | Source |
|---|---|---|
| C1 grants from client | Server-to-server purchase validation + verified webhooks | RevenueCat |
| C2 self-settled escrow | Server-derived outcomes; referee/auto-data verification; escalating-but-capped stakes | StickK, Beeminder |
| H1 no throttling | Login throttling, IP mitigation, MFA, layered defenses | OWASP |
| H2 free-summon faucet | Currency sinks, caps, economy monitoring | move-to-earn economy practice |
| H3 spoofable effort | Rep/day ceilings + ML anomaly flagging over the activity log; Health corroboration | STEPN/SMAC, Strava, Apple Health |
| M1/M2 idempotency | UUIDv4 idempotency keys + unique-constraint safety net | Stripe |
| **Strength: event sourcing** | The substrate for anomaly detection & honest escrow | Strava (retrofit), VOIDBORN (already has it) |
| **Strength: ethical loop** | Loss aversion + measure-the-real-thing + tight metaphor + coaching for the 12-wk cliff | Duolingo, Finch |

---

## Suggested sequence
1. **Server-derive all money/outcomes** (C1, C2) — the non-negotiable before any real payment flows.
2. **Throttle + idempotency keys** (H1, M1, M2) — small, high-leverage, blunts everything else.
3. **Rep ceilings + `StrikeEvent` anomaly scoring** (H3) — turns your best strength into anti-cheat.
4. **Economy caps/sinks** (H2).
5. **Amplify:** Health-corroborated strikes, then coach/Sects as the 12-week retention layer.

---

### Sources
- AccelByte — Server-Authoritative Game Logic: https://accelbyte.io/blog/server-authoritative-logic-to-prevent-cheating
- Promon — Mobile game security (Unity/Unreal): https://promon.io/security-news/mobile-game-security-in-unity-and-unreal-reducing-cheat-roi-at-runtime
- Ostorlab — Mobile Game Security Testing: https://blog.ostorlab.co/mobile-game-security.html
- FYC Labs — In-Game Currency / Virtual Economies: https://fyclabs.com/landing-pages/in-game-currency-virtual-economies/
- RevenueCat — Validate purchases on the backend: https://community.revenuecat.com/general-questions-7/how-do-i-validate-purchases-on-the-backend-2512
- RevenueCat — Webhooks docs: https://www.revenuecat.com/docs/integrations/webhooks
- RevenueCat — Webhook best practices: https://community.revenuecat.com/general-questions-7/best-practices-on-handling-webhooks-5054
- Stripe — Idempotent requests (API): https://docs.stripe.com/api/idempotent_requests
- Stripe — Designing APIs with idempotency (blog): https://stripe.com/blog/idempotency
- brandur.org — Implementing Stripe-like idempotency keys: https://brandur.org/idempotency-keys
- OWASP — Credential Stuffing Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html
- OWASP — Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- STEPN — SMAC (anti-cheat model): https://stepnofficial.medium.com/smac-stepn-model-for-anti-cheating-a36bc1d6ecb0
- Tokenist — STEPN AI cheat detection: https://tokenist.com/stepn-will-use-ai-to-detect-cheaters-on-move-to-earn-platform/
- Coinfomania — STEPN anti-cheating system: https://coinfomania.com/stepn-anti-cheating-system/
- TestDevLab — Beating step-counter algorithms: https://www.testdevlab.com/blog/testing-fitness-apps-can-you-cheat-the-algorithm
- Bikerumor — Strava ML e-bike detection: https://bikerumor.com/strava-uses-new-maching-learning-models-to-catch-cheaters/
- road.cc — Strava auto-flagging suspicious activities: https://road.cc/content/news/strava-automatically-flag-suspicious-activities-301759
- TechCrunch — Strava AI leaderboard cleanup: https://techcrunch.com/2024/05/16/strava-taps-ai-to-weed-out-leaderboard-cheats-unveils-family-plan-dark-mode-and-more
- Beeminder — Overview: https://www.beeminder.com/overview
- Beeminder — FAQ: https://www.beeminder.com/faq
- Beeminder — vs StickK: https://help.beeminder.com/article/49-why-should-i-use-beeminder-over-stickk
- Accountablo — Apps that charge you when you fail: https://www.accountablo.com/blog/apps-that-charge-you-money
- Apple — Protecting access to health data: https://support.apple.com/guide/security/protecting-access-to-users-health-data-sec88be9900f/web
- Dash — App Store requirements for health apps: https://blog.dashsdk.com/app-store-requirements-for-health-apps/
- StriveCloud — Duolingo gamification (12%→55%): https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo
- Yu-kai Chou — Streak design: https://yukaichou.com/gamification-study/master-the-art-of-streak-design-for-short-term-engagement-and-long-term-success/
- UX Magazine — Hot-streak design without shame: https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame
- Deconstructor of Fun — Finch retention/widgets: https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl
- Naavik — New horizons in habit-building gamification: https://naavik.co/deep-dives/deep-dives-new-horizons-in-gamification/
