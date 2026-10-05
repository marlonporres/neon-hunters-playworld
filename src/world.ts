import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ACTIVITIES, STAR_POSITIONS, FLOOR_PADS } from './simulation.ts';
import type { GameState } from './simulation.ts';
import { mergeColoredParts } from './geometry.ts';
import { demonTexture } from './bubble-view.ts';
import { createWorldArt, worldBubbleTexture } from './world-art.ts';
import type { DanceParty } from './dance-party.ts';

export function createWorld(scene: THREE.Scene) {
  const staticRoot = new THREE.Group();
  scene.add(staticRoot);
  const palette = {
    cream: '#e3ccd7', stone: '#50466c', purple: '#493068', lavender: '#9980b5', pink: '#cb78ac',
    mint: '#28666d', green: '#42878b', trunk: '#675476', gold: '#edc67f', dark: '#302c4c', window: '#efc992',
  };
  const materials = new Map<string, THREE.MeshLambertMaterial>();
  function material(color: string) {
    const value = palette[color as keyof typeof palette] || color;
    if (!materials.has(value)) materials.set(value, new THREE.MeshLambertMaterial({ color: value }));
    return materials.get(value)!;
  }
  function add(geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
    const mesh = new THREE.Mesh(geometry, material(color));
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    staticRoot.add(mesh);
    return mesh;
  }
  const box = (w: number, h: number, d: number, color: string, x: number, y: number, z: number, ry = 0) => add(new THREE.BoxGeometry(w, h, d), color, x, y, z, 0, ry);
  const cylinder = (top: number, bottom: number, height: number, color: string, x: number, y: number, z: number, segments = 16) => add(new THREE.CylinderGeometry(top, bottom, height, segments), color, x, y, z);
  const ball = (radius: number, color: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
    const mesh = add(new THREE.IcosahedronGeometry(radius, 1), color, x, y, z);
    mesh.scale.set(sx, sy, sz);
    return mesh;
  };
  const ring = (radius: number, tube: number, color: string, x: number, y: number, z: number, ground = true) => add(new THREE.TorusGeometry(radius, tube, 6, 32), color, x, y, z, ground ? Math.PI / 2 : 0);

  // All opaque scenery is merged into one colored mesh after construction.
  box(31, 0.5, 30, 'stone', 0, -0.28, 0);
  box(29, 0.055, 28, '#393550', 0, -0.007, 0);
  for (const x of [-7.6, 7.6]) {
    for (const z of [-6.6, 6.6]) {
      const garden = cylinder(4.5, 4.5, 0.06, 'mint', x, 0.01, z, 32);
      garden.scale.x = 1.13;
    }
  }
  box(3.6, 0.065, 27, 'stone', 0, 0.02, 0);
  box(28, 0.065, 3.2, 'stone', 0, 0.025, 0);
  cylinder(4.7, 4.7, 0.075, 'stone', 0, 0.02, 0, 48);
  ring(4.2, 0.025, 'cream', 0, 0.065, 0);
  // Little neighborhood buildings outside the playable boundary.
  for (const [x, z, width, height, color] of [
    [-11, -15, 5, 5.5, 'pink'], [-5.6, -16, 4, 7, 'lavender'], [6, -16, 5, 6.5, 'mint'], [12, -15, 4.5, 4.8, 'gold'],
    [-16, -6, 3, 5.5, 'lavender'], [16, -6, 3, 6, 'pink'], [-16, 5, 3, 4, 'cream'], [16, 6, 3, 4.5, 'mint'],
  ] as [number, number, number, number, string][]) {
    box(width, height, 3.5, color, x, height / 2 - 0.1, z);
    box(width + 0.2, 0.2, 3.8, 'cream', x, height, z);
    for (let y = 1.1; y < height - 0.4; y += 1.6) {
      for (let wx = -width / 2 + 0.65; wx < width / 2; wx += 1.35) {
        box(0.75, 1, 0.08, 'window', x + wx, y, z + 1.79);
        box(0.85, 0.08, 0.16, 'cream', x + wx, y - 0.52, z + 1.85);
      }
    }
  }
  function tree(x: number, z: number, color: string) {
    cylinder(0.13, 0.19, 2, 'trunk', x, 1, z, 8);
    const canopy = ball(1.05, color, x, 2.6, z, 1, 1.3, 1);
    canopy.userData.reactive = true;
    ball(0.7, color, x - 0.55, 2.15, z + 0.25);
    cylinder(0.85, 1, 0.2, 'cream', x, 0.11, z);
  }
  for (const x of [-11.5, 11.5]) for (const z of [-10, -1, 7, 10]) tree(x, z, z % 2 === 0 ? 'pink' : 'green');
  for (const [x, z] of [[-7, 10], [7, 10], [-7, -11], [7, -11]]) {
    cylinder(0.05, 0.05, 3, 'dark', x, 1.5, z, 8);
    ball(0.24, 'gold', x, 3.05, z);
    cylinder(0.18, 0.25, 0.13, 'dark', x, 0.08, z);
  }
  function bench(x: number, z: number, ry: number) {
    const group = new THREE.Group();
    box(1.9, 0.12, 0.6, 'trunk', 0, 0.5, 0);
    box(1.9, 0.55, 0.1, 'trunk', 0, 0.85, -0.28);
    box(0.08, 0.5, 0.5, 'dark', -0.7, 0.25, 0);
    box(0.08, 0.5, 0.5, 'dark', 0.7, 0.25, 0);
    for (const mesh of staticRoot.children.slice(-4)) group.add(mesh);
    group.position.set(x, 0, z);
    group.rotation.y = ry;
    staticRoot.add(group);
  }
  bench(-8, 3, Math.PI / 2);
  bench(8, 7, -Math.PI / 2);
  // Fountain: opaque bowl and a simple animated water surface, no particles or shaders.
  cylinder(1.65, 1.9, 0.25, 'lavender', -5, 0.15, 5);
  ring(1.6, 0.11, 'cream', -5, 0.3, 5);
  cylinder(0.26, 0.36, 1.05, 'cream', -5, 0.7, 5);
  cylinder(0.75, 0.45, 0.14, 'lavender', -5, 1.2, 5);
  ball(0.13, 'gold', -5, 1.5, 5);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), new THREE.MeshBasicMaterial({ color: '#69c6cb', transparent: true, opacity: 0.8 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(-5, 0.29, 5);
  scene.add(water);
  const ripples = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.69, 32), new THREE.MeshBasicMaterial({ color: '#e7fbff', transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  ripples.rotation.x = -Math.PI / 2;
  ripples.position.set(-5, 0.3, 5);
  scene.add(ripples);

  // Photo garden, with a floral arch and a small camera pedestal.
  box(4.6, 0.08, 4.5, '#845b86', -9, 0.06, -6);
  add(new THREE.TorusGeometry(1.55, 0.15, 8, 28, Math.PI), 'cream', -9, 1.7, -7.4);
  for (const x of [-10.55, -7.45]) cylinder(0.12, 0.12, 1.7, 'cream', x, 0.85, -7.4);
  for (let i = 0; i < 10; i++) {
    const angle = (i / 9) * Math.PI;
    ball(0.22, i % 2 ? 'pink' : 'lavender', -9 + Math.cos(angle) * 1.55, 1.7 + Math.sin(angle) * 1.55, -7.3);
  }
  cylinder(0.25, 0.3, 1, 'purple', -9, 0.5, -7.4);
  box(0.7, 0.45, 0.4, 'cream', -9, 1.15, -7.4);
  cylinder(0.18, 0.18, 0.1, 'dark', -9, 1.15, -7.13).rotation.x = Math.PI / 2;

  // Cloud Nine Tea, a mint kiosk with a striped awning.
  box(3.6, 0.08, 4.8, '#518e94', 9, 0.06, -4.7);
  box(2.7, 1.8, 1.5, 'mint', 9, 0.95, -5.6);
  box(3.1, 0.14, 1.95, 'cream', 9, 1.85, -5.45);
  box(2.5, 1.15, 0.07, 'window', 9, 1.2, -4.82);
  box(2.9, 0.12, 0.65, 'cream', 9, 0.8, -4.6);
  for (let i = 0; i < 7; i++) box(0.45, 0.16, 2.1, i % 2 ? 'mint' : 'cream', 7.65 + i * 0.45, 2.5, -5.35);
  for (const x of [7.6, 10.4]) cylinder(0.055, 0.055, 2.4, 'cream', x, 1.2, -4.65);
  for (const x of [8.5, 9.2, 9.8]) {
    cylinder(0.1, 0.08, 0.23, 'pink', x, 1.03, -4.65);
    cylinder(0.015, 0.015, 0.15, 'cream', x, 1.2, -4.65, 6);
  }
  ball(0.43, 'cream', 9, 3.2, -5.6, 1.6, 0.6, 0.65);

  // Starlight stage: a walkable platform, backdrop, and two speakers.
  box(7.8, 0.2, 3.5, 'purple', 0, 0.12, -11);
  box(7.3, 0.035, 3.1, 'lavender', 0, 0.24, -10.9);
  box(6.5, 3, 0.25, 'purple', 0, 1.75, -12.5);
  box(5.8, 2.35, 0.05, 'lavender', 0, 1.75, -12.35);
  for (const x of [-3.2, 3.2]) {
    box(0.7, 1.5, 0.6, 'dark', x, 0.98, -11.8);
    for (const y of [0.65, 1.3]) ball(0.22, '#4b435c', x, y, -11.47, 1, 1, 0.15);
  }
  for (const x of [-2.7, -1.35, 0, 1.35, 2.7]) ball(0.07, 'gold', x, 0.34, -9.3);

  // Small flower beds add detail without extra draw calls after merging.
  for (const [x, z] of [[-3, 8], [3, 8], [-5, -8], [5, -8]]) {
    cylinder(0.7, 0.65, 0.2, 'cream', x, 0.11, z);
    ball(0.16, 'gold', x, 0.44, z);
  }

  // A small, open-front stand beside the main path, not another building.
  box(3, 0.08, 2.6, 'lavender', 7.5, 0.07, 2.4);
  box(2.3, 0.75, 0.7, 'pink', 7.5, 0.45, 1.8);
  box(2.6, 0.12, 0.95, 'cream', 7.5, 0.87, 1.8);
  for (const x of [6.3, 8.7]) cylinder(0.065, 0.065, 2.6, 'gold', x, 1.3, 1.8, 8);
  box(2.8, 0.18, 1.1, 'purple', 7.5, 2.7, 1.8);
  const standFriend = new THREE.Sprite(new THREE.SpriteMaterial({ map: demonTexture('#bca2ee') }));
  standFriend.position.set(7.5, 1.7, 2.3); standFriend.scale.set(1.2, 1.2, 1); scene.add(standFriend);
  const standBubbles = [-1, 0, 1].map((side, i) => {
    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: worldBubbleTexture(), color: ['#ffcce9', '#ccfaff', '#ffe29c'][i], transparent: true, depthWrite: false }));
    bubble.scale.setScalar(.6);
    bubble.position.set(7.5 + side * 0.75, 3.1, 1.9); scene.add(bubble); return bubble;
  });
  staticRoot.updateMatrixWorld(true);
  const reactiveTrees = staticRoot.children.filter((object) => object.userData.reactive) as THREE.Mesh[];
  reactiveTrees.forEach((tree) => { staticRoot.remove(tree); scene.add(tree); });
  const geometryParts: THREE.BufferGeometry[] = [];
  const originals = new Set<THREE.BufferGeometry>();
  staticRoot.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    const count = geometry.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const color = object.material.color;
    for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometryParts.push(geometry);
    originals.add(object.geometry);
  });
  const scenery = new THREE.Mesh(mergeGeometries(geometryParts), new THREE.MeshLambertMaterial({ vertexColors: true }));
  scene.remove(staticRoot);
  scene.add(scenery);
  geometryParts.forEach((geometry) => geometry.dispose());
  originals.forEach((geometry) => geometry.dispose());
  materials.forEach((mat) => mat.dispose());

  function sign(text: string, x: number, y: number, z: number, color = '#776096') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#35304e';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = color;
    ctx.font = 'bold 43px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 66);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75), new THREE.MeshBasicMaterial({ map: texture }));
    mesh.position.set(x, y, z);
    scene.add(mesh);
  }
  sign('MAGIC GARDEN', -9, 4.1, -7.2, '#ffd998');
  sign('CLOUD NINE TEA', 9, 2.92, -4.28, '#a3ead8');
  sign('✦  ▶  ✦', 7.5, 2.72, 2.4, '#ead0ff');

  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + (i / 10) * Math.PI * 2;
    const radius = i % 2 === 0 ? 0.4 : 0.19;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const stars = new THREE.InstancedMesh(new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false }), new THREE.MeshLambertMaterial({ color: '#ffe2a0', emissive: '#795321', emissiveIntensity: 0.25 }), STAR_POSITIONS.length);
  stars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(stars);
  const transform = new THREE.Object3D();
  const activityRings = ACTIVITIES.map((activity) => {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.86, 0.93, 32), new THREE.MeshBasicMaterial({ color: activity.color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(activity.x, 0.09, activity.z);
    scene.add(mesh);
    return mesh;
  });
  const lights: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = [];
  for (const x of [-2, 0, 2]) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: '#fbe9a2' }));
    mesh.position.set(x, 4.4, -12.1);
    scene.add(mesh);
    lights.push(mesh);
  }
  // A fixed pool of pickup sparks; no objects are allocated during animation.
  const sparkPositions = new Float32Array(24 * 3);
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  const sparkMaterial = new THREE.PointsMaterial({ color: '#ffdda1', size: 0.13, transparent: true, opacity: 0, depthWrite: false });
  const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
  sparks.frustumCulled = false;
  scene.add(sparks);
  let sparkLife = 0;
  let sparkX = 0;
  let sparkZ = 0;
  const pads = FLOOR_PADS.map((pad) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.93, 0.98, 0.08, 24), new THREE.MeshLambertMaterial({ color: pad.color, emissive: pad.color, emissiveIntensity: 0.05 }));
    mesh.position.set(pad.x, 0.11, pad.z);
    scene.add(mesh);
    const note = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.055, 5, 12), new THREE.MeshBasicMaterial({ color: '#fffaf0' }));
    note.position.set(pad.x, 0.17, pad.z);
    note.rotation.x = -Math.PI / 2;
    scene.add(note);
    return mesh;
  });
  const cloudMaterial = new THREE.MeshLambertMaterial({ color: '#b4a4d0', transparent: true, opacity: 1 });
  const orbGeometry = new THREE.SphereGeometry(1, 10, 8);
  const clouds = [-1, 0, 1].map((index) => {
    const group = new THREE.Group();
    for (const [x, y, scale] of [[-0.32, 0, 0.35], [0, 0.12, 0.44], [0.33, 0, 0.33]]) {
      const mesh = new THREE.Mesh(orbGeometry, cloudMaterial);
      mesh.position.set(x, y, 0);
      mesh.scale.set(scale, scale * 0.85, scale);
      group.add(mesh);
    }
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(orbGeometry, new THREE.MeshBasicMaterial({ color: '#756085' }));
      eye.scale.set(0.035, 0.02, 0.02);
      eye.position.set(side * 0.15, 0.04, 0.4);
      group.add(eye);
    }
    group.position.set(-9 + index * 1.25, 1.5, -5.9);
    mergeColoredParts(group);
    scene.add(group);
    return group;
  });
  const magicMaterial = new THREE.MeshBasicMaterial({ color: '#ffe6a3', transparent: true, opacity: 0, depthWrite: false });
  const magicStars = new THREE.InstancedMesh(stars.geometry, magicMaterial, 24);
  magicStars.frustumCulled = false;
  scene.add(magicStars);
  const friend = new THREE.Group();
  const blue = new THREE.MeshLambertMaterial({ color: '#70b9db' });
  const ink = new THREE.MeshLambertMaterial({ color: '#576889' });
  const cream = new THREE.MeshLambertMaterial({ color: '#fff3dc' });
  function friendPart(mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const mesh = new THREE.Mesh(orbGeometry, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    friend.add(mesh);
    return mesh;
  }
  friendPart(blue, 0, 0.48, 0, 0.36, 0.35, 0.5);
  friendPart(blue, 0, 0.86, 0.3, 0.43, 0.38, 0.34);
  for (const side of [-1, 1]) {
    friendPart(blue, side * 0.32, 1.13, 0.25, 0.13, 0.17, 0.12);
    friendPart(cream, side * 0.2, 0.94, 0.585, 0.16, 0.17, 0.035);
    friendPart(ink, side * 0.16, 0.96, 0.62, 0.075, 0.1, 0.024);
    friendPart(cream, side * 0.15, 0.99, 0.64, 0.02, 0.03, 0.01);
    friendPart(cream, side * 0.15, 0.75, 0.58, 0.17, 0.11, 0.045);
    for (const z of [-0.27, 0.25]) friendPart(blue, side * 0.23, 0.2, z, 0.14, 0.15, 0.17);
    for (const y of [0.5, 0.66]) friendPart(ink, side * 0.34, y, 0.04, 0.035, 0.06, 0.25);
  }
  friendPart(ink, 0, 0.82, 0.635, 0.065, 0.045, 0.025);
  friendPart(blue, 0.17, 0.6, -0.6, 0.09, 0.09, 0.4).rotation.x = -0.55;
  friend.position.set(-8, 0, 6);
  mergeColoredParts(friend);
  scene.add(friend);
  const friendShadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), new THREE.MeshBasicMaterial({ color: '#514562', transparent: true, opacity: 0.1, depthWrite: false }));
  friendShadow.rotation.x = -Math.PI / 2;
  friendShadow.position.y = 0.02;
  scene.add(friendShadow);
  const heart = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), new THREE.MeshBasicMaterial({ color: '#f297bb' }));
  scene.add(heart);
  const art = createWorldArt(scene);
  return {
    reset() { friend.position.set(-8, 0, 6); sparkLife = 0; art.reset(); },
    artSnapshot: art.snapshot,
    pickup(x: number, z: number) { sparkLife = 0.8; sparkX = x; sparkZ = z; },
    update(time: number, dt: number, state: GameState | null, beat = 0, goldenPlaying = false, party?: DanceParty) {
      art.update(time, dt, state, beat, goldenPlaying, party);
      standFriend.position.y = 1.7 + Math.sin(time * 2) * 0.08;
      standBubbles.forEach((bubble, i) => { bubble.position.y = 3.1 + Math.sin(time * 1.7 + i * 2) * 0.2; bubble.rotation.y = time * 0.4; });
      STAR_POSITIONS.forEach((star, index) => {
        transform.position.set(star.x, 0.95 + Math.sin(time * 2.3 + index) * 0.13, star.z);
        transform.rotation.set(0, time * 1.5 + index, 0.08 * Math.sin(time + index));
        transform.scale.setScalar(state?.stars.has(index) ? 0 : 1);
        transform.updateMatrix();
        stars.setMatrixAt(index, transform.matrix);
      });
      stars.instanceMatrix.needsUpdate = true;
      activityRings.forEach((mesh, i) => {
        const active = state?.nearest === ACTIVITIES[i].id;
        const done = state?.visits.has(ACTIVITIES[i].id);
        mesh.material.opacity = done ? 0.3 : active ? 0.8 : 0.45;
        mesh.scale.setScalar(active ? 1 + Math.sin(time * 4) * 0.05 : 1);
      });
      lights.forEach((light, i) => {
        if (state?.visits.has('stage')) light.material.color.setHSL((time * 0.13 + i * 0.25) % 1, 0.6, 0.75);
        else light.material.color.set('#fbe9a2');
        light.scale.setScalar(1 + beat * 0.7);
        if (party?.active) {
          light.material.color.set(['#bd92ff','#ff7dac','#64e4d0'][i]);
          light.scale.setScalar(1 + Math.min(1,party.responses[i] + party.groupTime) * .7 + (party.pulses[i] > 0 ? .15 : 0));
        }
      });
      reactiveTrees.forEach((tree) => {
        const near = state && Math.hypot(state.x - tree.position.x, state.z - tree.position.z) < 3;
        tree.rotation.z = near ? Math.sin(time * 4 + tree.position.z) * 0.1 : 0;
        tree.scale.y = near ? 1.3 + Math.sin(time * 3) * 0.08 : 1.3;
      });
      pads.forEach((pad, i) => {
        const active = state?.pad === i;
        pad.material.emissiveIntensity = active ? 0.7 : beat * 0.1;
        pad.scale.y = active ? 1.7 + Math.sin(time * 12) * 0.3 : 1;
      });
      clouds.forEach((cloud, i) => {
        cloud.visible = !state?.cloudsCleared;
        cloud.position.y = 1.5 + Math.sin(time * 2 + i) * 0.15;
        cloud.rotation.z = Math.sin(time + i) * 0.07;
      });
      magicStars.visible = Boolean(state && state.magicTime > 0);
      if (state && state.magicTime > 0) {
        magicMaterial.color.set('#ffe6a3');
        magicMaterial.opacity = Math.min(1, state.magicTime * 2);
        const progress = 1 - state.magicTime / 1.6;
        for (let i = 0; i < 24; i++) {
          const angle = i / 24 * Math.PI * 2 + time * 3;
          const radius = 0.7 + progress * 2.5;
          transform.position.set(state.x + Math.cos(angle) * radius, 0.5 + (i % 4) * 0.3 + progress, state.z + Math.sin(angle) * radius);
          transform.rotation.set(0, angle, time * 2);
          transform.scale.setScalar(0.32 + progress * 0.15);
          transform.updateMatrix();
          magicStars.setMatrixAt(i, transform.matrix);
        }
        magicStars.instanceMatrix.needsUpdate = true;
      }
      if (party?.active) {
        magicStars.visible = party.effectTime > 0;
        if (party.effectTime > 0) {
          const progress = 1 - party.effectTime / party.effectDuration;
          magicMaterial.opacity = Math.min(1, party.effectTime * 3);
          magicMaterial.color.set(party.effectGroup ? '#ffe29a' : ['#ceabff','#ffb0d5','#9bf4dd'][party.chosen]);
          for (let i=0;i<24;i++) {
            const angle = i / 24 * Math.PI * 2 + party.effectSerial;
            const spread = (party.effectGroup ? 3.1 : 1.2) * progress;
            transform.position.set((party.effectGroup ? 0 : (party.chosen-1)*2.2)+Math.cos(angle)*spread,.7+Math.sin(progress*Math.PI)*1.9+(i%3)*.18,-10.8+Math.sin(angle)*spread*.22);
            transform.rotation.set(progress*4,angle,progress*5);transform.scale.setScalar((party.effectGroup ? .34 : .23)*(1-progress*.5));transform.updateMatrix();magicStars.setMatrixAt(i,transform.matrix);
          }
          magicStars.instanceMatrix.needsUpdate=true;
        }
      }
      if (state?.companionFollowing) {
        const targetX = state.x - Math.sin(state.yaw) * 1.3 - 0.6;
        const targetZ = state.z - Math.cos(state.yaw) * 1.3;
        const blend = 1 - Math.exp(-dt * 4);
        const dx = targetX - friend.position.x;
        const dz = targetZ - friend.position.z;
        friend.position.x += dx * blend;
        friend.position.z += dz * blend;
        if (Math.hypot(dx, dz) > 0.1) friend.rotation.y = Math.atan2(dx, dz);
        friend.position.y = Math.abs(Math.sin(time * (state.dancing ? 10 : 7))) * (state.moving || state.dancing || state.magicTime > 0 ? 0.2 : 0.035);
      } else {
        friend.position.set(-8, Math.abs(Math.sin(time * 3)) * 0.08, 6);
        friend.rotation.y = Math.sin(time * 0.7) * 0.35;
      }
      friendShadow.position.x = friend.position.x;
      friendShadow.position.z = friend.position.z;
      heart.visible = Boolean(state?.companionFollowing && (state.dancing || state.magicTime > 0));
      heart.position.set(friend.position.x, 1.6 + Math.sin(time * 3) * 0.1, friend.position.z);
      heart.rotation.y = time * 2;
      ripples.scale.setScalar(1 + (time * 0.6) % 1);
      ripples.material.opacity = 0.55 * (1 - (time * 0.6) % 1);
      sparkLife = Math.max(0, sparkLife - dt);
      sparkMaterial.opacity = sparkLife;
      if (sparkLife > 0) {
        const progress = 1 - sparkLife / 0.8;
        for (let i = 0; i < 24; i++) {
          const angle = (i / 24) * Math.PI * 2;
          sparkPositions[i * 3] = sparkX + Math.cos(angle) * progress * 1.2;
          sparkPositions[i * 3 + 1] = 0.7 + Math.sin(i * 8) * progress + progress * 1.6;
          sparkPositions[i * 3 + 2] = sparkZ + Math.sin(angle) * progress * 1.2;
        }
        sparkGeometry.attributes.position.needsUpdate = true;
      }
    },
  };
}
