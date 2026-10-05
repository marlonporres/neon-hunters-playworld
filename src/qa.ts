// Opt-in real-browser integration test: open /?qa=1 (or ?qa=local with a test WAV).
// Uses DOM actions and normal keyboard events; never changes simulation state.
interface Snapshot {
  models: { id: string; status: string; height: number; feet: number; riggedMeshes: number }[];
  mode: string; selected: string;
  state: { characterId: string; x: number; z: number; dancing: boolean; magicTime: number; visits: string[]; stars: number[]; padCount: number; cloudsCleared: number; companionFollowing: boolean };
  camera: { x: number; z: number };
  totalStars: number;
  music: { mode: string; selected: number; playing: boolean; currentTime: number; localFiles: (string | null)[]; context: string };
  worldArt: { selected: string; goldenBloom: number; openFlowers: number; magicResponse: number; capacities: { petals: number; accents: number; bubbles: number; lanterns: number } };
  performance: { frames: number; fps: number; p95Ms: number; drawCalls: number; geometries: number; textures: number; triangles: number };
}
declare global { interface Window { __STARLIGHT__: { snapshot: () => Snapshot }; __QA_RESULT__?: unknown } }
const errors: string[] = [];
window.addEventListener('error', (event) => errors.push(event.message));
window.addEventListener('unhandledrejection', (event) => errors.push(String(event.reason)));
const originalError = console.error;
console.error = (...args: unknown[]) => { errors.push(args.map(String).join(' ')); originalError(...args); };
const panel = document.createElement('pre');
panel.id = 'qa-result';
panel.style.cssText = 'position:fixed;z-index:100;left:96px;top:92px;max-width:430px;max-height:42vh;overflow:auto;background:#fffaf0ed;color:#67557b;border:1px solid #cdbbdd;border-radius:13px;padding:13px;font:11px monospace;pointer-events:none;white-space:pre-wrap';
document.body.append(panel);
const results: string[] = [];
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const snapshot = () => window.__STARLIGHT__.snapshot();
function assert(condition: unknown, description: string) {
  if (!condition) throw new Error(description);
  results.push(`PASS ${description}`);
  panel.textContent = results.join('\n');
}
function click(selector: string) {
  const button = document.querySelector<HTMLButtonElement>(selector);
  if (!button || button.hidden) throw new Error(`Missing button ${selector}`);
  button.click();
}
async function until(predicate: () => boolean, timeout = 12000) {
  const start = performance.now();
  while (!predicate()) {
    if (performance.now() - start > timeout) throw new Error('Timed out waiting for playable behavior');
    await wait(100);
  }
}
async function hold(code: string, ms: number) {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
  await wait(ms);
  window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
  await wait(100);
}
async function visit(id: string) {
  click(`[data-travel="${id}"]`);
  await until(() => snapshot().state.visits.includes(id));
  await wait(700);
}

