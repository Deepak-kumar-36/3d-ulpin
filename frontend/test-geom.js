import * as THREE from 'three';

const unit = {
  id: "test",
  elevation: 0,
  vertices: [
    [-8.438, 7.357, 0.0],
    [-1.588, 7.383, 0.0],
    [-1.588, 2.018, 0.0],
    [-8.438, 1.81, 0.0],
    [-8.438, 7.357, 3.0],
    [-1.588, 7.383, 3.0],
    [-1.588, 2.018, 3.0],
    [-8.438, 1.81, 3.0]
  ],
  faces: [
    [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], 
    [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7], 
    [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7]
  ]
};

const positions = new Float32Array(unit.vertices.length * 3);
for (let i = 0; i < unit.vertices.length; i++) {
  positions[i * 3] = unit.vertices[i][0];
  positions[i * 3 + 1] = unit.vertices[i][2] - unit.elevation;
  positions[i * 3 + 2] = unit.vertices[i][1];
}

const indices = [];
for (let i = 0; i < unit.faces.length; i++) {
  indices.push(unit.faces[i][0], unit.faces[i][1], unit.faces[i][2]);
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
// THREE.js setIndex requires array to be passed directly or BufferAttribute
geometry.setIndex(indices);
geometry.computeVertexNormals();
geometry.computeBoundingBox();
geometry.computeBoundingSphere();

console.log("Positions:", geometry.attributes.position.count);
console.log("Indices:", geometry.index.count);
console.log("BoundingBox:", geometry.boundingBox);
console.log("BoundingSphere:", geometry.boundingSphere);
