import { Rng, pick, hashString } from './rng';
import artFiles from './cards.art.json';
import customCards from './cards.custom.json';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'singularity';

export interface RarityDef {
  key: Rarity;
  name: string;
  /** Probability that a single pack slot rolls this rarity. Sums to 1. */
  weight: number;
  color: string;
  rank: number;
}

export const RARITIES: RarityDef[] = [
  { key: 'common', name: 'Common', weight: 0.55, color: '#9aa3b2', rank: 0 },
  { key: 'uncommon', name: 'Uncommon', weight: 0.27, color: '#5fd48a', rank: 1 },
  { key: 'rare', name: 'Rare', weight: 0.12, color: '#4aa8ff', rank: 2 },
  { key: 'epic', name: 'Epic', weight: 0.045, color: '#b56cff', rank: 3 },
  { key: 'legendary', name: 'Legendary', weight: 0.012, color: '#ffb347', rank: 4 },
  { key: 'mythic', name: 'Mythic', weight: 0.00299, color: '#ff4d8d', rank: 5 },
  { key: 'singularity', name: 'Singularity', weight: 0.00001, color: '#f3f1e8', rank: 6 },
];

export const rarityDef = (r: Rarity): RarityDef => RARITIES.find((d) => d.key === r)!;

export type Domain =
  | 'Arithmetic' | 'Algebra' | 'Geometry' | 'Number Theory' | 'Analysis' | 'Logic'
  | 'Probability' | 'Combinatorics' | 'Sequences' | 'Topology' | 'Infinity';

export const DOMAIN_COLORS: Record<Domain, string> = {
  Arithmetic: '#ffb347', Algebra: '#b56cff', Geometry: '#3ee0c7', 'Number Theory': '#4aa8ff',
  Analysis: '#ff5c3a', Logic: '#f2c14e', Probability: '#5fd48a', Combinatorics: '#ff4d8d',
  Sequences: '#ffd166', Topology: '#8ef0ff', Infinity: '#f3f1e8',
};

/** Where a card comes from. Only 'pack' cards can drop from packs. */
export type CardSource = 'pack' | 'season' | 'story' | 'plus';

export interface CardDef {
  id: string;
  name: string;
  kind: 'beast' | 'character';
  rarity: Rarity;
  domain: Domain;
  /** Mathematical glyph used by the generated emblem until real splash art exists in /public/cards/<id>.webp. */
  symbol: string;
  flavor: string;
  power: number;
  source: CardSource;
  /** URL of real splash art (from public/cards), if any. */
  art?: string;
}

const c = (id: string, name: string, kind: CardDef['kind'], rarity: Rarity, domain: Domain, symbol: string, power: number, flavor: string, source: CardSource = 'pack'): CardDef =>
  ({ id, name, kind, rarity, domain, symbol, power, flavor, source });

