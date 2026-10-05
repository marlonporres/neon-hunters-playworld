import { readdirSync } from 'node:fs';
import path from 'node:path';

export function localSongFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(mp3|ogg|wav|m4a)$/i.test(entry.name))
    .map((entry) => `/audio/songs/${encodeURIComponent(entry.name)}`)
    .sort();
}

export function localSongsPlugin(directory) {
  const moduleId = '\0virtual:local-songs';
  return {
    name: 'local-song-manifest',
    resolveId(id) { if (id === 'virtual:local-songs') return moduleId; },
    load(id) { if (id === moduleId) return `export default ${JSON.stringify(localSongFiles(directory))};`; },
    configureServer(server) {
      server.watcher.add(directory);
      const changed = (file) => {
        if (path.resolve(path.dirname(file)) !== path.resolve(directory) || !/\.(mp3|ogg|wav|m4a)$/i.test(file)) return;
        const module = server.moduleGraph.getModuleById(moduleId);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', changed).on('unlink', changed).on('change', changed);
    },
  };
}
