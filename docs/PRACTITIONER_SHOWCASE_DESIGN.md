# VOIDBORN — The Pantheons (Practitioner Showcase) Design

**Date:** 2026-06-16
**Status:** supersedes the "no global leaderboards, ever" line in `README.md` / `GAME_DESIGN.md`.
**Companions:** `docs/PROOF_OF_EFFORT_DESIGN.md` (the verified Strength Score that powers ranking) and `docs/RESEARCH_PLAYBOOK.md` (ethical-gamification posture).
**Goal:** A fun, modern, clean way to show off the top practitioners in each art — their profiles, their uploaded media, and their **customized entity** — without turning ascension into a shaming global ladder.

---

## 0. Why this is safe to add now

The original "no leaderboards" instinct was right *given a self-reported system* — a board over fakeable numbers rewards the best cheater and discourages everyone else. **Two things changed that make a showcase not just safe but powerful:**

1. **Verification exists.** With the Evidence Ladder + verified **Strength Score** (`PROOF_OF_EFFORT_DESIGN.md`), a place on the board is a *proven* feat, not a typed number. The leaderboard becomes a reason the verification system matters — and the verification system is what makes the leaderboard honest. They reinforce each other.
2. **Healthy leaderboard design is a solved problem.** The research is consistent: rank people **against peers, not the whole world**; celebrate **improvement**, not just the #1 slot; never publicly shame the bottom ([Yu-kai Chou](https://yukaichou.com/advanced-gamification/how-to-design-effective-leaderboards-boosting-motivation-and-engagement/); [Nudge](https://www.nudgenow.com/blogs/gamification-leaderboard-ideas-engagement)). Done this way, leaderboards lift engagement ~30% ([Fireart](https://fireart.studio/blog/user-interface-design-for-a-fitness-app/)) and stay aligned with VOIDBORN's "belonging, not comparison" ethos.

So we keep the ethos and add the celebration. The feature name fits the mythos: **Pantheons** — halls of those who have proven themselves in each art.

---

## 1. The Pantheons (the leaderboards, done right)

**One Pantheon per art** (Calisthenics, Running, Powerlifting, …), ranked on that art's **verified Strength Score** — and *only* verified feats place (T2/T3 from the Evidence Ladder). Unverified or anomaly-flagged feats never appear (Strava's "withhold until verified" applied as a ranking rule).

Design rules drawn straight from the ethical-leaderboard research:

| Principle | Implementation |
|---|---|
| **Compete with peers, not the planet** | Default cohorts: **realm tier × bodyweight class × age band** (and an opt-in "your Sect" board). Bodyweight classes come free from using DOTS / relative-strength (`PROOF_OF_EFFORT_DESIGN.md §4`). |
| **Celebrate improvement, not just rank** | A **Risers** board (biggest verified Strength-Score gain this season) sits beside the all-time board — "the other 90%" get a board they can top. |
| **Always show *a* win** | Every profile surfaces a personal percentile + "you climbed N places" rather than a bare global rank. |
| **No shaming** | Only the top of each cohort is public; you see *your* neighborhood, never a global last-place. Appearing is **opt-in**. |
| **Seasonal resets** | Pantheons reset per **Void Season** (already in your model) so the board never ossifies and new practitioners always have a live race. |
| **Team layer** | **Sect Pantheons** celebrate collective verified volume — competition *and* belonging. |

> Anti-cheat is the feature, not an afterthought: because ranking reads the **verified** Strength Score and excludes anomaly-flagged feats, the Pantheon is the public payoff for the whole proof-of-effort investment.

---

## 2. The Practitioner Profile (media-rich, entity-fronted)

A profile is a **shrine, not a stat sheet** — consistent with the Chronicle/Trophy-Hall aesthetic. Top to bottom:

1. **The customized entity, hero-sized.** The live `resolveManifestation()` render — their form, realm/stage silhouette, equipped cosmetics, lineage, aura, companion orbit — animating with their real metrics. This *is* the "show off their customized entity" centerpiece; the entity is the avatar.
2. **Identity band.** Pseudonymous handle, realm sigil + stage, primary art, current Strength Score + cohort percentile, streak, season Riser delta.
3. **The Proof Reel.** A swipeable, modern gallery of the **media they chose to make public** from their evidence submissions (`EvidenceSubmission`) — their muscle-up, their PR deadlift, their sub-20 5k trace. Clean cards, autoplay-muted, tap-to-expand. This is where "different media they have uploaded" lives.
4. **Verified feats & Monuments.** Top lifts/feats with a ✔ verified badge + tier; Chronicle turning points; trophies.
5. **Respectful actions.** Follow, visit Domain (your read-only roadmap feature), send kudos/decor gift — **belonging gestures, never trash-talk.**

