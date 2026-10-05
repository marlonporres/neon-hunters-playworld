import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { localSongFiles } from '../scripts/song-manifest.mjs';

test('local manifest lists audio without embedding it, and ignores documentation', async () => {
  const testRoot = path.resolve('.qa');
  const directory = path.join(testRoot, `manifest-test-${Date.now()}`);
  await mkdir(path.join(directory, 'folder.mp3'), { recursive: true });
  try {
    await writeFile(path.join(directory, 'golden-instrumental.mp3'), 'local test fixture');
    await writeFile(path.join(directory, 'soda-pop-instrumental.OGG'), 'local test fixture');
    await writeFile(path.join(directory, 'a space.wav'), 'local test fixture');
    await writeFile(path.join(directory, 'README.md'), 'not a song');
    assert.deepEqual(localSongFiles(directory), [
      '/audio/songs/a%20space.wav',
      '/audio/songs/golden-instrumental.mp3',
      '/audio/songs/soda-pop-instrumental.OGG',
    ]);
  } finally {
    if (directory.startsWith(testRoot + path.sep)) await rm(directory, { recursive: true, force: true });
  }
});
