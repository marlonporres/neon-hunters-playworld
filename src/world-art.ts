import * as THREE from 'three';
import { mergeColoredParts } from './geometry.ts';
import type { CharacterId, GameState } from './simulation.ts';
import type { DanceParty } from './dance-party.ts';

// Costume-derived accents, shared by the plaza ornaments and stage artwork.
export const WORLD_THEMES = {
  rumi: { light: '#bd92ff', hair: '#7137ac', cloth: '#ffd344', skin: '#efbc96' },
  mira: { light: '#ff7dac', hair: '#ac235c', cloth: '#242337', skin: '#f2c5ad' },
  zoey: { light: '#64e4d0', hair: '#242741', cloth: '#28b8b2', skin: '#c89370' },
} as const;
const gold = '#ffdc91';
const pearl = '#ffeecf';

function canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let bubbleTexture: THREE.CanvasTexture | undefined;
export function worldBubbleTexture() {
  return bubbleTexture ??= canvasTexture(128,128,ctx=>{
    const g=ctx.createRadialGradient(54,45,4,64,64,59);
    g.addColorStop(0,'#fff4fa08');g.addColorStop(.72,'#cfcbff12');g.addColorStop(.9,'#9de8f559');g.addColorStop(.96,'#ead0ffbf');g.addColorStop(1,'#fef5ff00');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(64,64,60,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#fff8e9dd';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.arc(64,64,48,Math.PI*1.09,Math.PI*1.55);ctx.stroke();
    ctx.strokeStyle='#ffdcb188';ctx.lineWidth=2;ctx.beginPath();ctx.arc(64,64,52,.15,1.2);ctx.stroke();
  });
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4; const r = i % 2 ? size * .24 : size;
    const px = x + Math.sin(a) * r; const py = y + Math.cos(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
}

// Broad hair silhouettes follow the supplied photos, rather than a fictitious logo.
function portrait(ctx: CanvasRenderingContext2D, id: CharacterId, x: number) {
  const c = WORLD_THEMES[id]; ctx.save(); ctx.translate(x, 190);
  ctx.fillStyle = c.hair;
  if (id === 'rumi') {
    for (let i = 0; i < 9; i++) {
      ctx.beginPath(); ctx.ellipse(58 + Math.sin(i * .85) * 12, -35 + i * 19, 18 - i * .8, 23 - i, -.35, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === 'mira') {
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * 28, -52); ctx.bezierCurveTo(side * 95, -104, side * 62, 85, side * 102, 140);
      ctx.bezierCurveTo(side * 42, 145, side * 42, 10, side * 28, -52); ctx.fill();
    }
  } else {
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * 48, -27, 23, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.fillStyle = c.cloth; ctx.beginPath(); ctx.moveTo(-53, 58); ctx.quadraticCurveTo(0, 31, 53, 58); ctx.lineTo(65, 136); ctx.lineTo(-65, 136); ctx.fill();
  if (id === 'rumi') { ctx.fillStyle = '#fff0df'; ctx.fillRect(-16, 55, 32, 81); ctx.fillStyle = '#312e48'; ctx.fillRect(-53, 62, 11, 70); ctx.fillRect(42, 62, 11, 70); }
  ctx.fillStyle = c.skin; ctx.fillRect(-12, 31, 24, 31); ctx.beginPath(); ctx.ellipse(0, -6, 43, 53, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.hair; ctx.beginPath(); ctx.moveTo(-43, -6); ctx.bezierCurveTo(-66, -88, 55, -92, 45, -4);
  if (id === 'zoey') { ctx.lineTo(31, -31); ctx.lineTo(-31, -31); }
  else if (id === 'mira') { ctx.lineTo(0, -43); ctx.lineTo(-34, -20); }
  else { ctx.quadraticCurveTo(27, -56, 17, -48); ctx.quadraticCurveTo(-10, -12, -43, -6); }
  ctx.fill();
  ctx.strokeStyle = '#31233e'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * 12, -6); ctx.quadraticCurveTo(side * 21, -11, side * 28, -7); ctx.stroke();
    ctx.fillStyle = '#332e49'; ctx.beginPath(); ctx.ellipse(side * 20, -4, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff0ce'; ctx.beginPath(); ctx.arc(side * 43, 20, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#ae5a76'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-9, 25); ctx.quadraticCurveTo(0, 33, 9, 25); ctx.stroke();
  ctx.strokeStyle = gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-18, 57); ctx.quadraticCurveTo(0, 82, 18, 57); ctx.stroke();
  ctx.fillStyle = gold; star(ctx, 0, 79, 7);
  ctx.restore();
}

export function createWorldArt(scene: THREE.Scene) {
  scene.background = canvasTexture(16, 256, ctx => {
    const g = ctx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#27234f'); g.addColorStop(.55, '#63547e'); g.addColorStop(1, '#b58d9c'); ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 256);
  });
  const fixed = new THREE.Group(); scene.add(fixed);
  const geometry = {
    box: new THREE.BoxGeometry(1, 1, 1), orb: new THREE.IcosahedronGeometry(1, 1),
    gem: new THREE.OctahedronGeometry(1), disk: new THREE.CylinderGeometry(1, 1, 1, 20),
  };
  const materials = new Map<string, THREE.MeshLambertMaterial>();
  function piece(g: THREE.BufferGeometry, color: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, parent = fixed) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshLambertMaterial({ color }));
    const m = new THREE.Mesh(g, materials.get(color)!); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m;
  }
  function line(points: THREE.Vector3[], color: string, radius = .035, parent = fixed) {
    const path = new THREE.CatmullRomCurve3(points);
    return piece(new THREE.TubeGeometry(path, 20, radius, 4, false), color, 0, 0, 0, 1, 1, 1, parent);
  }
  function loop(radius: number, color: string, x: number, y: number, z: number, ground = false, parent = fixed) {
    const m = piece(new THREE.TorusGeometry(radius, .035, 4, 40), color, x, y, z, 1, 1, 1, parent);
    if (ground) m.rotation.x = Math.PI / 2; return m;
  }
  function cloudCurl(x: number, y: number, z: number, size: number, color: string) {
    line([[-1, 0], [-.65, .05], [-.63, .35], [-.27, .36], [0, .64], [.33, .38], [.6, .38], [.72, .1], [1, 0]].map(([a,b]) => new THREE.Vector3(x+a*size,y+b*size,z)), color, .04);
  }
  // Taller, distant silhouettes make a city beyond the little neighborhood.
  for (let i = 0; i < 13; i++) {
    const x = (i - 6) * 3.1; const h = 5 + (i * 7 % 5) * 1.25; const z = -22 - i % 3 * 2;
    piece(geometry.box, i % 2 ? '#414567' : '#514a70', x, h / 2, z, 2.2, h, 2);
    piece(geometry.box, '#716384', x, h + .15, z, 2.5, .2, 2.25);
    if (i % 3 === 0) { piece(geometry.gem, '#887a9e', x, h + .85, z, 1.1, .8, 1); piece(geometry.orb, gold, x, h + 1.65, z, .09, .09, .09); }
    for (let row = 1; row < h - .6; row += 1.1) for (const side of [-.5,.5]) {
      piece(geometry.box, (i + Math.floor(row)) % 3 ? '#a7a4be' : '#eed197', x + side, row, z + 1.02, .28, .48, .035);
    }
  }
  // Upturned eaves and costume-like cloud piping connect the kiosks and city.
  for (const [x,z,w,y] of [[-11,-15,5,5.6],[-5.6,-16,4,7.1],[6,-16,5,6.6],[12,-15,4.5,4.9]]) {
    line([new THREE.Vector3(x-w*.58,y+.3,z+2),new THREE.Vector3(x-w*.3,y,z+2),new THREE.Vector3(x,y-.1,z+2),new THREE.Vector3(x+w*.3,y,z+2),new THREE.Vector3(x+w*.58,y+.3,z+2)], gold, .07);
    cloudCurl(x,y-.85,z+1.86,.6,'#c8accf');
  }
  // Moon and gold pinpoints are geometry, with no real lights or bloom.
  piece(geometry.disk, '#ffe9b0', 10, 9.8, -27, 1.1, .08, 1.1).rotation.x = Math.PI / 2;
  loop(1.3, '#bfa3a4', 10, 9.8, -27.1);
  for (let i=0;i<22;i++) piece(geometry.gem, i%3 ? '#d7c9f5' : gold, Math.sin(i*5.1)*23, 9+(i*7%9), -29-(i%3), .055,.11,.035);

  // Gold inlays lead toward the stage without narrowing any walkable path.
  for (const x of [-1.62,1.62]) for(let z=-8;z<12;z+=.8) piece(geometry.box, '#b6a0ca', x,.081,z,.045,.01,.5);
  loop(3.8,'#e7bc82',0,.09,0,true); loop(3.6,'#8d7eb3',0,.09,0,true);
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6; const x=Math.sin(a)*3.7, z=Math.cos(a)*3.7;
    piece(geometry.gem, gold,x,.10,z,.08,.012,.16).rotation.y=a;
  }
  for(const [x,z] of [[-3,8],[3,8],[-5,-8],[5,-8]]) {
    for(let i=0;i<5;i++) { const a=i*Math.PI*2/5; piece(geometry.orb,'#286e70',x+Math.sin(a)*.45,.27,z+Math.cos(a)*.45,.3,.045,.16).rotation.y=-a; }
  }
  // Leaf fans and scattered porcelain petals break up the planting islands.
  // They sit beside existing solid scenery, never across the walking lanes.
  for (const [x,z] of [[-11,-9],[11,-9],[-10,8],[10,9],[-6,10],[6,10],[-6,-10],[6,-10]]) {
    piece(geometry.disk,'#2a5a68',x,.065,z,.75,.025,.6);
    for(let i=0;i<5;i++) {
      const a=(i-2)*.42;
      const leaf=piece(geometry.gem,i%2?'#4fa49b':'#3e858c',x+Math.sin(a)*.28,.25+(i%2)*.09,z,.11,.42,.055);
      leaf.rotation.z=-a;leaf.rotation.y=i*.5;
    }
    for(let i=0;i<3;i++)piece(geometry.orb,i%2?'#b689c0':'#dfa9c2',x-.55+i*.45,.17,z+.4,.13,.1,.13);
  }

  // A layered, open concert proscenium. Center stays open for the three models.
  for(const side of [-1,1]) {
    piece(geometry.box,'#302c57',side*3.75,2.1,-12.25,.28,3.9,.3);
    piece(geometry.box,gold,side*3.59,2.1,-12.05,.035,3.9,.07);
    cloudCurl(side*3.5,3.95,-12, .6, gold);
    for(let j=0;j<3;j++) piece(geometry.gem, ['#a481eb','#f278a8','#63cbbd'][j],side*(3.8+j*.18),3.25-j*.3,-12.15,.18,.58,.09).rotation.z=-side*.4;
  }
  line([new THREE.Vector3(-3.9,4.25,-12.1),new THREE.Vector3(-2,4.45,-12.1),new THREE.Vector3(0,4.95,-12.1),new THREE.Vector3(2,4.45,-12.1),new THREE.Vector3(3.9,4.25,-12.1)],gold,.07);
  piece(geometry.gem,gold,0,4.85,-12,.23,.43,.08);
  piece(geometry.box,'#ffd391',0,.275,-9.28,7.4,.035,.075);
  const poster = canvasTexture(1024,512,ctx => {
    ctx.fillStyle='#302947';ctx.fillRect(0,0,1024,512);
    (Object.keys(WORLD_THEMES) as CharacterId[]).forEach((id,i)=>{
      const c=WORLD_THEMES[id],x=174+i*338;
      const g=ctx.createLinearGradient(0,0,0,512);g.addColorStop(0,c.light);g.addColorStop(1,'#333252');
      ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(x-148,14,296,476,[140,140,12,12]);ctx.fill();
      ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle='#fff1d3'; star(ctx,x,49,13);
      portrait(ctx,id,x);
      ctx.fillStyle=pearl;ctx.font='500 24px sans-serif';ctx.textAlign='center';ctx.fillText(id.toUpperCase(),x,414);
      ctx.strokeStyle=gold;ctx.beginPath();ctx.moveTo(x-60,440);ctx.lineTo(x+60,440);ctx.stroke();
      ctx.fillStyle=gold;star(ctx,x,468,10);
    });
  });
  const art = new THREE.Mesh(new THREE.PlaneGeometry(6.6,3.3),new THREE.MeshBasicMaterial({map:poster}));art.position.set(0,2.63,-12.08);scene.add(art);

  // A very large cup is readable before its sign. Three pearls echo the trio.
  const cup = new THREE.Group(); fixed.add(cup);cup.position.set(9,3.25,-5.45);cup.scale.setScalar(1.3);
  piece(new THREE.CylinderGeometry(.45,.31,.95,16),'#e1b7bf',0,0,0,1,1,1,cup);
  piece(geometry.disk,pearl,0,.48,0,.47,.08,.47,cup);
  piece(geometry.box,'#60c9bf',.12,.83,0,.09,.7,.09,cup).rotation.z=-.18;
  for(const [x,y] of [[-.18,-.25],[.13,-.24],[0,-.03]])piece(geometry.orb,'#49365b',x,y,.34,.08,.08,.035,cup);
  cloudCurl(9,2.42,-4.24,1.25,gold);
  // Garden becomes a moon gate with two broad open wings, pearl/gold clouds.
  loop(1.64,gold,-9,1.7,-7.16);cloudCurl(-9,3.35,-7.13,1.05,pearl);
  for(const side of [-1,1]) {
    piece(geometry.gem,'#6abcb2',-9+side*1.72,1.65,-7.3,.32,.75,.16).rotation.z=-side*.38;
    for(let i=0;i<3;i++)piece(geometry.gem,'#dea5cf',-9+side*(1.6+i*.14),1.1-i*.16,-7.1,.12,.25,.08);
  }
  // Bubble stand: scalloped cloud crest and dangling pearl charms.
  cloudCurl(7.5,2.95,1.9,1.32,gold);
  for(const side of [-1,1]) {
    line([new THREE.Vector3(7.5+side*1.17,2.6,2.3),new THREE.Vector3(7.5+side*1.17,2.12,2.3)],gold,.018);
    piece(geometry.gem,side<0?'#65d9d0':'#ef87b1',7.5+side*1.17,2.04,2.3,.13,.22,.1);
  }
  // The companion's little resting place tells a story without another activity.
  piece(geometry.disk,'#367d8c',-8,.07,6,1.05,.08,1.05);
  loop(.88,gold,-8,.12,6,true);
  for(const x of [-8.75,-7.25])piece(geometry.orb,'#e7b392',x,.25,5.75,.22,.12,.24);
  for(let i=0;i<3;i++) {
    const a=i*Math.PI*2/3;
    line([new THREE.Vector3(-5,1.4,5),new THREE.Vector3(-5+Math.sin(a)*.35,1.8,5+Math.cos(a)*.35),new THREE.Vector3(-5+Math.sin(a)*.8,.4,5+Math.cos(a)*.8)],'#96e5e3',.025);
  }

  // Original floating three-petal star: open outline, never a solid obstruction.
  const emblem = new THREE.Group();scene.add(emblem);emblem.position.set(0,3.45,.1);
  for(let i=0;i<3;i++) {
    const a=i*Math.PI*2/3;
    const p=(r:number,offset:number)=>new THREE.Vector3(Math.sin(a+offset)*r,Math.cos(a+offset)*r,0);
    line([p(.24,0),p(.8,-.35),p(1.15,0),p(.8,.35),p(.24,0)],gold,.045,emblem);
    const gem=piece(geometry.gem,Object.values(WORLD_THEMES)[i].light,Math.sin(a)*1.32,Math.cos(a)*1.32,0,.13,.2,.08,emblem);gem.rotation.z=-a;
  }
  loop(.33,pearl,0,0,0,false,emblem);
  mergeColoredParts(emblem);
  const coreMaterial=new THREE.MeshBasicMaterial({color:WORLD_THEMES.rumi.light});
  const core=new THREE.Mesh(geometry.gem,coreMaterial);core.scale.set(.16,.32,.12);emblem.add(core);
  const haloMaterial=new THREE.MeshBasicMaterial({color:gold,transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide});
  const halo=new THREE.Mesh(new THREE.RingGeometry(1.62,1.65,48),haloMaterial);halo.position.set(0,.1,0);halo.rotation.x=-Math.PI/2;scene.add(halo);

  // Fixed instance pools: flowers open, lanterns swing, and bubbles rise nearby.
  const petals = new THREE.InstancedMesh(geometry.orb,new THREE.MeshLambertMaterial({color:'#efb2d8',emissive:'#863e81',emissiveIntensity:.15}),36);scene.add(petals);
  const flowers=[[-3,8],[3,8],[-5,-8],[5,-8],[-10.3,-5.5],[-7.7,-5.5]];
  const accents = new THREE.InstancedMesh(geometry.gem,new THREE.MeshBasicMaterial({color:pearl}),24);scene.add(accents);
  const bubbles = new THREE.InstancedMesh(new THREE.PlaneGeometry(.5,.5),new THREE.MeshBasicMaterial({map:worldBubbleTexture(),transparent:true,opacity:.85,depthWrite:false}),12);scene.add(bubbles);
  const lanterns=new THREE.InstancedMesh(geometry.orb,new THREE.MeshBasicMaterial({color:pearl}),12);scene.add(lanterns);
  for(const x of [-11.5,11.5]) {
    line([new THREE.Vector3(x,3.5,-10),new THREE.Vector3(x,3,-5),new THREE.Vector3(x,3.5,-1)],gold,.018);
    line([new THREE.Vector3(x,3.5,-1),new THREE.Vector3(x,3.0,4),new THREE.Vector3(x,3.5,10)],gold,.018);
  }
  // Character spotlights use flat colored inlays instead of expensive light cones.
  const spotMaterial=new THREE.MeshBasicMaterial({color:pearl,transparent:true,opacity:.24,depthWrite:false});
  const spots=new THREE.InstancedMesh(new THREE.CircleGeometry(.8,24),spotMaterial,3);scene.add(spots);
  const glowTexture=canvasTexture(128,128,ctx=>{
    const g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#ffffffb0');g.addColorStop(.3,'#ffffff66');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  });
  const glowMaterial=new THREE.MeshBasicMaterial({map:glowTexture,transparent:true,opacity:.32,depthWrite:false,blending:THREE.AdditiveBlending});
  const glows=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),glowMaterial,6);scene.add(glows);
  const transform=new THREE.Object3D();const accentColor=new THREE.Color();const goldColor=new THREE.Color(gold);const whiteColor=new THREE.Color('#ffffff');const baseColors=Object.values(WORLD_THEMES).map(c=>new THREE.Color(c.light));
  for(let i=0;i<3;i++) {transform.position.set((i-1)*2.2,.285,-11);transform.rotation.set(-Math.PI/2,0,0);transform.scale.setScalar(1);transform.updateMatrix();spots.setMatrixAt(i,transform.matrix);spots.setColorAt(i,baseColors[i]);}
  [[0,0,5],[-9,-5,4],[9,-3,3],[7.5,3.2,3],[-5,5,4],[0,-9.2,6]].forEach(([x,z,size],i)=>{
    transform.position.set(x,.18,z);transform.rotation.set(-Math.PI/2,0,0);transform.scale.set(size,size,1);transform.updateMatrix();glows.setMatrixAt(i,transform.matrix);glows.setColorAt(i,baseColors[i%3]);
  });
  glows.instanceColor!.needsUpdate=true;
  spots.instanceColor!.needsUpdate=true;
  for(const mesh of [petals,accents,bubbles,lanterns]) {mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;}
  const disposableGeometry = new Set<THREE.BufferGeometry>();
  fixed.traverse(o=>{if(o instanceof THREE.Mesh)disposableGeometry.add(o.geometry);});
  // Only flatten the cup's local transform before the one-time static merge.
  cup.updateMatrix();for(const child of [...cup.children]){child.applyMatrix4(cup.matrix);fixed.add(child);}fixed.remove(cup);
  mergeColoredParts(fixed);
  // Primitive geometries remain shared by the small dynamic pools.
  disposableGeometry.forEach(g=>{if(!Object.values(geometry).includes(g as typeof geometry.box))g.dispose();});
  materials.forEach(m=>m.dispose());
  let wasGolden=false, goldenBloom=0, selected:CharacterId='rumi', openFlowers=0, magicResponse=0;
  function reset(){wasGolden=false;goldenBloom=0;openFlowers=0;magicResponse=0;}
  return {
    reset,
    snapshot:()=>({selected,goldenBloom,openFlowers,magicResponse,capacities:{petals:36,accents:24,bubbles:12,lanterns:12},emblem:'three-petal-star'}),
    update(time:number,dt:number,state:GameState|null,beat:number,goldenPlaying:boolean,party?:DanceParty) {
      if(!state)return;
      selected=state.characterId;accentColor.set(WORLD_THEMES[selected].light);
      if(goldenPlaying&&!wasGolden)goldenBloom=2.4;
      wasGolden=goldenPlaying;goldenBloom=Math.max(0,goldenBloom-dt);
      magicResponse=state.magicTime/1.6;
      const bloom=Math.max(magicResponse,Math.min(1,goldenBloom));
      emblem.position.y=3.45+Math.sin(time*.8)*.13+bloom*.18;
      emblem.rotation.set(0,Math.sin(time*.32)*.25,Math.sin(time*.6)*.035);
      const stageFraming=.6+.4*THREE.MathUtils.smoothstep(state.z,-8,-3);
      emblem.scale.setScalar(stageFraming*(1+bloom*.13));core.rotation.y=time*.65;
      coreMaterial.color.copy(accentColor).lerp(goldColor,bloom);
      halo.scale.setScalar(1+Math.sin(time)*.04+bloom*.5);haloMaterial.opacity=.28+bloom*.32;haloMaterial.color.copy(accentColor);
      spotMaterial.opacity=.2+beat*.15+bloom*.12;
      art.material.color.set('#ffffff');
      if(party?.active) {
        const warmth=Math.min(1,party.groupTime);
        spotMaterial.opacity=.35+warmth*.25;
        art.material.color.copy(baseColors[party.look]).lerp(goldColor,warmth*.6).lerp(whiteColor,.8);
      }
      for(let i=0;i<3;i++) {
        transform.position.set((i-1)*2.2,.285,-11);transform.rotation.set(-Math.PI/2,0,0);
        transform.scale.setScalar(1+(party?.active?Math.min(1,party.responses[i]+party.groupTime)*.35:0));transform.updateMatrix();spots.setMatrixAt(i,transform.matrix);
      }
      spots.instanceMatrix.needsUpdate=true;
      glowMaterial.opacity=.25+bloom*.1+beat*.035;
      glows.setColorAt(0,accentColor);glows.instanceColor!.needsUpdate=true;
      openFlowers=0;
      flowers.forEach(([x,z],i)=>{
        const near=Math.max(0,1-Math.hypot(state.x-x,state.z-z)/3.4);if(near>.1)openFlowers++;
        for(let p=0;p<6;p++) {
          const a=p*Math.PI/3;const spread=.19+near*.2+bloom*.08;
          transform.position.set(x+Math.sin(a)*spread,.4+near*.2+Math.sin(time*1.4+i)*.018,z+Math.cos(a)*spread);
          transform.rotation.set(Math.cos(a)*(.4-near*.3),a,Math.sin(a)*(.4-near*.3));
          transform.scale.set(.22,.065+near*.065,.35);transform.updateMatrix();petals.setMatrixAt(i*6+p,transform.matrix);
        }
      });
      for(let i=0;i<24;i++) {
        const lane=i%2?1:-1;const z=10-Math.floor(i/2)*1.65;
        const near=Math.max(0,1-Math.hypot(state.x-lane*1.4,state.z-z)/3);
        transform.position.set(lane*1.4,.12+near*(.16+Math.sin(time*2+i)*.08),z);
        transform.rotation.set(0,time*.25+i,0);transform.scale.set(.04+near*.045,.06+near*.08,.04+near*.045);transform.updateMatrix();accents.setMatrixAt(i,transform.matrix);
        accents.setColorAt(i,near>.1?accentColor:baseColors[i%3]);
      }
      for(let i=0;i<12;i++) {
        const tea=i<3, fountain=i>8;const x=fountain?-5:tea?9:7.5,z=fountain?5:tea?-4.7:2.1;
        const near=Math.max(0,1-Math.hypot(state.x-x,state.z-z)/4);
        const phase=(time*(.14+near*.1)+i*.137)%1;
        transform.position.set(x+Math.sin(i*2+time*.5)*(.4+phase*.35),1+phase*2.6,z+.2);
        transform.rotation.set(-.15,0,Math.sin(time+i)*.1);transform.scale.setScalar(Math.sin(phase*Math.PI)*(.5+near*.65));transform.updateMatrix();bubbles.setMatrixAt(i,transform.matrix);
      }
      for(let i=0;i<12;i++) {
        const side=i<6?-1:1,j=i%6,z=-9+j*3.3;
        transform.position.set(side*11.5+Math.sin(time*.7+i)*.08,3.2+Math.cos(j)*.16,z);
        transform.rotation.set(0,0,Math.sin(time+i)*.08);transform.scale.set(.11,.19,.11);transform.updateMatrix();lanterns.setMatrixAt(i,transform.matrix);
        lanterns.setColorAt(i,i%3===0?accentColor:baseColors[i%3]);
      }
      for(const mesh of [petals,accents,bubbles,lanterns])mesh.instanceMatrix.needsUpdate=true;
      accents.instanceColor!.needsUpdate=true;lanterns.instanceColor!.needsUpdate=true;
    },
  };
}
