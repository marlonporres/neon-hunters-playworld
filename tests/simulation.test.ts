import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, ACTIVITIES, SETTINGS, FLOOR_PADS, createState, updateState, castMagic, interact, startDance } from '../src/simulation.ts';

test('all three characters spawn at the safe starting position', () => {
  for (const character of CHARACTERS) {
    const state = createState(character.id);
    assert.equal(state.characterId, character.id);
    assert.deepEqual([state.x, state.z], [0, 6]);
  }
});

test('WASD and arrows move equally; diagonals do not give a speed boost', () => {
  const left = createState();
  const right = createState();
  const diagonal = createState();
  updateState(left, new Set(['KeyA']), 0.05);
  updateState(right, new Set(['ArrowRight']), 0.05);
  updateState(diagonal, new Set(['KeyD', 'KeyW']), 0.05);
  assert.equal(-left.x, right.x);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z - 6) - right.x) < 1e-10);
});

test('large elapsed time cannot teleport through the fountain; bounds are soft stops', () => {
  const state = createState();
  updateState(state, new Set(['KeyD']), 100);
  assert.equal(state.x, SETTINGS.speed * 0.05);
  state.x = -7.3; state.z = 5;
  for (let i = 0; i < 120; i++) updateState(state, new Set(['KeyD']), 1 / 60);
  assert.ok(state.x < -7);
  state.x = SETTINGS.boundX;
  state.z = 0;
  updateState(state, new Set(['KeyD']), 0.05);
  assert.equal(state.x, SETTINGS.boundX);
});

test('stars collect once per round and pads retrigger after leaving', () => {
  const state = createState();
  state.z = 3;
  assert.equal(updateState(state, new Set(), 0.016).filter((e) => e.type === 'star').length, 1);
  assert.equal(updateState(state, new Set(), 0.016).filter((e) => e.type === 'star').length, 0);
  state.x = FLOOR_PADS[0].x; state.z = FLOOR_PADS[0].z;
  assert.equal(updateState(state, new Set(), 0.016).filter((e) => e.type === 'pad').length, 1);
  assert.equal(updateState(state, new Set(), 0.016).filter((e) => e.type === 'pad').length, 0);
  state.z += 2; updateState(state, new Set(), 0.016);
  state.z -= 2;
  assert.equal(updateState(state, new Set(), 0.016).filter((e) => e.type === 'pad').length, 1);
});

test('every activity is proximity-gated and replayable; no precise targeting', () => {
  const state = createState();
  assert.equal(interact(state), null);
  for (const activity of ACTIVITIES) {
    state.x = activity.x + 1.8; state.z = activity.z;
    assert.ok(updateState(state, new Set(), 0.016).some((e) => e.type === 'approach'));
    assert.equal(interact(state)?.id, activity.id);
    assert.equal(interact(state)?.id, activity.id);
    assert.ok(state.visits.has(activity.id));
  }
  assert.equal(state.visits.size, ACTIVITIES.length);
  assert.equal(state.companionFollowing, true);
  assert.ok(state.teaTime > 0);
});

test('magic works anywhere, clears nearby clouds, and the activity replenishes', () => {
  const state = createState();
  castMagic(state);
  assert.ok(state.magicTime > 0);
  assert.equal(state.cloudsCleared, 0);
  state.x = -9; state.z = -5;
  castMagic(state);
  assert.equal(state.cloudsCleared, 3);
  for (let i = 0; i < 500; i++) updateState(state, new Set(), 1 / 60);
  assert.equal(state.cloudsCleared, 0);
  castMagic(state);
  assert.equal(state.cloudsCleared, 3);
});

test('dance can repeat immediately while movement continues', () => {
  const state = createState();
  startDance(state);
  updateState(state, new Set(), 0.05);
  assert.ok(state.danceTime > 0);
  startDance(state);
  assert.equal(state.danceTime, 0);
  updateState(state, new Set(['KeyW']), 0.016);
  assert.equal(state.dancing, true);
  assert.equal(state.moving, true);
});
