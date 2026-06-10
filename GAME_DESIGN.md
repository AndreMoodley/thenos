# VOIDBORN — Interface Fusion Design

> How the **Pokémon GO** creature/customization model and the **Clash Royale** home-hub model merge into a single coherent interface: **the Third Space.** This document is the design spine; `README.md` is the spec, `CLAUDE.md` the conventions, `BUILD_PROMPT.md` the build order.

---

## 1. The fusion thesis

Two interfaces, two jobs:

- **Pokémon GO answers "what do I care about?"** — a *creature you grow*. It evolves, you customize it, you collect, and it is *yours*. The emotional engine is attachment + progression made visible.
- **Clash Royale answers "how do I move?"** — a *home that feels effortless*. One focal subject, a persistent thumb-bar, depth that almost never exceeds one level, and tight juicy feedback. The engine is frictionless orientation.

Neither answers "where am I?" in a way VOIDBORN wants. Pokémon GO's answer is the *real-world map*; Clash Royale's is a *static camp*. VOIDBORN's answer is the **Third Space** — an inhabited inner domain that is simultaneously the CR-style home hub **and** the place the PoGo-style creature lives, but personal and evolving.

```
   POKÉMON GO                CLASH ROYALE              VOIDBORN
   a being you grow    ×     a home you navigate   =   a space you inhabit & ascend within
   (creature/cosmetics)      (hub/nav/juice)           (the Third Space)
```

Everything below is the implementation of that single sentence.

---

## 2. What we take from each (and what we deliberately leave)

### From Pokémon GO — TAKE
- **An evolving creature.** Embryo → divine across the seven realms. (Ours evolves through *earned training*, not candy.)
- **Deep avatar/cosmetic customization** — the modular, swappable, recolorable layer stack (core/aura/eyes/appendages/orbit/trail/sigils), plus **form choice** (Void/Beast/Humanoid).
- **A collection + buddy** — **Companions** (utility-bearing familiars), summoned and equipped, orbiting the entity.
- **Identity surfaced everywhere** — the entity follows you across every space and cinematic.

### From Pokémon GO — LEAVE (core), keep as optional future
- **Geolocation + AR + the real-world map.** The Third Space is *inner*, not geographic. (Optional later: real-world "training grounds," AR entity viewing — the architecture leaves room, the core does not depend on it.)
- **Catch-everything collection sprawl.** One entity you raise deeply > hundreds you raise shallowly. Companions are a tight, curated set.

### From Clash Royale — TAKE
- **A central hub on one subject** (your entity in its space).
- **A persistent bottom bar**, four destinations, always visible.
- **Depth ≤ 1 level** — disguised when it must go deeper.
- **Thumb-first layout** + **horizontal swipe** between top-level screens.
- **Juice** — haptics + audio + snappy springs on every meaningful action; anticipation beats as set-pieces.

### From Clash Royale — LEAVE
- **PvP, real-time battles, competitive ladders, global leaderboards.** VOIDBORN is single-player ascension; the only opponent is yesterday's self. (Social, when it comes, is belonging — visiting, Sects — not ranking.)

---

## 3. The screen architecture

A flat hub of four spaces. **One level deep.** Expo Router file-based routes map 1:1 onto spaces.

```
            ┌───────────────────────────────────────────────┐
            │                  THE DOMAIN                     │   ← home hub (index route)
            │            [ living entity, reacting ]          │
            │         ambient soundscape · live metrics       │
            └───────────────────────────────────────────────┘
   swipe ⇄ between spaces · persistent bottom bar always visible · depth ≤ 1
   ┌──────────────┬──────────────┬──────────────┬──────────────┐
   │   DOMAIN     │   CALENDAR   │ TROPHY HALL  │ MANIFESTATION│   ← the bottom bar
   │   (home)     │ goals/timeline│  monuments  │  form + look │
   └──────────────┴──────────────┴──────────────┴──────────────┘
```

| Space | Route | PoGo DNA | CR DNA | What happens |
|---|---|---|---|---|
| **Domain** | `app/index.tsx` | the creature lives here; identity center | the central hub on one subject | entity reacts to live metrics; **Today's Quest**; quick-log actions; ascension fires here |
| **Quest Log** (Calendar) | `app/calendar.tsx` | — | one-level screen, swipe-reachable | the sworn Trial's phase banner + weekly quest strip + Realignment consent; Binding Vows beneath with live countdowns |
| **The Chronicle** (Trophy Hall) | `app/trophy-hall.tsx` | collection-as-pride | clean monument screen | the saga's chapters as manhwa episode cards + Turning Points; Ascensions/Trophies/Records fold in as Monuments |
| **Manifestation** | `app/chamber.tsx` | the customization engine | preview + commit, no deep menus | choose form, swap/recolor layers, save presets, Unseal items |
| **Rebirth** | `app/(rebirth)/` | the creature is *born* | full-screen set-piece | onboarding: the **Mirror Rite** (WOOP identity steps) → trial wizard → the rebirth cinematic |

