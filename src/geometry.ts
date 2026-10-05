import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const coloredMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

// Merge only fixed, opaque siblings. Their parent remains free to animate.
export function mergeColoredParts(parent: THREE.Group) {
  const meshes = parent.children.filter((child): child is THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial | THREE.MeshBasicMaterial> => child instanceof THREE.Mesh && !Array.isArray(child.material) && !child.material.transparent && Boolean(child.material.color));
  if (meshes.length < 2) return;
  const parts = meshes.map((mesh) => {
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    mesh.updateMatrix();
    geometry.applyMatrix4(mesh.matrix);
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    const { r, g, b } = mesh.material.color;
    for (let index = 0; index < colors.length; index += 3) { colors[index] = r; colors[index + 1] = g; colors[index + 2] = b; }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  });
  const merged = mergeGeometries(parts);
  if (!merged) throw new Error('Character geometry could not be merged');
  meshes.forEach((mesh) => parent.remove(mesh));
  parent.add(new THREE.Mesh(merged, coloredMaterial));
  parts.forEach((geometry) => geometry.dispose());
}
