# NANO VISION — The Total Redesign

> **Status: VISION / PLAN ONLY — nothing in this document is built.** This is the no-scope redesign of
> THENOS: every shipped capability carried forward and massively amplified, reorganized around one new
> thesis. `README.md`/`GAME_DESIGN.md` describe what exists; this describes what it becomes.
> The 15 invariants in `CLAUDE.md` survive intact — they are extended here, never weakened.

---

## 0. The thesis shift

What exists today is **an app you visit**: four rooms, a creature, a plan, a story. All of it works.
All of it waits for you to open it.

The redesign's organizing fantasy is **Nano Machine** (나노마신): a symbiote intelligence injected
into an outcast, woven through his body, connected to his mind — it *perceives* everything (vitals,
meridians, technique errors), *speaks* at the exact moment it matters, *simulates* what he cannot yet
do, transfers technique while **the effort stays entirely his**. The nano doesn't fight for Cheon
Yeo-woon. It makes his growth **legible, guided, and inevitable** — and that is the entire emotional
payload of the progression-fantasy genre.

> **THENOS v1:** a being you raise in a place you visit.
> **NANO:** a system that inhabits *you* — it perceives your real life, speaks into it, plans inside
> it, and writes the myth of it. The phone stops being where the game lives; it becomes the implant's
> HUD. The game is your day.

One sentence: **stop asking the user to come to the system; weave the system through the user.**

---

## Part I — Human nature, decoded and implemented directly

Why do "system window" stories (Nano Machine, Solo Leveling, every isekai with a status screen) grip
hundreds of millions of readers? Because real life lacks exactly three things those windows provide,
and the craving for them is load-bearing human psychology:

1. **Legibility** — in fiction, effort visibly banks. In life, you cannot see yesterday's workout in
   your arm. The system window is the *competence* need (Self-Determination Theory) made visible.
2. **Fairness** — the system never forgets, never cheats, counts everything. Effort-in equals
   growth-out. (This is why invariant #2 — the append-only StrikeEvent ledger — is the soul of the
   product. It IS the fair system.)
3. **Companionship in struggle** — Nano speaks. The grind is witnessed. (*Relatedness*, the third SDT
   need, normally missing from solo self-improvement.)

Every mechanic in the redesign is one law of human nature, implemented literally:

| Law (the research) | NANO mechanic |
|---|---|
| **SDT: competence** — visible mastery feeds motivation | The **Stat Sheet of the Self**: per-Art mastery curves, projected breakthrough dates with confidence bands ("at this pace: Core Formation in 47 days"), all derived live from the ledger — numbers that never lie because they cannot be bought |
| **SDT: autonomy** — choice beats prescription | The Nano always offers **2–3 quest variants** ("three trainings present themselves"); suggest-only stays sacred at every structural level |
| **SDT: relatedness** — being witnessed | The Nano **remembers** ("Last tribulation, the Scroll took you on day 3. It is day 3.") — long-term memory summarized from the ledger, never invented |
| **Fogg B=MAP** — behavior fires when motivation × ability × prompt meet | The prompt moves to the **moment of maximum ability**: calendar-aware, readiness-aware quest timing; the action shrinks to one tap (auto-detected sessions need only confirmation) |
| **Implementation intentions** (Gollwitzer) — if-then plans pre-decide the battle | **Armed Wards**: the Ward stops being a sentence you wrote and becomes a tripwire — when the leak pattern is *detected in reality* (screen-time signal, time-of-day), the Ward fires as an interruption carrying the user's own words |
| **Mental contrasting (WOOP)** — wish + named obstacle, re-contrasted | The Mirror Rite recurs at every phase transition, not once — the demon is re-named as it evolves |
| **Identity-based habit / self-perception** — actions are votes for a self | Every fulfilled quest ends with a 2-second **identity stamp** ("Another stone in the dawn-runner's wall") — the session is framed as evidence, not expenditure |
| **Flow (Csikszentmihalyi)** — the 4% stretch zone | The difficulty dial becomes a **flow-band controller**: ratings + completion keep quests inside the challenge-skill channel, auto-adjusting *within bounds the user already accepted* (structure changes still Realignment-gated) |
| **Goal-gradient effect** — effort accelerates near the goal | Gates telegraph their approach; the HUD counts down to thresholds everywhere; the final week is staged as the Final Ascent it already is in the saga |
| **Fresh-start effect** — temporal landmarks license new selves | Trials open on Mondays (kept); the Regression beat reframes every return; new-moon/solstice **Rite moments** offered, never imposed |
| **Zeigarnik/Ovsiankina** — open loops pull | Next-chapter teases (kept) + the first line of the locked chapter's prose now shimmers half-readable |
| **Peak-end rule** — endings are the memory | The Quieting is *designed as savoring*; Breakthrough cinematics are the peak; chapter prose is written at the exact moment of the event (kept) and read back at trial's end as **the Recap Episode** |
| **Loss aversion — used ethically** | Unchanged red lines: streaks never punish (Dormant ≠ broken), corruption only follows *chosen* stakes, wagers stay opt-in. The nano is never a nag; silence is met with a re-opened path, not a guilt push |
| **Variable reward — used ethically** | **Hidden Quests** (the manhwa "hidden piece"): surprise chapter/companion moments triggered by real rare patterns (trained before dawn; trained in rain; returned after 30 days). The *category* is disclosed; the contents surprise. Never purchasable, never paid RNG beyond companions |

