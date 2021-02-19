import * as THREE from '../build/three.module.js';


export let drawCircles = function(position, name) {
  const geometry1 = new THREE.SphereBufferGeometry(.25, 32, 32);
  const material = new THREE.MeshBasicMaterial();

  const mesh = new THREE.Mesh(geometry1, material);
  mesh.position.set(position.x, position.y, position.z)
  mesh.scale.y = 0.01
  mesh.userData.name = name;
  return mesh
}