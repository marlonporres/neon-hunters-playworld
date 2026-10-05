// Opt-in browser integration harness. Exercises the real DOM/input handlers,
// including simultaneous touch pointers; never mutates game state.
interface Evidence {
  mode: string; selected: string; routeLength: number;
  state: { characterId: string; x: number; z: number; dancing: boolean; magicTime: number; nearest: string; moving: boolean };
  camera: { x: number; y: number; z: number };
  models: { id: string; status: string }[];
  input: { movement: { x: number; z: number }; joystick: { pointer: number | null; area: { width: number; height: number } } };
  bubbles: { active: boolean; captures: number; celebration: number; shower: number; pattern: string; goldenCaptures: number; rainbowCaptures: number; demoActive: boolean; maxGestureCaptures: number; particles: number; particleCapacity: number; pointers: number; demons: { phase: string; x: number; y: number; vy: number; launchId: number; kind: string; variant: number }[] };
  music: { selected: number; playing: boolean; currentTime: number; muted: boolean };
  performance: { fps: number; p95Ms: number; geometries: number; textures: number; drawCalls: number; triangles: number; pixelRatio: number };
}
const evidence = () => (window as unknown as { __STARLIGHT__: { snapshot(): Evidence } }).__STARLIGHT__.snapshot();
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const button = (id: string) => document.querySelector<HTMLButtonElement>(id)!;
const click = (id: string) => button(id).click();
async function until(check: () => boolean, timeout = 16000) {
  const start = performance.now();
  while (!check()) { if (performance.now() - start > timeout) throw new Error('Timed out waiting for touch gameplay'); await wait(50); }
}
function pointer(element: Element, type: string, x: number, y: number, id = 41) {
  element.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', isPrimary: id === 41, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1 }));
}
function tap(selector: string, id = 42) {
  const element = button(selector); const r = element.getBoundingClientRect();
  pointer(element, 'pointerdown', r.x + r.width / 2, r.y + r.height / 2, id);
  pointer(element, 'pointerup', r.x + r.width / 2, r.y + r.height / 2, id);
  // Non-action controls use the normal synthesized click after a pointer gesture.
  if (!['#dance', '#magic', '#interact'].includes(selector)) element.click();
}
export function runTabletQA() {
  const panel = document.createElement('pre'); panel.id = 'tablet-result';
  panel.style.cssText = 'position:fixed;z-index:100;left:90px;top:85px;max-width:460px;max-height:35vh;overflow:auto;background:#fffaf0ed;color:#67557b;border-radius:12px;padding:12px;font:11px monospace;pointer-events:none;white-space:pre-wrap';
  const start = document.createElement('button'); start.textContent = 'RUN TOUCH CHECKS'; start.id = 'tablet-start'; start.style.cssText = 'position:fixed;z-index:101;left:100px;top:15px;padding:18px;background:#75609d;color:white;border-radius:14px';
  document.body.append(panel, start); panel.textContent = 'Touch QA ready';
  const results: string[] = []; const errors: string[] = [];
  window.addEventListener('error', e => errors.push(e.message)); window.addEventListener('unhandledrejection', e => errors.push(String(e.reason)));
  function assert(condition: unknown, name: string) { if (!condition) throw new Error(name); results.push(`PASS ${name}`); panel.textContent = results.join('\n'); }
  start.addEventListener('click', async () => {
    start.remove();
    try {
      await until(() => evidence().models.every(m => m.status === 'ready'), 30000);
      for (const id of ['rumi', 'mira', 'zoey']) {
        tap(`[data-character="${id}"]`); tap('#play'); await wait(250);
        assert(evidence().state.characterId === id, `${id} selected and playable with touch`);
        click('#pause'); click('#change-character'); await wait(100);
      }
      tap('[data-character="rumi"]'); tap('#play'); await wait(400);
      const zone = document.getElementById('joystick-zone')!; const area = zone.getBoundingClientRect();
      const x = area.left + area.width - 25; const y = area.top + 100;
      assert(area.width >= 170 && area.height >= 180, 'generous joystick activation area');
      const before = evidence().state.z;
      const groundCamera = evidence().camera;
      pointer(zone, 'pointerdown', x, y); pointer(zone, 'pointermove', x, y - 55);
      await until(() => evidence().state.z < before - 1.6); tap('#dance'); tap('#magic', 43); await wait(120);
      assert(evidence().input.joystick.pointer === 41 && evidence().state.dancing && evidence().state.magicTime > 0 && evidence().state.z < before - 1.5, 'move + DANCE + MAGIC use independent touch pointers');
      pointer(zone, 'pointercancel', x, y - 55); await wait(100);
      assert(!evidence().state.moving && evidence().input.movement.z === 0, 'pointercancel clears movement');
      pointer(zone, 'pointerdown', x, y); pointer(zone, 'pointermove', x, y - 55);
      await until(() => evidence().state.z < -9.5); pointer(zone, 'pointerup', x, y - 55); await wait(400);
      const stageCamera = evidence().camera;
      assert(stageCamera.y - groundCamera.y > .15 && stageCamera.y - groundCamera.y < .3 && stageCamera.z < groundCamera.z - 10 && evidence().state.nearest === 'stage', 'touch reaches elevated concert; camera follows automatically');
      assert(window.scrollY === 0 && getComputedStyle(zone).touchAction === 'none', 'game gestures do not scroll page');
      click('#song-close');
      const keyboardX = evidence().state.x;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true })); await wait(500);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight', bubbles: true }));
      assert(evidence().state.x > keyboardX + 1, 'keyboard fallback retained');
      tap('[data-travel="bubbles"]'); await until(() => evidence().state.nearest === 'bubbles' && evidence().routeLength === 0); await wait(150);
      assert(evidence().mode === 'play' && !button('#interact').hidden, 'stand presents explicit contextual PLAY');
      const world = evidence(); tap('#interact'); await until(() => evidence().mode === 'bubbles'); await wait(700);
      const field = document.getElementById('bubble-playfield')!;
      function target() { return [...field.querySelectorAll<HTMLElement>('.demon-target')].find(t => !t.hidden)!; }
      function catchOne(swipe = false, near = false) {
        const t = target(); const r = t.getBoundingClientRect(); const cy = r.y + r.height / 2 + (near ? r.height * 0.42 : 0);
        const cx = r.x + r.width / 2;
        pointer(field, 'pointerdown', swipe ? r.x - 15 : cx, cy);
        if (swipe) pointer(field, 'pointermove', r.right + 15, cy);
        pointer(field, 'pointerup', swipe ? r.right + 15 : cx, cy);
      }
      assert(evidence().bubbles.demons.filter(d => d.phase !== 'hidden').length <= 3, 'at most three large slow friendly targets');
      catchOne(); await wait(30);
      assert(evidence().bubbles.captures === 1 && evidence().bubbles.demons.some(d => d.phase === 'bubble'), 'tap creates expanding magical bubble');
      await wait(700); assert(evidence().bubbles.particles > 0, 'bubble pops into bounded star confetti');
      await until(() => !!target()); catchOne(true); await wait(30); assert(evidence().bubbles.captures >= 2, 'broad swipe captures');
      await until(() => !!target()); catchOne(false, true); await wait(30); assert(evidence().bubbles.captures >= 3, 'near miss generously counts');
      while (evidence().bubbles.captures < 5) { await until(() => !!target()); catchOne(); await wait(60); }
      assert(evidence().bubbles.celebration > 0 && evidence().bubbles.particles <= 144, 'five captures celebrate with bounded particles');
      await wait(2200); await until(() => !!target()); assert(evidence().bubbles.celebration === 0, 'celebration ends and gameplay continues');
      pointer(field, 'pointerdown', 30, 250, 45); pointer(field, 'pointermove', 160, 250, 45); await wait(30);
      assert(evidence().bubbles.particles > 0 && evidence().bubbles.pointers === 1, 'magical drawing trail'); pointer(field, 'pointercancel', 160, 250, 45);
      assert(evidence().bubbles.pointers === 0, 'cancel cleans minigame pointers');
      assert(evidence().music.selected === world.music.selected && evidence().music.currentTime > world.music.currentTime, 'Golden continues without restarting');
      tap('#bubble-mute'); await wait(80); assert(evidence().music.muted, 'minigame respects shared mute'); tap('#bubble-mute');
      await wait(3400); const miniProfile = evidence().performance;
      assert(miniProfile.fps >= 30, `minigame performance ${miniProfile.fps.toFixed(1)} FPS / p95 ${miniProfile.p95Ms.toFixed(1)} ms`);
      tap('#bubble-back'); await wait(100);
      assert(evidence().mode === 'play' && Math.hypot(evidence().state.x - world.state.x, evidence().state.z - world.state.z) < 0.01 && !evidence().bubbles.active && evidence().bubbles.particles === 0, 'BACK restores exact hub position and cleans effects');
      // Let the follow camera settle and upload newly visible hub geometry before
      // comparing re-entries. First-use uploads are not lifecycle growth.
      await wait(1500);
      const resources = evidence().performance;
      for (let i = 0; i < 20; i++) { tap('#interact'); await wait(100); tap('#bubble-back'); await wait(100); }
      const after = evidence().performance;
      assert(after.geometries <= resources.geometries && after.textures <= resources.textures && field.querySelectorAll('.demon-target').length === 3 && evidence().bubbles.pointers === 0, `twenty re-entries: GPU ${resources.geometries}/${resources.textures} → ${after.geometries}/${after.textures}; fixed targets/pointers`);
      await wait(3400); const hubProfile = evidence().performance;
      assert(hubProfile.fps >= 30 && hubProfile.pixelRatio <= 1.5, `hub performance ${hubProfile.fps.toFixed(1)} FPS / p95 ${hubProfile.p95Ms.toFixed(1)} ms; DPR capped`);
      assert(!errors.length, 'no browser runtime errors');
      if (new URLSearchParams(location.search).has('polish')) {
        tap('#interact'); await wait(100);
        assert(!evidence().bubbles.demoActive, 'repeat visits skip first-session visual demo');
        const arcs = new Map<number, {below:boolean;up:boolean;apex:boolean;down:boolean;exit:boolean;maxY:number}>();
        const unchanged = evidence().bubbles.captures;
        const start = performance.now();
        while(performance.now()-start<6500) {
          for(const d of evidence().bubbles.demons) if(d.launchId>0) {
            if(!arcs.has(d.launchId))arcs.set(d.launchId,{below:false,up:false,apex:false,down:false,exit:false,maxY:-6});
            const arc=arcs.get(d.launchId)!;
            if(d.y<-4.5 && d.vy>0)arc.below=true;
            if(d.y>-.5 && d.vy>1)arc.up=true;
            if(d.y>0 && Math.abs(d.vy)<.6)arc.apex=true;
            if(d.y>-.5 && d.vy< -1)arc.down=true;
            if(d.y<-5.7 && d.vy<0)arc.exit=true;
            arc.maxY=Math.max(arc.maxY,d.y);
          }
          await wait(25);
        }
        assert([...arcs.values()].some(a=>a.below&&a.up&&a.apex&&a.down&&a.exit), 'browser observes below → rise → slow apex → fall → bottom exit');
        assert(evidence().bubbles.captures===unchanged && evidence().bubbles.pattern==='gentle-assist', 'misses are harmless; idle director supplies central gentle arcs');
        const patterns=new Set<string>(),variants=new Set<number>();let shower=false;let multi=false;
        const varietyStart=performance.now();
        while(evidence().bubbles.captures<32 && performance.now()-varietyStart<100000) {
          const s=evidence().bubbles;patterns.add(s.pattern);if(s.shower>0)shower=true;
          const visible=[...field.querySelectorAll<HTMLElement>('.demon-target')].filter(t=>!t.hidden);
          s.demons.filter(d=>d.phase!=='hidden').forEach(d=>variants.add(d.variant));
          assertLimit(s.demons.filter(d=>d.phase!=='hidden').length);
          // Let pairs overlap long enough for one uninterrupted swipe.
          if(s.captures>=8 && !multi && visible.length>=2) {
            const a=visible[0].getBoundingClientRect(),b=visible[1].getBoundingClientRect();const before=s.captures;
            pointer(field,'pointerdown',a.x+a.width/2,a.y+a.height/2);
            pointer(field,'pointermove',b.x+b.width/2,b.y+b.height/2);
            pointer(field,'pointerup',b.x+b.width/2,b.y+b.height/2);
            multi=evidence().bubbles.captures>=before+2;
          } else if(visible.length && (s.captures<8 || multi || s.demons.some(d=>d.kind!=='normal'&&d.phase==='float'&&d.y>-3) || s.demons.some(d=>d.phase==='float'&&d.vy<0))) catchOne();
          await wait(50);
        }
        function assertLimit(count:number){if(count>3)throw new Error('Visible target limit exceeded');}
        assert(evidence().bubbles.captures>=32 && patterns.size>=5 && variants.size>=7,'extended touch session varies curated arcs and seven visual variants');
        assert(multi && evidence().bubbles.maxGestureCaptures>=2,'one continuous pointer swipe captures multiple launched friends');
        assert(evidence().bubbles.goldenCaptures>0 && evidence().bubbles.rainbowCaptures>0 && shower,'Golden, rainbow and touchable star shower appear in real gameplay');
        pointer(field,'pointerdown',40,350,77);pointer(field,'pointermove',-100,-100,77);pointer(field,'pointerup',-100,-100,77);
        assert(evidence().bubbles.pointers===0,'finger lifted outside viewport does not stick');
        await wait(3400);assert(evidence().performance.fps>=30 && evidence().bubbles.particles<=144,'extended variety retains frame and particle budgets');
        tap('#bubble-back');await wait(100);
        assert(!evidence().bubbles.active&&!evidence().bubbles.particles&&!evidence().bubbles.pointers&&!errors.length,'polished activity cleans up without runtime errors');
      }
      panel.textContent = `ALL ${results.length} TOUCH CHECKS PASSED\n${results.join('\n')}\n${JSON.stringify({ viewport: [innerWidth, innerHeight], miniProfile, hubProfile, errors })}`;
      // Leave the new activity visible for inspection and real pointer testing.
      tap('#interact');
    } catch (error) { panel.textContent = `FAIL ${String(error)}\n${results.join('\n')}\nErrors: ${errors.join('; ')}\n${JSON.stringify(evidence())}`; }
  }, { once: true });
}
