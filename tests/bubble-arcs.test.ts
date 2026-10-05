import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BubbleGame } from '../src/bubble-game.ts';

test('launch starts below screen, rises, slows at apex, falls and exits without penalty',()=>{
  const game=new BubbleGame(()=>.5);game.enter();game.step(.05); const target=game.demons[0];
  assert.ok(target.y < -4.5-target.size/2 && target.vy>0);
  const id=target.launchId;const initialY=target.y;const velocity=target.vy;game.step(.05);
  assert.ok(target.y>initialY && target.vy<velocity);
  let rising=false,falling=false,apex=false,visible=0;
  for(let i=0;i<100 && target.launchId===id && target.phase!=='hidden';i++) {
    game.step(.025);if(target.vy>0)rising=true;if(Math.abs(target.vy)<.3)apex=true;if(target.vy<0)falling=true;
    assert.ok(target.y<=game.safeTop+.01);if(target.y>-4.5+target.size/2)visible+=.025;
  }
  // Finish falling even if a reused slot launches again afterwards.
  for(let i=0;i<60 && target.launchId===id && target.phase!=='hidden';i++)game.step(.025);
  assert.ok(rising&&apex&&falling);assert.ok(target.phase==='hidden'||target.launchId!==id);
  assert.ok(visible>=1.5 && visible<=3.1,`visible for ${visible}s`);assert.equal(game.captures,0);
});

test('fast segment captures every intersected target once, including generous near misses',()=>{
  const game=new BubbleGame(()=>.5);game.enter();
  game.demons.forEach((d,i)=>Object.assign(d,{phase:'float',x:(i-1)*2,y:1,launchId:i+1}));
  assert.deepEqual(game.hit({x:-5,y:1.9},{x:5,y:1.9}),[0,1,2]);
  assert.equal(game.captures,3);assert.deepEqual(game.hit({x:5,y:1.9},{x:-5,y:1.9}),[]);
  const frozen=game.demons[1].y;game.step(.05);assert.equal(game.demons[1].y,frozen);
  let pops=0;for(let i=0;i<8;i++)pops+=game.step(.05).length;assert.equal(pops,3);
});

test('pop feedback retains capture location when its pooled slot launches again immediately',()=>{
  const game=new BubbleGame(()=>.5);game.enter();Object.assign(game.demons[0],{phase:'bubble',age:.39,x:2,y:1,kind:'golden'});
  const pops=game.step(.05);assert.deepEqual(pops,[{x:2,y:1,kind:'golden'}]);
  assert.equal(game.demons[0].phase,'float');assert.ok(game.demons[0].y<-4.5);
});

test('director varies patterns, unlocks gentle specials, celebrations and star showers',()=>{
  const game=new BubbleGame(()=>.5);game.enter();const patterns=new Set<string>();const variants=new Set<number>();
  let golden=false,rainbow=false,shower=false,celebration=false,max=0;
  for(let i=0;i<3500;i++) {
    game.step(.025);patterns.add(game.pattern);max=Math.max(max,game.demons.filter(d=>d.phase!=='hidden').length);
    for(const d of game.demons) if(d.phase==='float'&&d.y>1) {
      variants.add(d.variant);if(d.kind==='golden'){golden=true;assert.ok(d.radius>1.3&&d.gravity>-8);}
      if(d.kind==='rainbow')rainbow=true;
      game.hit(d);
    }
    if(game.celebration>0)celebration=true;if(game.shower>0)shower=true;
  }
  assert.ok(patterns.size>=5 && variants.size>=7);assert.ok(golden&&rainbow&&shower&&celebration);
  assert.ok(game.goldenCaptures>0&&game.rainbowCaptures>0);assert.equal(max,3);
});

test('idle assist reduces intensity and launch safe area respects short-screen header',()=>{
  const game=new BubbleGame(()=>.5);game.resize(7.2,.6);game.enter();
  for(let i=0;i<450;i++)game.step(.025);
  assert.equal(game.pattern,'gentle-assist');assert.ok(game.demons.filter(d=>d.phase!=='hidden').length<=1);
  for(let i=0;i<180;i++){game.step(.025);for(const d of game.demons)if(d.phase==='float'){assert.ok(d.y<=.61);assert.ok(Math.abs(d.x)<.7);assert.ok(d.assist);}}
});

test('minigame retains authoritative main loop and bounded slots over repeated visits',()=>{
  for(const file of ['bubble-game.ts','bubble-view.ts']) assert.ok(!readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8').includes('requestAnimationFrame'));
  const game=new BubbleGame(()=>.5);const slots=[...game.demons];
  for(let visit=0;visit<50;visit++){game.enter();for(let i=0;i<30;i++)game.step(.05);game.exit();assert.ok(game.demons.every((d,i)=>d===slots[i]&&d.phase==='hidden'));assert.equal(game.shower,0);}
});
