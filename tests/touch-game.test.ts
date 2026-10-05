import test from 'node:test';
import assert from 'node:assert/strict';
import { GameInput, normalizeMovement } from '../src/input.ts';
import { BubbleGame, segmentDistance } from '../src/bubble-game.ts';
import { createState, updateState, startDance, castMagic } from '../src/simulation.ts';

test('keyboard and analog input share normalization, actions, and reset', () => {
  const input = new GameInput(); input.keys.add('KeyW'); input.keys.add('KeyD');
  assert.ok(Math.abs(Math.hypot(input.movement().x, input.movement().z) - 1) < 1e-9);
  input.keys.clear(); input.setStick(0.2, -0.4); assert.deepEqual(input.movement(), { x: 0.2, z: -0.4 });
  input.press('dance'); input.press('magic'); assert.deepEqual(input.consume(), ['dance', 'magic']);
  input.reset(); assert.deepEqual(input.movement(), { x: 0, z: 0 }); assert.deepEqual(input.consume(), []);
  assert.deepEqual(normalizeMovement(0, 0), { x: 0, z: 0 });
});
test('analog speed is proportional, bounded, and permits simultaneous dance/magic', () => {
  const slow = createState(); const fast = createState();
  updateState(slow, { x: 0.25, z: 0 }, 0.05); updateState(fast, { x: 1, z: 0 }, 0.05);
  assert.ok(Math.abs(slow.x * 4 - fast.x) < 1e-9);
  startDance(fast); castMagic(fast); updateState(fast, { x: 1, z: 0 }, 0.016);
  assert.ok(fast.moving && fast.dancing && fast.magicTime > 0);
});
test('bubbles accept taps, full swipe segments, and forgiving near misses once only', () => {
  const game = new BubbleGame(() => 0.5); game.enter(); for (let i = 0; i < 8; i++) game.step(0.05);
  const demon = game.demons[0];
  assert.equal(game.hit({ x: demon.x + 1, y: demon.y }).length, 1);
  assert.equal(game.hit(demon).length, 0); assert.equal(game.captures, 1);
  for (let i = 0; i < 70 && !game.demons.some(d=>d.phase==='float' && d.y>-3); i++) game.step(0.05);
  const target = game.demons.find(d => d.phase === 'float' && d.y>-3)!;
  assert.ok(game.hit({ x: target.x - 3, y: target.y }, { x: target.x + 3, y: target.y }).length > 0);
  assert.equal(segmentDistance({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 2, y: 0 }), 1);
});
test('five captures celebrate, misses have no penalty, and repeated transitions remain bounded', () => {
  const game = new BubbleGame(() => 0.5); game.enter();
  for (let i = 0; i < 400 && game.captures < 5; i++) { game.step(0.05); for (const d of game.demons) if (d.phase === 'float') game.hit(d); }
  assert.ok(game.captures >= 5 && game.celebration > 0);
  const captures = game.captures;
  for (let i = 0; i < 600; i++) game.step(0.05);
  assert.equal(game.captures, captures); assert.equal(game.celebration, 0);
  assert.ok(game.demons.some(d => d.phase === 'float'));
  for (let i = 0; i < 25; i++) { game.exit(); assert.ok(game.demons.every(d => d.phase === 'hidden')); game.enter(); game.step(0.05); assert.equal(game.demons.length, 3); assert.equal(game.captures, 0); }
  game.exit(); const snapshot = game.snapshot(); game.step(1); assert.deepEqual(game.snapshot(), snapshot);
});

test('portrait phones show fewer targets without shrinking forgiving hit areas', () => {
  const game = new BubbleGame(() => 0.5); game.resize(2.1); game.enter();
  for (let i = 0; i < 700; i++) {
    game.step(0.05); assert.ok(game.demons.filter(d=>d.phase!=='hidden').length<=2);
    assert.ok(game.demons.every(d => d.radius >= 1));
    assert.ok(game.demons.filter(d=>d.phase!=='hidden').every(d=>Math.abs(d.x)<=game.halfWidth-.85));
    for (const d of game.demons) if(d.phase==='float' && d.y>-.5) game.hit(d);
  }
  game.resize(7.2); let widest = 0;
  for(let i=0;i<700;i++) {game.step(.05);widest=Math.max(widest,game.demons.filter(d=>d.phase!=='hidden').length);for(const d of game.demons)if(d.phase==='float'&&d.y>1)game.hit(d);}
  assert.equal(widest,3);
});
