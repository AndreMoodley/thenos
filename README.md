```
██╗   ██╗ ██████╗ ██╗██████╗ ██████╗  ██████╗ ██████╗ ███╗   ██╗
██║   ██║██╔═══██╗██║██╔══██╗██╔══██╗██╔═══██╗██╔══██╗████╗  ██║
██║   ██║██║   ██║██║██║  ██║██████╔╝██║   ██║██████╔╝██╔██╗ ██║
╚██╗ ██╔╝██║   ██║██║██║  ██║██╔══██╗██║   ██║██╔══██╗██║╚██╗██║
 ╚████╔╝ ╚██████╔╝██║██████╔╝██████╔╝╚██████╔╝██║  ██║██║ ╚████║
  ╚═══╝   ╚═════╝ ╚═╝╚═════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝
        A   V O I D   P R O T O C O L   G A M E
```

> **Working title — `VOIDBORN`.** A greenfield game. Rename freely; the world is the Void Protocol.

> *"You are not opening an app. You are returning to a being — in a place that is yours alone, that grows because you do."*

**VOIDBORN** is a single-player ascension game that fuses three things into one experience:

- the **creature you grow and customize** of *Pokémon GO* (an evolving, moldable companion + collection + cosmetics),
- the **effortless home-hub interface** of *Clash Royale* (one focal subject, a persistent thumb-bar, near-zero menu depth, snappy juice), and
- a **unique Third Space** — an inhabited, evolving domain that is simultaneously your home screen *and* your world.

Your real-world training is the only fuel. Every strike, sealed ki point, and kept vow becomes the visible evolution of a **living Void Entity** that you are reborn as, mold into the form of your choosing, and raise from **embryo to divine** inside a space you inhabit. Beauty is purchasable. Ascension is earned.

