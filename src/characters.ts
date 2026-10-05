import * as THREE from 'three';
import { CHARACTERS } from './simulation.ts';
import type { CharacterId } from './simulation.ts';
import { mergeColoredParts } from './geometry.ts';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const models = new Map<CharacterId, Promise<THREE.Group>>();

// Shared geometry/textures, independent humanoid skeletons. Keep the controller contract.
export function createCharacter(id: CharacterId) {
  const fallback = createFallbackCharacter(id);
  const root = new THREE.Group();
  root.name = id;
  root.add(fallback.root);
  const asset = { id, status: 'loading', error: '', height: 0, feet: 0, riggedMeshes: 0 };
  let model: THREE.Group | undefined;
  const bones = new Map<string, { bone: THREE.Bone; rest: THREE.Quaternion; x: THREE.Vector3; z: THREE.Vector3 }>();
  const rotation = new THREE.Quaternion();
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.18, 8), new THREE.MeshLambertMaterial({ color: '#bdebdc' }));
  cup.visible = false;
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 5), new THREE.MeshLambertMaterial({ color: '#ffd760' }));
  straw.position.y = 0.14;
  cup.add(straw);
  if (!models.has(id)) models.set(id, loader.loadAsync(CHARACTERS.find(character => character.id === id)!.model).then(gltf => {
    // Keep full expressions in the delivered GLB; upload only useful MVP morphs.
    // VRoid's 58 facial targets otherwise allocate a large texture for every face part.
    gltf.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh) || !object.morphTargetDictionary) return;
      const names = ['Fcl_EYE_Close', 'Fcl_EYE_Joy', 'Fcl_MTH_Joy'].filter(name => object.morphTargetDictionary![name] !== undefined);
      const keep = names.map(name => object.morphTargetDictionary![name]);
      for (const attribute of Object.keys(object.geometry.morphAttributes)) {
        object.geometry.morphAttributes[attribute] = keep.map((index, i) => {
          const target = object.geometry.morphAttributes[attribute][index];
          target.name = names[i];
          return target;
        });
      }
      object.updateMorphTargets();
    });
    return gltf.scene;
  }));
  const ready = models.get(id)!.then(source => {
    model = clone(source) as THREE.Group;
    // SkeletonUtils clones a skeleton per mesh primitive. These exports have one
    // skin per avatar: share matching skeletons within that avatar, never across girls.
    const avatarSkeletons: THREE.Skeleton[] = [];
    model.traverse(object => {
      if (!(object instanceof THREE.SkinnedMesh)) return;
      const skeleton = object.skeleton;
      const shared = avatarSkeletons.find(candidate => candidate.bones.length === skeleton.bones.length && candidate.bones.every((bone, i) => bone === skeleton.bones[i] && candidate.boneInverses[i].equals(skeleton.boneInverses[i])));
      if (shared) object.skeleton = shared;
      else avatarSkeletons.push(skeleton);
    });
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    asset.height = box.max.y - box.min.y;
    asset.feet = box.min.y;
    model.traverse(object => {
      if (object instanceof THREE.SkinnedMesh) asset.riggedMeshes++;
      if (object instanceof THREE.Bone) {
        const inverseParent = object.parent!.getWorldQuaternion(new THREE.Quaternion()).invert();
        bones.set(object.name, { bone: object, rest: object.quaternion.clone(), x: new THREE.Vector3(1, 0, 0).applyQuaternion(inverseParent), z: new THREE.Vector3(0, 0, 1).applyQuaternion(inverseParent) });
      }
    });
    root.remove(fallback.root);
    const unusedGeometry = new Set<THREE.BufferGeometry>();
    const unusedMaterials = new Set<THREE.Material>();
    fallback.root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      unusedGeometry.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => unusedMaterials.add(material));
    });
    unusedGeometry.forEach(geometry => geometry.dispose());
    unusedMaterials.forEach(material => material.dispose());
    root.add(model);
    const hand = bones.get('J_Bip_R_Hand')?.bone;
    if (hand) { hand.add(cup); cup.position.set(-0.035, 0, 0.08); }
    asset.status = 'ready';
  }).catch(error => { asset.status = 'fallback'; asset.error = String(error); console.warn(`Character ${id} could not load`, error); });
  function pose(name: string, x: number, z = 0) {
    const joint = bones.get(name);
    if (!joint) return;
    joint.bone.quaternion.copy(joint.rest);
    rotation.setFromAxisAngle(joint.z, z);
    joint.bone.quaternion.premultiply(rotation);
    rotation.setFromAxisAngle(joint.x, x);
    joint.bone.quaternion.premultiply(rotation);
  }
  return { root, asset, ready, animate(time: number, moving: boolean, dancing: boolean, tea = false) {
    if (!model) { fallback.animate(time, moving, dancing, tea); return; }
    const beat = Math.sin(time * 9);
    const walk = moving ? Math.sin(time * 11) * 0.45 : 0;
    model.position.y = dancing ? Math.abs(beat) * 0.1 : moving ? Math.abs(walk) * 0.06 : 0;
    model.rotation.z = dancing ? Math.sin(time * 5) * 0.08 : 0;
    pose('J_Bip_C_Head', 0, Math.sin(time * 2) * 0.04);
    for (const [side, sign] of [['L', 1], ['R', -1]] as const) {
      pose(`J_Bip_${side}_UpperArm`, dancing ? Math.sin(time * 7 + sign) * 0.4 : tea && side === 'R' ? -0.7 : -walk * sign, -sign * (dancing ? 0.45 + beat * 0.6 : 1.35));
      pose(`J_Bip_${side}_LowerArm`, 0, -sign * (dancing ? 0.25 : 0.08));
      pose(`J_Bip_${side}_UpperLeg`, (dancing ? beat * 0.17 : walk) * sign);
      pose(`J_Bip_${side}_LowerLeg`, moving ? Math.max(0, -walk * sign) * 0.5 : 0);
    }
    cup.visible = tea;
    const blink = time % 4 < 0.12 ? Math.sin(time % 4 / 0.12 * Math.PI) : 0;
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh) || !object.morphTargetInfluences || !object.morphTargetDictionary) return;
      for (const [name, amount] of [['Fcl_EYE_Close', blink], ['Fcl_EYE_Joy', dancing ? 0.2 : 0], ['Fcl_MTH_Joy', dancing ? 0.35 : 0]] as const) {
        const index = object.morphTargetDictionary[name];
        if (index !== undefined) object.morphTargetInfluences[index] = amount;
      }
    });
  } };
}

