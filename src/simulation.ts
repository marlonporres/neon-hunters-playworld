export type CharacterId = 'rumi' | 'mira' | 'zoey';
export type ActivityId = 'hunter' | 'tea' | 'companion' | 'stage' | 'bubbles';
export interface GameState {
  characterId: CharacterId;
  x: number; z: number; yaw: number; time: number;
  moving: boolean; dancing: boolean; danceTime: number;
  stars: Set<number>; visits: Set<ActivityId>; nearest: ActivityId | null;
  lastInteraction: ActivityId | null; celebration: number; magicTime: number;
  cloudsCleared: number; cloudResetTime: number; teaTime: number;
  companionFollowing: boolean; pad: number | null; padCount: number;
}
export interface GameEvent { type: 'star' | 'pad' | 'approach'; index?: number; x?: number; z?: number; activity?: ActivityId }

export const CHARACTERS: { id: CharacterId; model: string; name: string; role: string; color: string; hair: string; outfit: string; skin: string; tagline: string }[] = [
  { id: 'rumi', model: '/models/characters/rumi.glb', name: 'Rumi', role: 'The fearless leader', color: '#8670ce', hair: '#7042ad', outfit: '#ffe050', skin: '#efbc96', tagline: 'Big dreams. Brave heart.' },
  { id: 'mira', model: '/models/characters/mira.glb', name: 'Mira', role: 'The effortless icon', color: '#dc779a', hair: '#b42667', outfit: '#25232c', skin: '#f2c5ad', tagline: 'Make every moment yours.' },
  { id: 'zoey', model: '/models/characters/zoey.glb', name: 'Zoey', role: 'The bright spark', color: '#579d91', hair: '#25263d', outfit: '#35b9b4', skin: '#c89370', tagline: 'A little mischief. A lot of joy.' },
];

export const STAR_POSITIONS = [
  { x: 0, z: 3 }, { x: 0, z: 0 }, { x: 0, z: -3 },
  { x: -4, z: -3 }, { x: -7, z: -4 }, { x: 4, z: 0 },
  { x: 7, z: 3 }, { x: 4, z: 6 },
];

export const ACTIVITIES: { id: ActivityId; name: string; action: string; icon: string; x: number; z: number; color: string; message: string }[] = [
  { id: 'hunter', name: 'Magic garden', action: 'Make cloud magic', icon: 'magic', x: -9, z: -5, color: '#dd88ae', message: 'Clouds into sparkles! Your magic makes the garden happy.' },
  { id: 'tea', name: 'Cloud Nine Tea', action: 'Grab a bubble tea', icon: 'cup', x: 9, z: -3, color: '#77af9c', message: 'One dreamy bubble tea, coming right up. Cheers!' },
  { id: 'stage', name: 'Starlight stage', action: 'Light up the stage', icon: 'music', x: 0, z: -9, color: '#9380d2', message: 'The stage is yours. Let the whole plaza see you shine!' },
  { id: 'companion', name: 'Bouncy the tiger', action: 'Play with Bouncy', icon: 'cat', x: -8, z: 6, color: '#6eb6d7', message: 'A new little friend! Bouncy will explore with you.' },
  { id: 'bubbles', name: 'Magic bubble stand', action: 'PLAY', icon: 'bubble', x: 7.5, z: 3.2, color: '#a17ee3', message: 'Bubble magic!' },
];

export const FLOOR_PADS = [
  { x: -2.2, z: -3, color: '#f8bc9c', note: 261.63 },
  { x: 0, z: -3, color: '#e7bddc', note: 329.63 },
  { x: 2.2, z: -3, color: '#b7dcd1', note: 392 },
  { x: -2.2, z: -5.3, color: '#bcc6ef', note: 523.25 },
  { x: 0, z: -5.3, color: '#f2d69c', note: 659.25 },
  { x: 2.2, z: -5.3, color: '#d0c0eb', note: 783.99 },
];

// Match the world geometry. Small circle colliders keep physics inexpensive.
export const COLLIDERS = [
  { x: 7.5, z: 1.8, radius: 0.65 },
  { x: -5, z: 5, radius: 1.8 },
  { x: 9, z: -5.6, radius: 1.15 },
  { x: -9, z: -7.4, radius: 0.8 },
  ...[-11.5, 11.5].flatMap((x) => [-10, -1, 7, 10].map((z) => ({ x, z, radius: 0.7 }))),
];

export const SETTINGS = Object.freeze({
  speed: 4.8,
  playerRadius: 0.34,
  pickupRadius: 0.85,
  activityRadius: 2.6,
  boundX: 12.8,
  boundZ: 11.8,
  danceDuration: 5.5,
});

export function createState(characterId: CharacterId = 'rumi'): GameState {
  if (!CHARACTERS.some((character) => character.id === characterId)) {
    throw new Error(`Unknown character: ${characterId}`);
  }
  return {
    characterId, x: 0, z: 6, yaw: Math.PI,
    moving: false, dancing: false, danceTime: 0,
    stars: new Set(), visits: new Set(), nearest: null,
    time: 0, lastInteraction: null, celebration: 0,
    magicTime: 0, cloudsCleared: 0, cloudResetTime: 0, teaTime: 0,
    companionFollowing: false, pad: null, padCount: 0,
  };
}

