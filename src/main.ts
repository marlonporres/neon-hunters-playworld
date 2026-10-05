import * as THREE from 'three';
import { CHARACTERS, ACTIVITIES, FLOOR_PADS, createState, updateState, startDance, castMagic, interact } from './simulation.ts';
import type { CharacterId, GameState, ActivityId } from './simulation.ts';
import { createCharacter } from './characters.ts';
import { createWorld } from './world.ts';
import { MusicSystem } from './music.ts';
import { createUI } from './ui.ts';
import { findRoute } from './navigation.ts';
import { GameInput, movementKeys } from './input.ts';
import { createBubbleView } from './bubble-view.ts';
import { DanceParty } from './dance-party.ts';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const music = new MusicSystem();
const input = new GameInput();
const keys = input.keys;
let selected: CharacterId = 'rumi';
let state: GameState | null = null;
let mode: 'home' | 'play' | 'pause' | 'bubbles' | 'party' = 'home';
let resumeMode: 'play' | 'bubbles' | 'party' = 'play';
const party = new DanceParty();
const partyCameraBefore = new THREE.Vector3();
const partyLookBefore = new THREE.Vector3();
let partyStarting = false;
let partyPlayback = 0;
let renderer: THREE.WebGLRenderer;
let totalStars = 0;
let starsResetAt = 0;
let routes: { x: number; z: number }[] = [];
let travelTo: ActivityId | null = null;
let musicBeforePause = false;
let autoStuck = 0;
let quality = Math.min(window.devicePixelRatio || 1, 1.5);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ui = createUI(music, {
  select(id) { selected = id; ui.select(id); void music.unlock().then(() => music.effect('star')); },
  play: play,
  dance() { if (mode === 'play') input.press('dance'); },
  magic() { if (mode === 'play') input.press('magic'); },
  interact() { if (mode === 'play') input.press('interact'); },
  exitBubbles,
  partyStart: enterParty, partyExit: exitParty, partyReplay: replayParty,
  partyPad(index) {
    if (mode !== 'party' || !party.press(index)) return;
    world.pickup((index - 1) * 2.2, -11);
    music.effect(party.interactions % 5 === 0 ? 'celebrate' : 'pad', [523.25,659.25,783.99][index]);
    ui.updateParty(party);
  },
  partyMagic() { if (mode === 'party' && party.magic()) { music.effect('golden'); ui.updateParty(party); } },
  pause: pause,
  resume: resume,
  home() {
    if (bubbleView.game.active) exitBubbles();
    if (party.active) exitParty();
    mode = 'home'; input.reset(); ui.resetInput(); routes = []; state = null;
    music.stop(); ui.home();
  },
  travel(id) {
    if (!state || mode !== 'play') return;
    const activity = ACTIVITIES.find((a) => a.id === id)!;
    input.reset(); ui.resetInput();
    routes = findRoute(state, activity);
    travelTo = activity.id;
    autoStuck = 0;
    ui.toast(activity.icon, `Let's visit ${activity.name}!`);
  },
  joystick(x, z) { if (mode === 'play') { input.setStick(x, z); if (Math.hypot(x, z) > 0) routes = []; } else input.setStick(0, 0); },
});