**Rule:** opening a space, acting, and returning is one tap each way. If a flow seems to need a second level (e.g., a cosmetic's color options), it renders *in place* (a sheet/inline panel), never a new screen stack — the Clash Royale "disguise depth as one level" principle.

---

## 4. The hub home screen, in detail (the CR core)

The Domain is the home. It obeys four rules:

1. **One subject.** The entity owns the center of the screen. Chrome is minimal: a slim top status (realm sigil, ki bar, streak) and the bottom bar. Nothing competes with the being.
2. **Thumb-first.** All primary actions (log a session, seal ki, open a space) live in the lower half. The top half is for *looking* at the entity.
3. **The bar is sacred.** Four destinations, always visible, never scrolling away. It is the user's anchor — they can always get home in one tap.
4. **Juice on everything.** Tapping the entity ripples it; sealing ki pulses the bar + a haptic + a chime; a strike logged spawns a particle burst; opening a space slides with a spring. The home never blocks input while animating.

**Anticipation set-pieces (the CR "chest" beats):** Rebirth, Realm Ascension, and Companion Summons are full-attention moments with build-up and payoff — rendered via Rive one-shots or Remotion. These are the dopamine punctuation of an otherwise calm hub.

---

## 5. The creature, in detail (the PoGo core)

The entity is the thing you grow and dress — Pokémon GO's two pleasures (evolution + customization), fused.

- **Evolution (the Pokémon pleasure):** seven visible stages, embryo → divine, gated by `hammerCount`. Crossing a threshold is a celebrated transformation, not a stat bump. **Earned only** — no purchasable evolution, no candy economy. This is the integrity line.
- **Form (the avatar pleasure):** Void (free origin), Beast (most Pokémon-like), Humanoid. The form is the *species*; the realm is the *stage*; cosmetics are the *outfit*.
- **Customization (the wardrobe pleasure):** the modular layer stack + recolor + presets, assembled by `resolveManifestation()`. Preview-before-buy, live against the real entity state — exactly the PoGo wardrobe loop, recast for an abstract evolving being.
- **Collection (the buddy pleasure):** Companions — a curated set of utility familiars, summoned (with disclosed rates + server pity) and equipped one at a time, orbiting the entity.

**Reading the entity is reading yourself:** ki → eye brightness, shadowLevel → spread, streak → orbit, mastery → glow, broken vow → corruption. Cosmetics change the *look*; your life changes the *motion*.

---

## 6. The Third Space — the synthesis layer

This is the original contribution that lets the two interfaces become one.

- **It is the home hub** (Clash Royale) — the Domain space you return to.
- **It is the creature's world** (Pokémon GO's map, internalized) — the place the entity inhabits and that evolves alongside it.
- **It is yours** — personal, not shared or geographic. The space matures with the entity: a Foundation-realm Dojo feels nascent; a Divine-Master domain feels vast.
- **It is purchasable as identity** — **Domain Packs** are premium third spaces (the highest-value cosmetic, because it is *where you live*), each a full sensory environment + soundscape.
- **It becomes social, later** — visiting others' domains, Sects, decor gifting: the point at which "third place" (Oldenburg's social anchor) is fully earned. Belonging, never ranking.

The Third Space is why VOIDBORN is one game and not two stapled together: the creature and the hub share a *place*.

---

## 7. The feel — a "juice" spec

The Clash Royale magic is 80% feel. Make it a checklist, not an afterthought:

- **Haptics** (`expo-haptics`): light on tap/equip, medium on seal/log, success on vow-complete, heavy on ascension.
- **Audio** (`expo-av`): a short cue per action; per-domain soundscapes underneath; ascension/summon stingers.
- **Motion:** snappy springs (Reanimated) over long eases; the entity is *always* idle-animating (never frozen); transitions between spaces are spring slides, ≤ 250ms.
- **Anticipation → payoff:** every set-piece builds (charge-up) before it pays (burst). Rebirth, ascension, summon, Heavenly-Restriction success.
- **Never block input:** animations are interruptible; the bottom bar is live at all times.
- **Respect reduce-motion:** all of the above has a calm variant; honor the OS setting.

---

## 8. The loop, end to end

