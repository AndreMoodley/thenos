// The complete I Ching (Book of Changes) — the "study" that trains the mind in VOIDBORN.
// Public-domain ancient work; every teaching below is a CONCISE ORIGINAL paraphrase of the
// hexagram's classical sense (no copyrighted translation reproduced). Pure + deterministic;
// the daily contemplation is server-derived, never client-supplied.

export type Trigram = 'heaven' | 'lake' | 'fire' | 'thunder' | 'wind' | 'water' | 'mountain' | 'earth';

// Trigram line patterns, bottom line = least-significant bit (1 = yang, 0 = yin).
const TRI: Record<Trigram, number> = {
  heaven: 0b111, // ☰
  lake: 0b011, // ☱
  fire: 0b101, // ☲
  thunder: 0b001, // ☳
  wind: 0b110, // ☴
  water: 0b010, // ☵
  mountain: 0b100, // ☶
  earth: 0b000, // ☷
};

export interface Hexagram {
  n: number; // King Wen number 1–64
  name: string;
  pinyin: string;
  lower: Trigram;
  upper: Trigram;
  teaching: string; // the studied sense
  reflection: string; // how thought shapes what unfolds
}

export const HEXAGRAMS: readonly Hexagram[] = [
  { n: 1, name: 'The Creative', pinyin: 'Qián', lower: 'heaven', upper: 'heaven', teaching: 'Tireless, disciplined initiative — the origin of all movement.', reflection: 'What the mind holds with constancy, it calls into being.' },
  { n: 2, name: 'The Receptive', pinyin: 'Kūn', lower: 'earth', upper: 'earth', teaching: 'Yielding strength: receive, support, and carry through.', reflection: 'An open mind shapes the world by what it makes room for.' },
  { n: 3, name: 'Difficulty at the Beginning', pinyin: 'Zhūn', lower: 'thunder', upper: 'water', teaching: 'First sprouting through hard ground — order from chaos, slowly.', reflection: 'Beginnings feel impossible until the first patient thought takes root.' },
  { n: 4, name: 'Youthful Folly', pinyin: 'Méng', lower: 'water', upper: 'mountain', teaching: 'The student who does not yet know they must ask.', reflection: 'Reality answers the mind that admits it does not know.' },
  { n: 5, name: 'Waiting', pinyin: 'Xū', lower: 'heaven', upper: 'water', teaching: 'Strength that waits with confidence, nourished, unhurried.', reflection: 'Calm certainty in the mind ripens the right moment to act.' },
  { n: 6, name: 'Conflict', pinyin: 'Sòng', lower: 'water', upper: 'heaven', teaching: 'Opposition met halfway; do not push a quarrel to the end.', reflection: 'The mind that seeks to win less, resolves more.' },
  { n: 7, name: 'The Army', pinyin: 'Shī', lower: 'water', upper: 'earth', teaching: 'Discipline organizes force toward a just aim.', reflection: 'Inner order marshals scattered energy into one direction.' },
  { n: 8, name: 'Holding Together', pinyin: 'Bǐ', lower: 'earth', upper: 'water', teaching: 'Union around a sincere centre; belong, and be loyal.', reflection: 'What you hold close in mind, you draw near in life.' },
  { n: 9, name: 'Small Taming', pinyin: 'Xiǎo Chù', lower: 'heaven', upper: 'wind', teaching: 'Gentle restraint shapes great force a little at a time.', reflection: 'Small steady intentions tame what raw will cannot.' },
  { n: 10, name: 'Treading', pinyin: 'Lǚ', lower: 'lake', upper: 'heaven', teaching: 'Walk carefully on the tiger’s tail — conduct with courtesy.', reflection: 'A composed mind crosses danger that panic would trigger.' },
  { n: 11, name: 'Peace', pinyin: 'Tài', lower: 'heaven', upper: 'earth', teaching: 'Heaven and earth meet; harmony, flow, good fortune.', reflection: 'When inner and outer agree, the world opens easily.' },
  { n: 12, name: 'Standstill', pinyin: 'Pǐ', lower: 'earth', upper: 'heaven', teaching: 'Heaven and earth draw apart; withdraw, keep integrity.', reflection: 'When the world stalls, the mind keeps its own clear order.' },
  { n: 13, name: 'Fellowship', pinyin: 'Tóng Rén', lower: 'fire', upper: 'heaven', teaching: 'Open community founded on shared, visible aims.', reflection: 'Thoughts spoken in the open gather the people who share them.' },
  { n: 14, name: 'Great Possession', pinyin: 'Dà Yǒu', lower: 'heaven', upper: 'fire', teaching: 'Abundance held with humility and clear sight.', reflection: 'What you can hold in mind without grasping, you keep.' },
  { n: 15, name: 'Modesty', pinyin: 'Qiān', lower: 'mountain', upper: 'earth', teaching: 'The mountain beneath the earth — greatness that lowers itself.', reflection: 'A modest mind has room to grow that pride seals off.' },
  { n: 16, name: 'Enthusiasm', pinyin: 'Yù', lower: 'earth', upper: 'thunder', teaching: 'Movement that inspires, in tune with the moment.', reflection: 'Aligned intention moves others before a word is said.' },
  { n: 17, name: 'Following', pinyin: 'Suí', lower: 'thunder', upper: 'lake', teaching: 'Lead by adapting; be worth following, and follow what is true.', reflection: 'The mind that serves the moment is the one the moment serves.' },
  { n: 18, name: 'Work on the Decayed', pinyin: 'Gǔ', lower: 'wind', upper: 'mountain', teaching: 'Repair what neglect has spoiled — patient, thorough renewal.', reflection: 'Decay began as a thought left untended; so does repair.' },
  { n: 19, name: 'Approach', pinyin: 'Lín', lower: 'lake', upper: 'earth', teaching: 'Greatness drawing near; act while the way is open.', reflection: 'Attention turned toward a thing makes it approachable.' },
  { n: 20, name: 'Contemplation', pinyin: 'Guān', lower: 'earth', upper: 'wind', teaching: 'Stand still and truly see — observe before you move.', reflection: 'The mind that contemplates clearly already begins to change what it sees.' },
  { n: 21, name: 'Biting Through', pinyin: 'Shì Kè', lower: 'thunder', upper: 'fire', teaching: 'Bite through the obstacle; decisive justice clears the way.', reflection: 'A clear judgment in the mind ends what hesitation prolongs.' },
  { n: 22, name: 'Grace', pinyin: 'Bì', lower: 'fire', upper: 'mountain', teaching: 'Beauty and form that adorn without hiding substance.', reflection: 'How you frame a thing in thought shapes how it is met.' },
  { n: 23, name: 'Splitting Apart', pinyin: 'Bō', lower: 'earth', upper: 'mountain', teaching: 'Decline at the top; yield, conserve, do not strive now.', reflection: 'When things fall away, hold the mind steady at the root.' },
  { n: 24, name: 'Return', pinyin: 'Fù', lower: 'thunder', upper: 'earth', teaching: 'The turning point; light returns after the dark.', reflection: 'One small renewed thought turns the whole tide.' },
  { n: 25, name: 'Innocence', pinyin: 'Wú Wàng', lower: 'thunder', upper: 'heaven', teaching: 'Act from the spontaneous true nature, without calculation.', reflection: 'A mind without ulterior motive moves in time with heaven.' },
  { n: 26, name: 'Great Taming', pinyin: 'Dà Chù', lower: 'heaven', upper: 'mountain', teaching: 'Hold great power in reserve; store strength, study the past.', reflection: 'Restraint held in mind today is force released well tomorrow.' },
  { n: 27, name: 'Nourishment', pinyin: 'Yí', lower: 'thunder', upper: 'mountain', teaching: 'Mind what you take in and what you give out.', reflection: 'You become the thoughts and words you feed yourself.' },
  { n: 28, name: 'Great Exceeding', pinyin: 'Dà Guò', lower: 'wind', upper: 'lake', teaching: 'The ridgepole bends under too much weight — act, but lighten the load.', reflection: 'When a mind is overloaded, set the burden down before it breaks.' },
  { n: 29, name: 'The Abysmal', pinyin: 'Kǎn', lower: 'water', upper: 'water', teaching: 'Danger upon danger; flow like water, true to yourself, and pass through.', reflection: 'Steadiness of mind makes the depth a passage, not a trap.' },
  { n: 30, name: 'The Clinging', pinyin: 'Lí', lower: 'fire', upper: 'fire', teaching: 'Radiance that depends on what it rests upon; clarity, dependence.', reflection: 'A clear mind, like fire, must cling to something true to shine.' },
  { n: 31, name: 'Influence', pinyin: 'Xián', lower: 'mountain', upper: 'lake', teaching: 'Gentle mutual attraction; move others by being moved rightly.', reflection: 'An open, still mind influences without forcing.' },
  { n: 32, name: 'Duration', pinyin: 'Héng', lower: 'wind', upper: 'thunder', teaching: 'Endurance through change; constancy of direction, not of form.', reflection: 'A lasting aim, held daily in mind, outlasts every mood.' },
  { n: 33, name: 'Retreat', pinyin: 'Dùn', lower: 'mountain', upper: 'heaven', teaching: 'Withdraw in good order while you still can; timing, not fear.', reflection: 'Knowing when to step back is a discipline of the mind.' },
  { n: 34, name: 'Great Power', pinyin: 'Dà Zhuàng', lower: 'heaven', upper: 'thunder', teaching: 'Great strength — use it only in accord with what is right.', reflection: 'Power without a governed mind breaks the one who wields it.' },
  { n: 35, name: 'Progress', pinyin: 'Jìn', lower: 'earth', upper: 'fire', teaching: 'The sun rising over the earth; easy, rapid advance.', reflection: 'A bright, clear intention accelerates everything beneath it.' },
  { n: 36, name: 'Darkening of the Light', pinyin: 'Míng Yí', lower: 'fire', upper: 'earth', teaching: 'Light wounded and hidden; keep your inner brightness, veil it outwardly.', reflection: 'In dark times the mind guards its own light to survive.' },
  { n: 37, name: 'The Family', pinyin: 'Jiā Rén', lower: 'fire', upper: 'wind', teaching: 'Order within the home; each role true, warmth with structure.', reflection: 'Right relation begins in how the mind orders its own house.' },
  { n: 38, name: 'Opposition', pinyin: 'Kuí', lower: 'lake', upper: 'fire', teaching: 'Estrangement; find the small common ground amid difference.', reflection: 'Two minds at odds still share more than they think.' },
  { n: 39, name: 'Obstruction', pinyin: 'Jiǎn', lower: 'mountain', upper: 'water', teaching: 'An obstacle ahead; halt, turn inward, gather allies.', reflection: 'When blocked outwardly, work on yourself; the way often clears itself.' },
  { n: 40, name: 'Deliverance', pinyin: 'Xiè', lower: 'water', upper: 'thunder', teaching: 'The storm breaks the tension; release, forgive, move on.', reflection: 'Letting a held thought go frees energy the knot consumed.' },
  { n: 41, name: 'Decrease', pinyin: 'Sǔn', lower: 'lake', upper: 'mountain', teaching: 'Diminish below to strengthen above; simplify, give up excess.', reflection: 'Cut a thought to its essence and it gains true force.' },
  { n: 42, name: 'Increase', pinyin: 'Yì', lower: 'thunder', upper: 'wind', teaching: 'Abundance flowing down to those below; act while it favours.', reflection: 'A generous mind multiplies what a guarded one would lose.' },
  { n: 43, name: 'Breakthrough', pinyin: 'Guài', lower: 'heaven', upper: 'lake', teaching: 'Resolute breakthrough; name the wrong openly, act with care.', reflection: 'A clearly resolved mind dissolves what long resistance could not.' },
  { n: 44, name: 'Coming to Meet', pinyin: 'Gòu', lower: 'wind', upper: 'heaven', teaching: 'A small influence arrives; meet it early, before it grows.', reflection: 'Notice the seed thought before it becomes a season.' },
  { n: 45, name: 'Gathering Together', pinyin: 'Cuì', lower: 'earth', upper: 'lake', teaching: 'People gather around a centre; unite for a shared purpose.', reflection: 'A held, sincere aim becomes a place others gather toward.' },
  { n: 46, name: 'Pushing Upward', pinyin: 'Shēng', lower: 'wind', upper: 'earth', teaching: 'Effort that rises steadily like a tree; small, faithful, upward.', reflection: 'Daily small ascents of mind reach heights leaps cannot.' },
  { n: 47, name: 'Oppression', pinyin: 'Kùn', lower: 'water', upper: 'lake', teaching: 'Exhausted and confined; stay true, speak little, endure.', reflection: 'When hemmed in, the free mind is the one thing none can confine.' },
  { n: 48, name: 'The Well', pinyin: 'Jǐng', lower: 'wind', upper: 'water', teaching: 'The unchanging source that nourishes all; keep it clear.', reflection: 'Tend the well of the mind; what is drawn from it feeds everything.' },
  { n: 49, name: 'Revolution', pinyin: 'Gé', lower: 'fire', upper: 'lake', teaching: 'Necessary change at the right time; molt the old skin.', reflection: 'A mind ready to shed its old shape can be remade.' },
  { n: 50, name: 'The Cauldron', pinyin: 'Dǐng', lower: 'wind', upper: 'fire', teaching: 'Transformation and nourishment; raw made fit by fire.', reflection: 'The mind cooks raw experience into wisdom worth serving.' },
  { n: 51, name: 'The Arousing', pinyin: 'Zhèn', lower: 'thunder', upper: 'thunder', teaching: 'Shock and thunder; startle, then steady — keep composure.', reflection: 'A mind that stays centred in the shock loses nothing in it.' },
  { n: 52, name: 'Keeping Still', pinyin: 'Gèn', lower: 'mountain', upper: 'mountain', teaching: 'Stillness like a mountain; quiet the thoughts, rest the back.', reflection: 'When the mind is truly still, only the necessary remains.' },
  { n: 53, name: 'Development', pinyin: 'Jiàn', lower: 'mountain', upper: 'wind', teaching: 'Gradual progress like a tree on a hill; step by patient step.', reflection: 'Lasting change of mind comes slowly, in its proper order.' },
  { n: 54, name: 'The Marrying Maiden', pinyin: 'Guī Mèi', lower: 'lake', upper: 'thunder', teaching: 'Entering a relation from a lesser place; know your role, keep dignity.', reflection: 'Right understanding of your position keeps the mind unshaken.' },
  { n: 55, name: 'Abundance', pinyin: 'Fēng', lower: 'fire', upper: 'thunder', teaching: 'Peak fullness like high noon; enjoy it, knowing it will turn.', reflection: 'Hold abundance lightly in mind and it does not blind you.' },
  { n: 56, name: 'The Wanderer', pinyin: 'Lǚ', lower: 'mountain', upper: 'fire', teaching: 'A stranger in transit; travel light, stay courteous and alert.', reflection: 'A mind that clings to nothing passes safely through anywhere.' },
  { n: 57, name: 'The Gentle', pinyin: 'Xùn', lower: 'wind', upper: 'wind', teaching: 'Penetrating wind; gentle, persistent influence works deep.', reflection: 'A soft, repeated thought reaches where force is turned away.' },
  { n: 58, name: 'The Joyous', pinyin: 'Duì', lower: 'lake', upper: 'lake', teaching: 'Joy shared and sincere; gladness that encourages others.', reflection: 'A glad mind, freely shared, opens doors a closed one bars.' },
  { n: 59, name: 'Dispersion', pinyin: 'Huàn', lower: 'water', upper: 'wind', teaching: 'Dissolve hardness and division; let rigidity melt and flow.', reflection: 'Loosen a fixed thought and what was stuck begins to move.' },
  { n: 60, name: 'Limitation', pinyin: 'Jié', lower: 'lake', upper: 'water', teaching: 'Helpful limits like the joints of bamboo; measure, do not stint.', reflection: 'Chosen limits free the mind that boundless choice would drown.' },
  { n: 61, name: 'Inner Truth', pinyin: 'Zhōng Fú', lower: 'lake', upper: 'wind', teaching: 'Sincerity at the centre that moves even the unseen.', reflection: 'A truthful mind reaches others below the level of words.' },
  { n: 62, name: 'Small Exceeding', pinyin: 'Xiǎo Guò', lower: 'mountain', upper: 'thunder', teaching: 'Attend to small things; exceed modestly, do not overreach.', reflection: 'Care in small thoughts prevents large errors quietly.' },
  { n: 63, name: 'After Completion', pinyin: 'Jì Jì', lower: 'fire', upper: 'water', teaching: 'Order achieved, but fragile; stay vigilant, things can slip.', reflection: 'A finished thought still needs a watchful mind to hold its shape.' },
  { n: 64, name: 'Before Completion', pinyin: 'Wèi Jì', lower: 'water', upper: 'fire', teaching: 'Almost across; the last careful step decides everything.', reflection: 'At the threshold, one focused thought completes the crossing.' },
];