function collides(x: number, z: number) {
  return COLLIDERS.some((collider) => Math.hypot(x - collider.x, z - collider.z) < collider.radius + SETTINGS.playerRadius);
}

export function canStandAt(x: number, z: number, clearance = 0) {
  return Math.abs(x) <= SETTINGS.boundX && Math.abs(z) <= SETTINGS.boundZ && !COLLIDERS.some((collider) => Math.hypot(x - collider.x, z - collider.z) < collider.radius + SETTINGS.playerRadius + clearance);
}

export function startDance(state: GameState) {
  state.dancing = true;
  state.danceTime = 0;
}

export function castMagic(state: GameState) {
  state.magicTime = 1.6;
  state.celebration = 1.6;
  if (Math.hypot(state.x + 9, state.z + 5) < 4.5) {
    state.cloudsCleared = 3;
    state.cloudResetTime = 8;
    state.visits.add('hunter');
  }
}

export function updateState(state: GameState, input: Set<string> | { x: number; z: number }, elapsed: number, steering?: { x: number; z: number }): GameEvent[] {
  // A stalled/background tab must never teleport the player through obstacles.
  const dt = Math.max(0, Math.min(elapsed, 0.05));
  state.time += dt;
  state.celebration = Math.max(0, state.celebration - dt);
  state.magicTime = Math.max(0, state.magicTime - dt);
  state.teaTime = Math.max(0, state.teaTime - dt);
  state.cloudResetTime = Math.max(0, state.cloudResetTime - dt);
  if (state.cloudResetTime === 0) state.cloudsCleared = 0;
  const analog = !(input instanceof Set);
  let dx = steering ? steering.x : analog ? input.x : Number(input.has('KeyD') || input.has('ArrowRight')) - Number(input.has('KeyA') || input.has('ArrowLeft'));
  let dz = steering ? steering.z : analog ? input.z : Number(input.has('KeyS') || input.has('ArrowDown')) - Number(input.has('KeyW') || input.has('ArrowUp'));
  const length = Math.hypot(dx, dz);
  state.moving = length > 0;
  if (state.moving) {
    dx /= length;
    dz /= length;
    state.yaw = Math.atan2(dx, dz);
    const distance = Math.min(SETTINGS.speed * dt * (analog && !steering ? Math.min(1, length) : 1), steering ? length : Infinity);
    const nextX = Math.max(-SETTINGS.boundX, Math.min(SETTINGS.boundX, state.x + dx * distance));
    const nextZ = Math.max(-SETTINGS.boundZ, Math.min(SETTINGS.boundZ, state.z + dz * distance));
    if (!collides(nextX, state.z)) state.x = nextX;
    if (!collides(state.x, nextZ)) state.z = nextZ;
  }
  if (state.dancing) {
    state.danceTime += dt;
    if (state.danceTime >= SETTINGS.danceDuration) state.dancing = false;
  }
  const events: GameEvent[] = [];
  STAR_POSITIONS.forEach((star, index) => {
    if (!state.stars.has(index) && Math.hypot(state.x - star.x, state.z - star.z) < SETTINGS.pickupRadius) {
      state.stars.add(index);
      events.push({ type: 'star', index, x: star.x, z: star.z });
    }
  });
  const previousNearest = state.nearest;
  state.nearest = null;
  let nearestDistance: number = SETTINGS.activityRadius;
  for (const activity of ACTIVITIES) {
    const distance = Math.hypot(state.x - activity.x, state.z - activity.z);
    if (distance < nearestDistance) {
      state.nearest = activity.id;
      nearestDistance = distance;
    }
  }
  if (state.nearest && previousNearest !== state.nearest) events.push({ type: 'approach', activity: state.nearest });
  const nextPad = FLOOR_PADS.findIndex((pad) => Math.hypot(state.x - pad.x, state.z - pad.z) < 0.92);
  if (nextPad !== -1 && nextPad !== state.pad) {
    state.padCount++;
    events.push({ type: 'pad', index: nextPad });
  }
  state.pad = nextPad === -1 ? null : nextPad;
  return events;
}

export function interact(state: GameState) {
  const activity = ACTIVITIES.find((item) => item.id === state.nearest);
  if (!activity) return null;
  state.visits.add(activity.id);
  state.lastInteraction = activity.id;
  state.celebration = 2.5;
  if (activity.id === 'stage') startDance(state);
  if (activity.id === 'hunter') castMagic(state);
  if (activity.id === 'tea') state.teaTime = 6;
  if (activity.id === 'companion') state.companionFollowing = true;
  return activity;
}

export function isComplete(state: GameState) {
  return state.stars.size === STAR_POSITIONS.length && state.visits.size === ACTIVITIES.length;
}
