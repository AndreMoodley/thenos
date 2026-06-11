# THE CONCEPT GRAPH — the nature of THENOS

> What this document is: the system's anatomy. Not *what* the features are (`README.md`) or *why*
> they're designed this way (`GAME_DESIGN.md`), but **how every concept connects to every other**,
> where each connection lives in code, what happens — end to end — when the user acts, and the
> single direction the whole graph is moving. Read this to understand the app as one organism.

---

## 1. The five laws (the threads every concept hangs on)

The app coheres because every system — training, plans, story, achievements, entity, economy —
obeys the same five laws. They are *the* connective tissue; everything in §2 is an instance.

| # | Law | What it means | Where it's enforced |
|---|---|---|---|
| **L1** | **One ledger, many mirrors** | `StrikeEvent` (append-only) + the clock are the only truth. Realm, stage, adherence, phase, mood, feats, demon scale, panel art — all *derivations*, never columns. Derive, don't store. | `lib/realms.ts`, `lib/protocol.ts`, `lib/adherence.ts`, `lib/reconcile.ts`, invariants #1/#12/#16 |
| **L2** | **Real events only** | Every celebratory artifact carries an audit pointer to the rows that caused it: quests → `fulfilledBySessionId`, chapters → `unlockedBy`, feats → `earnedBy`. Story can never precede fact. | `lib/sessionLog.ts`, `lib/sagaEngine.ts`, invariants #2/#13/#16 |
| **L3** | **Consent gates change** | Nothing restructures the user's world uninvited: Realignments propose, accept mutates; regeneration touches only future-unfulfilled; reforging archives, never deletes. | `routes/trials.ts`, `routes/saga.ts`, invariant #14 |
| **L4** | **Money buys expression, never progression** | The purchased graph (forms, cosmetics, domains, crystals) and the earned graph (hammer, realms, trials, saga, feats, marks) share exactly one node — the resolver (appearance) — and zero progression edges. | schema (no priceModel on earned models), invariants #8/#15/#16 |
| **L5** | **Degrade fidelity, never function** | Offline → queue + full cached snapshot. Keyless → authored fallbacks. No art → P0 procedural beauty. Reduce-motion → calm variants. Every floor is *real*, not an apology. | `api/queue.ts`, `/sync/state`, `lib/sagaTemplates.ts`, GAME_DESIGN §11 P0, invariant #7 |

---

## 2. The graph

```
                                   PURCHASED GRAPH                      EARNED GRAPH
                                   (expression)                         (progression — free forever)
                              ┌──────────────────────┐
   IAP / Crystals ───────────►│ Forms · Cosmetics ·  │
                              │ Domains · Lineages · │            ┌─────────────────────────────┐
   Companions (only RNG) ────►│ Decor · Auras        │            │   THE LEDGER  (StrikeEvent) │◄─── L1: root truth
                              └─────────┬────────────┘            └──────────────┬──────────────┘
                                        │ resolver only                          │ Σ amount
                                        ▼                                        ▼
   ┌────────────────────────────────────────────────┐               hammerCount ──► REALM/STAGE
   │     THE ENTITY  (resolveManifestation)         │◄──────────────  (derived; never stored)
   │  form → stage → lineage → cosmetics → auras →  │                            │
   │  artifacts → [story-marks V3] → corruption     │             realmsCrossed ─┴─► ascension cinematic
   └───────┬──────────────────────────────▲─────────┘                                + saga `realm_crossed`
           │ mood/reactions (V3)          │ marks = earned only (L4)
           ▼                              │
   ┌──────────────┐   antagonist   ┌──────┴────────┐   completing IS logging   ┌──────────────────┐
   │  THE DEMON   │◄───────────────│  SOUL PROFILE │                           │   VOID SESSION    │
   │ (body, V3)   │  obstacle =    │ (Mirror Rite: │     ┌────────────────────►│  (the only write  │
   │ looms/recoils│  LeakCategory  │ WOOP + Ward)  │     │   fulfilledBy LINK  │   path for effort)│
   └──────▲───────┘                └──────┬────────┘     │   (never strikes)   └────────┬─────────┘
          │ leaks logged / wards held     │ forge        │                              │ logSession
          │ (ledger truth only)           ▼              │                              ▼
   ┌──────┴───────┐  ki drain   ┌─────────────────┐   ┌──┴───────────────┐   ┌─────────────────────┐
   │   KI LEAKS   │────────────►│      SAGA       │   │      TRIAL       │   │  EVENTS (the fan)   │
   │ (6 natures)  │             │ 10 beats, 4 inks│   │ Gathering→Tribu→ │   │ planned/gate_fulfil │
   └──────────────┘             │ chapters unlock │◄──│ Quieting; Pillar;│   │ phase_entered ·     │
                                │ ONLY from events│   │ dials; Realign-  │   │ realm_crossed ·     │
        Vow ◄── auto-linked ────│ (unlockedBy, L2)│   │ ments (L3)       │   │ streak · cleansed · │
        │  major, subtype trial └────────┬────────┘   └──────────────────┘   │ returned_after_gap ·│
        │ kept→Trophy · broken→Corruption│ P0 seed                           │ vow_kept · forged · │
        ▼                                ▼                                   │ [feat_earned V2]    │
   ┌──────────────┐               ┌─────────────┐      computed from         └──────────┬──────────┘
   │ THE CHRONICLE│◄──────────────│ PANEL ART   │      ledger + audits (L2)             │
   │ chapters ·   │               │ (V1: seeded │   ┌──────────────────┐                │
   │ turning pts ·│◄──────────────│ from audits)│   │  FEATS & TITLES  │◄───────────────┘
   │ Hall of Feats│               └─────────────┘   │ (V2: 8 families) │     advanceSaga + awards
   │ · monuments  │◄────────────────────────────────└──────────────────┘     ride the SAME tx
   └──────────────┘                                                          as the session (L2)
          ▲                  THE VOICE/NANO reads everything, owns nothing,
          └────────────────  never invents (cache+fallback) — the narrator edge to ALL nodes
```

