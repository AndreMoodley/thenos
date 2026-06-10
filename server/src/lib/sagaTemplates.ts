// Authored arc templates — the deterministic floor under the Saga Forge. When the model is
// unreachable (or ANTHROPIC_API_KEY is unset) these slot-filled arcs ARE the saga: versioned,
// reviewable code constants, never DB rows. Structure comes from BEAT_SKELETON; these only
// provide flavor (titles/teases/synopsis), exactly like the AI does (invariant #13).

import type { SagaEvent } from './sagaBeats.js';

export interface ArcChapterSpec {
  beatKey: string;
  title: string;
  tease: string;
}

export interface ArcSpec {
  title: string;
  synopsis: string;
  demonName: string;
  chapters: ArcChapterSpec[];
}

export interface SoulProfileLike {
  currentSelf: string;
  higherSelf: string;
  outcome: string;
  obstacleCategory: string;
  obstacleName: string;
  obstacleDetail: string;
  wardPlan: string;
}

export interface StyleDef {
  styleKey: string;
  name: string;
  descriptor: string; // shown on the style card in the Mirror Rite
  diction: string; // voicing hint passed to the Forge prompt
}

export const SAGA_STYLES: readonly StyleDef[] = [
  {
    styleKey: 'murim',
    name: 'Murim Cultivation',
    descriptor: 'Sects, meridians, heart-demons. You temper a mortal shell toward the Dao.',
    diction: 'Korean murim / xianxia cultivation diction: sects, meridians, dao, heart-demons, tribulations, core formation.',
  },
  {
    styleKey: 'isekai',
    name: 'Isekai Rebirth',
    descriptor: 'Another world, a system window, daily quests. Your old life was the prologue.',
    diction: 'Japanese isekai diction: reborn in another world, [SYSTEM] windows, levels, daily quests, dungeon breaks, boss rooms.',
  },
  {
    styleKey: 'tower',
    name: 'The Tower',
    descriptor: 'Each floor has its own rules. The only way out is up.',
    diction: 'Tower-climbing manhwa diction: floors with their own rules, floor guardians, keepers, observation decks, checkpoints.',
  },
  {
    styleKey: 'regression',
    name: 'The Returnee',
    descriptor: 'You remember how this ends. This time, you train.',
    diction: 'Regression manhwa diction: a returnee with memories of a ruined timeline, foreknowledge, rewriting history.',
  },
] as const;

export function styleByKey(styleKey: string): StyleDef {
  return SAGA_STYLES.find((s) => s.styleKey === styleKey) ?? SAGA_STYLES[0]!;
}

type BeatFlavor = Record<string, { title: string; tease: string }>;