// pattern (0–63) → hexagram, built from the trigram pairs. The bijection (all 64 distinct) is
// asserted at module load and unit-tested.
const PATTERN_TO_HEX = new Map<number, Hexagram>();
for (const h of HEXAGRAMS) {
  const pattern = TRI[h.lower] | (TRI[h.upper] << 3);
  PATTERN_TO_HEX.set(pattern, h);
}
if (PATTERN_TO_HEX.size !== 64) {
  throw new Error(`I Ching table is not a bijection: ${PATTERN_TO_HEX.size}/64 distinct patterns`);
}

export const TOTAL_HEXAGRAMS = HEXAGRAMS.length;
export function glyph(n: number): string {
  return String.fromCodePoint(0x4dc0 + n - 1); // ䷀ (U+4DC0) is hexagram 1
}
export function hexagramByNumber(n: number): Hexagram {
  const h = HEXAGRAMS[n - 1];
  if (!h) throw new Error(`No hexagram ${n}`);
  return h;
}
function hexFromBits(bits: number[]): Hexagram {
  const pattern = bits.reduce((acc, b, i) => acc | (b << i), 0);
  const h = PATTERN_TO_HEX.get(pattern);
  if (!h) throw new Error(`No hexagram for pattern ${pattern}`);
  return h;
}

