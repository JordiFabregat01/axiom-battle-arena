import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { syncCards } from './scripts/sync-cards.mjs';

/** Keeps src/engine/cards.art.json in step with the images in public/cards. */
function cardArt(): Plugin {
  const dir = fileURLToPath(new URL('./public/cards', import.meta.url));
  return {
    name: 'axiom-card-art',
    buildStart() { syncCards({ log: false }); },
    configureServer(server) {
      server.watcher.add(dir);
      const onChange = (file: string) => { if (file.startsWith(dir)) syncCards(); };
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
    },
  };
}

export default defineConfig({
  plugins: [cardArt(), react()],
  server: { port: 5173 },
});
