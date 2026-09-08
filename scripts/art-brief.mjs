// Generates art/ART-BRIEF.md: a style guide plus one image prompt per card,
// so splash art can be commissioned or generated consistently.
// Run: npm run art-brief
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';

const bundle = await build({ entryPoints: ['src/engine/cards.ts'], bundle: true, format: 'esm', write: false, platform: 'neutral', logLevel: 'silent' });
const code = bundle.outputFiles[0].text;
const { CARDS, RARITIES, DOMAIN_COLORS } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

const RICHNESS = {
  common: 'simple, clean, one light source, modest detail',
  uncommon: 'a little more detail, a soft secondary glow',
  rare: 'rich detail, dramatic rim light, floating geometric motes',
  epic: 'ornate, cinematic lighting, energy trails in the domain colour',
  legendary: 'lavish, golden particles, an aura of symbols orbiting the subject',
  mythic: 'overwhelming, reality bending at the edges, deep contrast, sacred-geometry halo',
  singularity: 'abstract and cosmic, iridescent, the subject dissolving into pure mathematics',
};

const subject = (c) => {
  const beast = c.kind === 'beast';
  const species = c.name.split(',')[0].replace(/ · .*$/, '');
  return beast
    ? `a fantastical creature called "${species}", a stylised animal whose body and markings are built from the idea of ${c.domain.toLowerCase()} (${c.symbol})`
    : `a heroic character portrait of ${species}, a mathematician reimagined as a fantasy figure, holding or surrounded by the symbol ${c.symbol}`;
};

const lines = [];
lines.push('# Axiom Arena · Art brief');
lines.push('');
lines.push('Portrait 5:7 (about 600 × 840 px), WebP, file name = card id. Drop files into `public/cards/`.');
lines.push('');
lines.push('## Shared style');
lines.push('');
lines.push('- Painted fantasy trading-card splash art, semi-realistic, confident brushwork, no text, no borders, no watermarks.');
lines.push('- Background: deep navy (#0b1020) with a faint graph-paper grid and a soft glow in the card\'s domain colour.');
lines.push('- Lighting: one strong rim light in the domain colour, chalk-white highlights. Subjects face slightly left.');
lines.push('- Beasts are stylised animals whose anatomy expresses a math idea; characters are historical mathematicians as fantasy heroes, respectful, no caricature.');
lines.push('- Rarity sets the richness (see each card). Keep the composition centred with margin; the UI crops to cover.');
lines.push('');
lines.push('| Domain | Colour |');
lines.push('| --- | --- |');
for (const [d, col] of Object.entries(DOMAIN_COLORS)) lines.push(`| ${d} | ${col} |`);
lines.push('');
for (const r of RARITIES) {
  const cards = CARDS.filter((c) => c.rarity === r.key);
  if (!cards.length) continue;
  lines.push(`## ${r.name} (${cards.length})`);
  lines.push('');
  for (const c of cards) {
    lines.push(`### \`${c.id}\` — ${c.name}`);
    lines.push('');
    lines.push(`- ${c.kind === 'beast' ? 'Beast' : 'Character'} · ${c.domain} · ${r.name}${c.source !== 'pack' ? ` · ${c.source} exclusive` : ''}`);
    lines.push(`- Flavor: "${c.flavor}"`);
    lines.push(`- Prompt: ${subject(c)}; ${RICHNESS[c.rarity]}; accent colour ${DOMAIN_COLORS[c.domain]}; painted fantasy trading-card splash art on a deep navy graph-paper background, dramatic rim light, centred, portrait 5:7, no text.`);
    lines.push('');
  }
}

await mkdir('art', { recursive: true });
await writeFile('art/ART-BRIEF.md', lines.join('\n'));
console.log(`Wrote art/ART-BRIEF.md with ${CARDS.length} prompts.`);
