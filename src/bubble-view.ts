import * as THREE from 'three';
import { BubbleGame } from './bubble-game.ts';
import type { Point } from './bubble-game.ts';
import type { createCharacter } from './characters.ts';

const demonTextures = new Map<string, THREE.CanvasTexture>();
export function demonTexture(color: string, variant = 0, happy = false) {
  const key = `${color}:${variant}:${happy}`;
  if (demonTextures.has(key)) return demonTextures.get(key)!;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.fillStyle = color;
  // Rounded ears, squishy bean body, rosy cheeks and a toothless smile.
  c.beginPath(); c.ellipse(65, 72, 28, 41, -0.6, 0, Math.PI * 2); c.ellipse(191, 72, 28, 41, 0.6, 0, Math.PI * 2); c.fill();
  if (variant === 0) { c.fillStyle = '#e9d7ff'; for (const x of [77, 179]) { c.beginPath(); c.moveTo(x - 12, 80); c.quadraticCurveTo(x, 28, x + 12, 80); c.fill(); } }
  if (variant === 2) { for (const x of [36, 220]) { c.beginPath(); c.ellipse(x, 153, 30, 16, x < 128 ? -0.5 : 0.5, 0, Math.PI * 2); c.fill(); } }
  if (variant === 3 || variant === 5) { c.strokeStyle = color; c.lineWidth = 10; c.beginPath(); c.moveTo(128, 83); c.lineTo(128, 24); c.stroke(); c.beginPath(); c.arc(128, 24, 13, 0, Math.PI * 2); c.fill(); }
  if (variant === 4) { for (const x of [48, 208]) { c.beginPath(); c.ellipse(x, 101, 22, 52, x < 128 ? -0.6 : 0.6, 0, Math.PI * 2); c.fill(); } }
  c.fillStyle = color;
  c.beginPath(); c.ellipse(128, 144, 91, 83, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff4fa'; c.beginPath(); c.ellipse(103, 116, 38, 28, -0.4, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#584476';
  for (const x of [96, 160]) { c.beginPath(); c.ellipse(x, 140, 9, 15, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 2, 135, 3, 0, Math.PI * 2); c.fill(); c.fillStyle = '#584476'; }
  c.strokeStyle = '#584476'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.arc(128, 158, 22, 0.1, Math.PI - 0.1); c.stroke();
  c.fillStyle = '#f791b3'; for (const x of [68, 188]) { c.beginPath(); c.ellipse(x, 162, 15, 9, 0, 0, Math.PI * 2); c.fill(); }
  if (happy) { c.fillStyle = color; c.fillRect(77, 119, 104, 39); c.strokeStyle = '#584476'; c.lineWidth = 7; for (const x of [96, 160]) { c.beginPath(); c.arc(x, 146, 12, Math.PI + 0.25, Math.PI * 2 - 0.25); c.stroke(); } }
  if (variant === 1 || variant === 4) { c.fillStyle = '#584476'; c.beginPath(); c.ellipse(128, 179, variant === 1 ? 12 : 20, 11, 0, 0, Math.PI * 2); c.fill(); }
  if (variant === 6) { c.clearRect(0, 0, 256, 256); c.strokeStyle = '#ffdbab'; c.lineWidth = 14; c.beginPath(); c.arc(128, 128, 90, 0, Math.PI * 2); c.stroke(); c.strokeStyle = '#c6faff'; c.lineWidth = 10; c.beginPath(); c.arc(128, 128, 81, 0, Math.PI * 2); c.stroke(); c.fillStyle = '#ffffff50'; c.beginPath(); c.arc(128, 128, 78, 0, Math.PI * 2); c.fill(); c.font = 'bold 85px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff3ae'; c.fillText('✦', 128, 159); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; demonTextures.set(key, texture); return texture;
}

function backdropTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
  const c = canvas.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, 1024, 512); g.addColorStop(0, '#7764ae'); g.addColorStop(0.55, '#b68dcb'); g.addColorStop(1, '#83bbc9');
  c.fillStyle = g; c.fillRect(0, 0, 1024, 512);
  c.fillStyle = '#ffffff20'; for (let i = 0; i < 18; i++) { const h = 25 + i % 5 * 14; c.fillRect(i * 62, 512 - h, 48, h); }
  c.strokeStyle = '#ffe4f044'; c.lineWidth = 4; c.beginPath(); c.ellipse(512, 555, 560, 130, 0, Math.PI, Math.PI * 2); c.stroke();
  c.font = '60px sans-serif'; c.fillStyle = '#e5f8ff22'; c.fillText('♪', 170, 380); c.fillText('♫', 860, 260);
  for (let i = 0; i < 5; i++) { c.fillStyle = '#fbceef12'; c.beginPath(); c.moveTo(i * 240, 512); c.lineTo(i * 240 - 110, 0); c.lineTo(i * 240 + 110, 0); c.fill(); }
  c.fillStyle = '#fff4dd'; for (let i = 0; i < 36; i++) { const x = (i * 173 + 41) % 1024; const y = (i * 83 + 25) % 450; c.globalAlpha = 0.2 + i % 3 * 0.2; c.beginPath(); c.arc(x, y, i % 3 + 1.5, 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

export function createBubbleView(playfield: HTMLElement, onEffect: (kind: 'bubble' | 'pop' | 'celebrate' | 'golden' | 'sparkle') => void) {
  const game = new BubbleGame();
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#aa90ca');
  scene.add(new THREE.HemisphereLight('#fff7e8', '#8977aa', 2));
  const camera = new THREE.OrthographicCamera(-7.2, 7.2, 4.5, -4.5, 0.1, 40); camera.position.z = 12;
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: backdropTexture() })); backdrop.position.z = -2; scene.add(backdrop);
  const bubbleMaterial = new THREE.MeshBasicMaterial({ color: '#c5f6ff', transparent: true, opacity: 0.22, depthWrite: false });
  const rimMaterial = new THREE.MeshBasicMaterial({ color: '#edfaff', transparent: true, opacity: 0.85, depthWrite: false });
  const circle = new THREE.CircleGeometry(0.87, 28); const ring = new THREE.RingGeometry(0.84, 0.88, 28);
  const colors = ['#bca2ee', '#8dcdf0', '#f2b1cb', '#f4d47e', '#83d6c3', '#ffd76d', '#eac4fa'];
  const faces = colors.map((color, i) => ({ idle: demonTexture(color, i), happy: demonTexture(color, i, true) }));
  const demons = Array.from({length: 3}, (_, i) => {
    const root = new THREE.Group();
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: faces[i].idle, transparent: true, depthWrite: false })); sprite.scale.set(1.8, 1.8, 1); root.add(sprite);
    const rim = new THREE.Mesh(ring, rimMaterial.clone());
    const bubble = new THREE.Group(); bubble.add(new THREE.Mesh(circle, bubbleMaterial), rim); bubble.position.z = 0.15; root.add(bubble);
    scene.add(root); return { root, sprite, bubble, rim };
  });
  const shape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const angle = Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? 0.45 : 1; const x = Math.cos(angle) * r; const y = Math.sin(angle) * r; if (!i) shape.moveTo(x, y); else shape.lineTo(x, y); } shape.closePath();
  const particles = new THREE.InstancedMesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ vertexColors: false, transparent: true, opacity: 0.9, depthWrite: false }), 144);
  particles.frustumCulled = false; scene.add(particles);
  const pool = Array.from({ length: 144 }, () => ({ life: 0, total: 1, x: 0, y: 0, vx: 0, vy: 0, size: 0.08, angle: 0, shower: false }));
  const palette = ['#ffe38b', '#faf2ff', '#ffb6d4', '#adf2ed', '#b6baff', '#ffce8e'];
  const ribbon = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#eef5ff', transparent: true, opacity: 0.25, depthWrite: false }), 48); ribbon.frustumCulled = false; scene.add(ribbon);
  const links = Array.from({length:48},()=>({life:0,x:0,y:0,length:0,angle:0})); let nextLink = 0;
  const transform = new THREE.Object3D(); const color = new THREE.Color(); let next = 0;
  const pointers = new Map<number, Point & { captured: Set<number>; count: number }>();
  const finger = document.createElement('div'); finger.className = 'bubble-demo-finger'; finger.textContent = '☝'; finger.setAttribute('aria-hidden', 'true'); finger.hidden = true; playfield.append(finger);
  const aura = document.createElement('div'); aura.className='bubble-aura'; aura.setAttribute('aria-hidden','true'); playfield.append(aura);
  let demoSeen = false; let demoTime = 0; let demoActive = false; let demoCaptured = false;
  let showerClock = 0; let goldenClock = 0; let pulse = 0;
  let maxGestureCaptures = 0;
  const targets = demons.map((_, i) => {
    const button = document.createElement('button'); button.className = 'demon-target'; button.setAttribute('aria-label', `Catch bubble friend ${i + 1}`); button.dataset.demon = String(i);
    button.addEventListener('click', event => { if (event.detail === 0 && game.demons[i].phase === 'float') catchGesture(game.demons[i]); });
    playfield.append(button); return button;
  });
  let avatar: ReturnType<typeof createCharacter> | undefined;
  let priorParent: THREE.Object3D | null = null;
  let priorTransform: { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3; visible: boolean } | undefined;
  function emit(point: Point, count: number, trail = false, gold = false) {
    for (let i = 0; i < count; i++) {
      const p = pool[next]; const index = next; next = (next + 1) % pool.length;
      const angle = Math.random() * Math.PI * 2; const speed = trail ? 0.5 : 1.5 + Math.random() * 2;
      Object.assign(p, { life: trail ? 0.3 : 0.65 + Math.random() * 0.25, x: point.x, y: point.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: trail ? 0.08 : 0.09 + Math.random() * 0.12, angle, shower: false }); p.total = p.life;
      color.set(gold ? '#ffe28b' : palette[index % palette.length]); particles.setColorAt(index, color);
    }
    if (particles.instanceColor) particles.instanceColor.needsUpdate = true;
  }
  function trail(from: Point, to: Point) {
    const link = links[nextLink++ % links.length]; Object.assign(link, {life:.25,x:(from.x+to.x)/2,y:(from.y+to.y)/2,length:Math.hypot(to.x-from.x,to.y-from.y),angle:Math.atan2(to.y-from.y,to.x-from.x)});
    const steps = Math.min(12, Math.max(1, Math.ceil(link.length / 0.18)));
    for (let i = 1; i <= steps; i++) emit({x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps},1,true);
  }
  function catchGesture(to: Point, from = to, gesture?: { captured: Set<number>; count: number }) {
    const before = game.captures;
    const caught = game.hit(from, to);
    const celebrates = Math.floor(game.captures / 5) > Math.floor(before / 5);
    const special = caught.some(i => game.demons[i].kind !== 'normal');
    if (caught.length) { pulse = .3; onEffect(special ? 'golden' : celebrates ? 'celebrate' : 'bubble'); }
    if (celebrates || special) emit({ x: 0, y: 2.4 }, 64, false, caught.some(i => game.demons[i].kind === 'golden'));
    if (gesture) for (const i of caught) { const id = game.demons[i].launchId; if (!gesture.captured.has(id)) { gesture.captured.add(id); while(gesture.captured.size>3)gesture.captured.delete(gesture.captured.values().next().value!); gesture.count++; maxGestureCaptures=Math.max(maxGestureCaptures,gesture.count); if (gesture.count >= 2) emit(game.demons[i], gesture.count === 2 ? 18 : 32); } }
    for (const star of pool) if (star.shower && star.life > 0 && Math.hypot(star.x-to.x,star.y-to.y)<.4) { star.life=0; emit(to,5,true); onEffect('sparkle'); }
    return caught;
  }
  function point(event: PointerEvent) {
    const rect = playfield.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * game.halfWidth * 2 - game.halfWidth, y: 4.5 - (event.clientY - rect.top) / rect.height * 9 };
  }
  playfield.addEventListener('pointerdown', event => {
    if (!game.active || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault(); demoActive = false; finger.hidden = true; const p = {...point(event),captured:new Set<number>(),count:0}; pointers.set(event.pointerId, p); if (event.isTrusted) playfield.setPointerCapture(event.pointerId); emit(p, 4, true); catchGesture(p,p,p);
  });
  playfield.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId); if (!game.active || !previous) return;
    event.preventDefault(); const p = point(event); catchGesture(p, previous, previous); trail(previous,p);
    previous.x = p.x; previous.y = p.y;
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) playfield.addEventListener(type, event => { pointers.delete((event as PointerEvent).pointerId); });
  function clearPointers() { for (const id of pointers.keys()) if (playfield.hasPointerCapture(id)) playfield.releasePointerCapture(id); pointers.clear(); }
  function resize(width: number, height: number) {
    clearPointers(); const halfWidth = 4.5 * width / height;
    const header = document.querySelector<HTMLElement>('.bubble-header')!;
    const headerBottom = Math.max(90, header.getBoundingClientRect().bottom);
    game.resize(halfWidth, Math.min(2.2, 4.5 - (headerBottom + 24) / height * 9 - 1.12));
    camera.left = -halfWidth; camera.right = halfWidth; camera.updateProjectionMatrix();
    backdrop.scale.set(halfWidth * 2, 9, 1);
    if (avatar) avatar.root.position.set(-halfWidth + 1, -4.35, 0.2);
  }
  return {
    scene, camera, game, resize, clearPointers,
    warm(renderer: THREE.WebGLRenderer) { faces.forEach(face => { renderer.initTexture(face.idle); renderer.initTexture(face.happy); }); },
    enter(selected: ReturnType<typeof createCharacter>) {
      game.enter(); pool.forEach(p => { p.life = 0; }); clearPointers();
      links.forEach(p => {p.life=0;}); pulse=0; showerClock=goldenClock=0; demoTime=0; demoCaptured=false; demoActive=!demoSeen; demoSeen=true;
      maxGestureCaptures=0;
      avatar = selected; priorParent = avatar.root.parent;
      priorTransform = { position: avatar.root.position.clone(), quaternion: avatar.root.quaternion.clone(), scale: avatar.root.scale.clone(), visible: avatar.root.visible };
      scene.add(avatar.root);
      avatar.root.scale.setScalar(0.95); avatar.root.rotation.set(0, 0, 0); avatar.root.visible = true;
      resize(playfield.clientWidth, playfield.clientHeight);
    },
    exit() {
      game.exit(); clearPointers(); pool.forEach(p => { p.life = 0; }); targets.forEach(t => { t.hidden = true; });
      links.forEach(p=>{p.life=0;}); finger.hidden=true; demoActive=false;
      aura.style.opacity='0';
      if (avatar && priorParent && priorTransform) {
        priorParent.add(avatar.root); avatar.root.position.copy(priorTransform.position); avatar.root.quaternion.copy(priorTransform.quaternion); avatar.root.scale.copy(priorTransform.scale); avatar.root.visible = priorTransform.visible;
      }
      avatar = undefined; priorTransform = undefined;
    },
    update(time: number, dt: number) {
      const popped = dt > 0 ? game.step(dt) : [];
      popped.forEach(event => emit(event, event.kind === 'normal' ? 28 : 52, false, event.kind === 'golden')); if (popped.length) { pulse=.25; onEffect('pop'); }
      pulse=Math.max(0,pulse-dt); backdrop.material.color.setRGB(1+Math.min(.055,pulse*.18),1+Math.min(.035,pulse*.1),1+Math.min(.025,pulse*.08));
      aura.style.opacity=String(Math.min(.7,game.specialPulse*.55));
      if (demoActive && dt>0) {
        demoTime+=dt; const demon=game.demons[0];
        if (demoTime>.65 && demoTime<2.3) {
          const point={x:demon.x + (demoTime-1.3)*2.2,y:demon.y}; finger.hidden=false;
          finger.style.left=`${(point.x+game.halfWidth)/(game.halfWidth*2)*100}%`; finger.style.top=`${(4.5-point.y)/9*100}%`;
          emit(point,1,true);
          if (demoTime>1.25 && !demoCaptured) { catchGesture(demon); demoCaptured=true; }
        } else finger.hidden=true;
        if (demoTime>2.5) demoActive=false;
      }
      if (game.shower>0 && dt>0) { showerClock+=dt; if(showerClock>.07) { showerClock=0; emit({x:(Math.random()-.5)*game.halfWidth*1.65,y:3.2},1); const p=pool[(next+pool.length-1)%pool.length]; p.life=p.total=1.7; p.vx=0; p.vy=-1.3; p.size=.16; p.shower=true; } }
      goldenClock+=dt;
      if(goldenClock>.12) {goldenClock=0;for(const demon of game.demons)if(demon.kind==='golden'&&demon.phase==='float')emit({x:demon.x+(Math.random()-.5)*1.5,y:demon.y+.5},2,true,true);}
      demons.forEach((d, i) => {
        const state = game.demons[i]; d.root.visible = state.phase !== 'hidden'; d.root.position.set(state.x, state.y, 0);
        const captured=state.phase==='bubble'; const face=faces[state.variant];
        d.rim.material.color.set(state.kind==='golden' ? '#ffe38a' : state.kind==='rainbow' ? '#fcbce9' : '#edfaff');
        d.sprite.material.map=captured || Math.sin(time*2.1+i)>0.985 ? face.happy : face.idle;
        d.sprite.material.rotation = captured ? Math.sin(state.age*13)*.18 : Math.sin(state.age*3+i)*.12;
        const squash=captured ? Math.sin(state.age/.4*Math.PI)*.2 : Math.min(.08,Math.abs(state.vy)*.006);
        d.sprite.scale.set(state.size*(1+squash),state.size*(1-squash),1);
        d.bubble.visible = captured || state.kind!=='normal' || state.assist; d.bubble.scale.setScalar(captured ? state.size/1.8*(.8+state.age*1.8) : state.size/1.8*(1.1+Math.sin(time*3)*.04));
        const target = targets[i]; target.hidden = state.phase !== 'float' || state.y < -4.2;
        const diameter = state.radius * 2 / 9 * playfield.clientHeight;
        target.style.width = target.style.height = `${diameter}px`;
        target.style.left = `${(state.x + game.halfWidth) / (game.halfWidth * 2) * 100}%`; target.style.top = `${(4.5 - state.y) / 9 * 100}%`;
      });
      pool.forEach((p, i) => {
        p.life = Math.max(0, p.life - dt); p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= dt * 1.2;
        transform.position.set(p.x, p.y, 0.4); transform.rotation.z = p.angle + time * 2;
        transform.scale.setScalar(p.life > 0 ? p.size * Math.min(1, p.life / p.total * 3) : 0); transform.updateMatrix(); particles.setMatrixAt(i, transform.matrix);
      }); particles.instanceMatrix.needsUpdate = true;
      links.forEach((link,i)=>{link.life=Math.max(0,link.life-dt);transform.position.set(link.x,link.y,.25);transform.rotation.z=link.angle;transform.scale.set(link.life>0?link.length:0,Math.max(0,link.life)*.4,1);transform.updateMatrix();ribbon.setMatrixAt(i,transform.matrix);});ribbon.instanceMatrix.needsUpdate=true;
      if (avatar) avatar.animate(time, false, game.reaction > 0 || game.celebration > 0);
    },
    snapshot() { return { ...game.snapshot(), demoActive, maxGestureCaptures, particles: pool.filter(p => p.life > 0).length, particleCapacity: pool.length, ribbonCapacity:48, pointers: pointers.size }; },
  };
}