**Three shapes to notice:**

1. **The hourglass.** Every form of effort — manual log, quest Begin, offline replay, (later)
   perception drafts — funnels through ONE function, `logSession` (`server/src/lib/sessionLog.ts`),
   and fans out into *every* celebration system (strike → realm → cinematic; link → quest → trial;
   events → saga → panels; [V2] feats; [V3] entity reactions). That single transactional waist is
   why the app cannot contradict itself: there is no second door.
2. **The two graphs, one membrane.** Purchased and earned meet only at `resolveManifestation()` —
   the entity's *appearance*. Remove every purchase and the earned graph is untouched; remove the
   earned graph and there is nothing left to dress. That asymmetry is the business model AND the
   ethics, expressed as topology.
3. **The audit chain.** Session → `fulfilledBySessionId` → quest; event → `unlockedBy` → chapter;
   rows → `earnedBy` → feat; audits → P0 seeds → art. Truth flows outward through pointers, so any
   artifact can be traced back to the sweat that minted it — and *recomputed* from it (L1's test:
   wipe the mirror, re-derive it, get the identical mirror).

---

## 3. The cascade — one tap, end to end

What actually happens when the user taps **Begin** on Today's Quest and strikes. Every arrow is a
file you can open. This trace IS the implementation-areas map in motion:

| Step | What happens | Where |
|---|---|---|
| 1 | Quest card prefills the sheet (`plannedSessionId`, modality, targetReps) | `voidborn/src/components/QuestCard.tsx` → `QuickLogSheet.tsx` |
| 2 | **Optimistic instant**: hammer/streak/realm recomputed locally, quest marked, ascension staged | `voidborn/src/store/metrics.ts logStrike` (+ `store/trial.ts noteFulfilled`) |
| 3 | Mutation enqueued with `clientId` (idempotency key), flush attempted | `voidborn/src/api/queue.ts` → `POST /sync/flush` |
| 4 | **The waist**: one transaction — idempotency check → session row → strike | `server/src/lib/sessionLog.ts` → `lib/metrics.ts applyStrike` |
| 5 | Streak math, penance progress, possible cleanse | `applyStrike` + penance block in `sessionLog.ts` |
| 6 | Quest fulfillment — **a link, never a strike** (stillness ⇔ reps:0 enforced here) | `fulfillPlanned()` in `sessionLog.ts` |
| 7 | The event fan: gap-return, fulfilled, gate, phase-entered, streak, realm-crossed, cleansed | `sessionLog.ts` events array (uses `lib/protocol.ts` phase math) |
| 8 | Chapters unlock in beat order, `unlockedBy` + fallback prose written in-tx | `lib/sagaEngine.ts advanceSaga` → `lib/sagaBeats.ts` → `lib/sagaTemplates.ts` |
| 9 | *(V2)* Feats evaluated over the ledger, `earnedBy` written, `feat_earned` joins the fan | `lib/feats.ts` (planned), same hook |
| 10 | Results return through flush: `fulfilledPlanned`, `unlockedChapters`, authoritative practitioner | `routes/sync.ts` → `store/metrics.ts syncNow` |
| 11 | Stores reconcile (last-write-wins by `updatedAt`; ledger always wins) | `metrics.reconcile`, `trial/saga` stores persist (`lib/persist.ts`) |
| 12 | The body answers: juice fires, *(V3)* `react_quest`, watchers play set-pieces | `lib/juice.ts`, `hooks/useAscensionWatcher.ts`, `hooks/useChapterWatcher.ts` |
| 13 | The Chronicle re-renders: new chapter panel *(V1: art seeded from the `unlockedBy` hash)* | `app/trophy-hall.tsx` (+ planned `src/lib/panels/`) |
| 14 | Later: Claude refines prose lazily, cached by promptHash — flavor only | `routes/saga.ts refineOneChapter` (the `lib/voice.ts` pattern) |

Offline? Steps 1–2 and 11–13 run identically from the persisted stores; 3 holds the mutation; the
next reconnect replays it and the server returns `idempotent: true` — no double-count, no drift.
That is L5 as a lived path, not a footnote.

---

## 4. Concept → implementation map (the static view)

| Concept | Truth (schema) | Pure logic | Transactional | API | Client state | Surface |
|---|---|---|---|---|---|---|
| Effort / ledger | `VoidSession`, `StrikeEvent` | `lib/metrics.ts` | `lib/sessionLog.ts` | `/sessions`, `/practitioner/me/strike`, `/sync/flush` | `store/metrics.ts` | QuickLogSheet, QuestCard |
| Realms / stage | — (derived) | `lib/realms.ts` ⇄ `constants/realms.ts` | — | serialized everywhere | derived in store | TopStatus, Domain, shrines |
| Trials / quests | `Trial`, `PlannedSession` | `lib/protocol.ts` | `lib/trialOps.ts` | `/trials/*` | `store/trial.ts` (persisted) | Quest Log (`app/calendar.tsx`) |
| Adaptation | `TrialRealignment` | `lib/adherence.ts` | accept handler | `/trials/:id/realignments/*` | `store/trial.ts` | Meridian Reading banner |
| Identity intake | `SoulProfile` | — | upsert | `/saga/profile` (+ flush kind) | `store/saga.ts` | Mirror Rite (`SagaOnboardingSheet`) |
| Story | `Saga`, `SagaChapter` | `lib/sagaBeats.ts`, `lib/sagaTemplates.ts`, `lib/sagaForge.ts` | `lib/sagaEngine.ts` | `/saga/*` | `store/saga.ts` (persisted) | The Chronicle (`app/trophy-hall.tsx`) |
| Vows / stakes | `Vow`, `Progression`, `WagerEvent` | — | `routes/vows.ts` tx | `/vows/*`, `/premium/wager-*` | `store/metrics.ts` | Quest Log vows section |
| Feats / titles *(V2)* | `PractitionerFeat`, `activeTitleKey` | `lib/feats.ts` + `constants/feats.ts` | award in the waist | `/feats` | extend `store/saga.ts` or own | Hall of Feats |
| Entity | `activeFormKey`, presets, `PractitionerEntity` | `resolveManifestation()`, `stageResolver` | — | `/entity/*`, `/cosmetics/*` | `store/characterConfig.ts` | every space; Chamber |
| Demon *(V3)* | — (derived from leaks/wards/feats) | planned pure derivation | — | serialized | derived | Domain (the body) |
| Voice / Nano | `CoachReflection` (cache) | `lib/voice.ts` | — | `/coach/reflect` | screen-local | Domain voice card |
| Economy | catalogs + ownership + `Entitlement` | `lib/gacha.ts` (only RNG) | `routes/premium.ts` | `/companions`, `/premium/*` | `store/premium.ts` | Chamber, summons |
| Celebration | — | `lib/juice.ts`, cinematic catalog | — | `/cinematics` | `hooks/useCinematic.ts` | CinematicOverlay |

