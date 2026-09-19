import * as THREE from 'three';
import type { Unit } from '../data/types';

// Palette matching Verta dark architectural design
export const MATERIALS = {
  residential: new THREE.MeshLambertMaterial({ color: 0x333333, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  commercial: new THREE.MeshLambertMaterial({ color: 0x222222, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  office: new THREE.MeshLambertMaterial({ color: 0x444444, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  lobby: new THREE.MeshLambertMaterial({ color: 0x222222, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  retail: new THREE.MeshLambertMaterial({ color: 0x333333, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  parking: new THREE.MeshLambertMaterial({ color: 0x111111, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  penthouse: new THREE.MeshLambertMaterial({ color: 0x555555, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  
  // States
  selected: new THREE.MeshLambertMaterial({ color: 0x8da399, transparent: true, opacity: 0.4, side: THREE.DoubleSide }), // Accent sage green
  validationFail: new THREE.MeshLambertMaterial({ color: 0xff5555, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
  
  // Environment
  slab: new THREE.MeshLambertMaterial({ color: 0x050505, side: THREE.DoubleSide }), // Pitch black
  parcel: new THREE.LineDashedMaterial({ color: 0x8da399, dashSize: 1, gapSize: 1, linewidth: 2 }), // Sage green
};

export const OUTLINE_COLORS = {
  default: 0x555555, // Subtle grey outlines for blueprint feel
  selected: 0xffffff, // White outline when selected
  validationFail: 0xffaaaa, // Light red
  office: 0x666666,
};

/**
 * Extrudes a 2D polygon into a 3D geometry using Three.js ExtrudeGeometry.
 */
export function createExtrudedGeometry(polygon2d: number[][], height: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  if (polygon2d.length === 0) return new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });

  shape.moveTo(polygon2d[0][0], polygon2d[0][1]);
  for (let i = 1; i < polygon2d.length; i++) {
    shape.lineTo(polygon2d[i][0], polygon2d[i][1]);
  }

  const extrudeSettings = {
    depth: height,
    bevelEnabled: false,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, height, 0);

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