// This factory is the replacement seam for future GLB characters.
// Contract: root at the feet, height ~2 world units, face +Z; animate(t, moving, dancing).
export function createFallbackCharacter(id: CharacterId) {
  const character = CHARACTERS.find((item) => item.id === id)!;
  const root = new THREE.Group();
  root.name = character.name;
  const body = new THREE.Group();
  root.add(body);
  const materials = {
    skin: new THREE.MeshLambertMaterial({ color: character.skin }),
    hair: new THREE.MeshLambertMaterial({ color: character.hair }),
    outfit: new THREE.MeshLambertMaterial({ color: character.outfit }),
    dark: new THREE.MeshLambertMaterial({ color: '#333047' }),
    white: new THREE.MeshLambertMaterial({ color: '#fff8ec' }),
    gold: new THREE.MeshLambertMaterial({ color: '#f9d477' }),
  };
  const geometries = {
    sphere: new THREE.SphereGeometry(1, 10, 8),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
    box: new THREE.BoxGeometry(1, 1, 1),
  };
  function piece(parent: THREE.Group, geometry: keyof typeof geometries, material: keyof typeof materials, position: [number, number, number], scale: [number, number, number]) {
    const mesh = new THREE.Mesh(geometries[geometry], materials[material]);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }
  // Friendly stylized proportions and separate limbs for procedural animation.
  piece(body, 'cylinder', 'outfit', [0, 1.07, 0], [0.26, 0.55, 0.19]);
  piece(body, 'box', 'dark', [0, 0.75, 0], [0.48, 0.17, 0.33]);
  piece(body, 'box', 'gold', [0, 0.83, 0.18], [0.12, 0.055, 0.025]);
  piece(body, 'cylinder', 'skin', [0, 1.4, 0], [0.09, 0.13, 0.09]);
  const head = new THREE.Group();
  head.position.y = 1.7;
  body.add(head);
  piece(head, 'sphere', 'skin', [0, 0, 0], [0.34, 0.36, 0.3]);
  piece(head, 'sphere', 'hair', [0, 0.16, -0.055], [0.35, 0.28, 0.3]);
  piece(head, 'sphere', 'hair', [-0.18, 0.16, 0.22], [0.19, 0.12, 0.09]);
  for (const side of [-1, 1]) {
    piece(head, 'sphere', 'dark', [side * 0.115, 0.005, 0.278], [0.028, 0.04, 0.018]);
    piece(head, 'sphere', 'white', [side * 0.109, 0.017, 0.29], [0.009, 0.011, 0.007]);
    piece(head, 'sphere', 'outfit', [side * 0.23, -0.09, 0.245], [0.047, 0.024, 0.012]);
    piece(head, 'sphere', 'gold', [side * 0.33, -0.08, 0], [0.026, 0.05, 0.026]);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.009, 4, 8, Math.PI), materials.dark);
  smile.position.set(0, -0.075, 0.29);
  smile.rotation.z = Math.PI;
  head.add(smile);
  if (id === 'rumi') {
    for (let i = 0; i < 6; i++) {
      piece(head, 'sphere', 'hair', [0.3 + i * 0.025, 0.1 - i * 0.2, -0.19], [0.115 - i * 0.008, 0.15, 0.105]);
    }
    piece(head, 'sphere', 'gold', [0.42, -0.95, -0.19], [0.06, 0.07, 0.06]);
  } else if (id === 'mira') {
    piece(head, 'sphere', 'hair', [0, 0.39, -0.22], [0.13, 0.16, 0.14]);
    const ponytail = piece(head, 'sphere', 'hair', [0.04, 0.07, -0.37], [0.21, 0.5, 0.19]);
    ponytail.rotation.x = -0.35;
    piece(head, 'box', 'white', [0, 0.38, -0.12], [0.28, 0.06, 0.12]);
  } else {
    for (const side of [-1, 1]) {
      piece(head, 'sphere', 'hair', [side * 0.29, 0.29, -0.035], [0.18, 0.19, 0.17]);
      piece(head, 'sphere', 'outfit', [side * 0.3, 0.22, 0.13], [0.095, 0.065, 0.03]);
    }
  }
  const arms: THREE.Group[] = [];
  const legs: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.3, 1.28, 0);
    body.add(arm);
    piece(arm, 'cylinder', 'outfit', [0, -0.1, 0], [0.095, 0.22, 0.1]);
    piece(arm, 'cylinder', 'skin', [0, -0.32, 0], [0.066, 0.3, 0.068]);
    piece(arm, 'sphere', 'skin', [0, -0.49, 0], [0.073, 0.08, 0.07]);
    arm.rotation.z = side * 0.1;
    arms.push(arm);
    const leg = new THREE.Group();
    leg.position.set(side * 0.14, 0.74, 0);
    body.add(leg);
    piece(leg, 'cylinder', id === 'mira' ? 'skin' : 'dark', [0, -0.25, 0], [0.085, 0.5, 0.085]);
    piece(leg, 'box', 'white', [0, -0.63, 0.055], [0.18, 0.17, 0.3]);
    piece(leg, 'box', 'outfit', [0, -0.53, 0], [0.17, 0.1, 0.16]);
    legs.push(leg);
  }
  const cup = new THREE.Group();
  cup.position.set(0, -0.44, 0.15);
  piece(cup, 'cylinder', 'white', [0, 0, 0], [0.11, 0.23, 0.11]);
  piece(cup, 'cylinder', 'outfit', [0, 0.04, 0], [0.113, 0.09, 0.113]);
  piece(cup, 'cylinder', 'gold', [0.025, 0.2, 0], [0.014, 0.19, 0.014]);
  arms[1].add(cup);
  cup.visible = false;
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.44, 20), new THREE.MeshBasicMaterial({ color: '#4c4668', transparent: true, opacity: 0.15, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);
  [head, body, ...arms, ...legs, cup].forEach(mergeColoredParts);
  return {
    root,
    animate(time: number, moving: boolean, dancing: boolean, tea = false) {
      const walk = Math.sin(time * 11) * (moving ? 0.65 : 0);
      const beat = Math.sin(time * 9);
      body.position.y = dancing ? Math.abs(beat) * 0.16 : moving ? Math.abs(Math.sin(time * 11)) * 0.055 : Math.sin(time * 2) * 0.015;
      body.rotation.z = dancing ? Math.sin(time * 5) * 0.18 : 0;
      head.rotation.z = dancing ? Math.sin(time * 5 + 1) * 0.13 : Math.sin(time * 1.5) * 0.035;
      arms.forEach((arm, i) => {
        const side = i === 0 ? -1 : 1;
        arm.rotation.x = dancing ? Math.sin(time * 7 + i) * 0.5 : walk * side;
        arm.rotation.z = dancing ? side * (1.15 + beat * 0.5) : side * 0.1;
      });
      legs[0].rotation.x = dancing ? beat * 0.28 : walk;
      legs[1].rotation.x = dancing ? -beat * 0.28 : -walk;
      cup.visible = tea;
      if (tea && !dancing) arms[1].rotation.x = -0.8;
    },
  };
}