/** Hand-written roster. Cards from public/cards (see cards.art.json) are merged in below. */
const BUILTIN: CardDef[] = [
  // ─────────────────────────── Common (32)
  c('digit-mouse', 'Digit Mouse', 'beast', 'common', 'Arithmetic', '1', 12, 'Counts every crumb twice, just to be sure.'),
  c('tally-hare', 'Tally Hare', 'beast', 'common', 'Arithmetic', '#', 15, 'Four hops, then a slash through them.'),
  c('abacus-beetle', 'Abacus Beetle', 'beast', 'common', 'Arithmetic', '⋮', 14, 'Slides its beads with six legs at once.'),
  c('sum-sparrow', 'Sum Sparrow', 'beast', 'common', 'Arithmetic', '+', 13, 'Adds seeds faster than it eats them.'),
  c('carry-crab', 'Carry Crab', 'beast', 'common', 'Arithmetic', '↑', 18, 'Never forgets to carry the one.'),
  c('minus-mole', 'Minus Mole', 'beast', 'common', 'Arithmetic', '−', 14, 'Digs a little less every day and calls it progress.'),
  c('times-tarsier', 'Times Tarsier', 'beast', 'common', 'Arithmetic', '×', 17, 'Its eyes multiply everything they see.'),
  c('quotient-quail', 'Quotient Quail', 'beast', 'common', 'Arithmetic', '÷', 16, 'Shares the seed evenly. Keeps the remainder.'),
  c('decimal-duck', 'Decimal Duck', 'beast', 'common', 'Arithmetic', '.', 13, 'Knows exactly where the point goes.'),
  c('half-hedgehog', 'Half Hedgehog', 'beast', 'common', 'Arithmetic', '½', 15, 'Always rolls up exactly halfway.'),
  c('estimate-emu', 'Estimate Emu', 'beast', 'common', 'Arithmetic', '≈', 14, 'Close enough, and remarkably fast about it.'),
  c('dozen-donkey', 'Dozen Donkey', 'beast', 'common', 'Arithmetic', '12', 16, 'Carries eggs in twelves. Never thirteen.'),
  c('place-value-pika', 'Place Value Pika', 'beast', 'common', 'Arithmetic', '10', 15, 'Hundreds, tens, ones. Squeak.'),
  c('rounding-rabbit', 'Rounding Rabbit', 'beast', 'common', 'Arithmetic', '≃', 13, 'Five and up, it hops up.'),
  c('chalk-kitten', 'Chalk Kitten', 'beast', 'common', 'Arithmetic', '=', 12, 'Knocks the eraser off the board every time.'),
  c('clock-cricket', 'Clock Cricket', 'beast', 'common', 'Arithmetic', '60', 15, 'Chirps exactly sixty times a minute.'),
  c('even-toad', 'Even Toad', 'beast', 'common', 'Number Theory', '2', 16, 'Only sits on lily pads in pairs.'),
  c('odd-newt', 'Odd Newt', 'beast', 'common', 'Number Theory', '3', 16, 'The one left over. Proud of it.'),
  c('zero-zebra', 'Zero Zebra', 'beast', 'common', 'Number Theory', '0', 17, 'Adds nothing to the herd and the herd is grateful.'),
  c('grid-goat', 'Grid Goat', 'beast', 'common', 'Geometry', '⌗', 17, 'Climbs anything with coordinates.'),
  c('compass-flamingo', 'Compass Flamingo', 'beast', 'common', 'Geometry', '◠', 19, 'One leg planted, the other draws a perfect arc.'),
  c('tangram-turtle', 'Tangram Turtle', 'beast', 'common', 'Geometry', '◧', 20, 'Seven pieces of shell, infinite shapes.'),
  c('angle-ant', 'Angle Ant', 'beast', 'common', 'Geometry', '∠', 14, 'Turns exactly ninety degrees at every corner.'),
  c('ruler-rat', 'Ruler Rat', 'beast', 'common', 'Geometry', '|', 13, 'Its tail is precisely thirty centimetres.'),
  c('symmetry-swan', 'Symmetry Swan', 'beast', 'common', 'Geometry', '⋈', 19, 'Its reflection is the only one it trusts.'),
  c('pencil-pup', 'Pencil Pup', 'beast', 'common', 'Logic', '?', 11, 'Fetches the right answer. Eventually.'),
  c('venn-vole', 'Venn Vole', 'beast', 'common', 'Logic', '∩', 15, 'Lives in the overlap of two burrows.'),
  c('true-toucan', 'True Toucan', 'beast', 'common', 'Logic', '✓', 14, 'Never says anything false. Rarely says anything.'),
  c('dice-raccoon', 'Dice Raccoon', 'beast', 'common', 'Probability', '⚄', 21, 'Steals your dice and rolls a six. Somehow.'),
  c('coin-koala', 'Coin Koala', 'beast', 'common', 'Probability', '◐', 15, 'Heads it sleeps, tails it sleeps.'),
  c('pattern-parrot', 'Pattern Parrot', 'beast', 'common', 'Sequences', '…', 16, 'Repeats what comes next before you say it.'),
  c('count-caterpillar', 'Count Caterpillar', 'beast', 'common', 'Sequences', 'n', 14, 'One more leg every day. Ask it how many.'),

  // ─────────────────────────── Uncommon (26)
  c('fibonacci-fox', 'Fibonacci Fox', 'beast', 'uncommon', 'Sequences', 'F', 34, 'Each litter is the sum of the last two.'),
  c('prime-porcupine', 'Prime Porcupine', 'beast', 'uncommon', 'Number Theory', 'p', 38, 'Its quills cannot be divided. Do not try.'),
  c('fraction-gator', 'Fraction Gator', 'beast', 'uncommon', 'Arithmetic', '¾', 33, 'Takes three-quarters of everything.'),
  c('vector-viper', 'Vector Viper', 'beast', 'uncommon', 'Geometry', '→', 36, 'Has magnitude. Has direction. Has fangs.'),
  c('modulo-beaver', 'Modulo Beaver', 'beast', 'uncommon', 'Number Theory', '≡', 35, 'Keeps only the remainder of every log.'),
  c('radical-ram', 'Radical Ram', 'beast', 'uncommon', 'Algebra', '√', 40, 'Roots for everyone. Square ones.'),
  c('percent-panda', 'Percent Panda', 'beast', 'uncommon', 'Arithmetic', '%', 32, 'Eats 100% of the bamboo, 25% at a time.'),
  c('axis-owl', 'Axis Owl', 'beast', 'uncommon', 'Geometry', '⊥', 41, 'Turns its head to every quadrant.'),
  c('binary-bat', 'Binary Bat', 'beast', 'uncommon', 'Logic', '01', 37, 'Sees the world in ones and zeros.'),
  c('factorial-otter', 'Factorial Otter', 'beast', 'uncommon', 'Combinatorics', '!', 39, 'Arranges its pebbles every possible way.'),
  c('pascals-pigeon', "Pascal's Pigeon", 'beast', 'uncommon', 'Combinatorics', '△', 42, 'Nests in the triangle. Always in a hole.'),
  c('sigma-stag', 'Sigma Stag', 'beast', 'uncommon', 'Analysis', '∑', 44, 'Its antlers add up.'),
  c('ratio-raven', 'Ratio Raven', 'beast', 'uncommon', 'Arithmetic', ':', 33, 'Two of these for every three of those.'),
  c('power-puma', 'Power Puma', 'beast', 'uncommon', 'Algebra', 'x²', 40, 'Doubles its speed, quadruples its pounce.'),
  c('negative-narwhal', 'Negative Narwhal', 'beast', 'uncommon', 'Arithmetic', '−1', 35, 'Swims below zero and feels right at home.'),
  c('perimeter-python', 'Perimeter Python', 'beast', 'uncommon', 'Geometry', '▭', 36, 'Wraps around the whole shape exactly once.'),
  c('area-armadillo', 'Area Armadillo', 'beast', 'uncommon', 'Geometry', '▦', 37, 'Covers the floor tile by tile.'),
  c('volume-vulture', 'Volume Vulture', 'beast', 'uncommon', 'Geometry', '▣', 38, 'Circles anything with three dimensions.'),
  c('mean-meerkat', 'Mean Meerkat', 'beast', 'uncommon', 'Probability', 'μ', 34, 'Stands exactly in the middle of the group.'),
  c('median-manatee', 'Median Manatee', 'beast', 'uncommon', 'Probability', 'M', 33, 'Half the river is above it, half below.'),
  c('slope-salamander', 'Slope Salamander', 'beast', 'uncommon', 'Algebra', 'm', 36, 'Rise over run, then a nap in the sun.'),
  c('linear-lemur', 'Linear Lemur', 'beast', 'uncommon', 'Algebra', 'x', 35, 'Leaps in straight lines only.'),
  c('inequality-ibex', 'Inequality Ibex', 'beast', 'uncommon', 'Algebra', '<', 37, 'Always on the greater side of the cliff.'),
  c('gcd-gecko', 'GCD Gecko', 'beast', 'uncommon', 'Number Theory', '⋂', 39, 'Finds what two walls have in common.'),
  c('square-squirrel', 'Square Squirrel', 'beast', 'uncommon', 'Number Theory', '□', 34, 'Stores 1, 4, 9, 16 acorns. No exceptions.'),
  c('cube-capybara', 'Cube Capybara', 'beast', 'uncommon', 'Number Theory', '∛', 38, 'Calm in all three dimensions.'),

  // ─────────────────────────── Rare (20)
  c('hypatia', 'Hypatia, Star Reader', 'character', 'rare', 'Geometry', '☆', 52, 'Charted the heavens from Alexandria.'),
  c('euclid', 'Euclid, Keeper of Axioms', 'character', 'rare', 'Geometry', '∥', 55, 'Five postulates. Two thousand years of proof.'),
  c('pythagoras', 'Pythagoras, the Harmonist', 'character', 'rare', 'Geometry', 'a²', 54, 'Heard numbers in every plucked string.'),
  c('thales', 'Thales of Miletus', 'character', 'rare', 'Geometry', '∆', 50, 'Measured a pyramid with its shadow.'),
  c('brahmagupta', 'Brahmagupta, Keeper of Zero', 'character', 'rare', 'Number Theory', '0', 53, 'Gave nothing a name and rules to live by.'),
  c('leonardo-pisa', 'Leonardo of Pisa', 'character', 'rare', 'Sequences', 'φ', 51, 'Brought the numerals west and the rabbits with them.'),
  c('mobius-moth', 'Möbius Moth', 'beast', 'rare', 'Topology', '∞', 50, 'One wing. One side. No way to tell.'),
  c('golden-griffin', 'Golden Ratio Griffin', 'beast', 'rare', 'Sequences', 'φ', 53, 'Every feather is 1.618 times the last.'),
  c('tessellation-tiger', 'Tessellation Tiger', 'beast', 'rare', 'Geometry', '⬡', 51, 'Its stripes tile the plane with no gaps.'),
  c('logarithm-lynx', 'Logarithm Lynx', 'beast', 'rare', 'Analysis', 'ln', 49, 'Turns multiplication into a gentle walk.'),
  c('matrix-mammoth', 'Matrix Mammoth', 'beast', 'rare', 'Algebra', '[ ]', 58, 'Rows and columns of tusk.'),
  c('bayes-bison', "Bayes' Bison", 'beast', 'rare', 'Probability', 'P', 54, 'Updates its beliefs before it charges.'),
  c('chance-chameleon', 'Chance Chameleon', 'beast', 'rare', 'Probability', '⚅', 48, 'Its colour is a random variable.'),
  c('exponent-elk', 'Exponent Elk', 'beast', 'rare', 'Algebra', 'eˣ', 52, 'Grows faster the bigger it gets.'),
  c('quadratic-quokka', 'Quadratic Quokka', 'beast', 'rare', 'Algebra', 'Δ', 50, 'Smiles at both roots equally.'),
  c('parabola-panther', 'Parabola Panther', 'beast', 'rare', 'Algebra', '∪', 55, 'Every leap is a perfect curve.'),
  c('circle-cobra', 'Circle Cobra', 'beast', 'rare', 'Geometry', 'π', 56, 'Coils exactly 3.14159 times around its prey.'),
  c('permutation-peacock', 'Permutation Peacock', 'beast', 'rare', 'Combinatorics', 'nPr', 53, 'Never displays its feathers in the same order.'),
  c('inverse-ibis', 'Inverse Ibis', 'beast', 'rare', 'Algebra', 'x⁻¹', 49, 'Undoes whatever the last bird did.'),
  c('limit-lion', 'Limit Lion', 'beast', 'rare', 'Analysis', 'lim', 57, 'Gets arbitrarily close. Never quite pounces.'),

  // ─────────────────────────── Epic (14)
  c('al-khwarizmi', 'Al-Khwarizmi, the Algorist', 'character', 'epic', 'Algebra', 'ال', 66, 'Gave algebra its name and the world its algorithms.'),
  c('gauss', 'Gauss, Prince of Numbers', 'character', 'epic', 'Number Theory', '∑', 72, 'Summed one to a hundred before the teacher sat down.'),
  c('ada', 'Ada, Enchantress of Numbers', 'character', 'epic', 'Logic', 'λ', 69, 'Wrote the first program for a machine that did not yet exist.'),
  c('descartes', 'Descartes, Lord of Coordinates', 'character', 'epic', 'Geometry', '(x,y)', 67, 'Pinned every point in the plane to a pair of numbers.'),
  c('fermat', 'Fermat, the Margin Writer', 'character', 'epic', 'Number Theory', 'xⁿ', 70, 'Had a truly marvellous proof. The margin was too small.'),
  c('pascal', 'Pascal, Weigher of Chance', 'character', 'epic', 'Probability', 'C', 66, 'Turned a gambler’s question into a science.'),
  c('newton', 'Newton, the Fluxion Master', 'character', 'epic', 'Analysis', 'ẋ', 73, 'Saw the apple fall and wrote down why.'),
  c('leibniz', 'Leibniz, Scribe of the Integral', 'character', 'epic', 'Analysis', '∫', 72, 'Drew a long S and the area beneath every curve.'),
  c('germain', 'Sophie Germain, the Hidden Prime', 'character', 'epic', 'Number Theory', '2p+1', 68, 'Wrote as Monsieur Le Blanc until the mathematics spoke for her.'),
  c('galois', 'Galois, Duelist of Symmetry', 'character', 'epic', 'Algebra', 'G', 71, 'Wrote down group theory the night before the duel.'),
  c('turing', 'Turing, the Decoder', 'character', 'epic', 'Logic', '⊢', 71, 'Asked whether a machine could think, then built one.'),
  c('prime-hydra', 'Prime Hydra', 'beast', 'epic', 'Number Theory', '7', 70, 'Cut one head and two indivisible ones grow back.'),
  c('infinity-kraken', 'Infinity Kraken', 'beast', 'epic', 'Infinity', '∞', 68, 'Countably many arms. Uncountably many suckers.'),
  c('fractal-kirin', 'Fractal Kirin', 'beast', 'epic', 'Geometry', '❄', 71, 'Look closer. It is still a kirin.'),

  // ─────────────────────────── Legendary (8)
  c('euler', 'Euler, Master of Us All', 'character', 'legendary', 'Analysis', 'e', 84, 'e to the i pi, plus one, is zero. He wrote everything else too.'),
  c('ramanujan', 'Ramanujan, the Dreamer', 'character', 'legendary', 'Number Theory', '1729', 82, '1729. Not a dull number at all.'),
  c('noether', 'Noether, Queen of Symmetry', 'character', 'legendary', 'Algebra', '≅', 83, 'Every symmetry hides a conserved quantity.'),
  c('hilbert', 'Hilbert, Keeper of Problems', 'character', 'legendary', 'Logic', 'H', 81, 'Twenty-three questions that shaped a century.'),
  c('cantor', 'Cantor, Counter of Infinities', 'character', 'legendary', 'Infinity', 'ℵ', 85, 'Proved some infinities are bigger than others.'),
  c('kovalevskaya', 'Kovalevskaya, the Spinning Top', 'character', 'legendary', 'Analysis', '∂', 82, 'Solved the top that would not stop spinning.'),
  c('erdos', 'Erdős, the Wandering Prover', 'character', 'legendary', 'Combinatorics', 'ε', 83, 'A mathematician is a machine for turning coffee into theorems.'),
  c('zeta-leviathan', 'Zeta Leviathan', 'beast', 'legendary', 'Analysis', 'ζ', 86, 'Sleeps on the critical line. Do not wake it.'),

  // ─────────────────────────── Mythic (4)
  c('archimedes', 'Archimedes, Eureka Incarnate', 'character', 'mythic', 'Geometry', 'π', 93, 'Give him a lever and he will move the arena.'),
  c('godel', 'Gödel, the Incompleteness', 'character', 'mythic', 'Logic', '⊬', 94, 'Proved that some truths can never be proved.'),
  c('riemann-wyrm', 'Riemann Wyrm', 'beast', 'mythic', 'Analysis', '½', 95, 'Its zeros are exactly where you fear they are.'),
  c('aleph-behemoth', 'Aleph Behemoth', 'beast', 'mythic', 'Infinity', 'ℵ₀', 92, 'You can count its scales forever and never finish.'),

  // ─────────────────────────── Singularity (1)
  c('omega', 'Ω, the Absolute Infinite', 'beast', 'singularity', 'Infinity', 'Ω', 100, 'Larger than every set. Including the set of people who own this card.'),

  // ─────────────────────────── Not in packs
  c('genesis-golem', 'Genesis Golem · Season 1', 'beast', 'legendary', 'Number Theory', '2', 80, 'Forged from the first primes. Awarded to Platinum and above in Season 1.', 'season'),
  c('scaly-emperor', 'Draconis, the Scaly Emperor', 'beast', 'legendary', 'Number Theory', '♛', 88, 'Every scale on his hide is a prime. He has counted.', 'story'),
  c('clockwork-gardener', 'Tock, the Clockwork Gardener', 'character', 'epic', 'Arithmetic', '⚙', 70, 'Plants in rows, harvests in tables, oils itself on Sundays.', 'story'),
  c('lyra-cartographer', 'Lyra, the Star Cartographer', 'character', 'epic', 'Geometry', '✧', 74, 'Maps the sky one angle at a time.', 'story'),
  c('sigma-sentinel', 'Sigma Sentinel', 'beast', 'legendary', 'Analysis', '∑', 85, 'Stands guard over the sum of all things. Plus members only.', 'plus'),
];

