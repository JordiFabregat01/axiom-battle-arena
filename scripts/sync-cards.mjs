// Scans public/cards for splash art and writes src/engine/cards.art.json, which the browser
// and the game server both import. Runs automatically before `dev`, `build` and `server`,
// and while `vite dev` is running (see vite.config.ts). Safe to run by hand: npm run cards:sync
//
// File name convention:  <name>_<R>.<jpg|jpeg|png|webp>
//   <name>  free text, becomes the card id (lower-case, dashes) and the display name
//   <R>     rarity letter: C common · U uncommon · R rare · E epic · L legendary · M mythic · S singularity
//   No suffix: the file is art for an existing card with that id (rarity unchanged).
// Everything else about a card (kind, domain, flavor…) can be set in src/engine/cards.custom.json.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART_DIR = join(ROOT, 'public', 'cards');
const OUT = join(ROOT, 'src', 'engine', 'cards.art.json');

const RARITY_LETTERS = { C: 'common', U: 'uncommon', R: 'rare', E: 'epic', L: 'legendary', M: 'mythic', S: 'singularity' };
const EXT = /\.(jpe?g|png|webp)$/i;

export function slugify(raw) {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const SMALL_WORDS = new Set(['the', 'of', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'from', 'with', 'by', 'or']);

export function humanize(raw) {
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s*\(\s*/g, ' (').replace(/\s*\)\s*/g, ') ')
    .trim()
    .split(/\s+/)
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w.replace(/[()]/g, '')) ? w : w.replace(/^\(?[a-z]/, (c) => c.toUpperCase())))
    .join(' ')
    .replace(/\s+\)/g, ')');
}

export function parseArtFile(file) {
  if (!EXT.test(file)) return null;
  const base = file.replace(EXT, '');
  const m = base.match(/^(.*?)(?:[_-]([CUuRrEeLlMmSs]))?$/);
  const raw = m ? m[1] : base;
  const letter = m && m[2] ? m[2].toUpperCase() : null;
  const rarity = letter ? RARITY_LETTERS[letter] ?? null : null;
  const id = slugify(raw);
  if (!id) return null;
  return { id, file, rarity, name: humanize(raw) };
}

export function syncCards({ log = true } = {}) {
  // One entry per card id; when both sleepy-fox_C.jpg and sleepy-fox_C.webp exist, the WebP wins.
  const byId = new Map();
  const weight = (f) => (/\.webp$/i.test(f) ? 3 : /\.png$/i.test(f) ? 2 : 1);
  for (const e of existsSync(ART_DIR) ? readdirSync(ART_DIR).map(parseArtFile).filter(Boolean) : []) {
    const prev = byId.get(e.id);
    if (!prev || weight(e.file) > weight(prev.file)) byId.set(e.id, e);
  }
  const entries = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  const next = JSON.stringify(entries, null, 2) + '\n';
  const prev = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null;
  if (prev !== next) {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, next, 'utf8');
    if (log) console.log(`[cards] ${entries.length} art file(s) → src/engine/cards.art.json`);
  }
  return entries;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const entries = syncCards();
  for (const e of entries) console.log(`  ${e.id.padEnd(28)} ${(e.rarity ?? 'art only').padEnd(12)} ${e.file}`);
}
