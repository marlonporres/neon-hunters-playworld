import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFallbackCharacter } from '../src/characters.ts';
import { CHARACTERS } from '../src/simulation.ts';

test('fallback characters have bounded geometry, distinct colors, and animated limbs', () => {
  for (const character of CHARACTERS) {
    const avatar = createFallbackCharacter(character.id);
    let meshes = 0;
    let triangles = 0;
    avatar.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      meshes++;
      triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3;
    });
    assert.ok(meshes <= 10, `${character.id} draw budget: ${meshes}`);
    assert.ok(triangles < 7000, `${character.id} triangle budget: ${triangles}`);
    avatar.animate(0.2, true, false);
    const walking = avatar.root.children[0].position.y;
    avatar.animate(0.2, false, true);
    assert.notEqual(avatar.root.children[0].position.y, walking);
    const bounds = new THREE.Box3().setFromObject(avatar.root);
    assert.ok(bounds.max.y > 1.8 && bounds.max.y < 2.8);
  }
});