interface ArtFile { id: string; file: string; rarity: string | null; name: string; }
interface CustomCard { name?: string; kind?: 'beast' | 'character'; domain?: Domain; symbol?: string; flavor?: string; power?: number; rarity?: Rarity; }

const DOMAINS = Object.keys(DOMAIN_COLORS) as Domain[];
const RARITY_KEYS = new Set(RARITIES.map((r) => r.key));
const DEFAULT_POWER: Record<Rarity, number> = { common: 15, uncommon: 36, rare: 52, epic: 68, legendary: 84, mythic: 93, singularity: 100 };
const artUrlFor = (file: string) => `/cards/${encodeURIComponent(file)}`;

/**
 * Merge the built-in roster with cards discovered in public/cards:
 *  - an art file whose id matches a built-in card supplies that card's art;
 *  - any other art file becomes a new pack card, with details from cards.custom.json or sensible defaults.
 */
function buildCatalog(): CardDef[] {
  const byId = new Map(BUILTIN.map((card) => [card.id, { ...card }]));
  const custom = customCards as Record<string, CustomCard | string>;
  const files = artFiles as ArtFile[];

  for (const f of files) {
    const existing = byId.get(f.id);
    if (existing) { existing.art = artUrlFor(f.file); continue; }
    const o = (typeof custom[f.id] === 'object' ? custom[f.id] : {}) as CustomCard;
    const rarity: Rarity = o.rarity && RARITY_KEYS.has(o.rarity) ? o.rarity : (f.rarity && RARITY_KEYS.has(f.rarity as Rarity) ? (f.rarity as Rarity) : 'common');
    const h = hashString(f.id);
    const name = o.name ?? f.name;
    byId.set(f.id, {
      id: f.id,
      name,
      kind: o.kind ?? 'beast',
      rarity,
      domain: o.domain && DOMAINS.includes(o.domain) ? o.domain : DOMAINS[h % DOMAINS.length],
      symbol: o.symbol ?? name.charAt(0).toUpperCase(),
      flavor: o.flavor ?? '',
      power: o.power ?? Math.min(100, DEFAULT_POWER[rarity] + (h % 7)),
      source: 'pack',
      art: artUrlFor(f.file),
    });
  }
  // Cards described only in cards.custom.json (no art yet) still exist, with the generated emblem.
  for (const [id, o] of Object.entries(custom)) {
    if (id.startsWith('_') || typeof o !== 'object' || byId.has(id)) continue;
    const rarity: Rarity = o.rarity && RARITY_KEYS.has(o.rarity) ? o.rarity : 'common';
    const h = hashString(id);
    const name = o.name ?? id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    byId.set(id, { id, name, kind: o.kind ?? 'beast', rarity, domain: o.domain && DOMAINS.includes(o.domain) ? o.domain : DOMAINS[h % DOMAINS.length], symbol: o.symbol ?? name.charAt(0).toUpperCase(), flavor: o.flavor ?? '', power: o.power ?? DEFAULT_POWER[rarity], source: 'pack' });
  }
  return [...byId.values()];
}