---

## 3. The customized entity is the unit of identity (lean into your strength)

VOIDBORN already has what most apps bolt on badly: a deep, **layer-resolved, never-baked** avatar (`resolveManifestation()`: trail → aura → core → surface → eyes → appendages → orbit → sigils). The showcase should make that the star:
- **Entity cards** in the Pantheon grid (not face photos) — privacy-friendly *and* on-brand; your "you **are** the entity" metaphor becomes the social object.
- **Share cards** — export a beautiful entity + verified-feat card (the Proof Reel clip + entity overlay) for off-app sharing, the single biggest organic-growth lever for fitness apps (social sharing of achievements).
- Because the look is **rebuilt from `avatarConfig`**, a profile render is cheap, consistent, and always current — no stored snapshots to drift.

---

## 4. Customization inspiration — Claude Fable 5 + open-source to borrow from

You asked to look at recent **Claude Fable 5** creations and open-source code for advanced customization. Two distinct uses:

### a) Fable 5 as a *build accelerator* for the showcase
Claude Fable 5 (Anthropic, released **June 9, 2026**) is built for long-horizon agentic build work and is the strongest model on end-to-end "vibe-coding," frequently **one-shotting** apps ([Anthropic](https://www.anthropic.com/news/claude-fable-5-mythos-5); [Simon Willison](https://simonwillison.net/2026/Jun/9/claude-fable-5/)). In the community's first-week showcase, one creator reports Fable 5 generating **"all decoration, character models, 4 maps, music, all three game modes, and UI in a single shot,"** and others one-shot navigable **Three.js** 3D scenes ([awesome-claude-fable-5](https://github.com/Anil-matcha/awesome-claude-fable-5)). Practical notes from the same write-ups: it's **token-intensive**, so the recommended pattern is a **relay — "think with Fable 5, build with a cheaper model, review with Fable 5."** For VOIDBORN that means: prototype the Pantheon UI and the R3F entity-card renderer with Fable 5, then hand the steady-state code to a cheaper model.

### b) Open-source customization systems to borrow patterns from
These validate and can directly inform your entity/cosmetic layer system and the showcase renderer:

| Project | What to borrow | Link |
|---|---|---|
| **CharacterStudio** (M3-org, MIT) | Web VRM avatar creator with a **custom layer system + automatic face culling** — exactly your back-to-front layer stack; their culling approach keeps many equipped layers cheap to render in a grid | https://github.com/M3-org/CharacterStudio |
| **msquared avatar-creator** (React) | **Slot model** (body/head/hair/top/bottom/shoes/outfit) — a clean schema mirror for your `avatarConfig` layers and a React component pattern for the Chamber + profile render | https://github.com/msquared-io/avatar-creator |
| **gltf-avatar-threejs** | glTF-based swappable-part avatar pipeline — reference for R3F part-swapping if/when the entity goes true-3D | https://github.com/shrekshao/gltf-avatar-threejs |
| **Wawa Sensei — R3F Avatar Builder course** | End-to-end React-Three-Fiber avatar builder + configurator UX — close to your stack | https://wawasensei.dev/tuto/3d-avatar-builder-threejs-course |
| **Boring Avatars** | Deterministic SVG avatars from a seed — perfect **low-tier / loading / pre-art fallback** for Pantheon cards on low-end devices (Invariant #7 degradation) | https://boringavatars.com/ |

**The throughline:** every one of these is a *layered, config-driven, recolorable* avatar — the same architecture you already chose. The inspiration to take is on the *showcase* side: grid-friendly cached renders (CharacterStudio culling), exportable share cards, and a slot schema clean enough to render identically in the Chamber, the profile, and the Pantheon grid.

---

## 5. Privacy, consent & wellbeing (non-negotiable, given we're reversing a ban)

- **Opt-in to appear**, with **granular visibility**: entity-only (default), + handle, + percentile, + per-clip public media. Nothing public by default beyond what the user toggles.
- **Pseudonymous by design** — handles, not real names; entity cards, not faces (face-blur from the proof system carries over to any public clip).
- **Minors & safety** — under-18 accounts excluded from public Pantheons and from public media; all public clips pass safety moderation.
- **No shaming surface** — there is no global last place, no forced ranking, and a one-tap "leave the Pantheon" that removes you instantly.
- **Belonging, not comparison, stays the default** — the home loop is still your Dojo and yesterday's-self; Pantheons are an opt-in room you choose to enter.
- **Free forever** — ranking is progression-adjacent, so per Invariant #15 it's never monetized and never gacha.

---

## 6. Data model & API (additive)

```prisma
model ShowcaseProfile {            // opt-in; absent = invisible (default)
  practitionerId String  @id
  handle         String  @unique
  visibility     Json                // { entity:true, handle:true, percentile:false, media:false }
  primaryArt     String
  optedInAt      DateTime @default(now())
}

model PantheonEntry {             // materialized per season/cohort from VERIFIED scores
  id            String @id @default(cuid())
  practitionerId String
  disciplineKey String
  seasonKey     String
  cohort        String              // e.g. 'realm5|bw83|age30'
  strengthScore Int                 // from VerificationResult (verified only)
  riserDelta    Int                 // season gain
  @@index([disciplineKey, seasonKey, cohort, strengthScore])
}
// Public media reel = EvidenceSubmission where visibility.media && verdict=='verified' && user-flagged public
```

**API (no `/api/` prefix; Bearer JWT; server-authoritative):**
`GET /pantheon/:art?cohort=&season=` · `GET /pantheon/:art/risers` · `GET /profiles/:handle` (entity envelope + public reel) · `PUT /showcase/profile` (opt-in + visibility) · `POST /profiles/:handle/kudos`. Ranking queries read **only verified** `strengthScore`; anomaly-flagged feats are excluded at write time.

It reuses what you have: the entity envelope from `GET /entity/me`, the verified scores from the proof system, and `Season` for resets.

---

## 7. UI/UX — modern, clean, seamless

- **A new top-level "Pantheon" space** (or a tab inside the Chronicle) — depth ≤ 1, swipe between arts, your bottom-bar juice intact.
- **Grid of living entity cards** (cohort default), each: entity render + handle + score + ✔; tap → profile with the hero entity and the **Proof Reel**.
- **Motion & feel** — shared-element transition from card → profile (the entity "steps forward"); muted autoplay reels; haptic on rank-up; a celebratory ascension card when you enter a Pantheon for the first time.
- **Aesthetic** — same dark, sigil-driven language as the Chronicle; entity-forward, photo-light; touch-first large targets ([fitness UI best practice](https://fireart.studio/blog/user-interface-design-for-a-fitness-app/)).
- **Shareable** — one tap exports the entity + verified-feat card.

---

## 8. Rollout

1. **Opt-in profiles + entity cards** (no ranking yet) — visit/show-off layer; validates consent + render.
2. **Per-art Pantheons over verified Strength Score**, peer cohorts + Risers board.
3. **Proof Reel** (public verified media) on profiles.
4. **Share cards** + **Sect Pantheons** (team layer).
5. **Polish:** shared-element transitions, season ceremonies, CharacterStudio-style cached grid renders.

Sequence so the social layer only ever ranks **proven** feats — the Pantheon ships *after* (or with) the verification tiers, never before.

---

### Sources
- Anthropic — Claude Fable 5 & Mythos 5: https://www.anthropic.com/news/claude-fable-5-mythos-5
- Simon Willison — Initial impressions of Claude Fable 5: https://simonwillison.net/2026/Jun/9/claude-fable-5/
- awesome-claude-fable-5 (curated creations/demos): https://github.com/Anil-matcha/awesome-claude-fable-5
- CharacterStudio (open-source layered VRM avatar creator): https://github.com/M3-org/CharacterStudio
- msquared avatar-creator (React slot-model avatars): https://github.com/msquared-io/avatar-creator
- gltf-avatar-threejs (glTF swappable-part avatars): https://github.com/shrekshao/gltf-avatar-threejs
- Wawa Sensei — R3F Avatar Builder course: https://wawasensei.dev/tuto/3d-avatar-builder-threejs-course
- Boring Avatars (deterministic SVG avatar fallback): https://boringavatars.com/
- Yu-kai Chou — Leaderboards that motivate the other 90%: https://yukaichou.com/advanced-gamification/how-to-design-effective-leaderboards-boosting-motivation-and-engagement/
- Nudge — Gamification leaderboard ideas: https://www.nudgenow.com/blogs/gamification-leaderboard-ideas-engagement
- Common Ninja — Psychology behind leaderboards: https://www.commoninja.com/blog/the-psychology-behind-leaderboards
- Fireart — Fitness app UI/UX best practices (2026): https://fireart.studio/blog/user-interface-design-for-a-fitness-app/
