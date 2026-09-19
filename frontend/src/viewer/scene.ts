import * as THREE from 'three';
import type { Unit } from '../data/types';

// Palette definitions matching Reference 2 architectural cutaway
export const PALETTE = {
  residential: 0x68a2b8, // Frosted ice cyan
  commercial: 0xc4965c,  // Warm architectural amber
  office: 0xb89266,      // Refined champagne ochre
  lobby: 0x589675,       // Architectural sage emerald
  retail: 0x4c8f77,      // Warm jade glass
  parking: 0x44505c,     // Subterranean smoke slate
  penthouse: 0x809bb0,   // Refined platinum frost
  selected: 0xa5e5cb,    // Luminous mint pastel
  validationFail: 0xd94444,
  validationWarning: 0xe09b3d,
  column: 0x22262a,      // Structural column
  slab: 0x1b1f23,        // Concrete floor plate
};

// Active floor materials (vibrant architectural semi-transparency)
export const ACTIVE_MATERIALS: Record<string, THREE.Material> = {
  residential: new THREE.MeshStandardMaterial({ 
    color: PALETTE.residential, 
    emissive: 0x0c2530,
    emissiveIntensity: 0.12,
    transparent: true, 
    opacity: 0.68, 
    roughness: 0.25, 
    metalness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  commercial: new THREE.MeshStandardMaterial({ 
    color: PALETTE.commercial, 
    emissive: 0x2a1d0a,
    emissiveIntensity: 0.12,
    transparent: true, 
    opacity: 0.68, 
    roughness: 0.25, 
    metalness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  office: new THREE.MeshStandardMaterial({ 
    color: PALETTE.office, 
    emissive: 0x241808,
    emissiveIntensity: 0.12,
    transparent: true, 
    opacity: 0.68, 
    roughness: 0.25, 
    metalness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  lobby: new THREE.MeshStandardMaterial({ 
    color: PALETTE.lobby, 
    emissive: 0x0f2618,
    emissiveIntensity: 0.12,
    transparent: true, 
    opacity: 0.68, 
    roughness: 0.25, 
    metalness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  retail: new THREE.MeshStandardMaterial({ 
    color: PALETTE.retail, 
    emissive: 0x0a241a,
    emissiveIntensity: 0.12,
    transparent: true, 
    opacity: 0.68, 
    roughness: 0.25, 
    metalness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  parking: new THREE.MeshStandardMaterial({ 
    color: PALETTE.parking, 
    emissive: 0x0d151c,
    emissiveIntensity: 0.12,
    transparent: true, 
    opacity: 0.62, 
    roughness: 0.35, 
    metalness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  penthouse: new THREE.MeshStandardMaterial({ 
    color: PALETTE.penthouse, 
    emissive: 0x141f2a,
    emissiveIntensity: 0.12,
    transparent: true, 
    opacity: 0.70, 
    roughness: 0.2, 
    metalness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
};

export const MATERIALS = ACTIVE_MATERIALS;

// Inactive floor materials: retains the exact color identity but with restrained opacity
export const INACTIVE_MATERIALS: Record<string, THREE.Material> = {
  residential: new THREE.MeshStandardMaterial({ 
    color: PALETTE.residential, 
    emissive: 0x040e14,
    emissiveIntensity: 0.05,
    transparent: true, 
    opacity: 0.28, 
    roughness: 0.35, 
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  commercial: new THREE.MeshStandardMaterial({ 
    color: PALETTE.commercial, 
    emissive: 0x100b04,
    emissiveIntensity: 0.05,
    transparent: true, 
    opacity: 0.28, 
    roughness: 0.35, 
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  office: new THREE.MeshStandardMaterial({ 
    color: PALETTE.office, 
    emissive: 0x0e0903,
    emissiveIntensity: 0.05,
    transparent: true, 
    opacity: 0.28, 
    roughness: 0.35, 
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  lobby: new THREE.MeshStandardMaterial({ 
    color: PALETTE.lobby, 
    emissive: 0x050f09,
    emissiveIntensity: 0.05,
    transparent: true, 
    opacity: 0.28, 
    roughness: 0.35, 
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  retail: new THREE.MeshStandardMaterial({ 
    color: PALETTE.retail, 
    emissive: 0x040e0a,
    emissiveIntensity: 0.05,
    transparent: true, 
    opacity: 0.28, 
    roughness: 0.35, 
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  parking: new THREE.MeshStandardMaterial({ 
    color: PALETTE.parking, 
    emissive: 0x05080b,
    emissiveIntensity: 0.05,
    transparent: true, 
    opacity: 0.25, 
    roughness: 0.45, 
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  penthouse: new THREE.MeshStandardMaterial({ 
    color: PALETTE.penthouse, 
    emissive: 0x070b0f,
    emissiveIntensity: 0.05,
    transparent: true, 
    opacity: 0.28, 
    roughness: 0.3, 
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
};

// Common special state materials
export const COMMON_MATERIALS = {
  selected: new THREE.MeshStandardMaterial({ 
    color: PALETTE.selected, 
    emissive: 0x245540, 
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.94,
    roughness: 0.18,
    metalness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  validationFail: new THREE.MeshStandardMaterial({ 
    color: PALETTE.validationFail, 
    emissive: 0x4a1212, 
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.88,
    roughness: 0.25,
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  validationWarning: new THREE.MeshStandardMaterial({ 
    color: PALETTE.validationWarning, 
    emissive: 0x3d2408, 
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.85,
    roughness: 0.25,
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  slab: new THREE.MeshStandardMaterial({ 
    color: PALETTE.slab, 
    roughness: 0.85,
    metalness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  slabInactive: new THREE.MeshStandardMaterial({ 
    color: 0x121619, 
    transparent: true,
    opacity: 0.4,
    roughness: 0.9,
    side: THREE.DoubleSide,
    depthWrite: true,
  }),
  column: new THREE.MeshStandardMaterial({
    color: PALETTE.column,
    roughness: 0.8,
    metalness: 0.15,
  }),
  mullion: new THREE.LineBasicMaterial({
    color: 0x6e887d,
    transparent: true,
    opacity: 0.55,
  }),
  doorThreshold: new THREE.LineBasicMaterial({
    color: 0xa5e5cb,
    transparent: true,
    opacity: 0.85,
  }),
  parcel: new THREE.LineDashedMaterial({ 
    color: 0x8da399, 
    dashSize: 1, 
    gapSize: 0.8, 
    linewidth: 2 
  }),
};

export const OUTLINE_COLORS = {
  active: 0x6e8a7d,
  inactive: 0x33423b,
  selected: 0xffffff,
  validationFail: 0xff5555,
  validationWarning: 0xffbb44,
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
  
  // Rotate so 2D (X, Y) maps to 3D horizontal (X, Z), and depth becomes vertical height (Y)
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, height, 0);

  return geometry;
}

export function getUnitMaterial(unit: Unit, isSelected: boolean, isFloorActive: boolean = true): THREE.Material {
  if (isSelected) return COMMON_MATERIALS.selected;
  
  const hasFail = unit.validations.some(v => v.status === 'fail');
  if (hasFail) return COMMON_MATERIALS.validationFail;

  const hasWarning = unit.validations.some(v => v.status === 'warning');
  if (hasWarning) return COMMON_MATERIALS.validationWarning;

  const dict = isFloorActive ? ACTIVE_MATERIALS : INACTIVE_MATERIALS;
  return dict[unit.unit_type] || dict.residential;
}

export function getOutlineColor(unit: Unit, isSelected: boolean, isFloorActive: boolean = true): number {
  if (isSelected) return OUTLINE_COLORS.selected;
  
  const hasFail = unit.validations.some(v => v.status === 'fail');
  if (hasFail) return OUTLINE_COLORS.validationFail;

  const hasWarning = unit.validations.some(v => v.status === 'warning');
  if (hasWarning) return OUTLINE_COLORS.validationWarning;

  return isFloorActive ? OUTLINE_COLORS.active : OUTLINE_COLORS.inactive;
}