export const CARDS: CardDef[] = buildCatalog();

export const cardById = (id: string): CardDef | undefined => CARDS.find((c) => c.id === id);
export const packableCards = CARDS.filter((c) => c.source === 'pack');
export const isPackable = (c: CardDef) => c.source === 'pack';

/** Chance that one pack slot produces this exact card. */
export function cardOdds(card: CardDef): { p: number; oneIn: number } {
  if (!isPackable(card)) return { p: 0, oneIn: Infinity };
  const def = rarityDef(card.rarity);
  const n = packableCards.filter((c) => c.rarity === card.rarity).length;
  const p = def.weight / n;
  return { p, oneIn: Math.round(1 / p) };
}

export function formatOneIn(card: CardDef): string {
  const { oneIn } = cardOdds(card);
  if (Number.isFinite(oneIn)) return `1 in ${oneIn.toLocaleString('en-US')}`;
  return { season: 'Season reward', story: 'Story reward', plus: 'Plus exclusive', pack: '' }[card.source];
}

export type PackId = 'standard' | 'premium';
export interface PackDef { id: PackId; name: string; size: number; guaranteed: Rarity; blurb: string; price: number; }
export const PACKS: Record<PackId, PackDef> = {
  standard: { id: 'standard', name: 'Arena Pack', size: 5, guaranteed: 'rare', blurb: 'Five cards. The last one is at least Rare.', price: 400 },
  premium: { id: 'premium', name: 'Prime Pack', size: 5, guaranteed: 'epic', blurb: 'Five cards. The last one is at least Epic.', price: 1200 },
};

export function rollRarity(rng: Rng, minRank = 0): Rarity {
  const pool = RARITIES.filter((r) => r.rank >= minRank);
  const total = pool.reduce((s, r) => s + r.weight, 0);
  let roll = rng() * total;
  for (const r of pool) {
    roll -= r.weight;
    if (roll <= 0) return r.key;
  }
  return pool[pool.length - 1].key;
}

export function openPack(pack: PackDef, rng: Rng): CardDef[] {
  const out: CardDef[] = [];
  for (let i = 0; i < pack.size; i++) {
    const minRank = i === pack.size - 1 ? rarityDef(pack.guaranteed).rank : 0;
    const rarity = rollRarity(rng, minRank);
    const pool = packableCards.filter((c) => c.rarity === rarity);
    out.push(pick(rng, pool));
  }
  return out;
}

/** Sort key: rarest first, then power. */
export function cardSortValue(card: CardDef): number {
  return rarityDef(card.rarity).rank * 1000 + card.power;
}