export interface Contemplation {
  primary: Hexagram;
  changing: number[]; // line numbers 1–6 that are "old"/changing
  transformed: Hexagram; // where the changing lines carry the situation
}

type RNG = () => number;

/** One cast line via the three-coin distribution: 1/8 old-yin, 3/8 young-yang, 3/8 young-yin, 1/8 old-yang. */
function castLine(r: number): { yang: boolean; changing: boolean } {
  if (r < 1 / 8) return { yang: false, changing: true }; // old yin (6)
  if (r < 1 / 2) return { yang: true, changing: false }; // young yang (7)
  if (r < 7 / 8) return { yang: false, changing: false }; // young yin (8)
  return { yang: true, changing: true }; // old yang (9)
}

/** Cast a full reading from an RNG. Pure. */
export function cast(rng: RNG): Contemplation {
  const lines = Array.from({ length: 6 }, () => castLine(rng()));
  const primaryBits = lines.map((l) => (l.yang ? 1 : 0));
  const transformedBits = lines.map((l) => ((l.changing ? !l.yang : l.yang) ? 1 : 0));
  const changing = lines.map((l, i) => (l.changing ? i + 1 : 0)).filter((x) => x > 0);
  return { primary: hexFromBits(primaryBits), changing, transformed: hexFromBits(transformedBits) };
}

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic daily contemplation for a seed (e.g. `${practitionerId}:${utcDate}`). */
export function dailyContemplation(seed: string): Contemplation {
  return cast(mulberry32(hashStr(seed)));
}
