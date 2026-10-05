import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DanceParty, GOLDEN_TIMELINE } from '../src/dance-party.ts';

test('Golden invitations are timestamped and consume crossed cues once without timing penalties', () => {
  assert.ok(GOLDEN_TIMELINE.cues.every((c,i,a)=>i===0||c.at>=a[i-1].at));
  const party=new DanceParty(); party.enter();party.step(1.6,false,.016);
  assert.ok(party.pulses[0]>0);assert.ok(party.press(2));assert.equal(party.interactions,1);
  assert.ok(party.responses[2]>0);const cursor=party.snapshot().cueCursor;
  party.step(1.6,false,.016);assert.equal(party.snapshot().cueCursor,cursor);
  party.step(40,false,.016);assert.equal(party.interactions,1);assert.equal(party.finished,false);
  assert.equal(party.magicVisible,false); // skipped old prompt is harmless
});
test('any pad responds repeatedly; five interactions celebrate and magic is optional', () => {
  const party=new DanceParty();party.enter();
  for(let i=0;i<15;i++)assert.ok(party.press(i%3));
  assert.equal(party.interactions,15);assert.equal(party.celebrations,3);assert.ok(party.groupTime>0);
  party.step(18,false,.016);assert.ok(party.magicVisible);assert.ok(party.magic());
  assert.equal(party.magicHits,1);assert.equal(party.interactions,16);assert.equal(party.magic(),false);
  party.step(51,false,.016);party.step(62,false,.016);assert.equal(party.magicVisible,false);
  assert.equal(party.interactions,16);assert.ok(party.press(0));
});
test('transport end celebrates once, pads remain playful, replay and exit clean the session', () => {
  const party=new DanceParty();party.enter();party.step(200,true,.016);party.step(200,true,.016);
  assert.equal(party.finaleCount,1);assert.ok(party.finished&&party.groupTime>0);assert.ok(party.press(1));
  const motion=party.motionTime;party.step(200,true,.05);assert.ok(party.motionTime>motion,'finale and post-song taps keep animating after the media clock stops');
  party.enter();assert.equal(party.interactions,0);assert.equal(party.finished,false);assert.equal(party.finaleCount,0);
  party.step(18,false,.016);party.exit();assert.equal(party.magicVisible,false);assert.equal(party.press(0),false);assert.equal(party.effectTime,0);
});
test('paused media keeps invitations and reactions still; reused arrays stay bounded over many visits', () => {
  const party=new DanceParty();const responses=party.responses,pulses=party.pulses;
  for(let i=0;i<100;i++) {
    party.enter();party.step(18,false,.016);party.press(0);const before=party.snapshot();
    party.step(18,false,0);assert.deepEqual(party.snapshot(),before);party.exit();
    assert.equal(party.responses,responses);assert.equal(party.pulses,pulses);
  }
  assert.ok(!readFileSync(new URL('../src/dance-party.ts',import.meta.url),'utf8').includes('requestAnimationFrame'));
});
