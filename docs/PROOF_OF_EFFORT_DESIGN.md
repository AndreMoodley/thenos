# VOIDBORN — Proof-of-Effort & Strength-Metric Design

**Date:** 2026-06-16
**Companions:** `docs/SECURITY_AUDIT.md` (finding **H3 — spoofable effort**) and `docs/RESEARCH_PLAYBOOK.md` (Part A.5/A.6 — anti-cheat & anomaly detection).
**Goal:** Let practitioners submit **photo/video (or sensor) evidence** to verify they've met the thresholds that gate **realm ascension**, with a system that adapts to different "arts" (calisthenics, running, powerlifting), and recommend the **strength metric** underneath it.

---

## 0. The one design decision that makes this work

**Verify at the gate, don't tax every session.** Day-to-day strikes stay frictionless self-report (the loop you already have). Evidence is requested only when something *consequential* happens — crossing a **realm threshold**, claiming a **personal-record feat**, or settling the real-money **Heavenly Restriction**. This is the natural extension of your existing **Gate** concept in Trials (assessments that replace slots) and keeps the audit's fix (H3) where it matters: the moments worth cheating for.

Everything else follows three rules you already live by:
- **Server owns the verdict** (Invariant #6). The client submits evidence; the server decides the tier.
- **Additive-only** (Invariant #8). Evidence *raises* trust; it never deletes earned progress. An unverified realm still shows — just marked "unverified," and locked out of the proof-only rewards.
- **Append-only audit** (Invariant #2). `EvidenceSubmission` + `VerificationResult` are an immutable log, exactly like `StrikeEvent`.

---

## 1. The Evidence Ladder (trust tiers)

Every strike — and every realm gate — carries a **proof tier**. Higher realms (and the real-money proof form) require higher tiers. This is the trust-tier model from the playbook, made concrete.

| Tier | How it's earned | Friction | Gates it can cross |
|---|---|---|---|
| **T0 — Attested** | Self-reported reps (today's flow) | none | early realms only; always "unverified" |
| **T1 — Sensor-corroborated** | Apple Health / Health Connect workout + device motion/GPS auto-attached | ~none | mid realms |
| **T2 — Media-verified** | Photo/video analyzed on-device (pose/rep/bar-path) + authenticity checks | one clip at a gate | high realms, PR feats |
| **T3 — Witnessed** | Human/community review or a real referee (your **Vow Witness** companion), optional live session | review delay | apex realm (Divine), Heavenly Restriction "proof" form |

**Apple Health is corroboration, not proof** — it's permission-gated and Apple prohibits writing spoofed data into HealthKit ([Apple](https://support.apple.com/guide/security/protecting-access-to-users-health-data-sec88be9900f/web)), but other apps can still write to it, so T1 supports a claim, T2/T3 prove it. Map the seven realms so the **first transcendent threshold (Realm 5 "The Void") is the first T2 gate**, and **Divine (Realm 7) / the Heavenly-Restriction form require T3** — the rewards that are supposed to be "obtainable no other way" get the strongest proof.

---

## 2. The verification pipeline (on-device first, server-authoritative verdict)

```
 capture ──▶ on-device analysis ──▶ submit (presigned upload) ──▶ server verify ──▶ verdict
 (camera)    BlazePose / Vision      clip + signals + hashes      re-score + checks   tier + ProofRecord
```

1. **Capture & on-device analysis.** Rep counting and form scoring run **on-device** with MediaPipe **BlazePose** (33 body landmarks, real-time on iOS/Android; rep counting via a small classifier or joint-distance lookup) ([Google Research](https://research.google/blog/on-device-real-time-body-pose-tracking-with-mediapipe-blazepose/); [RepDetect](https://github.com/giaongo/RepDetect)) — Apple's **Vision** body-pose is the iOS-native equivalent. On-device keeps it **free, private, and offline-friendly** (Invariant #6/#7).
2. **Submit** via a **presigned direct-to-storage upload** (S3-style) so video never round-trips your API ([pipeline pattern](https://oneuptime.com/blog/post/2026-02-16-content-moderation-user-generated-media-azure-content-safety/view)). Alongside the clip you send: the on-device pose summary, sensor/GPS trace, device attestation, capture timestamp, and a **perceptual hash**.
3. **Server verify (escalating rigor by stakes).**
   - **Authenticity:** check **C2PA Content Credentials** if present (cryptographic, tamper-evident capture provenance — now signed natively by Samsung S25 / Sony cameras) ([C2PA explainer](https://spec.c2pa.org/specifications/specifications/2.4/explainer/Explainer.html)); validate EXIF/capture time; verify device attestation (App Attest / Play Integrity).
   - **Dedup:** compare the **perceptual video hash** (64-bit, robust to re-encode/crop/resize) against the user's and global history to catch **re-submitted or borrowed clips** ([videohash](https://github.com/akamhy/videohash)).
   - **Re-score:** for T2 gates, re-run pose/bar-path analysis server-side (don't trust the client's count); for running, run the **GPS+sensor-fusion** checks below.
   - **Safety moderation:** automated NSFW/face screen (AWS Rekognition / Google SafeSearch) only on submitted clips — pennies each, and only at gates, so cost stays negligible ([AWS Rekognition](https://aws.amazon.com/rekognition/content-moderation/)).
   - **Verdict:** assign tier, write an append-only `VerificationResult`, stamp the realm gate / `StrikeEvent` with its `proofTier`. Anything ambiguous → **flag for human/T3 review** (Strava's "withhold from leaderboard until verified" model) rather than auto-reject.

**Cost & privacy posture:** on-device CV is the default → **~$0 per session and no video leaves the phone** for ungated activity. Server moderation/re-score touches only **gate submissions** (a tiny fraction of events). Store clips short-lived, offer **on-device face-blur**, and prefer keeping *derived signals* (rep count, ROM, bar path, GPS summary) over raw video where possible — data minimization.

---

## 3. Discipline Adapters — the "dynamic per art" engine

The arts differ, so make **Discipline** a pluggable adapter rather than hard-coded branches. Each adapter declares: its **metric**, its **valid evidence types**, its **analysis module**, its **threshold standards**, and its **anti-cheat signals**. Adding a new art = adding a config, not rewriting the gate.

```ts
interface DisciplineAdapter {
  key: 'calisthenics' | 'running' | 'powerlifting' | string;
  metric: StrengthMetric;            // how a feat becomes a score (§4)
  evidence: EvidenceType[];          // ['video'] | ['gps','sensor'] | ['video','vbt_device']
  analyze(submission): FeatResult;   // pose reps+ROM | gps+sensorfusion | barpath+1RM
  standards: ThresholdTable;         // realm/level cutoffs for THIS art
  antiCheat: Signal[];               // dedup, impossible-feat, sensor-consistency...
}
```

| Art | Primary metric | Evidence + analysis | Threshold standard | Key anti-cheat |
|---|---|---|---|---|
| **Calisthenics** | **Relative strength** (added load as % bodyweight) + rep maxes + skill unlocks (muscle-up → planche) | Video → BlazePose rep count **+ ROM checks** (chin-over-bar, full lockout) | %BW tiers: novice 0–10%, intermediate 10–35%, advanced 35–70%, **elite ≥100% added** ([Liftoff](https://liftoffrank.com/blog/weighted-pull-up-standards); [Cinnabar](https://www.cinnabarcalisthenics.com/blog/calisthenics-strength-standards)) | rep/ROM validity; perceptual-hash dedup; bodyweight sanity |
| **Running** | Distance / pace / volume | **GPS trace + sensor fusion** (no video) | pace/distance bands per realm | layered GPS checks (mock-location, **accelerometer-cadence vs GPS speed**, cell/Wi-Fi, impossible speed/duration) ([Guardsquare](https://www.guardsquare.com/blog/securing-location-trust-to-prevent-geo-spoofing); [TestDevLab](https://www.testdevlab.com/blog/testing-fitness-apps-can-you-cheat-the-algorithm)) |
| **Powerlifting** | **1RM / DOTS score / tonnage** | Video → **bar-path + depth/lockout** checks; optional **VBT** device velocity → estimated 1RM ([Vitruve](https://vitruve.fit/blog/barbell-velocity-tracker/)) | DOTS cutoffs per realm (§4) | plate-math sanity; velocity↔load consistency; dedup |

This is also why **"strike amount = reps" is too blunt** (audit H3): a verified calisthenics muscle-up and 100 unverified sit-ups should not be the same. The adapter converts a *feat* into a *weighted, verified* contribution.

---

## 4. The strength metric (the recommendation)

You asked for the best solution for strength metrics specifically. Use **bodyweight-normalized scoring** so a 60 kg and a 110 kg practitioner ascend on comparable terms, and unify the arts into one internal **Strength Score**.

**For barbell / powerlifting → adopt DOTS.** Wilks (1994) systematically **undervalues heavier lifters**; IPF GL Points (2020) are official but **fitted to elite competition**; **DOTS (2019) is the most accurate across extreme bodyweights** and is what USAPL/USPA use for best-lifter ([rpe.training](https://rpe.training/guides/wilks-dots-ipf-gl-explained/); [Vitruve IPF GL](https://vitruve.fit/calculators/ipf-gl-points-calculator/)). DOTS is the right default for a general population spanning all sizes; expose IPF GL as an optional "competition" lens later.

**For calisthenics → relative-strength index.** Score the feat as **added load ÷ bodyweight** plus a **skill-tier multiplier** (rep maxes and movement difficulty: pull-up → weighted → muscle-up → one-arm), benchmarked against published standards (a "Calisthenics Strength Index" comparing your 1RM to elite marks already exists — [Calixpert](https://www.calixpert.com/calculators/calisthenics-strength-index)).

**Unify into one "Strength Score" → realm thresholds.** Normalize each art's metric to a common 0–1000 scale (DOTS and the relative-strength index both already aim for cross-bodyweight comparability), then:
- The **verified Strength Score**, not raw rep volume, is what gates the **strength realms**.
- Keep `hammerCount` as the cumulative effort engine (unchanged), but **weight each StrikeEvent by `proofTier`** so verified feats advance ascension and unverified volume accrues "soft" progress that can't cross a gated threshold. (Additive, append-only, reconcilable — no invariant broken.)

> Net effect: the entity's evolution becomes a *credible* claim about real-world strength, which is exactly the "ascension is earned" promise the README makes — now backed by evidence, federation-grade math, and an audit trail.

---

## 5. Anti-cheat stack (defense in depth)

No single check is sufficient — layer them, each catching what the others miss (the explicit lesson from GPS-spoofing research and Strava's program):
1. **Provenance** — C2PA credentials when available; device attestation (App Attest / Play Integrity) always.
2. **Dedup** — perceptual hashing blocks reused/borrowed/looped clips.
3. **Consistency** — sensor fusion (accelerometer/gyro vs GPS for running; bar velocity vs claimed load for lifting); plate-math and bodyweight sanity.
4. **Anomaly scoring over your `StrikeEvent` log** — your append-only history is the substrate Strava had to retrofit; score each feat against the user's own curve and population norms, **auto-flag outliers to "unverified"** instead of silently granting realm progress ([Strava ML](https://bikerumor.com/strava-uses-new-maching-learning-models-to-catch-cheaters/)).
5. **Human/community review** for flagged or apex-tier claims (StickK-style referee = your Vow Witness companion).
6. **Impossible-feat guards** — per-day/-session ceilings; >24h-of-activity-in-a-day style rejects.

Note: **deepfake/AI-generated video detection is unreliable** as a primary defense — provenance (C2PA, attestation) + dedup + sensor consistency are the durable strategy; treat "looks real" as the weakest signal.

---

## 6. Privacy, safety, accessibility (don't skip — it's a fitness app with minors-adjacent risk)

- **On-device analysis by default**; upload raw video only at gates, and only the **shortest clip** that proves the feat.
- **Face-blur option on-device**; automated safety moderation on anything uploaded.
- **Data minimization & retention** — keep derived signals (reps, ROM, bar path, GPS summary, hashes), expire raw clips quickly; explicit consent for any human review.
- **Accessibility / degradation (Invariant #7)** — never *require* a camera to play: low-end or camera-less devices fall back to **sensor (T1)** or **server-analyzed** evidence; adaptive athletes get **alternative feats per realm** (the adapter already abstracts "what counts").
- **Free forever** — verification is *progression integrity*, so per Invariant #15 it carries **no price tag** and is never gacha.

---

## 7. Data model & API (additive to the current schema)

```prisma
model Discipline {                 // seedable; the adapter's server-side config
  key           String  @id        // 'calisthenics' | 'running' | 'powerlifting'
  metricKind    String              // 'relative_strength' | 'distance_pace' | 'dots'
  evidenceTypes String[]            // ['video'] | ['gps','sensor'] | ['video','vbt']
  standards     Json                // realm/level threshold tables
}

model EvidenceSubmission {         // APPEND-ONLY (audit, like StrikeEvent)
  id             String   @id @default(cuid())
  practitionerId String
  disciplineKey  String
  realmGate      Int?               // the realm threshold this is claiming (nullable = PR feat)
  mediaUrl       String?            // presigned storage key; null for sensor-only
  perceptualHash String?
  c2paStatus     String?            // 'verified' | 'absent' | 'invalid'
  deviceAttested Boolean  @default(false)
  signals        Json                // on-device pose summary / gps trace / sensor fusion
  clientId       String              // idempotency key (audit fix M2)
  createdAt      DateTime @default(now())
  @@unique([practitionerId, clientId])
}

model VerificationResult {         // APPEND-ONLY; server is authoritative
  id             String  @id @default(cuid())
  submissionId   String  @unique
  proofTier      Int                 // 0..3
  strengthScore  Int?                // normalized 0..1000 (DOTS / rel-strength)
  verdict        String              // 'verified' | 'flagged' | 'rejected'
  reason         Json
  reviewedBy     String?             // null = automated; set = human/referee (T3)
  createdAt      DateTime @default(now())
}
// + StrikeEvent gains: proofTier Int @default(0)
```

**API (no `/api/` prefix; Bearer JWT; all server-authoritative):**
`GET /disciplines` · `POST /evidence/upload-url` (presigned) · `POST /evidence/submit` · `GET /evidence/:id` · `POST /admin/evidence/:id/review` (T3) · realm-ascension reads the **max verified tier** before unlocking a gated reward.

It slots straight into your **Trials Gate** flow (a realm gate becomes an evidence-backed assessment) and the **server-derived settlement** the playbook prescribed for Heavenly Restriction.

---

## 8. Suggested rollout

1. **Tiers + schema (no CV yet).** Ship the Evidence Ladder with **T1 sensor (Health/GPS)** + **manual photo** at gates; stamp `proofTier`. Immediately blunts H3 for ascension.
2. **Running adapter.** Pure data (GPS + sensor fusion) — no CV, fastest win, fully automated.
3. **On-device rep CV (BlazePose/Vision)** → **calisthenics adapter** (rep count + ROM) at T2.
4. **Powerlifting adapter** (bar-path + DOTS; optional VBT-device import).
5. **Anomaly scoring over `StrikeEvent`** + **human/T3 review** + perceptual-hash dedup at scale.
6. **C2PA capture credentials** as device support spreads (future-proofing, low effort to add).

Start with tiers + running because they need no computer vision; let CV and federation-grade scoring follow where they add the most credibility.

---

### Sources
- Google Research — On-device BlazePose body tracking: https://research.google/blog/on-device-real-time-body-pose-tracking-with-mediapipe-blazepose/
- RepDetect — MediaPipe pose rep counting + form feedback: https://github.com/giaongo/RepDetect
- Vitruve — Barbell velocity tracker (VBT, estimated 1RM, video): https://vitruve.fit/blog/barbell-velocity-tracker/
- Vitruve — IPF GL Points calculator: https://vitruve.fit/calculators/ipf-gl-points-calculator/
- rpe.training — Wilks, DOTS & IPF GL explained: https://rpe.training/guides/wilks-dots-ipf-gl-explained/
- Wikipedia — Wilks coefficient: https://en.wikipedia.org/wiki/Wilks_coefficient
- Liftoff — Weighted pull-up standards by level: https://liftoffrank.com/blog/weighted-pull-up-standards
- Cinnabar — Calisthenics strength standards: https://www.cinnabarcalisthenics.com/blog/calisthenics-strength-standards
- Calixpert — Calisthenics Strength Index: https://www.calixpert.com/calculators/calisthenics-strength-index
- C2PA — Content Credentials explainer (2.4): https://spec.c2pa.org/specifications/specifications/2.4/explainer/Explainer.html
- Content Authenticity Initiative — How it works: https://contentauthenticity.org/how-it-works
- akamhy/videohash — Perceptual (near-duplicate) video hashing: https://github.com/akamhy/videohash
- Guardsquare — Preventing geo-spoofing (layered location trust): https://www.guardsquare.com/blog/securing-location-trust-to-prevent-geo-spoofing
- TestDevLab — Can you cheat step-counter algorithms: https://www.testdevlab.com/blog/testing-fitness-apps-can-you-cheat-the-algorithm
- Bikerumor — Strava ML cheat detection: https://bikerumor.com/strava-uses-new-maching-learning-models-to-catch-cheaters/
- OneUptime — UGC moderation pipeline (presigned + automated): https://oneuptime.com/blog/post/2026-02-16-content-moderation-user-generated-media-azure-content-safety/view
- AWS Rekognition — Content moderation: https://aws.amazon.com/rekognition/content-moderation/
- Apple — Protecting access to health data: https://support.apple.com/guide/security/protecting-access-to-users-health-data-sec88be9900f/web