const scene = new THREE.Scene();
scene.background = new THREE.Color('#ede7f4');
scene.fog = new THREE.Fog('#6c6088', 32, 72);
scene.add(new THREE.HemisphereLight('#e7e6ff', '#555075', 1.65));
const sun = new THREE.DirectionalLight('#ffe7cf', 1.75);
sun.position.set(-8, 15, 8);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 85);
const cameraTarget = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();
const lookAt = new THREE.Vector3();
const galleryScene = new THREE.Scene();
galleryScene.background = new THREE.Color('#f0edf6');
galleryScene.add(new THREE.HemisphereLight('#fff8ed', '#b4a6c7', 2.7));
const gallerySun = new THREE.DirectionalLight('#fff4e7', 2.5);
gallerySun.position.set(-5, 9, 6);
galleryScene.add(gallerySun);
const galleryCamera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
const avatars = CHARACTERS.map((character) => createCharacter(character.id));
const galleryAvatars = CHARACTERS.map((character) => createCharacter(character.id));
const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.85, 0.16, 64), new THREE.MeshLambertMaterial({ color: '#dfd3ee' }));
plinth.position.set(0, -0.1, 0);
galleryScene.add(plinth);
const rim = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.025, 5, 64), new THREE.MeshBasicMaterial({ color: '#f7efdc' }));
rim.rotation.x = Math.PI / 2;
rim.position.y = 0.005;
galleryScene.add(rim);
galleryAvatars.forEach((avatar, index) => { avatar.root.position.set((index - 1) * 1.8, 0, index === 1 ? -0.65 : 0); galleryScene.add(avatar.root); });
avatars.forEach((avatar) => scene.add(avatar.root));
const bubbleView = createBubbleView(document.getElementById('bubble-playfield')!, kind => music.effect(kind));
let world: ReturnType<typeof createWorld>;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(quality);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  world = createWorld(scene);
  bubbleView.warm(renderer);
} catch (error) {
  ui.fatal(`Please use a browser with WebGL enabled. ${error instanceof Error ? error.message : ''}`);
  throw error;
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  galleryCamera.aspect = width / height;
  const mobile = width < 600;
  const galleryDistance = mobile ? Math.max(12.5, 5.1 / (2 * Math.tan(THREE.MathUtils.degToRad(18)) * galleryCamera.aspect)) : 10.8;
  galleryCamera.position.set(mobile ? 0 : -0.4, mobile ? 3.5 : 3.3, galleryDistance);
  galleryCamera.setViewOffset(width, height, mobile ? 0 : -width * 0.19, mobile ? height * 0.2 : 0, width, height);
  galleryCamera.lookAt(0, 0.85, 0);
  galleryCamera.updateProjectionMatrix();
  input.reset(); ui.resetInput();
  bubbleView.resize(width, height);
}
window.addEventListener('resize', resize);
resize();

function play() {
  mode = 'play';
  state = createState(selected);
  totalStars = 0; starsResetAt = 0; input.reset(); ui.resetInput(); routes = [];
  world.reset();
  camera.position.set(0, 7.3, 17.8);
  lookAt.set(0, 2.7, 4.8);
  camera.lookAt(lookAt);
  ui.play(); ui.select(selected);
  void music.play(music.files.findIndex((file) => file) >= 0 ? music.files.findIndex((file) => file) : 0);
  ui.toast('music', 'Welcome! Dance, play, and make magic.');
}

