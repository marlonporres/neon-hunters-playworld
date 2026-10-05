import test from 'node:test';
import assert from 'node:assert/strict';
import { findRoute } from '../src/navigation.ts';
import { ACTIVITIES, createState, updateState } from '../src/simulation.ts';

test('guided walks connect every pair of activities, including across the fountain', () => {
  for (const from of ACTIVITIES) for (const to of ACTIVITIES) {
    const state = createState();
    state.x = from.x; state.z = from.z;
    const path = findRoute(from, to);
    assert.ok(path.length, `${from.id} → ${to.id} has a route`);
    for (let frame = 0; frame < 1500 && path.length; frame++) {
      const target = path[0];
      const dx = target.x - state.x; const dz = target.z - state.z;
      if (Math.hypot(dx, dz) < 0.2) { path.shift(); continue; }
      updateState(state, new Set(), 1 / 60, { x: dx, z: dz });
    }
    assert.equal(path.length, 0, `${from.id} → ${to.id} reaches the destination`);
    assert.ok(Math.hypot(state.x - to.x, state.z - to.z) < 0.2);
  }
});