const beats = (p: SoulProfileLike): Record<string, BeatFlavor> => ({
  murim: {
    awakening: { title: 'The Mortal Shell Cracks', tease: `One who was "${p.currentSelf}" wakes beneath the sect gates, and something old stirs.` },
    system_window: { title: 'The Manual of Ten Thousand Strikes', tease: 'A training manual opens itself. Every page is a week; every line, a strike not yet struck.' },
    first_gate: { title: 'First Blood at the Outer Gate', tease: 'The outer gate of the sect only opens to one who has actually begun.' },
    tower_floor: { title: 'Ascending the Inner Court', tease: 'The easy forms are behind. The inner court trains differently.' },
    hidden_master: { title: 'The Sweeper of the Seventh Hall', tease: 'Seven days unbroken, and the old sweeper finally looks up.' },
    tribulation_gate: { title: `Heart-Demon Tribulation`, tease: `${p.obstacleName} takes form at last, and it must be faced, not fled.` },
    regression: { title: "The Returner's Second Dawn", tease: 'Some who fall from the path return carrying everything they learned in the dark.' },
    final_ascent: { title: 'Before the Heavenly Gate', tease: 'The sect grows quiet. The final tempering is stillness itself.' },
    breakthrough: { title: 'Core Formation', tease: 'When the gate falls, what walks through is no longer what walked in.' },
    next_path: { title: 'The Dao Continues', tease: 'A realm is not a destination. Somewhere above, another gate waits.' },
  },
  isekai: {
    awakening: { title: 'Reborn Beneath a Strange Sky', tease: `The one called "${p.currentSelf}" died to an old life. Something else opened its eyes.` },
    system_window: { title: '[SYSTEM] Quest Log Initialized', tease: 'A translucent window hangs in the air. It already knows your name.' },
    first_gate: { title: 'The First Daily Quest', tease: 'Every legend in this world began with a single completed quest.' },
    tower_floor: { title: 'The Dungeon Break', tease: 'The tutorial zone collapses. Real difficulty begins.' },
    hidden_master: { title: 'The NPC Who Was More', tease: 'Log in seven days straight and certain characters start saying new things.' },
    tribulation_gate: { title: `Boss Room: ${p.obstacleName}`, tease: 'The door seals behind you. The boss has your face.' },
    regression: { title: 'Loading a Saved Life', tease: 'Death is not deletion here. The save point holds.' },
    final_ascent: { title: 'The Last Safe Zone', tease: 'Before the final raid, the system lowers the volume on the world.' },
    breakthrough: { title: 'Level Cap Shattered', tease: 'The window flashes a number it was never supposed to show.' },
    next_path: { title: 'New Game+', tease: 'The credits do not roll. They never do, for players like you.' },
  },
  tower: {
    awakening: { title: 'The Door at the Bottom of the World', tease: `"${p.currentSelf}" stood before the Tower, and the Tower opened.` },
    system_window: { title: 'Rules of the First Floor', tease: 'Each floor has its own rules. These are yours, written for you alone.' },
    first_gate: { title: 'First Floor Cleared', tease: 'The Tower acknowledges only one currency: a thing actually done.' },
    tower_floor: { title: 'The Floors of Trial', tease: 'The lobby floors end. The Tower starts testing in earnest.' },
    hidden_master: { title: 'The Keeper of the Stairwell', tease: 'Climb seven days without stopping and the Keeper leaves the door ajar.' },
    tribulation_gate: { title: 'The Floor Guardian', tease: `Every climber meets a guardian wearing their weakness. Yours is called ${p.obstacleName}.` },
    regression: { title: 'Back to the Checkpoint', tease: 'Falling is part of climbing. The checkpoint remembers your height.' },
    final_ascent: { title: 'The Observation Deck', tease: 'Near the top, the Tower goes quiet, and you can finally see how far you came.' },
    breakthrough: { title: 'A New Floor of the Self', tease: 'The ceiling was never the Tower. It was the climber.' },
    next_path: { title: 'The Tower Keeps Climbing', tease: 'Above the highest floor you have seen, scaffolding. It builds as you do.' },
  },
  regression: {
    awakening: { title: 'I Remember How This Ends', tease: `The timeline where "${p.currentSelf}" never changed — you have seen it. You came back.` },
    system_window: { title: 'The Plan Only I Know', tease: 'A returnee’s advantage is not strength. It is a schedule written in foreknowledge.' },
    first_gate: { title: 'This Time, I Train', tease: 'In the last life, this day was wasted. Not this one.' },
    tower_floor: { title: 'The Crisis I Foresaw', tease: 'The hard weeks arrive on schedule. You knew they would. That is why you are ready.' },
    hidden_master: { title: 'An Old Ally, Met Early', tease: 'Seven unbroken days — a meeting that took years in the old timeline.' },
    tribulation_gate: { title: 'The Battle I Once Lost', tease: `${p.obstacleName} ended you once, in the life before. It does not know you remember.` },
    regression: { title: 'Even Returners Stumble', tease: 'Foreknowledge is not immunity. The difference is that you know the way back.' },
    final_ascent: { title: 'The Final Days Before the End', tease: 'In the old timeline these days were squandered. Watch what they become instead.' },
    breakthrough: { title: 'History, Rewritten', tease: 'The moment the old timeline finally, permanently, diverges.' },
    next_path: { title: 'A Future Unwritten', tease: 'Past this point, even your memories are blank. Good.' },
  },
});

const SYNOPSES: Record<string, (p: SoulProfileLike) => { title: string; synopsis: string }> = {
  murim: (p) => ({
    title: `Ascension of ${p.higherSelf}`,
    synopsis: `A nameless cultivator once called "${p.currentSelf}" enters the sect to temper body and meridian toward one form: ${p.higherSelf}. But the heart-demon ${p.obstacleName} walks the same halls, and only struck iron — never spoken oaths — will decide who ascends.`,
  }),
  isekai: (p) => ({
    title: `Reborn as ${p.higherSelf}`,
    synopsis: `Truck-kun was a metaphor: the old life of "${p.currentSelf}" ends the moment the window opens. In this world, every completed quest writes the player closer to ${p.higherSelf} — while the hidden boss ${p.obstacleName} farms the hours you leave undefended.`,
  }),
  tower: (p) => ({
    title: `${p.higherSelf} of the Tower`,
    synopsis: `The Tower opens for "${p.currentSelf}" exactly once. Every floor is a week, every cleared quest a step, and somewhere above waits the version of you the Tower built it for: ${p.higherSelf}. The guardian ${p.obstacleName} climbs too — it always does.`,
  }),
  regression: (p) => ({
    title: `The Return of ${p.higherSelf}`,
    synopsis: `You have already lived the timeline where "${p.currentSelf}" never trained, and you remember exactly how it ends. Returned to the divergence point with memories intact, every session is a rewrite — and ${p.obstacleName}, the thing that won last time, does not yet know you remember.`,
  }),
};

