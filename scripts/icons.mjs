// Renders the SVG favicon to the PNG sizes the web manifest and iOS need.
// Usage: npm run icons
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = join(ROOT, 'public', 'favicon.svg');
for (const size of [192, 512]) {
  const out = join(ROOT, 'public', `icon-${size}.png`);
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(out);
  console.log(`wrote public/icon-${size}.png`);
}
