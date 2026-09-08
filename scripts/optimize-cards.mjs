// Converts card art in public/cards to WebP sized for the game, then re-syncs the manifest.
// Originals are moved to art/originals/ (kept out of git) so nothing is lost.
// Usage: npm run cards:optimize            (all jpg/jpeg/png in public/cards)
//        node scripts/optimize-cards.mjs --keep    (leave originals in place, only add .webp next to them)
import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { syncCards } from './sync-cards.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART_DIR = join(ROOT, 'public', 'cards');
const ORIGINALS = join(ROOT, 'art', 'originals');
const MAX_WIDTH = 1000;
const QUALITY = 82;
const keep = process.argv.includes('--keep');

const files = readdirSync(ART_DIR).filter((f) => /\.(jpe?g|png)$/i.test(f));
if (!files.length) { console.log('[cards] nothing to optimize in public/cards'); process.exit(0); }
if (!keep) mkdirSync(ORIGINALS, { recursive: true });

let before = 0, after = 0;
for (const file of files) {
  const src = join(ART_DIR, file);
  const out = join(ART_DIR, file.replace(/\.(jpe?g|png)$/i, '.webp'));
  const size = statSync(src).size;
  await sharp(src).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(out);
  const outSize = statSync(out).size;
  before += size; after += outSize;
  console.log(`  ${file.padEnd(40)} ${(size / 1024).toFixed(0).padStart(5)} KB → ${(outSize / 1024).toFixed(0).padStart(4)} KB`);
  if (!keep) {
    const dest = join(ORIGINALS, file);
    if (existsSync(dest)) renameSync(src, join(ORIGINALS, `${Date.now()}-${file}`)); else renameSync(src, dest);
  }
}
console.log(`[cards] ${files.length} file(s): ${(before / 1024 / 1024).toFixed(1)} MB → ${(after / 1024 / 1024).toFixed(1)} MB${keep ? '' : ` · originals moved to art/originals/`}`);
syncCards();