The ethical line, stated as design law: **the system exists to make the user need it less, while
loving it more.** Interruptions only by armed consent. No punishment mechanics. No dark patterns.
The nano serves the climber, not the session count.

---

## Part II — The Nano (the Voice of the Void, fully embodied)

The Voice of the Void today is a reflection card. It becomes **the Nano** — five capabilities:

1. **It perceives.** A consent-gated **Perception Layer** ingests real signals:
   - HealthKit / Health Connect: workouts (auto-drafted sessions), steps, sleep, HR/HRV.
   - Screen time (iOS DeviceActivity/FamilyControls where granted; Android UsageStats): the Hollow
     Scroll is *detected*, not self-reported — leaks draft themselves.
   - Calendar: quests schedule into actual free slots; the Pillar Day negotiates with real life.
   - Manual logging remains first-class and offline-first — perception is an amplifier, never a gate.
2. **It speaks — at moments, not on schedule.** One terse system line at a time, in system diction:
   `[Quest complete. The Gate in 2 days.]` · `[Recovery: full. The Pillar holds today.]` ·
   `[The Hollow Scroll stirs. Your ward: ten breaths.]` Push/widgets/watch are its mouth (Part V).
3. **It remembers.** A ledger-derived memory (facts only, summarized server-side) that the voice can
   cite. Never invents — invariant #13's "story follows fact" now governs conversation too.
4. **It simulates.** A **readiness model** (the "meridian map"): load vs. recovery derived from
   sessions + sleep/HR when granted → drives the day's quest variant and the flow band. Nano Machine's
   battle-simulation, recast: *project the week, show the consequence of choices before they're made*
   ("move the Pillar to Friday and the taper compresses — acceptable, here is the re-laid week").
5. **It converses as the interface.** Type or speak anything — "move tomorrow's quest", "how close is
   the next realm", "log 40 push-ups", "why is this week lighter" — and the Nano executes through the
   *same authoritative APIs* (no privileged path; AI parses intent, deterministic systems act,
   consent gates hold).

**The honesty rule for perception (new invariant candidate N1):** *perceived signals DRAFT; only
confirmation strikes.* Auto-detected workouts arrive as one-tap pending sessions, source-tagged on
the StrikeEvent, plausibility-capped, reconcilable. The earned-only ledger stays unspoofable — by
sensors as well as by money.

---

## Part III — Any goal, exactly like Yugen (and then deeper)

Yugen's opening move is its best one: *tell it any goal you want*. The redesign adopts it completely
and grounds it in the existing ledger machinery:

- **The six modalities generalize into the Arts** — a taxonomy where every Art defines its strike
  unit: **Body Arts** (the current six — reps), **Mind Arts** (meditation/study — minutes, pages),
  **Craft Arts** (writing/music/code — words, sessions, problems), **Voice Arts** (language/social
  courage — exchanges, attempts), **Abstinence Arts** (sobriety/leak-fasting — clean days, where the
  "rep" is a day held and stillness logic, not strike logic, applies). Per-Art weights normalize
  units into hammer (effort-equivalence, server-authoritative, versioned like the generator).
- **The Goal Dialogue** replaces the form-shaped wizard: the Mirror Rite becomes an actual
  conversation with the Nano — free text in ("I want to write a novel by spring" / "deadlift 180kg" /
  "be someone who isn't afraid to speak") → the Nano classifies Art, unit, baseline, deadline →
  contrasts the WOOP obstacle → and the **same deterministic generator** lays the Trial. AI structures
  *parameters*; pure code lays *plans*; consent gates *changes*. (Invariants untouched — this is the
  Yugen experience on rails that cannot hallucinate a schedule.)