Tests live beside the logic column: `server/src/__tests__/{realms,gacha,protocol,adherence,sagaBeats,sagaForge}.test.ts`
and the root harness for client purity (`resolveManifestation`, `stageResolver`, realms mirror) —
**the pure column is the tested column**, which is the point of keeping it pure.

---

## 5. The seams — where the next systems plug in (no rewiring required)

The graph was built with five extension sockets. Everything specced in V1–V3 and `NANO_VISION.md`
lands in one of them:

1. **The event fan** (`sessionLog.ts` events array + `TriggerSpec` JSON): new real-event kinds
   (`feat_earned`, `ward_held`, `leak_resisted`, perception drafts) are *additions to a list*, not
   new architecture. The saga, feats, and entity reactions all subscribe to the same fan.
2. **The audit-pointer pattern** (`unlockedBy`/`earnedBy`/`fulfilledBy`): any future artifact —
   marks, recap episodes, oracle reports — mints the same way: real rows in, pointer out, P0 art
   seeded from the pointer.
3. **The resolver stack** (`resolveManifestation` precedence): story-marks (V3) are a declared layer
   between lineage and cosmetics; the demon body is a sibling renderer on the same inputs bridge.
4. **The AI seam pattern** (`voice.ts`: promptHash cache → strict validation → deterministic
   fallback): the Forge already inherits it; the Nano's conversation layer and P2 covers inherit it
   next. AI is always *behind* this membrane — flavor in, never structure out (L2).
5. **The offline contract** (`/sync/state` ships complete payloads + persisted stores + idempotent
   mutations): any new system MUST ship its snapshot here or it doesn't exist offline — the
   checklist item that keeps L5 true forever.

---

## 6. Seeing the vision — what each era adds to the graph

| Era | What it added / adds | New edge class | The law it leans on |
|---|---|---|---|
| **v1 (built)** | The mirror: effort → ledger → realm → entity; vows; economy; Voice | derivation edges | L1, L4 |
| **T (built)** | The path & the myth: trials structure effort; saga gives it meaning | consent edges (L3) + narrative/audit edges (L2) | L2, L3 |
| **V (specced)** | The face: panels render audits; feats mint identity; the entity (and demon) embody state | aesthetic-derivation edges (art *from* audits) + earned-identity edges | L1, L2, L4 |
| **N (vision)** | The symbiote: the world writes drafts (perception), the system speaks into life (HUD/wards), any goal enters the graph (Arts) | sensory edges (world → ledger, confirm-gated) + ambient edges (system → life, consent-armed) | L2 (N1), L3 (N2), L5 (N3) |

The constant across eras: **no new edge family ever bypasses the waist or breaks a law.** The graph
grows by adding mirrors and senses around the same small, auditable heart. That is the nature of
this app: *a ledger of real effort, wearing progressively richer bodies.*

---

## 7. Tensions in the graph (named, so they stay managed)

- **The waist is sacred and therefore hot.** `logSession` accretes responsibilities (strike, penance,
  links, fan, feats). Discipline: the tx stays thin — every rule lives in a pure lib it *calls*;
  the function orchestrates, never decides.
- **Derivation everywhere has a CPU bill.** Acceptable because the pure functions are trivial and
  the serialize layer is the single cache point; never solve this by storing a derived column (L1).
- **Celebration inflation.** Chapters, feats, marks, cinematics can cheapen each other. Pacing rules
  already in the design: one chapter per event, Hidden feats rare, marks small. The Chronicle is a
  museum, not a slot machine.
- **Beauty vs. instrument.** Ink & Ember is for *story* surfaces; the Quest Log stays an instrument
  panel (system-glass, tabular numerals). The day the readout becomes a painting, L1's spirit dies.
- **The UTC seam.** Week boundaries are server-UTC by convention (documented in README pitfalls);
  `canMove` is the human escape hatch. Revisit only with real user pain, not speculation.
- **AI cost & trust.** Fenced by seam #4; the fallback is always the contract, the model is always
  the upgrade.
