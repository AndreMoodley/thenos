# THE EXPERIENCE STANDARD — seamless like enterprise, alive like manhwa

> The bar: **beautiful like a manhwa, dependable like Linear/Stripe-class software.** Enterprise
> "clean" is not a visual style — it is the *absence of surprise*: every state designed, every
> action answered instantly, every word in one voice, every screen predictable from the last one.
> Ink & Ember (`GAME_DESIGN.md §11`) is the costume; this document is the spine under it. Every
> rule here is testable, and §10 audits today's build against it honestly.

---

## 1. The interaction contract (latency is a feature)

The architecture is already optimistic-first (the ledger reconciles later); the contract makes it
law for every surface:

| Budget | Rule |
|---|---|
| **0ms perceived** | Effort is NEVER blocked by the network. Logging, fulfilling, moving, equipping render their result immediately from local truth (optimistic + queue). A spinner on a mutation is a defect. |
| **≤100ms** | Every press answers — haptic + visual state change — within a frame or two. If real work takes longer, the *acknowledgment* doesn't. |
| **≤250ms** | Space transitions (`TRANSITION_MS`), sheet presentations, panel reveals. Springs, never long eases. |
| **≤2.5s cold** | App open → interactive Domain on the mid-range target, rendering from persisted stores before the network answers. |
| **Silent truth** | Server reconciliation never *jumps* the UI. Corrections animate calmly or land on next natural re-render; conflicts resolve last-write-wins + ledger-wins, invisibly. |
| **Spinners** | Allowed only on cold, never-cached fetches — and even then prefer skeletons (§2.1). |

---

## 2. The eight states (no surface ships with fewer)

Enterprise polish is mostly this: **every screen designed for all eight states**, not just the happy
one. The states, with the house treatment:

1. **Cold / skeleton** — ink-wash shimmer placeholders in the exact final geometry (no grey bars,
   no layout shift when truth arrives).
2. **Empty** — an in-world invitation with exactly one CTA. Never a blank region, never "No data."
   (House examples already shipped: "No vows bound. The Void rewards the kept word." — this is the
   standard; extend it everywhere.)
3. **Offline / cached** — full function from the persisted snapshot + one quiet indicator (a dim
   thread glyph + "as of" time in the TopStatus). Never a blocking banner; offline is a *mode*, not
   an error.
4. **Pending-sync** — optimistic rows subtly marked (a faint pulse on the seal), one pending-count
   chip in TopStatus (`pendingCount` already exists in the store — surface it).
5. **Error** — in-voice, in-place, actionable (§5): a quiet banner with a retry verb. Never a stack
   trace, never a modal trap, never a silent `catch` the user can't see past.
6. **Success** — the change itself is the confirmation (state visibly updates in place) + juice.
   Toasts only when the change happened off-screen ("Chapter unlocked — the Chronicle turned").
7. **Reduced-motion** — every animated treatment has a named calm variant (crossfade + same haptic).
   Already invariant #7; the standard adds: *designed*, not just shortened.
8. **Stale / returning** — on app focus, refetch in background and anchor-update (content updates
   without scroll jumps or reflows). Long-idle screens never visibly "snap."

**The matrix rule:** a feature is "done" when its surface × eight-states matrix has no blank cells.
The matrix is the review artifact (§9).

---

## 3. Tokens & the component grammar (one system, zero one-offs)

- **Single source of truth:** `constants/theme.ts` (+ `inks.ts` per V1). Additions to formalize:
  **elevation/blur tokens** (the system-glass spec: 3 blur levels, hairline edge), **grade tokens**
  (phase weather tints), a **state-opacity scale** (locked/dimmed/disabled — today's ad-hoc `0.65`,
  `0.6`, `0.5` collapse into named steps), and **z-layers** (space < chrome < sheet < cinematic).
- **Raw-value lint:** no hex colors, opacities, radii, or durations outside the token files. A grep
  is the linter until a real one exists (§9).
- **The component inventory** — every surface composes from these, and only these:
  `Panel` (story, image-first) · `Card` (instrument) · `Chip` (selection/status) · `Sheet`
  (the one depth-disguise) · `Banner` (realignment/error/offline) · `Medallion` (feats) ·
  `SystemLine` (the voice) · `StatRow` (records) · `JuicyButton` (already canonical).
  Each defines anatomy + all eight states once. **A screen needing a new pattern must add it to the
  inventory** — bespoke one-offs are how apps go stale unevenly.
- **Iconography:** one glyph language. The unicode sigils (◈ ⟁ ⛩ ♛) are brand — keep them — but
  ship them as a consistent SVG set with uniform weight/optical size in V1, not as font-roulette.

---

## 4. Motion grammar (three verbs, total predictability)

Every animation in the app is one of three verbs — users learn the language once:

| Verb | Meaning | Used by | Reduced-motion |
|---|---|---|---|
| **Slide** (spring) | *moving* between places | space swaps, sheets | shortened slide |
| **Bloom** (ink) | *revealing* something earned | chapter/feat/panel unlocks, ascension splash | crossfade |
| **Stamp** (seal) | *committing* something real | quest fulfilled, vow kept, ward held | static seal + haptic |

If a proposed animation isn't one of the three, it's either a new verb (rare, a design decision) or
it's decoration (cut it). Durations and springs come only from tokens.

---

## 5. Voice & copy standard (one narrator, everywhere)

The product has a single narrator — the system/Void voice. Enterprise apps feel coherent because
their copy is governed; ours is too:

- **Register:** terse, mythic, calm. Second person. No exclamation marks. No emoji. Sentence case.
- **Never blame:** no "you failed/missed/broke" framing from the system. A miss is a fact of the
  path, not a judgment ("2 quests slipped past this week. The remaining days can be re-laid.").