![Platform](https://img.shields.io/badge/Platform-React%20Native%20%2F%20Expo%20(New%20Arch)-blue)
![Entity](https://img.shields.io/badge/Entity-Rive-ec4899)
![Spaces](https://img.shields.io/badge/Spaces-React%20Three%20Fiber-000000)
![Shell](https://img.shields.io/badge/Navigation-Expo%20Router-111827)
![Backend](https://img.shields.io/badge/Backend-Node%20%2F%20Express%20%2F%20Prisma-green)
![AI](https://img.shields.io/badge/AI-Anthropic%20Claude-purple)

---

## Table of Contents

1. [The Fusion — What Makes This One Game](#the-fusion--what-makes-this-one-game)
2. [The Core Loop](#the-core-loop)
3. [The Living Entity](#the-living-entity)
4. [The Seven Realms — Progression Engine](#the-seven-realms--progression-engine)
5. [Third Spaces — The Hub & The World](#third-spaces--the-hub--the-world)
6. [The Manifestation Chamber — Form & Customization](#the-manifestation-chamber--form--customization)
7. [Companions, Lineages & Premium Systems](#companions-lineages--premium-systems)
8. [The Soul Escrow System](#the-soul-escrow-system)
9. [The Voice of the Void — AI Coach](#the-voice-of-the-void--ai-coach)
10. [Trials — the Forged Path](#trials--the-forged-path)
11. [Saga — the Chronicle](#saga--the-chronicle)
12. [The Codex of Arts & the Inner Art](#the-codex-of-arts--the-inner-art)
13. [Ascension Standards & the Cohort](#ascension-standards--the-cohort)
14. [Rendering & Feel](#rendering--feel)
15. [System Hardening](#system-hardening)
16. [Greenfield Stack & Project Layout](#greenfield-stack--project-layout)
17. [Getting Started From Zero](#getting-started-from-zero)
18. [Data Model](#data-model)
19. [API Surface](#api-surface)
20. [Monetization](#monetization)
21. [Build Roadmap](#build-roadmap)
22. [Invariants & Pitfalls](#invariants--pitfalls)

---

## The Fusion — What Makes This One Game

Two of the most successful mobile interfaces ever shipped solve two different problems. VOIDBORN takes the best of each and resolves them with a single idea.

| Borrowed from | What it contributes | How VOIDBORN uses it |
|---|---|---|
| **Pokémon GO** | A *creature you grow*: an evolving companion, deep avatar/cosmetic customization, a collection, and an identity surfaced everywhere. | The **Void Entity** — moldable into Void / Beast / Humanoid forms, evolving across seven stages, layered with swappable cosmetics. **Companions** (Familiars) are the collection. |
| **Clash Royale** | A *home that feels effortless*: one central focal subject, a persistent thumb-reachable bar, UI depth that almost never exceeds one level, and tight, juicy feedback. | The **Third Space shell** — your domain is the hub, four destinations one tap away, depth ≤ 1, swipe between spaces, haptic/audio juice on every meaningful action. |
| **The unique synthesis** | — | The **Third Space**. Pokémon GO anchors its creature to a *real-world map*; Clash Royale anchors play to a *camp*. VOIDBORN replaces both with an **inhabited inner domain** — a place that is at once the CR-style home hub and the PoGo-style world your creature lives in, but **personal, evolving, and yours**. |

The thesis in one line: **a being you raise (Pokémon GO) + a home you navigate (Clash Royale) = a space you inhabit and ascend within (the Third Space).** Everything in this document serves that fusion.

*(Optional future axis: Pokémon GO's signature geolocation/AR could later become real-world "training grounds" or AR entity viewing. It is explicitly out of the core — the Third Space is inner, not geographic — but the architecture leaves room for it.)*

---

## The Core Loop

The loop is a narrative, not a dashboard:

1. **Rebirth.** On first launch (and at every realm ascension), the void coalesces and your entity is *born* — a short, reactive cinematic. You are returning to a being, not opening a tool.
2. **Choose your space.** A guided beat introduces the **Third Space** — a place that is neither home nor work, where your truest self takes form. The default space is **The Dojo**.
3. **Choose your form.** In the **Manifestation Chamber**, mold the entity into a form line (Void, Beast, or Humanoid) and refine its look.
4. **Inhabit & act.** Your space becomes the home screen. One tap reaches the **Calendar** (goals on a timeline), the **Trophy Hall** (accumulated will), and the **Chamber**. Logging training, sealing ki, and keeping vows all flow back into the entity in real time.
5. **Evolve.** As lifetime effort (`hammerCount`) crosses realm thresholds, the entity visibly evolves — embryo → divine — and the space matures with it.

---

## The Living Entity

The entity is the heart of the game, rendered with **Rive** (`rive-react-native`): a real-time runtime whose **state machines live inside the asset** and react to live inputs pushed from the app. Your metrics become Rive inputs; the entity animates itself at 60fps.

### Two axes: Form and Stage

**Form — what kind of being it is** (stored as `activeFormKey`, chosen in the Chamber):

| Form line | Tier | Identity |
|---|---|---|
| **Void** | Free (default) | The formless, abstract origin — a permanent, valid choice, not a placeholder. |
| **Beast** | Premium | A creature companion that evolves from hatchling to apex spirit (the most Pokémon-like line). |
| **Humanoid** | Premium | A figure form — the ascended self made manifest. |

**Stage — how far it has ascended.** Not a separate mechanic: it **is** the [Seven Realms](#the-seven-realms--progression-engine), computed from `hammerCount`. Each form provides one Rive artboard per stage:

`Realm 1 Embryo → 2 Awakening → 3 Forming → 4 Tempered → 5 Ascendant → 6 Sovereign → 7 Divine self`

**Evolution is earned through training, never purchased.** Like the realm, the **stage is never stored** — always computed.

### Reacting to live state (metric → Rive input)

| Entity behavior | Driven by |
|---|---|
| Evolution stage / silhouette | `realm` (from `hammerCount`) |
| Aura color | active `auraKey`: `ki` (cyan) · `gold` · `crimson` · `white` |
| Appendage spread, pulse rate | `shadowLevel` (1–5) |
| Eye brightness | `ki` (0–100) |
| Bonus orbit state | `streak ≥ 7` |
| Glow intensity | `originArtMastery` (`hammerCount × 0.001`) |
| Corruption overlay | broken-vow state |
| **Mood / idle set** (v2) | computed from readiness + streak + time-of-day + recent events + Bond — never stored |
| **Reaction triggers** (v2) | `react_quest/gate/chapter/feat/ward` — every meaningful event lands on the body |
| **Demon proximity/scale** (v2) | the embodied Inner Demon (see below) — looms/recoils/shrinks from ledger truth only |
| **Story-marks** (v2) | scar-glyphs per Breakthrough Gate, seals per trial, embers per title — earned-only resolver layer |

Cosmetics define **form and palette**; metrics define **motion**. Customization re-skins the readout — it never disables it.

### The entity, embodied (design spec — `GAME_DESIGN.md §13`)

The entity is the shell's **resident, not a screen's content**: rendered once and composited into every space (full-stage in the Domain; perched at the corner of the Quest Log, turning to look at Today's Quest; curled beside the prose in the Chronicle), with a **mood engine** (computed, never stored), a **reaction vocabulary** (juice = haptic + audio + entity reaction), and **story-marks** — earned visual testimony layered into the resolver between lineage and cosmetics. The **Inner Demon gets a body**: a small shadow-creature in the domain, driven only by ledger reality — it looms in your stated trouble-hours and after logged leaks, recoils when a Ward holds, and visibly shrinks as Demon-family feats accumulate. The procedural `FallbackEntity` implements the identical input contract, so the soul ships before the art does.

---

## The Seven Realms — Progression Engine

A single currency drives everything: **Hammer Count** — cumulative lifetime strikes logged across all training. Realm and evolution stage are **never stored**; both compute from thresholds in `constants/realms.ts`.

| Realm | Name | Hammer Threshold | Sigil |
|---|---|---|---|
| 1 | Foundation Realm | 0 | ◈ |
| 2 | Ki Accumulation | 1,500 | ◈◈ |
| 3 | Ki Establishment | 4,000 | ◈◈◈ |
| 4 | True Ki Awakening | 9,000 | ◈◈◈◈ |
| 5 | Transcendence — The Void | 18,000 | ⟁ |
| 6 | Evolutionary Realm | 36,500 | ⟁⟁ |
| 7 | Divine Master | 73,000 | ⟁⟁⟁ |

**Core metrics:** `hammerCount` (0→∞, the engine) · `ki` (0–100, integrity) · `shadowLevel` (1–5, intensity) · `streak` (consecutive days; ≥7 = bonus orbit) · `originArtMastery` (`hammerCount × 0.001`).

**Six modalities:** `origin` · `pull` · `push` · `core` · `cardio` · `recovery`. Any session with `reps > 0` appends a `StrikeEvent` and increments `hammerCount`. Recovery / Stillness use `reps: 0` and never strike.

**Binding Vows** are deadline-gated commitments (`major` / `minor`) with ordered `Progression` steps. Completing a major vow adds a trophy to the Trophy Hall and triggers a one-time evolution flourish.

**Ki Leaks** (`social` · `food` · `media` · `argument` · `validation` · `doubt`) debit the ki bar. The **Temporal Anchor** is a daily ritual whose consistency preserves the streak.

---

## Third Spaces — The Hub & The World

> *"A Domain is not a background. It is your inner world, extended outward until it swallows reality."*

Your home screen is a **place** you inhabit, with your entity living in it. Navigation is the Clash Royale model, applied without compromise:

1. **One central, uncluttered hub** built around a single subject — your entity in its space.
2. **A persistent bottom bar**, always visible, with exactly four destinations — **Domain · Calendar · Trophy Hall · Manifestation** — each one tap away.
3. **UI depth almost never exceeds one level.** A space opens, you act, you are back. No nested menus.
4. **Everything within thumb reach**, with **horizontal swipe** between top-level spaces as a secondary gesture.

### The spaces
- **The Dojo (default Void Domain).** Dark, minimal, absolute — the free home. The entity is front and center, reacting to live metrics over an ambient soundscape.
- **The Calendar.** Your Binding Vows on a navigable timeline with **live countdowns** to their resolution dates (2.5D first; true-3D later).
- **The Trophy Hall.** Completed vows, ascensions, streak records, and milestones rendered as **trophies and shrines** — a monument to accumulated will. *(Zeigarnik effect: a half-filled hall is productively uncomfortable; a full one is satisfying to inhabit.)*
- **The Manifestation Chamber.** Where you choose your form and shape your look.

### Domain Packs — premium third spaces
The Dojo is free. **Domain Packs** are premium third spaces — complete sensory environments you live inside, the highest-perceived-value cosmetic in the game *because it is where you live*:

| Domain | Aesthetic | Tap Effect | Ki Bar Material |
|---|---|---|---|
| Frozen Wastes | Arctic blue, frost geometry | Ice shard spray | Glacial crystal |
| Ember Court | Deep orange, heat shimmer | Ember sparks | Molten core |
| Abyssal Rift | Void purple, spatial tears | Dimensional fractures | Liquid void |
| Jade Sovereign | Forest green, ancient stone | Falling leaves | Jade plate |
| Storm Mandate | Electric white, thunder | Lightning fork | Charged plasma |

Each ships a **Soundscape** (ambient + session SFX), bundled in the IAP — no streaming. In 2.5D a domain is a layered parallax scene; in true-3D it becomes an R3F environment driven by a `domainConfig`.

### Social Third Places *(roadmap)*
Oldenburg's "third place" is fundamentally social. VOIDBORN starts personal (your Dojo) and earns the name later: **visiting** other practitioners' domains (read-only), **Sects** (small guilds with shared Trials and quiet accountability), and **decor gifting** (a crystal sink). Consent-gated; belonging, not comparison — **no global leaderboards, ever.**

---

## The Manifestation Chamber — Form & Customization

> *"The realm decides what you are. The Manifestation decides how that truth is worn."*

This is the Pokémon-GO customization engine, recast for an evolving void being. The entity is shaped along two axes — **form** (above) and **cosmetic layers** — both assembled at render time by a pure resolver and **never stored** as a baked appearance.

### The layer stack
Within a form, the entity composes back-to-front as independently swappable, recolorable layers, driven by one `avatarConfig` object plus live metrics:

`trail → aura → core/silhouette → surface/material → eyes → appendages → orbit → sigils`

Each layer draws from a catalog of **Cosmetic Items** (`itemKey`, `category`, `rarity`, `layerSpec`). Items recolor via a tint applied **on equip** (never per-frame). Rarities: `free` · `standard` · `premium` · `seasonal` · `event`. **Manifestation Sets** bundle layers sharing a motif. A full config saves as a named **Manifestation Preset**, swapped in one tap.

### The resolver & precedence
`resolveManifestation()` merges sources in strict order (higher overrides lower):
1. **Form line** (`activeFormKey`) → selects the stage-artboard set.
2. **Realm base stage** (from `hammerCount`) → selects the evolution stage.
3. **Lineage (Bloodline)** → remaps stage configs / palettes; may *lock* slots it owns.
4. **Equipped cosmetics** → override unlocked layer styles.
5. **Reactive Auras** → override the aura layer with live biometrics.
6. **Artifacts** → add orbit layers (additive).
7. **Corruption** → final global modifier.

The resolver is pure and unit-tested; it can never render an illegal combination. Only `avatarConfig` + `activeFormKey` persist.

### The Chamber screen
A form selector above a vertical category rail, beside a **live render of your entity in its current realm and state** — every preview is the real, animated readout. Owned items show **Manifest**; unowned show **Unseal** (Void Crystal cost or IAP). Preview-before-buy. The active manifestation follows the entity everywhere.

---

## Companions, Lineages & Premium Systems

### Companions (the collection)
**Companions** are secondary spirits that accompany the entity — VOIDBORN's answer to the Pokémon GO collection/buddy. Each carries a **utility ability**, not just looks:

| Companion | Rarity | Utility |
|---|---|---|
| Time-Weaver | Ancient | Retroactively log one missed session per month without breaking streak |
| Oracle | Ancient | Deep AI analysis of 30 days → custom protocol (powers a richer [Voice of the Void](#the-voice-of-the-void--ai-coach)) |
| Anchor Keeper | Bound | Adaptive notification timing from your patterns |
| Shadow Hound | Bound | Doubles hammer count for sessions before 6am |
| Ki Sentinel | Wandering | Caps daily ki drain at 20 regardless of leaks |
| Vow Witness | Wandering | Daily check-in when a major vow is active |
| Echo Specter | Void Herald | An inverted ghost echo trailing the entity |

One active at a time (switching free), orbiting the entity in the Dojo. Summoned via **The Summoning Void** gacha: free **Lesser Scrolls** (standard pool) and premium **Abyssal Scrolls** (boosted). **Rates are disclosed; pity is server-side** (50 pulls → guaranteed Ancient+; 100 → guaranteed Void Herald). **Companions are the *only* randomized system** — forms, spaces, and cosmetics are never gacha.

### Lineages (Bloodlines)
A **Lineage** is a complete visual overhaul of the entity's evolutionary path — it rewrites every future stage across all seven realms (Abyssal, Celestial Mandate, Crimson Curse, Phantom Sovereign). One-time purchase per lineage; persists through realms, corruptions, restorations. Implemented as an alternate stage-artboard set inside the form's Rive file.

### Reactive Auras & Artifacts
**Reactive Auras** respond to live Apple Health / Health Connect data (steps → growth rings; sleep debt → dim/slow; HR zone → pulse rate; recovery → soften), pushed as Rive inputs. **Artifacts** (Void Blade, Cursed Rings, Rune Array, Fractured Halo, Phantom Chain) add orbiting cosmetic layers, sold individually and in Sets.

---

## The Soul Escrow System

> *"Some vows demand collateral. The Void responds only to consequences."*

Built on the commitment-contract model (real money against a goal raises follow-through 2–3×).

- **Heavenly Restriction Pass** — a 30-day binary-criteria protocol with a $5–$10 wager. **Success** unlocks a **Transcendent** form available no other way (proof, not cosmetic). **Failure** forfeits the wager and brands the entity with a permanent Restriction Scar (new attempt after a 14-day cooldown). *(Stripe holds on activation; webhook settles on outcome.)*
- **Vow Corruption & Cleansing** — breaking a standard vow puts the entity in a **Corrupted** state (desaturated, chained, red-eyed) shown on every open. Cleanse free via the **Penance Protocol** (7 consecutive full sessions) or instantly via a **Purification Talisman** (~$1.99). Engineered to be uncomfortable, not punishing — loss aversion outperforms reward anticipation.
- **Wagered Ki Multipliers** — stake **Void Crystals** on your own week; win → doubled, loss → forfeited. Weekly caps prevent abuse.

---

## The Voice of the Void — AI Coach

> *"The Void does not give orders. It reflects. When it speaks, it is your own pattern speaking back."*

The AI coach (Anthropic Claude) is **voiced through the entity**, not a faceless chat box. It appears at **rebirth/ascension** (a reflection on what you did to arrive), on the **daily return** (a read of recent streaks, leak patterns, upcoming deadlines), and **on request** (the Oracle ritual: 30-day analysis → custom protocol).

*Server route `/coach/reflect`* composes recent metrics, streaks, leaks, active vows, **and the sworn trial (phase, week, adherence)** into a structured prompt and calls Claude; the response renders in the entity's voice. It is **advisory and supportive — never punitive, never diagnostic, never inventing data it wasn't given.** Rate-limited and cached. Occasions: `rebirth · ascension · return · oracle · gate · realign · chapter`.

---

## Trials — the Forged Path

> *A goal becomes a path: weeks, quests, gates — generated around your life, fulfilled only by real training.*

The Runna-style goal engine, void-skinned. A **Trial** is sworn from a goal: a **Breakthrough Trial** (deadline-bound) or **the Open Path** (rolling maintenance). The wizard collects discipline, experience, a baseline ("a comfortable session today, in reps"), sessions-per-week (2–6), the **Pillar Day** (the long session the week is arranged around), two dials (**Volume** 1–5, **Difficulty** 1–5), and 4–26 weeks. The server's deterministic generator (`lib/protocol.ts` — pure, unit-tested, no RNG) lays the whole path:

- **Phases:** **The Gathering** (base volume builds gently) → **The Tribulation** (the key block; intensity ramps weekly, every 4th week deloads) → **The Quieting** (taper: volume falls to 45–55% of peak, the edge stays). Open Path trials never taper — they renew.
- **Weekly shape:** 1 **Pillar** on the Pillar Day · 1–2 **Surges** (quality) · **Flow** fills · one **Stillness** (recovery, `targetReps: 0` — never counted, never strikes). **Gates** are assessments that *replace* slots: the last Gathering week, every 4th Tribulation week, and — for breakthroughs — the final **Breakthrough Gate**.
- **Quest fulfillment is a LINK, never a strike.** Completing a quest IS logging a real `VoidSession` (`plannedSessionId` rides the normal session payload, or auto-matches by UTC day + modality). Stillness quests pair only with `reps: 0`. Deleting a session un-fulfills its quest automatically (`onDelete: SetNull`).
- **Weeks, phases, and adherence are never stored** — derived from `startDate` + the generator params, exactly like realm-from-hammerCount.
- **Realignment (the Meridian Reading) is suggest-only.** The analyzer (`lib/adherence.ts`, pure) reads real weeks and may *propose*: ease after two sub-50% weeks, intensify after two perfect well-rated weeks, re-lay a slipped week, or an eased re-entry after a ≥7-day silence. **Nothing changes until the practitioner accepts** — and accept rewrites only future, unfulfilled quests.
- **Never a dead end:** completing a trial keeps its auto-linked **major Vow** (Trophy + flourish), fires the saga, and chains an Open Path follow-up. Abandoning cancels the vow — never breaks it (re-planning is not corruption).
- Preference changes **regenerate from next week**; quests move within their week or one adjacent, never into the past.

The Calendar space is the **Quest Log**: phase banner, 7-day quest strip, in-place day panel, the Realignment banner, and the Binding Vows beneath. The Domain surfaces **Today's Quest**.

---

## Saga — the Chronicle

> *Instead of a to-do list, a story — but the story only ever follows the facts.*

The Yugen-style purpose arc, grounded in real psychology and manhwa/isekai structure. The **Mirror Rite** (onboarding, repeatable from the Chronicle) walks WOOP/MCII: *who stands here now* (current self) → *who the Void shows you* (higher self + best outcome — **the entity IS this future self**) → **Name your Inner Demon** (the obstacle; its nature is the KiLeak taxonomy — social/food/media/argument/validation/doubt) → **Forge the Ward** (an if-then implementation intention) → choose a telling. Mental contrasting is deliberate: pure positive fantasy demonstrably *reduces* attainment; naming the obstacle is what makes the wish work.

- **The Saga Forge** (`POST /saga/forge`) writes a personalized arc in one of four styles — **Murim Cultivation**, **Isekai Rebirth**, **The Tower**, **The Returnee** — with the named demon as antagonist. **AI writes flavor, never structure:** a deterministic authored 10-beat skeleton (`lib/sagaBeats.ts`) is force-merged server-side over whatever the model returns (strict Zod), and authored fallback templates (`lib/sagaTemplates.ts`) make the whole system work keyless/offline. Reforge anytime — the old saga archives, additive-only.
- **The ten beats**, each triggered by a REAL logged event: Awakening (forged) · System Window (trial sworn) · First Gate (first quest fulfilled) · Tower Floor (Tribulation entered) · Hidden Master (streak 7) · Tribulation Gate (first Gate cleared) · Regression (*optional* — a return after ≥7 silent days) · Final Ascent (Quieting entered) · Breakthrough (trial kept OR realm crossed) · The Next Path (vow kept).
- **Chapters unlock ONLY from logged events** — `unlockedBy` records the exact event (the audit). Locked chapters show a tease, never prose (Zeigarnik). Fallback prose is written *in the same transaction* as the unlocking event; Claude lazily refines it later (promptHash-cached, rate-limited), grounded in the stored event.
- The Trophy Hall is reworked as **The Chronicle**: the saga header, chapter cards (manhwa episode style; the next chapter highlighted), **Turning Points** (realm crossings, trial weeks, kept vows), and the old hall folded in as **Monuments** (Ascension shrines, Trophies, Records). Route unchanged (`/trophy-hall`).

- **The Hall of Feats — achievements as earned identity** (`GAME_DESIGN.md §12`): a **Feat** is computed from the ledger — never granted, bought, or random — with an **`earnedBy` audit** (the chapters' honesty contract, applied to achievements). Eight families: **Iron** (volume) · **Tempo** (streaks — *the Unbroken* at 100) · **Gates** · **Demon** (ward-holds — *Demonslayer*) · **Path** (trials) · **Realm** (every ascension) · **Return** (the comeback, celebrated — *the Returner*) · **Hidden** (category disclosed, conditions secret). Feat sets confer **Titles** — one equippable epithet (`activeTitleKey`) shown under your name everywhere, with a micro-shimmer on the entity (expression, never a stat). The Chronicle renders them as **medallion panels** in the Hall of Feats: earned = ink + foil; unearned = silhouette + condition tease. `feat_earned` is a real saga event (it can unlock Hidden chapters) and stamps the Turning Points timeline.

**Trials and Sagas are progression ⇒ free forever.** No priceModel exists on any of their models; nothing narrative or structural is ever sold or randomized — and that now includes feats, titles, and story-marks.

---

## The Codex of Arts & the Inner Art

> *The goal of the app is not "a goal." It is the Art being cultivated — and a life holds more than one.* (Full design: `GAME_DESIGN.md §14–15`.)

**The Codex of Arts (design spec):** a **Practitioner Art** is the unit of a life-project — a named pursuit ("the Iron Art", "the Written Art") with a **family** (Body — the six modalities mapped 1:1, nothing removed — Mind, Craft, Voice, Abstinence), a unit of effort, and a **Mastery Vision** (a direction, not a deadline). Each Art owns its own thread of everything that already exists: chained Trials, a saga thread, its feats, its ledger slice, its derived mastery curve (the generalization of `originArtMastery`). **One Focus Art** holds the prime surfaces (Today's Quest, phase weather); resting Arts keep a light heartbeat cadence so nothing decays to zero; switching focus is a consent act and a saga event. **One entity, always** — every Art strikes the same hammer through versioned per-family weights; the realm measures the whole person. The Codex surfaces as the Quest Log's top stratum (in-place Art switcher; depth ≤ 1; no fifth space), and the Chronicle braids the threads.

**The Inner Art (design spec):** the world's "inner energy" implemented as **real, evidence-based mind-body training** — slow-paced breathing before sessions (the Gathering Breath), motor-imagery rehearsal (Intent Circulation), kind-correct attentional focus cues during sets (*press the ki into* = internal focus for hypertrophy quests; *send the ki through* = external focus for performance quests), a down-regulating Seal after, and guided body-scan / imagined-training on Stillness quests (which stay `reps: 0` and never strike). Completing protocols **is** the canonical ki seal; inner sessions log as real Mind-Art sessions so chapters, feats (a new **Inner** family), readiness, and the demon all respond to them. Two fences: **supportive, never medical** (the citations live in design docs, never in the UI), and **the world is self-contained** (product copy never names external fiction or studies — the Voice cites only the practitioner's own ledger).

---

## Ascension Standards & the Cohort

> *You don't accumulate your way into a realm — you prove your way in.* (Full design: `GAME_DESIGN.md §16`.)

The fix for self-reported grind: a realm gains two axes. **Depth** (`realmForHammerCount(hammerCount)`, unchanged — your foundation, never lost) and **Standing** (what you've *proven*). The highest realm whose **Standard** you've met in an **attested Proving** is your `provenRealm`; `realm` derives from both (`lib/standards.ts`, pure, generalizing `realmForHammerCount` — still never stored). When depth runs ahead of proving you are **at the Threshold** — qi amassed, the breakthrough open (the cultivation "bottleneck," a celebrated state, never a demotion).

A **Standard** is community-normed, like real strength standards: a per-Art-family **normalization function** turns raw performance into one comparable score (a DOTS-style coefficient for strength relative to bodyweight; age-graded pace for cardio; sustained focus for Mind Arts) that bands into the seven realms by **percentile tier** — Foundation … Divine Master become *competence tiers*, not arbitrary counts. **A Gate is a Proving** (the Trial's Gates and the Breakthrough Gate become the realm assessments). **Attestation** climbs `claimed` (self, plausible — the sensor-optional floor) → `corroborated` (health-data plausibility, the anti-spoof) → `witnessed` (a Sect peer co-signs) → `certified` (a real event); a pure **plausibility engine** holds impossible efforts out of Provings while still counting them as depth. **Manual input now builds foundation but no longer ascends you alone — the Proving does.**

The community is **belonging, not ranking**: the **Cohort** is the derived peers who proved the same realm (mutual witness, never a ladder); **Sects/Guilds** gain an **entry Standard** — the literal "meet the requirement to join" — and members witness each other's Provings. Standards, Provings, attestation, cohorts, and Sect entry are **progression ⇒ free, unbuyable, unspoofable**; grandfathered depth becomes `claimed` standing (zero migration loss); `StrikeEvent` gains a `source`/attestation that weights Standing but never depth (`hammerCount` is still Σ `amount`).

---

## Rendering & Feel

A **hybrid render stack**, each engine for what it does best:

| Concern | Engine | Why |
|---|---|---|
| The living entity | **Rive** | State machines inside the asset, driven by live inputs; native 60fps even on low-end Android; tiny files; modular artboards for forms × stages. |
| The third spaces | **React Three Fiber** (`@react-three/fiber` + `expo-gl` + `expo-three` + `drei`) | Declarative 3D for React; DRACO-compressed glTF scenes load <5MB; on-demand rendering for static rooms. |
| The shell | **Expo Router** | File-based routing maps cleanly onto "spaces as routes"; maintained on the New Architecture. |
| Cinematics | **Remotion** | Pre-rendered hero moments (rebirth, ascension). |

The entity (Rive) composes **on top of** the space (R3F / 2.5D) in each screen; the two are coupled only by the screen.

**2.5D-first, true-3D-later:** build the entity over layered/parallax backgrounds, validate the loop, then upgrade spaces to R3F. The 3D engine is upside, not a prerequisite — the game is shippable in 2.5D through the evolution arc.

**The "juice" (the Clash Royale feel):** every meaningful action gets **haptics + an audio cue + a snappy spring + an entity reaction** — sealing ki, crossing a realm, completing a vow, equipping a cosmetic, opening a space. Anticipation beats (the rebirth, ascension, summons) are the equivalent of CR's chest-opening. Snappy springs over long eases; the home hub never blocks input.

**The look — "Ink & Ember"** (full art direction in `GAME_DESIGN.md §11`): the Yugen bar — comic-panel-first story surfaces — met with manhwa materials. Story UI is **image-first** (panels, not grey cards); each saga style carries its own ink + accent system (murim vermillion-seal · isekai system-glass blue · tower brass/verdigris · regression dusk-violet/ember); the **plan phase grades the whole app** (Gathering dawn-grey → Tribulation storm → Quieting pre-dawn calm); three named materials everywhere (**system-glass**, **ink-wash**, **foil**); chapter unlocks land as panel-reveals with ink blooms. Three honest art tiers: **P0 procedural beauty** (generative panels seeded deterministically from each chapter's real `unlockedBy` event — ships first, beautiful with zero authored assets), **P1 authored style kits** (additive), **P2 generated covers** (optional, cached, P0 fallback). The gate: the Chronicle must be screenshot-beautiful at P0. Beauty renders the ledger — it never invents, obscures, or replaces a readout.

---

## System Hardening

These are first-class, designed in from day one:

- **Offline-first logging.** A training app is used where wifi is worst — the gym. Every mutation (session, seal, leak, anchor, vow progress) writes locally, the entity updates **optimistically**, and a background queue flushes on reconnect. The **server is authoritative** for currency, ownership/entitlements, and all gacha/pity — those never resolve offline.
- **Event-sourced integrity.** `StrikeEvent` is append-only and is the **source of truth** for `hammerCount`. A nightly job (and an admin endpoint) recompute and correct drift — so evolution is tamper-evident and can never be bought or spoofed.
- **Gentle re-engagement (no spam).** Neglect puts the entity in a **Dormant** state (dimmed, slowed — *not* the punitive Corruption) with a single, configurable nudge; it brightens the moment you return and log.
- **The Bond (affinity).** A lightweight relationship value that deepens with presence and unlocks entity *moods* and idle variations — not power. Tamagotchi attachment, decaying slowly, never punishing.
- **Accessibility & graceful degradation.** Respect the OS **reduce-motion** setting (calm entity state, shortened cinematics); detect low-end devices and fall back **R3F 3D → 2.5D**. Dark-fantasy palette must still meet contrast targets; all controls carry labels. Degrade fidelity, never function.

---

## Greenfield Stack & Project Layout

A clean New-Architecture build — **no legacy baggage** (no Bridge, no migration, no fallback to an old animation system).

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo, **latest stable SDK, New Architecture (mandatory on SDK 55+)** |
| Language | TypeScript throughout |
| Shell | **Expo Router** (file-based) |
| Living entity | **Rive** (`rive-react-native`) |
| 3D spaces | **React Three Fiber** (`@react-three/fiber`, `expo-gl`, `expo-three`, `@react-three/drei`, `three`) |
| Animation/gesture | Reanimated + Gesture Handler (New-Arch builds) |
| Backend | Node.js + Express · Prisma + PostgreSQL · JWT (HS256, 7d) |
| AI | Anthropic Claude API (the Voice) |
| Video | Remotion · IAP RevenueCat · Payments Stripe |
| Build | `expo-dev-client` + EAS Build (native modules ⇒ dev build) |

```
voidborn/                      # Expo app (TypeScript, Expo Router)
├── app/                       # Expo Router routes = the spaces
│   ├── _layout.tsx            # providers + persistent bottom bar (the hub shell)
│   ├── (rebirth)/             # onboarding + rebirth flow
│   ├── index.tsx              # Domain (Dojo) — the home hub
│   ├── calendar.tsx           # Calendar space
│   ├── trophy-hall.tsx        # Trophy Hall space
│   └── chamber.tsx            # Manifestation Chamber
├── src/
│   ├── entity/                # Rive wrapper + metric→input bridge + stage resolver
│   ├── spaces/                # R3F scenes + 2.5D fallbacks (dojo, calendar, hall, domains)
│   ├── manifestation/         # resolveManifestation() (pure) + cosmetic catalog types
│   ├── store/                 # state: auth, session/metrics, premium, character-config, bond
│   ├── api/                   # http client + offline queue/flush
│   ├── constants/             # realms.ts, forms.ts, cosmetics.ts, theme.ts (+domainConfig)
│   ├── hooks/                 # useEntityInputs, useOfflineSync, useCinematic, useAscensionWatcher
│   └── lib/                   # device-tier + reduce-motion, haptics/audio "juice"
├── assets/rive/               # .riv per form line (void/beast/humanoid), artboards per stage
├── assets/models/             # DRACO-compressed glTF (3D phase)
└── app.json / eas.json

server/
├── src/index.ts               # entry, PORT 4000
├── src/routes/                # auth, practitioner, vows, progressions, sessions,
│                              #   entity, spaces, cosmetics, companions, coach, sync,
│                              #   premium, cinematics, admin
├── src/middleware/auth.ts     # requireAuth, requireAdmin, signToken
├── src/jobs/reconcileHammer.ts# nightly StrikeEvent → hammerCount audit
├── prisma/schema.prisma · src/seed.ts

remotion/                      # Rebirth, RealmAscension, StrikeBurst, DailyRecap, …
```

---

## Getting Started From Zero

> Native modules (Rive, `expo-gl`) require a **custom dev build** — Expo Go won't run the entity or 3D spaces. Build the dev client once, then iterate.

```bash
# 1. Scaffold the app (TypeScript + Expo Router)
npx create-expo-app@latest voidborn -t            # pick the TypeScript + Router template
cd voidborn

# 2. Add the render + platform deps (let Expo pin compatible versions)
npx expo install rive-react-native @react-three/fiber @react-three/drei expo-gl expo-three three
npx expo install react-native-reanimated react-native-gesture-handler expo-haptics expo-av
npx expo install expo-dev-client
#   VERIFY the Rive + R3F + Reanimated matrix on your chosen SDK before locking versions.

# 3. Build a dev client once (cloud) and run
eas build --profile development --platform ios     # or android
npx expo start --dev-client

# 4. Backend
cd ../server && npm init -y
npm install express @prisma/client jsonwebtoken bcrypt cors zod
npm install -D prisma tsx typescript
npx prisma init                                    # then author schema.prisma (see Data Model)
npx prisma migrate dev --name init && npm run seed
npm run dev                                        # http://localhost:4000  →  curl /health → { ok: true }
```

**`server/.env`:** `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN=7d`, `ANTHROPIC_API_KEY`, `PORT=4000`.
**Android emulator** reaches the host at `10.0.2.2` (not `localhost`) — handle in the API client via `Platform.OS`.

---

## Data Model

Realm and evolution **stage are never stored**; `hammerCount` is reconcilable from `StrikeEvent`.

**Core:** `Practitioner` (id, email, passwordHash, name, role, ki, shadowLevel, hammerCount, streak, lastLogDate, anchorCompletedAt, updatedAt, **activeFormKey** default `void`, **activeDomainKey** default `dojo`, activeManifestationPresetId?) · `Vow` (… type, startDate, resolutionDate, wagerAmount, wagerStatus, vowSubtype) · `Progression` (vowId, text, completed, orderIndex) · `VoidSession` (modality, reps, rating, note, occurredOn) · `KiLeak` (category, label, cost) · **`StrikeEvent`** (amount, occurredAt — **append-only, source of truth**).

**Entity / customization:** `EntityForm` (formKey unique, tier, stageAssets JSON, priceModel) · `PractitionerEntity` (activeFormKey — **stage never stored**) · `CosmeticItem` (itemKey, category, rarity, defaultTint, layerSpec JSON, priceModel JSON, setKey, availableFrom/To) · `PractitionerCosmetic` (`@@unique([practitionerId, cosmeticItemId])`) · `ManifestationPreset` (name, config JSON, isActive).

**Spaces & premium:** `DomainPack` / `PractitionerDomain` · `SpaceDecor` / `PractitionerDecor` · `Bloodline` / `PractitionerBloodline` · `Companion` / `CompanionSummon` (server-side pull history) / `PractitionerCompanion` · `WagerEvent`.

**Trials (free forever — no priceModel):** `Trial` (goalKind breakthrough/open_path, focusModality, experience, ability JSON, sessionsPerWeek, pillarDay, volumeDial, difficultyDial, totalWeeks, startDate Monday-UTC, targetDate?, status, generatorVersion, **vowId? @unique** → auto-linked major Vow `vowSubtype:'trial'`, chainedFromId — **weeks/phases/adherence never stored, always derived**) · `PlannedSession` (scheduledOn UTC-midnight, kind flow/surge/pillar/gate/stillness, modality, targetReps — 0 for stillness, title, **fulfilledBySessionId? @unique → VoidSession, onDelete SetNull** — completion is a link, never a strike) · `TrialRealignment` (kind ease/intensify/realign_missed, reason, payload JSON, status proposed/accepted/dismissed — suggest-only).

**Saga (free forever):** `SoulProfile` (currentSelf, higherSelf, outcome, **obstacleCategory: LeakCategory**, obstacleName, obstacleDetail, wardPlan, styleKey?) · `Saga` (styleKey, title, synopsis, demonName, status, **spec JSON = authored beat skeleton, never AI-mutated**, promptHash, source claude/fallback, trialId?) · `SagaChapter` (index, beatKey, title, tease, prose? written at unlock, trigger JSON, optional, unlockedAt?, **unlockedBy JSON — the real-event audit**).

**Feats & Titles (free forever — design spec):** `PractitionerFeat` (featKey, earnedAt, **earnedBy JSON — the ledger audit**; `@@unique([practitionerId, featKey])`) · `activeTitleKey String?` on `Practitioner`. Feat *definitions* are versioned code constants (`constants/feats.ts` + server `lib/feats.ts`, pure) and **progress is never stored** — recomputed from the ledger; awards happen transactionally in the same hooks that advance the saga.

**Arts (design spec — all additive, optional columns):** `Art` (practitionerId, name, family `body/mind/craft/voice/abstinence`, unit, weight, masteryVision, status `focus/active/resting/archived`) · `Trial.artId?` · `VoidSession.artId?` (Body Arts keep `modality`+`reps` untouched; per-family weights normalize units into hammer, server-authoritative + versioned). Per-Art mastery is **derived from the ledger slice** — never stored.

**Ascension Standards (design spec — append-only, identity-preserving):** `ProvingEvent` (practitionerId, realmIndex, artId, standardKey, standingScore, attestation `claimed/corroborated/witnessed/certified`, evidence JSON, occurredAt — **append-only like StrikeEvent**; `provenRealm` and `realm` derive from these + `hammerCount`, never stored) · `StrikeEvent` gains `source`/`attestation` (weights Standing, never depth; `hammerCount` still = Σ `amount`) · `Sect` gains `entryStandard` JSON (the requirement to join). Standard *definitions* + normalization functions are versioned code constants (`constants/standards.ts` + server `lib/standards.ts`, pure) — recomputed, never stored. Cohorts are **derived** (peers at a proven realm), not a table.

**Systems:** `Bond` (value, lastPresenceDate) · `Season` (seasonKey, startsAt, endsAt — limited-time drops) · `Sect` / `SectMember` (social roadmap).

---

## API Surface

Bearer JWT unless noted. **No `/api/` prefix** — routes mount directly.

- **Auth:** `POST /auth/signup` · `POST /auth/login` · `POST /auth/refresh` · `GET /auth/me`
- **Practitioner:** `GET|PATCH /practitioner/me` · `POST /practitioner/me/strike` · `/anchor` · `GET|POST /practitioner/me/leaks` · `POST /practitioner/me/seal`
- **Training:** `GET|POST /sessions` · `DELETE /sessions/:id` · `GET|POST /vows` · `GET|PUT|DELETE /vows/:id` · `…/progressions`
- **Entity & forms:** `GET /entity/forms` · `GET /entity/me` (computed stage) · `POST /entity/form`
- **Spaces & cosmetics:** `GET /spaces` · `POST /spaces/activate` · `GET /cosmetics` (`?category=`) · `GET /cosmetics/owned` · `POST /cosmetics/equip` · `/unequip` · `GET|POST /manifestation-presets` · `PUT|DELETE /…/:id` · `POST /…/:id/activate`
- **Companions:** `GET /companions` · `POST /companions/summon` (server RNG + pity) · `POST /companions/activate`
- **Trials:** `GET|POST /trials` · `GET /trials/active` · `POST /trials/:id/regenerate` (future-unfulfilled only) · `POST /trials/:id/sessions/:psId/move` · `POST /trials/:id/complete` (chains the Open Path) · `DELETE /trials/:id` (vow cancelled, never broken) · `POST /trials/:id/realignments/check|:rid/accept|:rid/dismiss` (accept is the ONLY suggestion→plan path)
- **Saga:** `GET /saga/styles` · `PUT /saga/profile` (absolute-set, offline-replayable) · `POST /saga/forge` (online-only; keyless fallback) · `GET /saga/state` (locked = tease only; lazy Claude prose refinement) · `GET /saga/chapters/:id`
- **Feats (design spec):** `GET /feats` (definitions + earned, with `earnedBy`; Hidden = veiled count) · `POST /feats/title` (equip `activeTitleKey` — earned titles only)
- **Coach & sync:** `POST /coach/reflect` (rate-limited, cached) · `POST /sync/flush` (offline queue; last-write-wins; StrikeEvent append-only; session mutations carry `plannedSessionId?`; `plan_move` + `soul_profile` are absolute-set) · `GET /sync/state` (includes the FULL active trial + saga so the Quest Log and Chronicle render offline)
- **Premium & admin:** `POST /premium/reconcile` (RevenueCat webhook → grants) · `GET /admin/*` · `POST /admin/recompute-hammer/:id`

---

## Monetization

**Soft paywall.** A genuinely excellent free core — the Void form + full embryo→divine evolution, real progression, the Dojo/Calendar/Trophy Hall, and a free option per cosmetic layer. Monetize **identity, expression, environment — never progression.** (A comparable self-care creature app reportedly reached ~$30M ARR on this exact model; a great free experience converts better than a locked one.)

| Product | Model | Price | Psychology |
|---|---|---|---|
| **Entity Forms** (Beast, Humanoid) | One-time IAP (non-consumable) | $4.99–$9.99 | Identity — the marquee product |
| Lineages | One-time IAP | $4.99–$9.99 | Permanent self-expression |
| **Domain Packs (3D spaces)** | One-time IAP | $6.99–$12.99 | *Where you live* — highest value |
| Cosmetic layers / Sets | Crystals or IAP | 50–300 crystals / $1.99–$7.99 | Granular expression |
| Reactive Auras / Artifacts | One-time IAP | $1.99–$4.99 | Personalization / collection |
| Space & trophy decor | Void Crystals | small | Daily cosmetic sink |
| Heavenly Restriction | Wager + unlock | $5–$10 | Commitment contract + exclusive form |
| Purification Talisman | Microtransaction | $1.99 | Loss aversion |
| Abyssal Scrolls | IAP (consumable) | $2.99–$19.99 | Companion summons |
| Void Crystal Packs | IAP (currency) | $0.99–$9.99 | Decor + wager fuel |
| Void Seasons | Time-limited drops | varies | Scarcity via rotation, never randomness |

**Entitlements & compliance:** forms/spaces/cosmetics/lineages/auras/artifacts = **non-consumable RevenueCat entitlements** (restorable); Void Crystals = **consumable**, server-authoritative, never expiring; Stripe settles Soul Escrow. **Cosmetics, forms, and spaces are direct purchases — never gacha** (keeps them outside loot-box odds-disclosure; only Companions are summoned, with disclosed rates + server pity). **Additive-only** — never alter/remove an owned item or change a default look without opt-in.

---

## Build Roadmap

Ship the cheap, high-impact thing first. Each phase ships independently.

| Phase | Scope | Gate |
|---|---|---|
| **0 — Scaffold & spike** | `create-expo-app` (TS + Router) on latest SDK (New Arch); Express + Prisma + Postgres; `expo-dev-client` + EAS; spike a Rive entity (idle SM driven by fake `ki`) and one DRACO glTF dojo (<5MB). | Both run on a mid-range Android **dev build** at 60fps; `/health` green. |
| **1 — Entity, rebirth, form choice** | Void form in Rive (idle + `rebirth`; inputs ki/shadow/streak/realm); metric→input bridge; rebirth on first launch; Chamber form selector (Void live; Beast/Humanoid stubbed premium); auth + practitioner/sessions/strike. | Sign up → rebirth → entity reacts to real metrics at 60fps. |
| **2 — Hub & 2.5D spaces + offline/a11y** | Expo Router hub shell (persistent bar, depth ≤1, swipe, juice); Dojo (2.5D); 2.5D Calendar (timeline + countdowns) & Trophy Hall; vows + progressions; offline queue + reconnect; reduce-motion + device-tier fallback. | One-tap navigation; live data; works offline; reduce-motion honored. |
| **3 — Evolution arc + the Voice** | Void's seven stage artboards bound to computed realm; ascension cinematics; `/coach/reflect`; Vows-as-Trials; Bond; Stillness; nightly hammer reconcile. | Crossing a realm visibly evolves the entity; coach speaks grounded in real data. |
| **4 — Customization economy** | Full cosmetic layer system + recolor + presets; Void Crystals; RevenueCat entitlements; `/cosmetics/*`, `/premium/reconcile`; decor. | Equip/recolor/save persists + syncs; first paid cosmetic restorable. |
| **5 — True 3D + companions + Soul Escrow** | R3F 3D Dojo/Calendar/Hall + Domain Packs; Companions gacha (disclosed rates, server pity); Soul Escrow (Stripe); Lineages/Auras/Artifacts. | 3D loads <5MB at frame/battery target, degrades to 2.5D; gacha compliant. |
| **6 — Premium forms & social** | Beast + Humanoid form lines (fully staged); Void Seasons; visiting, Sects, decor gifting. | Forms purchasable/restorable; first social loop live. |
| **T1 — Trials schema + protocol core** | `Trial`/`PlannedSession`/`TrialRealignment` (+ saga models); deterministic generator `lib/protocol.ts` + tests. | Fresh-DB migration applies; generator tests green (determinism, 40–60% taper, phase splits, pillar day). |
| **T2 — Trials server** | `/trials` router; `logSession` fulfillment hook; `/sync` extensions; auto-linked trial-vow; seed demo trial. | Stillness quest @ `reps:0` ⇒ fulfilled, **no StrikeEvent, hammer unchanged**; flush replay idempotent; `recompute-hammer` drift 0. |
| **T3 — Adaptation** | `lib/adherence.ts` analyzer + realignment endpoints (suggest-only). | Missed week ⇒ grounded proposal; accept rewrites future-unfulfilled only; dismiss is a no-op. |
| **T4 — Saga server** | SoulProfile; beats/templates/forge/engine; `/saga` router; coach occasions; cinematics; seed demo saga. | **Keyless** forge yields a valid fallback arc; chapters unlock in order from real events with `unlockedBy` audit; locked teases carry no prose. |
| **T5 — Client loop** | trial/saga stores (persisted); Quest Log calendar; Today's Quest; QuickLog prefill; chapter watcher. | Demo shows Today's Quest; complete+move offline → relaunch renders from cache → reconnect flushes without dupes; reduce-motion shortens `chapter_unlock`. |
| **T6 — Mirror Rite + Chronicle + docs** | WOOP onboarding steps in rebirth; `SagaOnboardingSheet`/`TrialWizardSheet`; Chronicle rework; docs. | Fresh signup walks the rite → forged saga visible in the Chronicle; demo shows mid-arc + next-chapter tease; depth ≤ 1 audit. |
| **V1 — Ink & Ember (the look)** | P0 procedural panel engine (event-seeded generative art for chapters/feats/covers); style ink systems + phase grading; system-glass/ink-wash/foil materials; panel-grammar motion + reduce-motion variants. | The Chronicle is screenshot-beautiful **with zero authored assets**; same data, no readout obscured; calm variants verified. |
| **V2 — Hall of Feats & Titles** | `lib/feats.ts` (pure, unit-tested) + `PractitionerFeat` + award hooks; `/feats` routes; Hall of Feats medallions in the Chronicle; `activeTitleKey` rendered everywhere; `feat_earned` saga event + Voice occasion. | Feats recompute identically from the raw ledger (audit matches); nothing grants a feat but ledger truth; demo shows earned + teased + veiled-Hidden medallions. |
| **V3 — The Entity, Embodied** | Persistent presence layer across spaces; mood engine (computed); `react_*` trigger contract on Rive + `FallbackEntity` parity; the embodied Demon (ledger-driven); story-marks resolver layer. | Entity present + reactive in all four spaces at 60fps; demon size/distance provably derived from real leak/ward rows; marks earned-only; reduce-motion stills honored. |
| **A1 — The Codex of Arts** | `Art` model + per-family weights; `Trial.artId`/`VoidSession.artId`; Codex stratum in the Quest Log (Art switcher); Chronicle thread braiding; Goal Dialogue intake (free text → Art + unit + vision). | A v1 account migrates as one implicit Body Art with zero behavior change; two Arts run concurrently (one Focus) with correct per-Art mastery + unified hammer; switching focus is consent-gated + a saga event. |
| **A2 — The Inner Art** | Guided Begin flow (Gathering Breath → Intent Circulation → train with kind-correct focus cue → the Seal); Stillness quests carry guided inner sessions; inner sessions log as Mind-Art rows; Inner feat family; `circulating` entity state; Voice `circulation` occasion. | Every step skippable in ≤2 taps; protocol completion seals ki via the ledger (tap-seal still works); stillness stays `reps:0`/no-strike; no medical claims in any string; sealed-session chain visible from real rows. |
| **S1 — Standards & the Proving** | `lib/standards.ts` (pure: per-Art normalization → score → percentile tier; `realmFor(hammer, provings)`); `ProvingEvent` append-only; Gates become Provings; `StrikeEvent.source`/attestation + the plausibility engine; Threshold/Bottleneck entity state. | `realmFor` recomputes identically from `hammerCount` + provings (v1 account = `claimed` at its depth realm, **zero demotion**); manual junk volume raises depth but cannot cross a Threshold; a phone-only self-attested Proving is valid; plausibility holds impossible efforts out of Provings. |
| **S2 — The Cohort & the Sect** | Health-data corroboration (HealthKit/Health Connect) + witness co-signing; `Sect.entryStandard`; the Cohort belonging surface; Standing marks in the Chronicle + on the entity. | Sect entry requires a met Standard (never sold); witnessing is consent-based; the Cohort exposes no competitive ranking; corroboration strengthens Standing without gating the sensorless. |

**Top risks:** art cost (Form × 7 stages) → ship one fully-staged form first, fund the rest from revenue; 3D on low-end Android → DRACO + baked light + on-demand + 2.5D fallback; scope for a solo dev → the phasing lets you stop after Phase 3 with a genuinely differentiated game.

---

## Invariants & Pitfalls

1. **Never store** realm, evolution stage, or the resolved look. `activeFormKey` is stored; the stage within it is computed from `hammerCount`.
2. **Evolution is earned, never bought.** `hammerCount` reconciles with the append-only `StrikeEvent` log (nightly job + admin endpoint).
3. **Render split:** Rive (entity, logic in the asset's state machines) over R3F/2.5D (spaces); composed by the screen. No legacy animation system — this is greenfield.
4. **Offline-first, server authoritative** for currency, ownership, and all gacha/pity.
5. **Respect reduce-motion + device tier** (3D → 2.5D). Degrade fidelity, never function.
6. **Cosmetics, forms, spaces = direct purchases, never gacha.** Companions are the only RNG (disclosed rates + server pity). **Additive-only** releases.
7. **No `/api/` prefix.** Bearer JWT. `reps:0` ⇒ no strike. `10.0.2.2` for Android emulator. `JWT_SECRET` required before boot.
8. **Native modules ⇒ dev build.** Verify the Rive + R3F + Reanimated version matrix on your SDK before locking. On SDK 55+ the New Architecture is mandatory.
9. **PlannedSessions never strike.** Completing a quest IS logging a real `VoidSession`; the `fulfilledBySessionId` link is the only completion mechanism. Stillness quests pair only with `reps:0`. UTC days are the week-boundary convention end-to-end (the client mirrors the server's `dayDiff`).
10. **Saga chapters unlock ONLY from real logged events** (`unlockedBy` is the audit). AI writes flavor — titles, teases, prose — never structure or history; the authored beat skeleton is force-merged server-side and keyless fallbacks exist at every AI seam.
11. **Adaptation is suggest-only.** A Realignment changes nothing until the practitioner accepts; accept rewrites only future, unfulfilled quests. The past is immutable.
12. **Trials and Sagas are progression ⇒ free forever.** No priceModel on any of their models, nothing gacha, additive-only (reforging archives, never deletes).
13. **Feats, Titles, and story-marks are computed from the ledger** with an `earnedBy` audit — never granted, sold, or randomized; progress is never stored. Beauty (procedural/authored/generated art) renders real events and state — it never invents, obscures, or replaces a readout.
14. **The myth is a mechanism, and the world is self-contained.** Every in-world ritual wraps a real, evidence-based practice (breath pacing, motor imagery, attentional focus, interoception) — and product copy never names external fiction or studies, never makes medical claims, and cites only the practitioner's own data. Inner work amplifies and maintains; it never strikes (`reps: 0` stays law). Arts are additive organization: one entity, one hammer, per-Art mastery always derived.
15. **Ascension is standard-gated and community-verified — never bought, spoofed, or stored.** Depth derives from `hammerCount` (foundation, never lost); `provenRealm` from append-only attested `ProvingEvent`s; `realm` from both (pure, never stored). Manual volume builds depth but cannot cross a **Threshold** — a **Proving** of a community-normed **Standard** does, attested `claimed→corroborated→witnessed→certified` (verification is anti-spoof + amplifier, never a hard sensor-gate; the self-attested floor preserves offline/sensor-optional). Standards/Provings/Sect-entry are progression ⇒ free + unbuyable; grandfathered depth = `claimed` (zero demotion). Cohorts and Sects are **belonging, not ranking** — shared-standard communities and mutual witnesses, never PvP ladders.

---

*VOIDBORN is not a fitness app that added a game. It is a game whose only cheat code is showing up. You are reborn, you take form, you inhabit a space, and you ascend. The Void was here first — the game just made it legible.*
