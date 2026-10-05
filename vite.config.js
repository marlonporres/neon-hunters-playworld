import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { localSongsPlugin } from './scripts/song-manifest.mjs';

export default defineConfig({
  plugins: [localSongsPlugin(fileURLToPath(new URL('./public/audio/songs', import.meta.url)))],
  server: { port: 5199, strictPort: true },
  preview: { port: 4199, strictPort: true },
  build: { target: 'es2022' },
});
