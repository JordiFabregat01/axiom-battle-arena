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
  /** Mathematical glyph used by the generated emblem when a card has no art yet. */
  symbol: string;
  flavor: string;
  power: number;
  source: CardSource;
  /** URL of splash art (from public/cards), if any. */
  art?: string;
}

const c = (id: string, name: string, kind: CardDef['kind'], rarity: Rarity, domain: Domain, symbol: string, power: number, flavor: string, source: CardSource = 'pack'): CardDef =>
  ({ id, name, kind, rarity, domain, symbol, power, flavor, source });

/**
 * The roster lives in public/cards (one image per card, see that folder's README) and
 * cards.custom.json. Only two cards are defined here, because the economy hands them out
 * without art being required: the season reward and the Plus membership card. Give them
 * art by adding genesis-golem.jpg / sigma-sentinel.jpg (no suffix) to public/cards.
 */
const BUILTIN: CardDef[] = [
  c('genesis-golem', 'Genesis Golem · Season 1', 'beast', 'legendary', 'Number Theory', '2', 80, 'Forged from the first primes. Awarded to Platinum and above in Season 1.', 'season'),
  c('sigma-sentinel', 'Sigma Sentinel', 'beast', 'legendary', 'Analysis', '∑', 85, 'Stands guard over the sum of all things. Plus members only.', 'plus'),
];

interface ArtFile { id: string; file: string; rarity: string | null; source?: string; name: string; }
interface CustomCard { name?: string; kind?: 'beast' | 'character'; domain?: Domain; symbol?: string; flavor?: string; power?: number; rarity?: Rarity; source?: CardSource; }

const DOMAINS = Object.keys(DOMAIN_COLORS) as Domain[];
const RARITY_KEYS = new Set(RARITIES.map((r) => r.key));
const SOURCES = new Set<CardSource>(['pack', 'season', 'story', 'plus']);
const DEFAULT_POWER: Record<Rarity, number> = { common: 15, uncommon: 36, rare: 52, epic: 68, legendary: 84, mythic: 93, singularity: 100 };
const artUrlFor = (file: string) => `/cards/${encodeURIComponent(file)}`;
const titleCase = (id: string) => id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

function fromParts(id: string, o: CustomCard, fallbackName: string, fallbackRarity: Rarity | null, fallbackSource: CardSource, art?: string): CardDef {
  const rarity: Rarity = o.rarity && RARITY_KEYS.has(o.rarity) ? o.rarity : fallbackRarity ?? 'common';
  const source: CardSource = o.source && SOURCES.has(o.source) ? o.source : fallbackSource;
  const h = hashString(id);
  const name = o.name ?? fallbackName;
  return {
    id,
    name,
    kind: o.kind ?? 'beast',
    rarity,
    domain: o.domain && DOMAINS.includes(o.domain) ? o.domain : DOMAINS[h % DOMAINS.length],
    symbol: o.symbol ?? name.charAt(0).toUpperCase(),
    flavor: o.flavor ?? '',
    power: o.power ?? Math.min(100, DEFAULT_POWER[rarity] + (h % 7)),
    source,
    art,
  };
}

/**
 * Build the catalog from the built-in exclusives, the images in public/cards and cards.custom.json:
 *  - an image whose id matches a built-in card supplies that card's art;
 *  - every other image becomes a card (rarity and source from its suffix, details from cards.custom.json);
 *  - cards that exist only in cards.custom.json get the generated emblem until their art arrives.
 */
function buildCatalog(): CardDef[] {
  const byId = new Map(BUILTIN.map((card) => [card.id, { ...card }]));
  const custom = customCards as Record<string, CustomCard | string>;
  const detail = (id: string): CustomCard => (typeof custom[id] === 'object' ? (custom[id] as CustomCard) : {});

  for (const f of artFiles as ArtFile[]) {
    const existing = byId.get(f.id);
    if (existing) { existing.art = artUrlFor(f.file); continue; }
    const rarity = f.rarity && RARITY_KEYS.has(f.rarity as Rarity) ? (f.rarity as Rarity) : null;
    const source = f.source && SOURCES.has(f.source as CardSource) ? (f.source as CardSource) : 'pack';
    byId.set(f.id, fromParts(f.id, detail(f.id), f.name, rarity, source, artUrlFor(f.file)));
  }
  for (const [id, o] of Object.entries(custom)) {
    if (id.startsWith('_') || typeof o !== 'object' || byId.has(id)) continue;
    byId.set(id, fromParts(id, o, titleCase(id), null, 'pack'));
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
  const pool = RARITIES.filter((r) => r.rank >= minRank && packableCards.some((c) => c.rarity === r.key));
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