function pause() {
  if (mode !== 'play' && mode !== 'bubbles' && mode !== 'party') return;
  resumeMode = mode;
  mode = 'pause'; input.reset(); ui.resetInput(); bubbleView.clearPointers(); routes = [];
  musicBeforePause = music.playing;
  music.stop(); ui.pause(true);
}
function resume() {
  if (mode !== 'pause') return;
  mode = resumeMode; input.reset(); ui.pause(false);
  if (musicBeforePause) {
    if (resumeMode === 'party' && party.seconds === 0) startPartySong();
    else void music.resume();
  }
}
function enterBubbles() {
  if (!state || mode !== 'play') return;
  input.reset(); ui.resetInput(); routes = []; travelTo = null;
  state.moving = false;
  mode = 'bubbles'; ui.bubbles(true);
  bubbleView.enter(galleryAvatars[CHARACTERS.findIndex(c => c.id === selected)]);
}
function exitBubbles() {
  if (!bubbleView.game.active) return;
  bubbleView.exit(); input.reset(); ui.resetInput(); mode = 'play'; ui.bubbles(false);
  // State and camera were frozen, so returning requires no teleport or reload.
  if (state) ui.update(state, totalStars);
}
function enterParty() {
  if (mode !== 'play' || !state || state.nearest !== 'stage') return;
  partyCameraBefore.copy(camera.position); partyLookBefore.copy(lookAt);
  input.reset(); ui.resetInput(); routes = []; travelTo = null;
  state.moving = false;
  party.enter(); mode = 'party'; ui.party(true); ui.updateParty(party);
  music.setLoop(false); startPartySong();
}
function startPartySong() {
  const run = ++partyPlayback; partyStarting = true;
  void music.play(0).finally(() => { if (run === partyPlayback) partyStarting = false; });
}
function replayParty() {
  if (mode !== 'party' || !party.finished) return;
  party.enter(); ui.updateParty(party); startPartySong();
}
function exitParty() {
  if (!party.active) return;
  partyPlayback++; partyStarting = false;
  party.exit(); input.reset(); ui.resetInput(); mode = 'play'; ui.party(false);
  camera.position.copy(partyCameraBefore); lookAt.copy(partyLookBefore); camera.lookAt(lookAt);
  music.setLoop(true);
  if (!music.playing) { if (music.ended()) void music.play(0); else void music.resume(); }
  if (state) ui.update(state, totalStars);
}
function activate() {
  if (!state || mode !== 'play') return;
  const activity = interact(state);
  if (!activity) return;
  if (activity.id === 'bubbles') { enterBubbles(); return; }
  if (activity.id === 'stage') {
    ui.openSongs();
    if (!music.playing) void music.play();
  } else music.effect(activity.id === 'hunter' ? 'magic' : activity.id === 'tea' ? 'tea' : 'friend');
  world.pickup(activity.x, activity.z);
  ui.toast(activity.icon, activity.message);
}
window.addEventListener('keydown', (event) => {
  if ((event.target as HTMLElement | null)?.tagName === 'INPUT') return;
  if (event.code === 'Escape') {
    if (mode === 'party') { exitParty(); return; }
    if (mode === 'bubbles') { exitBubbles(); return; }
    if (ui.closeParent()) return;
    if (mode === 'play') pause(); else if (mode === 'pause') resume();
    return;
  }
  if (mode !== 'play' || ui.modalOpen()) return;
  if (movementKeys.has(event.code)) { event.preventDefault(); routes = []; keys.add(event.code); }
  if (event.repeat) return;
  if (event.code === 'Space') { event.preventDefault(); document.getElementById('dance')!.click(); }
  if (event.code === 'KeyM') document.getElementById('magic')!.click();
  if (event.code === 'KeyE') input.press('interact');
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => { input.reset(); ui.resetInput(); pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

const frameTimes = new Float32Array(300);
let frameIndex = 0;
let frameCount = 0;
let slowTime = 0;
let previousTime = performance.now();
let time = 0;
let lastUI = 0;
let renderedFrames = 0;
let qualityCheck = 0;
let qualityFrames = 0;
function frame(now: number) {
  requestAnimationFrame(frame);
  const rawDt = (now - previousTime) / 1000;
  previousTime = now;
  const dt = Math.min(rawDt, 0.05);
  if (document.hidden) return;
  if (mode === 'play' || mode === 'bubbles' || mode === 'party') {
    frameTimes[frameIndex++ % frameTimes.length] = rawDt * 1000;
    frameCount++;
    qualityCheck += rawDt; qualityFrames++;
    if (qualityCheck > 3) {
      const fps = qualityFrames / qualityCheck;
      slowTime = fps < 48 ? slowTime + qualityCheck : 0;
      if (slowTime > 3 && quality > 0.75) { quality = Math.max(0.75, quality - 0.25); renderer.setPixelRatio(quality); slowTime = 0; }
      qualityCheck = 0; qualityFrames = 0;
    }
  }
  time += dt;
  if (mode === 'bubbles' || (mode === 'pause' && resumeMode === 'bubbles')) {
    bubbleView.update(time, mode === 'bubbles' ? dt : 0);
    ui.updateBubbles(bubbleView.game.captures, bubbleView.game.celebration > 0);
    renderer.render(bubbleView.scene, bubbleView.camera); renderedFrames++; return;
  }
  if (mode === 'home') {
    galleryAvatars.forEach((avatar, index) => {
      const active = CHARACTERS[index].id === selected;
      const targetScale = active ? 1.1 : 0.93;
      const scale = THREE.MathUtils.lerp(avatar.root.scale.x, targetScale, 1 - Math.exp(-dt * 6));
      avatar.root.scale.setScalar(scale);
      avatar.root.rotation.y = active ? Math.sin(time * 0.6) * 0.12 : (index - 1) * -0.14;
      avatar.animate(reducedMotion ? 0 : time + index, false, false);
    });
    renderer.render(galleryScene, galleryCamera);
    return;
  }
  if (!state) return;
  if (mode === 'party' || (mode === 'pause' && resumeMode === 'party')) {
    if (mode === 'party' && !partyStarting) {
      const finishedBefore = party.finished;
      const ended = music.ended() || (music.mode === 'demo' && music.position() >= party.timeline.demoDuration);
      party.step(music.position(), ended, dt);
      if (!finishedBefore && party.finished) { if (music.mode === 'demo') music.stop(); music.effect('celebrate'); }
    }
    const partyClock = party.motionTime;
    avatars.forEach((avatar, i) => {
      const reacting = party.responses[i] > 0 || party.groupTime > 0 || party.pulses[i] > 0;
      avatar.root.visible = true;
      avatar.root.position.set((i-1)*2.2,.26,-11.15);
      avatar.root.rotation.y = reacting && !reducedMotion ? Math.sin(partyClock * 3 + i) * .28 : 0;
      avatar.animate(reducedMotion ? 0 : partyClock + i * .7, false, reacting);
    });
    // Reframe the existing stage; all three original models remain in this scene.
    const distance = Math.max(8.2, 7.4 / (2 * Math.tan(THREE.MathUtils.degToRad(24)) * camera.aspect));
    const framing = camera.aspect < .8 ? .9 : 1.15;
    camera.position.set(0, 3.5, -11.15 + distance);
    camera.lookAt(0, framing, -11.15);
    world.update(reducedMotion ? partyClock * .3 : partyClock, mode === 'party' ? dt : 0, state, music.beat(), music.playing && music.selected === 0, party);
    ui.updateParty(party);
    renderer.render(scene, camera); renderedFrames++; return;
  }
  if (mode === 'play') {
    if (ui.modalOpen()) { input.reset(); ui.resetInput(); }
    for (const action of input.consume()) {
      if (mode !== 'play') break;
      if (action === 'interact') activate();
      else if (action === 'dance') { routes = []; startDance(state); if (!music.playing) void music.resume(); ui.toast('dance', 'Dance, dance, dance!'); }
      else { castMagic(state); music.effect('magic'); ui.toast('magic', 'Sparkly magic!'); }
    }
    if (bubbleView.game.active) return;
    let steering: { x: number; z: number } | undefined;
    if (routes.length) {
      const target = routes[0];
      const dx = target.x - state.x;
      const dz = target.z - state.z;
      if (Math.hypot(dx, dz) < 0.2) routes.shift();
      else {
        steering = { x: dx, z: dz };
      }
    }
    const beforeX = state.x; const beforeZ = state.z;
    const events = updateState(state, input.movement(), dt, steering);
    if (routes.length && Math.hypot(state.x - beforeX, state.z - beforeZ) < 0.005) autoStuck += dt;
    else autoStuck = 0;
    if (autoStuck > 0.8) { routes = []; autoStuck = 0; }
    events.forEach((event) => {
      if (event.type === 'star') { totalStars++; world.pickup(event.x!, event.z!); music.effect('star'); }
      if (event.type === 'pad') { music.effect('pad', FLOOR_PADS[event.index!].note); world.pickup(FLOOR_PADS[event.index!].x, FLOOR_PADS[event.index!].z); }
      if (event.type === 'approach' && event.activity !== 'bubbles') activate();
    });
    if (travelTo && !routes.length && state.nearest === travelTo) { if (travelTo !== 'bubbles') activate(); travelTo = null; }
    if (state.nearest === 'stage' && music.playing && !state.moving && !state.dancing) startDance(state);
    if (state.stars.size === 8 && !starsResetAt) starsResetAt = state.time + 6;
    if (starsResetAt && state.time > starsResetAt) { state.stars.clear(); starsResetAt = 0; }
  }
  const beat = music.beat();
  avatars.forEach((avatar, index) => {
    const active = CHARACTERS[index].id === state!.characterId;
    avatar.root.visible = true;
    if (active) {
      avatar.root.position.set(state!.x, state!.z < -9.3 && Math.abs(state!.x) < 3.7 ? 0.26 : 0, state!.z);
      const yaw = state!.dancing ? Math.sin(state!.danceTime * 2) * 0.6 : state!.yaw;
      const delta = Math.atan2(Math.sin(yaw - avatar.root.rotation.y), Math.cos(yaw - avatar.root.rotation.y));
      avatar.root.rotation.y += delta * (1 - Math.exp(-dt * 12));
      avatar.animate(reducedMotion ? 0 : state!.time, state!.moving, state!.dancing, state!.teaTime > 0);
    } else {
      avatar.root.position.set(index === 0 ? -2.2 : index === 1 ? 0 : 2.2, 0.26, -11.2);
      avatar.root.rotation.y = 0;
      avatar.animate(reducedMotion ? 0 : time + index, false, music.playing);
    }
  });
  const blend = 1 - Math.exp(-dt * 4);
  const elevation = state.z < -9.3 && Math.abs(state.x) < 3.7 ? 0.26 : 0;
  desiredCamera.set(state.x * 0.82, 7.3 + elevation, state.z + 11.8);
  camera.position.lerp(desiredCamera, blend);
  cameraTarget.set(state.x * 0.86, 2.7 + elevation, state.z - 1.2);
  lookAt.lerp(cameraTarget, blend);
  camera.lookAt(lookAt);
  world.update(reducedMotion ? state.time * 0.3 : state.time, mode === 'play' ? dt : 0, state, reducedMotion ? beat * 0.2 : beat, music.playing && music.selected === 0);
  if (now - lastUI > 90) { ui.update(state, totalStars); lastUI = now; }
  renderer.render(scene, camera);
  renderedFrames++;
}
requestAnimationFrame(frame);
ui.select(selected);

if (new URLSearchParams(location.search).has('partyqa')) void import('./party-qa.ts').then(({ runPartyQA }) => runPartyQA());
else if (new URLSearchParams(location.search).has('tabletqa')) void import('./tablet-qa.ts').then(({ runTabletQA }) => runTabletQA());
else if (new URLSearchParams(location.search).has('qa')) void import('./qa.ts').then(({ runQA }) => runQA());

// Read-only runtime evidence for browser QA; no teleport or mutation shortcuts.
Object.defineProperty(window, '__STARLIGHT__', { value: Object.freeze({
  snapshot() {
    const values = [...frameTimes.slice(0, Math.min(frameCount, frameTimes.length))].sort((a, b) => a - b);
    const mean = values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
    return {
      mode, selected, state: state ? { ...state, stars: [...state.stars], visits: [...state.visits] } : null,
      totalStars, routeLength: routes.length,
      camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z, targetX: lookAt.x, targetZ: lookAt.z },
      music: music.snapshot(),
      models: avatars.map(avatar => ({ ...avatar.asset })),
      input: { movement: input.movement(), joystick: ui.joystickSnapshot() },
      bubbles: bubbleView.snapshot(),
      party: { ...party.snapshot(), starting: partyStarting, stage: avatars.map(a => ({ x:a.root.position.x,y:a.root.position.y,z:a.root.position.z,visible:a.root.visible })), particleCapacity: 24 },
      worldArt: world.artSnapshot(),
      performance: { frames: frameCount, renderedFrames, fps: mean ? 1000 / mean : 0, medianMs: values[Math.floor(values.length * 0.5)] || 0, p95Ms: values[Math.floor(values.length * 0.95)] || 0, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, pixelRatio: renderer.getPixelRatio(), canvasWidth: canvas.width, canvasHeight: canvas.height },
    };
  },
}) });