```
  SWEAR A TRIAL (goal → generated path: Gathering → Tribulation → Quieting)
      │  the System Window opens: weekly quests laid around your Pillar Day
      ▼
  TRAIN (real world) ──► TODAY'S QUEST fulfilled by a REAL session
      │  log session (reps>0) ──► StrikeEvent ──► hammerCount ▲   (the link never strikes)
      ▼
  THE DOMAIN  ◄── entity reacts live (ki, shadow, streak, glow)
      │  cross a realm threshold · clear a Gate · enter a phase · keep the streak
      ▼
  ASCENSION set-piece ──► entity evolves a stage + space matures
  CHAPTER UNLOCK ──► the Chronicle turns a page (story follows fact, never precedes it)
      │
      ├─► QUEST LOG: move/complete quests; accept or dismiss a Realignment (suggest-only)
      ├─► THE CHRONICLE: read the saga; trophies + turning points beneath
      ├─► CHAMBER: mold form / swap look (identity, optional spend)
      └─► VOICE OF THE VOID: the entity reflects your pattern back (Claude)
      │
      ▼
  RETURN TOMORROW  ◄── Bond deepens; neglect ⇒ Dormant (gentle nudge);
                        a return after silence is the REGRESSION beat, never a punishment
      │  the trial completes ──► Breakthrough Gate ──► vow kept ──► the Open Path chains
      ▼
  NEVER A DEAD END
```

The only input is showing up. Everything purchasable is identity and environment — never the climb, never the plan, never the story.

---

## 9. Design guardrails (do not violate)

- **One entity, raised deeply** — not a sprawling roster.
- **Evolution is earned** — never sold, never spoofable (`StrikeEvent` is truth).
- **Depth ≤ 1** — disguise deeper flows as in-place sheets.
- **No ranking** — single-player ascension; social = belonging.
- **Identity is the product** — forms, spaces, cosmetics; the climb is free.
- **Feel is a feature** — juice and reduce-motion are both requirements.
- **The space and the creature share a place** — that shared place is the whole idea.
- **Story follows fact** — chapters unlock only from logged events; the Chronicle can never be read ahead of the work, and the AI may flavor the myth but never invent the history.
- **Suggest, never impose** — the plan adapts only by consent (Realignments are proposals); a missed week is met with a re-laid path, not a penalty.

---

## 10. The two engines (Runna × Yugen, made VOIDBORN)

The fusion gains a second axis: **structure** (how training is laid out) and **meaning** (why it matters), borrowed from the two best-in-class apps for each and skinned in the world VOIDBORN already is.

### The Trial engine (modeled on Runna's goal-based plans)
| Runna | VOIDBORN |
|---|---|
| Race distance + date, or a general target | **Breakthrough Trial** (deadline) / **the Open Path** (maintenance) |
| Base → key block → taper | **The Gathering → the Tribulation → the Quieting** (taper = 45–55% of peak volume, derived, never stored) |
| Long-run anchor day; week auto-arranged | **Pillar Day**; flows/surges/stillness laid around it by the deterministic generator |
| Easy / quality / long run / assessment | **Flow / Surge / Pillar / Gate** (+ **Stillness**, reps:0 — recovery counts as kept, never as struck) |
| Volume & difficulty preferences regenerate the plan | Two dials; regeneration touches **future, unfulfilled weeks only** |
| Pace Insights suggest; the runner accepts | **The Meridian Reading** — Realignments are suggest-only; accept is the only mutation |
| Post-race plans; goals chain | Completing a trial keeps its major Vow and **auto-chains the Open Path** — never a dead end |

### The Saga engine (modeled on Yugen's story arcs, corrected by the research)
| Yugen | VOIDBORN (and why it's stronger) |
|---|---|
| Tell it your goals → a personal story arc | **The Mirror Rite** — full WOOP/MCII: current self → higher self → **a NAMED inner obstacle** → an if-then **Ward**. Pure positive fantasy measurably *reduces* attainment; the contrast step is the fix. |
| 20+ authored arcs with vibes and milestones | **4 manhwa/isekai styles** (Murim, Isekai, Tower, Returnee) × AI personalization over ONE authored 10-beat skeleton — infinite flavor, fixed honest structure |
| Daily tasks become chapters | Chapters unlock **only from real logged events** (`unlockedBy` audit) — quests fulfilled, gates cleared, phases entered, realms crossed, streaks kept, returns after silence |
| Skill levels unlock new paths | Realms, streaks, and kept trials ARE the unlock conditions — no parallel XP |
| Online-only | Offline-first: authored fallback arcs + in-transaction fallback prose; Claude refines lazily when reachable |

The psychology is load-bearing, not garnish: the **Inner Demon's nature is the KiLeak taxonomy** (the obstacle you log is the antagonist you fight), **the entity is the rendered higher self** (future-self vividness), and the Tribulation reframes difficulty as **importance** (identity-based motivation) — which is also, exactly, the manhwa trope.