/** The deterministic fallback arc — valid against arcSpecSchema for every style × profile. */
export function templateArc(styleKey: string, profile: SoulProfileLike, skeleton: readonly { beatKey: string }[]): ArcSpec {
  const key = SYNOPSES[styleKey] ? styleKey : 'murim';
  const head = SYNOPSES[key]!(profile);
  const flavor = beats(profile)[key]!;
  return {
    title: head.title.slice(0, 80),
    synopsis: head.synopsis.slice(0, 600),
    demonName: profile.obstacleName.slice(0, 60),
    chapters: skeleton.map((b) => ({
      beatKey: b.beatKey,
      title: (flavor[b.beatKey]?.title ?? 'An Unwritten Page').slice(0, 80),
      tease: (flavor[b.beatKey]?.tease ?? 'Something stirs that has no name yet.').slice(0, 200),
    })),
  };
}

/**
 * Deterministic chapter prose at unlock — grounded ONLY in the real unlocking event and the
 * profile. Used offline/keyless, and as the in-transaction floor before any AI refinement.
 */
export function templateChapterProse(
  profile: SoulProfileLike,
  beatKey: string,
  ev: SagaEvent,
  ctx: { realmName: string; trialTitle?: string; totalWeeks?: number },
): string {
  switch (beatKey) {
    case 'awakening':
      return `It begins as all rebirths do: quietly. The one who was "${profile.currentSelf}" names what they are becoming — ${profile.higherSelf} — and names the thing that stands in the way: ${profile.obstacleName}, ${profile.obstacleDetail}. A ward is set against it: ${profile.wardPlan}. The ${ctx.realmName} watches, and waits to be earned.`;
    case 'system_window':
      return `The path takes shape${ctx.trialTitle ? ` — "${ctx.trialTitle}"` : ''}${ctx.totalWeeks ? `, ${ctx.totalWeeks} weeks laid out gate by gate` : ''}. Nothing on it can be bought and nothing can be skipped. It only counts what is actually done.`;
    case 'first_gate':
      return ev.kind === 'planned_fulfilled'
        ? `The first quest falls — a ${ev.planKind} session, real and logged. One is a small number, but every count that matters starts there.`
        : `The first quest falls, real and logged. Every count that matters starts at one.`;
    case 'tower_floor':
      return `The Gathering ends and the Tribulation begins. The work gets heavier from here — which is how you know it matters. Difficulty is not a wall on this path; it is the proof of the path.`;
    case 'hidden_master':
      return ev.kind === 'streak_reached'
        ? `${ev.days} days unbroken. Consistency is the one technique that cannot be taught, only kept — and you are keeping it.`
        : `A week unbroken. Consistency is the one technique that cannot be taught, only kept.`;
    case 'tribulation_gate':
      return `A Gate stood in the week and did not move, so you moved. ${profile.obstacleName} was somewhere in the room when you cleared it — it always is — and it watched you do it anyway.`;
    case 'regression':
      return ev.kind === 'returned_after_gap'
        ? `${ev.gapDays} days of silence, and then a return. Falling off the path is a fact; returning to it is a choice, and the rarer of the two. The path re-opens where you stand.`
        : `A silence, and then a return. The path re-opens where you stand.`;
    case 'final_ascent':
      return `The Quieting. The volume falls away and what remains is sharp and short. This stillness is not rest — it is the drawn breath before the gate.`;
    case 'breakthrough':
      return ev.kind === 'realm_crossed'
        ? `A threshold crossed into the ${ctx.realmName}. Not granted, not purchased — struck into being, strike by strike, by the one who kept showing up.`
        : `The trial is kept. What walked in as a plan walks out as a fact, and the entity wears the difference.`;
    case 'next_path':
      return `The vow is kept and stands in the Chronicle now, permanent. But a chronicle is not a tombstone — somewhere past this page, another path is already unrolling.`;
    default:
      return `Something real happened, and the Chronicle recorded it.`;
  }
}