export async function runQA() {
  panel.textContent = 'Browser QA ready — press RUN CHECKS to begin.';
  const startButton = document.createElement('button');
  startButton.id = 'qa-start';
  startButton.textContent = 'RUN CHECKS';
  startButton.style.cssText = 'position:fixed;z-index:101;left:100px;top:55px;padding:10px 18px;border-radius:12px;background:#75609d;color:white;font-weight:bold';
  document.body.append(startButton);
  startButton.addEventListener('click', async () => {
    startButton.remove();
    try {
      // A real click unlocks browser audio before the automated sequence.
      click('[data-character="rumi"]');
      await until(() => snapshot().models.every(model => model.status === 'ready'), 30000);
      for (const model of snapshot().models) {
        assert(model.status === 'ready' && model.riggedMeshes > 0 && Math.abs(model.height - 2) < 0.1 && Math.abs(model.feet) < 0.04, `${model.id} GLB loads with rig, grounded feet and consistent scale`);
      }
      await wait(350);
      for (const id of ['rumi', 'mira', 'zoey']) {
        click(`[data-character="${id}"]`);
        assert(document.querySelector(`[data-character="${id}"]`)?.getAttribute('aria-pressed') === 'true', `select ${id}`);
        click('#play');
        await wait(700);
        assert(snapshot().state.characterId === id, `spawn ${id}`);
        assert(snapshot().worldArt.selected === id, `${id} costume palette reaches environment accents`);
        if (id !== 'zoey') { click('#pause'); click('#change-character'); await wait(150); }
      }
      const initial = snapshot();
      assert(initial.worldArt.goldenBloom > 0, 'Golden starts the brief plaza halo without restarting audio');
      await hold('KeyW', 1200);
      assert(snapshot().state.z < initial.state.z - 3, 'WASD movement');
      assert(snapshot().totalStars > 0, 'star pickup during real movement');
      const beforeArrow = snapshot();
      await hold('ArrowRight', 600);
      assert(snapshot().state.x > beforeArrow.state.x + 1.5, 'arrow movement');
      await wait(600);
      assert(snapshot().camera.x > beforeArrow.camera.x + 0.6, 'automatic follow camera');
      click('#dance'); await wait(200);
      assert(snapshot().state.dancing, 'large Dance action');
      click('#magic'); await wait(200);
      assert(snapshot().state.magicTime > 0, 'large Magic action');
      await visit('stage');
      assert(snapshot().state.visits.includes('stage'), 'concert stage proximity');
      assert(!document.querySelector<HTMLElement>('#song-panel')!.hidden, 'large song choices appear');
      const hasLocal = snapshot().music.localFiles.some(Boolean);
      for (let i = 0; i < 5; i++) {
        click(`[data-song="${i}"]`); await wait(300);
        assert(snapshot().music.playing && snapshot().music.selected === i, `song button ${i + 1} plays/replays`);
      }
      assert(snapshot().state.padCount > 0, 'musical pads respond to movement');
      if (location.search.includes('local')) {
        assert(hasLocal, 'local music asset discovered');
        click('[data-song="0"]'); await wait(1200);
        assert(snapshot().music.mode === 'local' && snapshot().music.currentTime > 0, 'supplied local instrumental actually plays');
      } else {
        assert(snapshot().music.mode === 'demo', 'missing files use original synthesized music');
        assert(snapshot().music.context === 'running', 'Web Audio is running');
      }
      click('#song-close');
      await visit('hunter');
      assert(snapshot().state.cloudsCleared === 3, 'Hunter magic clears all friendly clouds');
      assert(snapshot().worldArt.openFlowers >= 2, 'garden petals open through proximity');
      click('#magic'); await wait(200);
      assert(snapshot().state.magicTime > 0, 'repeatable Hunter magic');
      assert(snapshot().worldArt.magicResponse > .5, 'MAGIC opens the floating plaza emblem');
      await visit('tea');
      assert(snapshot().state.visits.includes('tea'), 'bubble-tea proximity activity');
      await visit('companion');
      assert(snapshot().state.companionFollowing, 'playful companion follows');
      // Three.js uploads hidden meshes lazily: show the companion heart before
      // measuring resource stability across subsequent action repetitions.
      click('#dance'); click('#magic'); await wait(400);
      const stableMemory = snapshot().performance;
      for (let i = 0; i < 35; i++) {
        click('#dance'); click('#magic');
        if (i % 5 === 0) click(`[data-song="${i % 5}"]`);
        await wait(120);
      }
      const afterRepetition = snapshot().performance;
      assert(JSON.stringify(snapshot().worldArt.capacities) === JSON.stringify({petals:36,accents:24,bubbles:12,lanterns:12}), 'world delight effects retain fixed instance capacities');
      assert(afterRepetition.geometries === stableMemory.geometries && afterRepetition.textures === stableMemory.textures, `repeated actions do not grow GPU resources (${stableMemory.geometries}/${stableMemory.textures} to ${afterRepetition.geometries}/${afterRepetition.textures})`);
      click('#mute'); assert(snapshot().music.playing, 'mute retains song playback'); click('#mute');
      click('#pause'); await wait(200);
      assert(snapshot().mode === 'pause' && !snapshot().music.playing, 'pause stops movement and sound');
      click('#resume'); await wait(400);
      assert(snapshot().mode === 'play', 'resume restores play');
      await hold('KeyS', 650);
      assert(snapshot().state.z > 6, 'companion exploration keeps working');
      await wait(4000);
      const profile = snapshot().performance;
      assert(profile.frames > 300, 'real browser frame profile gathered');
      assert(profile.drawCalls < 220 && profile.triangles < 180000, 'render budget is bounded (three VRoid avatars plus hub)');
      assert(profile.fps >= 50 && profile.p95Ms < 35, 'acceptable real-browser performance');
      await visit('stage');
      await until(() => snapshot().state.z < -7 && Math.abs(snapshot().state.x) < 2.5);
      click('[data-song="0"]');
      click('#song-close');
      click('#dance');
      await wait(4500);
      const concertProfile = snapshot().performance;
      assert(snapshot().state.z < -7 && snapshot().state.dancing && snapshot().models.every(model => model.status === 'ready'), 'all three GLBs present during the concert');
      assert(concertProfile.fps >= 50 && concertProfile.p95Ms < 35 && concertProfile.drawCalls < 220, 'three-character concert performance');
      assert(errors.length === 0, 'no console errors or unhandled exceptions');
      const result = { status: 'PASS', checks: results, errors, profile, concertProfile, final: snapshot() };
      window.__QA_RESULT__ = result;
      panel.textContent = `ALL ${results.length} CHECKS PASSED\n${results.join('\n')}\n\n${JSON.stringify({ exploration: profile, concert: concertProfile }, null, 2)}`;
      console.info('STARLIGHT_QA', result);
    } catch (error) {
      window.__QA_RESULT__ = { status: 'FAIL', checks: results, errors, failure: String(error), state: snapshot() };
      panel.textContent = `FAILED: ${String(error)}\n${results.join('\n')}\n${JSON.stringify(snapshot(), null, 2)}`;
      console.warn('STARLIGHT_QA_FAILED', window.__QA_RESULT__);
    }
  }, { once: true });
}