- **Main Quest + Side Quests** (the manhwa shape): one active Trial remains the spine (focus is a
  feature), but small recurring **side practices** (a daily 10-minute Mind Art; the Abstinence
  counter) ride alongside without competing — each its own quest chip, its own thread in the saga.
- **Every goal gets the full machine:** phased plan, Pillar anchor, Gates, Stillness, Realignments,
  the linked major Vow, the chained Open Path, the saga's ten beats. A novel has a Tribulation. A
  sobriety arc has a Breakthrough Gate. The Chronicle braids them.

---

## Part IV — The Living Protocol (the plan that breathes)

Today's plan is weekly-static and regenerates by consent. That stays the *structural* truth — and
gains a daily heartbeat:

- **`resolveToday()`** — each morning the Nano resolves the day inside the already-consented plan:
  picks the quest variant (2–3 pre-generated options per slot), adjusts target within the accepted
  flow band using readiness, schedules the prompt into the calendar's real gap. Deterministic, pure,
  auditable — consent was given at plan level; the day breathes within it.
- **Realignment v2 (the Meridian Reading, continuous):** the analyzer runs on every real event, not
  on demand; proposals carry projected outcomes ("accept: the Gate moves 4 days, taper preserved").
  Accept/dismiss stays the only structural mutation. The Oracle companion's promise is finally real:
  a periodic **Oracle Report** — pattern truths from the ledger ("your leaks cluster Sundays after
  21:00; your best sessions follow 7+ hours of sleep") with at most one suggested ward or realign.
- **Armed Wards (platform-honest):** Android first-class (UsageStats + overlay intervention); iOS
  best-effort (DeviceActivity shields + report extensions; FamilyControls entitlement and its known
  revocability documented to the user — the ward is armor they wear, not a cage we lock).
- **Recovery is sensed, not assumed:** Stillness quests confirm against sleep/HRV when granted —
  the reps:0 invariant becomes *physiologically real*.

---

## Part V — The interface: from four rooms to a HUD over life

Depth ≤ 1 was the right law. The redesign applies it to the whole phone:

- **Layer 0 — the HUD (the app, closed):** lock-screen widget = Today's Quest + the system line;
  watch complication = the gate countdown; **Live Activity during a session** = the system window
  counting reps in real time (the Solo-Leveling screen, on the actual lock screen); notifications =
  Nano lines, armed-consent only. *Most days, the user never needs Layer 1.*
- **Layer 1 — the Domain (the app, opened):** one screen. The entity, the system line, Today's Quest,
  and a **command line to the Nano** (speak/type anything). Navigation is replaced by intent.
- **Layer 2 — the dive (one gesture in, one out):** the four spaces become **views of the being**,
  reached by zooming *into the entity* rather than tabbing beside it — the Quest Log is its
  meridian map; the Chronicle is its memory; the Chamber is its form; the Domain is its world.
  Same routes, same depth law, new spatial metaphor.
- **Layer 3 — the world (endgame):** the entity in AR in your room at milestones; the domain as a
  living diorama that physically matures per realm; training-ground moments (the PoGo inheritance,
  finally cashed) — optional, never required.
- **Feel doctrine unchanged**, amplified: every Nano line lands with its haptic signature; the
  entity is always present in Layer 1 (the relationship is the home screen).

---

## Part VI — Saga v2: the braided Chronicle

- **Any-goal beat libraries:** the ten-beat skeleton holds (it is the monomyth of progression
  fantasy); each Art family gets authored trigger-flavor so a writing Tribulation reads differently
  from an iron one. Styles expand beyond four (academy, sect-war, dungeon-break, villainess…) — all
  skeleton-locked, all keyless-fallback.
- **Braided arcs:** Main Quest arc + the **Demon arc** (the relationship with the named obstacle has
  its own beats: first detection, first ward-win, the relapse, the long silence, the day it lost) +
  side-practice vignettes. The Chronicle renders them as one interleaved season.
- **Richer real-event vocabulary:** perception adds honest triggers — `ward_held`,
  `leak_detected/leak_resisted`, `readiness_peak`, `hidden_condition_met` — every one
  ledger-grounded, every unlock still `unlockedBy`-audited.
- **The Recap Episode:** at trial's end, the season's unlocked prose is composed (deterministically,
  AI-polished when reachable) into a single readable chapter-of-chapters — the peak-end artifact, and
  the thing users will screenshot and share.

---

## Part VII — What does not change (and what is added to the law)

Invariants 1–15 carry verbatim. The redesign adds its own:

- **N1. Perception drafts; confirmation strikes.** No sensor writes the ledger alone. Source-tagged,
  capped, reconcilable. Earned-only now also means un-spoofable-by-sensor.
- **N2. Interruption only by armed consent.** The Nano speaks into life only where the user installed
  the tripwire. Silence is always available and never punished.
- **N3. Signals are the user's body.** On-device-first, consent-gated per source, viewable,
  exportable, deletable. Perception off ⇒ every feature still works manually (offline-first's
  sibling: *sensor-optional*).
- **N4. AI parses and flavors; pure code decides.** The conversation layer routes through the same
  deterministic, consent-gated systems as buttons do. No privileged AI path to state.
- **N5. The product's success metric is the user's real-world outcome,** not session length. Anything
  that grows engagement while shrinking outcomes is a bug class.

Monetization philosophy unchanged (identity/expression/environment; progression/story/plan free
forever). New honest surfaces: Nano voice-personas and HUD themes (expression), AR domain packs
(environment). The Perception Layer is never paywalled — safety and honesty features are not products.

---

## Part VIII — Carry-over map (nothing lost, everything raised)

| THENOS v1 (shipped) | NANO (this vision) |
|---|---|
| Manual session logging | Stays + perception-drafted sessions, one-tap confirm, Live Activity capture |
| StrikeEvent ledger / realms | Unchanged law; now also sensor-honest (N1); Stat Sheet projections on top |
| Trials: phases, Pillar, dials, gates | Stays + any-goal Arts, daily `resolveToday()`, flow-band targets, calendar negotiation |
| Realignments (suggest-only) | Continuous analyzer + projected-outcome proposals + Oracle Reports |
| Ki Leaks (self-reported) | Stays + detected leaks (screen time), `leak_resisted` as a first-class win |
| Wards (written if-then) | **Armed** Wards — fire at the detected moment, in the user's own words |
| Mirror Rite (form steps) | The Goal Dialogue — free-text any-goal intake, recurring re-contrast |
| Saga: 4 styles, 10 beats, audits | Braided arcs, style library, richer real-event triggers, the Recap Episode |
| Voice of the Void (reflection card) | The Nano: perceives, speaks at moments, remembers, simulates, converses |
| Four spaces, bottom bar, depth ≤ 1 | HUD layers; spaces become zoomable views of the being; depth law kept |
| Companions, cosmetics, domains, wagers | Unchanged economy + persona/HUD/AR surfaces |
| Offline-first, server-authoritative | Unchanged + sensor-optional (N3) |

---

## Part IX — Reality tiers & build horizon (for when building begins)

**Tier A (pure software, current stack):** Arts taxonomy + any-goal Goal Dialogue · `resolveToday()`
+ flow band · continuous Realignments + Oracle Reports · Saga v2 braiding + Recap · conversational
action layer · Stat Sheet. *No new platform risk.*

**Tier B (platform integrations):** HealthKit/Health Connect ingestion + drafted sessions · widgets/
watch/Live Activities · calendar scheduling · Android armed wards. *Known APIs, known costs.*

**Tier C (frontier):** iOS armed wards (FamilyControls entitlement; revocable-by-design — ship as
armor, not cage) · AR entity/domains · voice-first Nano. *Prototype-gated.*

Horizon (each phase ships value alone, invariant-gated like T1–T6): **N0** perception spike (HealthKit
→ drafted session → confirm → strike) + command line prototype → **N1** Arts + Goal Dialogue → **N2**
Living Protocol → **N3** HUD layer → **N4** Armed Wards (Android) → **N5** Saga v2 + Oracle → **N6**
AR/voice frontier.

**Top risks:** privacy trust (answer: N3, on-device-first, radical transparency) · AI cost/latency
(answer: N4 — AI at the edges, deterministic core, fallbacks everywhere, as today) · iOS intervention
fragility (answer: honest tiering, Android-first proof) · scope gravity (answer: the phase gates; the
soul of v1 — *the ledger never lies* — is the test every feature must pass).

---

*The genre's secret, and this product's: the system never made the hero strong. It made his effort
impossible to waste, impossible to fake, and impossible to face alone. Build that.*