- **Buttons are in-world verbs:** Begin · Swear it · Walk on · Kept · Release · Accept. Never "OK",
  "Submit", "Cancel" where a world-verb exists ("Not yet" over "Cancel").
- **Errors are world-events with an action:**
  - offline mutation: *"The thread to the Void is severed — your strikes are held safely here."*
  - failed fetch: *"The Void is silent. [Reach again]"*
  - forge offline: *"The Forge needs the server — it will fire when the connection holds."* (shipped)
- **Numbers are protagonists:** tabular numerals, thousands separators, never naked floats.
- **A banned-words lint** (§9): "error", "failed", "invalid", "oops", "!" in user-facing strings.

---

## 6. Navigation & focus discipline

- **Depth ≤ 1 is also a UX promise:** any screen is one tap from home, one gesture from its sheet.
- **One primary action per region** (the Domain's lower half = Begin/Log; the Quest Log day panel =
  Begin; everything else is ghost-toned).
- **Sheets:** scrim-tap and swipe-down both dismiss; drafts persist across dismissal (closing the
  Mirror Rite never loses entered text); keyboard never covers the focused input.
- **Destructive acts confirm in place** (a second-tap arm state on the same button — "Broke" →
  "Break it?"), never via OS alert dialogs that shatter the world's voice.
- **The bar is sacred** (existing law): always visible, always live, never blocked by animation.

---

## 7. Accessibility contract (table stakes, not a feature)

- Contrast ≥ 4.5:1 body / 3:1 large text on every ink-system palette (the V1 palettes ship with a
  verified contrast table — beauty doesn't get to break this).
- Touch targets ≥ 44pt; the quest strip chips and day cells included.
- Every interactive: `accessibilityRole` + `Label` + `State` (the codebase pattern exists — the
  standard makes it a per-PR checklist, §9).
- Screen-reader narration for the *living* parts: the entity ("Your entity is focused. 210 strikes
  to Ki Establishment."), panels (chapter title + locked/unlocked + tease), the demon (V3: "The
  Hollow Scroll keeps its distance.").
- Dynamic type: layouts tolerate +2 text sizes without truncation of meaning (counts may abbreviate).
- Reduce-motion: full coverage via the three-verb grammar (§4) — no orphan animations.

---

## 8. Performance & quality gates

- 60fps held during: space swaps, sheet springs, panel blooms, entity idle — on the mid-range
  Android target (the existing Phase-0 bar, now applied to V-work).
- Lists virtualize past ~20 items (Chronicle chapters + Hall of Feats + quest history → `FlatList`).
- P0 panel engine budget: < 8ms generation per panel, rendered to a cached texture once per seed.
- Art caching: P1/P2 images cached on disk with content-hash keys; the Chronicle never re-downloads
  a cover it has shown.
- Bundle watch: web export tracked per PR (today: 2.3MB single bundle — split the panel engine and
  three.js behind async boundaries when V1 lands).

---

## 9. The Seamlessness Audit (run per release; this IS the enterprise discipline)

A literal checklist, kept in this file, run against the build:

1. **States matrix:** every screen × eight states — no blank cells, no layout shift cold→warm.
2. **Latency spot-check:** mutation answers ≤100ms perceived; cold start ≤2.5s on target hardware.
3. **Token lint:** `grep -rE '#[0-9a-fA-F]{3,8}' voidborn/src app --include='*.tsx'` returns only
   token files; no inline durations/opacities off-scale.
4. **Voice lint:** banned-words grep over user-facing strings; button labels are world-verbs.
5. **A11y pass:** roles/labels/states present; contrast table green for the active ink system.
6. **Offline walkthrough:** airplane-mode → full loop (view, complete, move, read) → reconnect →
   zero dupes, zero jumps.
7. **Reduce-motion walkthrough:** the three verbs' calm variants verified on every new surface.
8. **Depth audit:** every flow reachable and escapable in one step; no accidental second level.

---

## 10. Honest audit — today's build vs. this standard (the V1-adjacent punch list)

What the current implementation already does right: optimistic-everything, offline-complete
snapshots, in-world empty states, world-verb buttons, reduce-motion variants, depth ≤ 1, a11y
labels on most interactives. The gaps, named with their fixes:

| # | Gap today | Fix (where) |
|---|---|---|
| 1 | No skeletons anywhere — cold screens pop in | Ink-wash skeleton component; apply to Domain/Quest Log/Chronicle cold loads |
| 2 | Errors are silent `catch {}`es — failures look like emptiness | `Banner` component + per-store `lastError` surfaced quietly with a retry verb (§5 copy) |
| 3 | `pendingCount` exists but isn't surfaced | TopStatus chip: a dim thread glyph + count; pulses on flush |
| 4 | Offline is invisible (no mode indicator) | Same TopStatus thread glyph, severed state + "as of" time |
| 5 | "Broke" destroys a vow in one tap | In-place arm-confirm on destructive buttons (§6) |
| 6 | Ad-hoc dim opacities (0.65/0.6/0.5) and inline hexes in screens | State-opacity + palette tokens; run the token lint (§9.3) |
| 7 | Chronicle/feats lists are unvirtualized ScrollViews | `FlatList` with anchored updates (§8) |
| 8 | Demo-account shortcut visible unconditionally | Gate behind `__DEV__`/env flag |
| 9 | Toast-less off-screen events (a chapter can unlock while in Chamber) | Success toast pattern (§2.6) routed through the juice layer |
| 10 | Glyphs are raw unicode at OS-font mercy | V1 SVG sigil set (§3) |
| 11 | No per-PR checklist enforcement | Adopt §9 as the PR template for all V-phase work |

Items 1–9 are small, code-level, and **precede** the Ink & Ember art pass — polish the spine, then
dress it. They are the difference the user feels as "clean" before a single illustration ships.
