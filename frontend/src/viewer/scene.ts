import * as THREE from 'three';
import type { Unit } from '../data/types';

// Palette matching Verta dark architectural design
export const MATERIALS: Record<string, THREE.Material> = {
  residential: new THREE.MeshLambertMaterial({ color: 0x3d3d3d, side: THREE.DoubleSide }),
  commercial: new THREE.MeshLambertMaterial({ color: 0x2d2d2d, side: THREE.DoubleSide }),
  office: new THREE.MeshLambertMaterial({ color: 0x4d4d4d, side: THREE.DoubleSide }),
  lobby: new THREE.MeshLambertMaterial({ color: 0x262626, side: THREE.DoubleSide }),
  retail: new THREE.MeshLambertMaterial({ color: 0x383838, side: THREE.DoubleSide }),
  parking: new THREE.MeshLambertMaterial({ color: 0x1a1a1a, side: THREE.DoubleSide }),
  penthouse: new THREE.MeshLambertMaterial({ color: 0x555555, side: THREE.DoubleSide }),
  
  // States
  selected: new THREE.MeshLambertMaterial({ color: 0x8da399, emissive: 0x223322, side: THREE.DoubleSide }),
  validationFail: new THREE.MeshLambertMaterial({ color: 0x8b3a3a, emissive: 0x330000, side: THREE.DoubleSide }),
  
  // Environment
  slab: new THREE.MeshLambertMaterial({ color: 0x111111, side: THREE.DoubleSide }),
  parcel: new THREE.LineDashedMaterial({ color: 0x8da399, dashSize: 1, gapSize: 1, linewidth: 2 }), // Sage green
};

export const OUTLINE_COLORS = {
  default: 0x444444,
  selected: 0xffffff,
  validationFail: 0xff8888,
  office: 0x777777,
};

/**
 * Creates geometry from backend pre-calculated vertices and faces.
 * Falls back to extruding the 2D polygon if 3D data is missing.
 */
export function createUnitGeometry(unit: Unit): THREE.BufferGeometry {
  if (unit.vertices && unit.vertices.length > 0 && unit.faces && unit.faces.length > 0) {
    const geometry = new THREE.BufferGeometry();
    
    // Flatten vertices array [x1, y1, z1, x2, y2, z2...]
    const positions = new Float32Array(unit.vertices.length * 3);
    for (let i = 0; i < unit.vertices.length; i++) {
      // Backend z is vertical, we need to map to Three.js coordinates
      // The backend extrudes from z=base to z=base+height. But wait, UnitMesh
      // applies a position offset `[0, unit.elevation, 0]`.
      // The backend vertices ALREADY include the elevation in their Z coordinate!
      // Wait, let's check `services.py`:
      // `base_z = compute_elevation(floor_number, floor_height)`
      // `vertices, faces = extrude_polygon(coords, base_z, floor_height)`
      // If we use UnitMesh's group position offset, we would double-apply the elevation.
      // We will subtract unit.elevation here so the local origin is at the base of the unit.
      positions[i * 3] = unit.vertices[i][0];
      positions[i * 3 + 1] = unit.vertices[i][2] - unit.elevation; // Map backend Z to Three.js Y
      positions[i * 3 + 2] = unit.vertices[i][1]; // Map backend Y to Three.js Z
    }
    
    // Flatten faces array
    const indices = [];
    for (let i = 0; i < unit.faces.length; i++) {
      indices.push(unit.faces[i][0], unit.faces[i][1], unit.faces[i][2]);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    return geometry;
  }
  
  // Fallback to naive extrusion
  const shape = new THREE.Shape();
  if (unit.polygon_2d.length === 0) return new THREE.ExtrudeGeometry(shape, { depth: unit.height, bevelEnabled: false });

  shape.moveTo(unit.polygon_2d[0][0], unit.polygon_2d[0][1]);
  for (let i = 1; i < unit.polygon_2d.length; i++) {
    shape.lineTo(unit.polygon_2d[i][0], unit.polygon_2d[i][1]);
  }

  const extrudeSettings = {
    depth: unit.height,
    bevelEnabled: false,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, unit.height, 0);

  return geometry;
}

export function getUnitMaterial(unit: Unit, isSelected: boolean): THREE.Material {
  if (isSelected) return MATERIALS.selected;
  
  const hasFail = unit.validations.some(v => v.status === 'fail');
  if (hasFail) return MATERIALS.validationFail;

  return MATERIALS[unit.unit_type] || MATERIALS.residential;
}

export function getOutlineColor(unit: Unit, isSelected: boolean): number {
  if (isSelected) return OUTLINE_COLORS.selected;
  const hasFail = unit.validations.some(v => v.status === 'fail');
  if (hasFail) return OUTLINE_COLORS.validationFail;
  
  if (unit.unit_type === 'office' || unit.unit_type === 'penthouse' || unit.unit_type === 'lobby') {
     return OUTLINE_COLORS.office;
  }
  return OUTLINE_COLORS.default;
}
