/**
 * Mock data: "Metropolis Tower" demo building.
 * 14 units across 5 floors (B1, GF, F1, F2, F3).
 * Shapes match the backend API exactly.
 */
import type { Project, Floor, Unit, Validation, ValidationSummary } from './types';

/* ── Parcel boundary (building footprint on the ground plane) ── */
const PARCEL_BOUNDARY: number[][] = [
  [0, 0], [20, 0], [20, 16], [0, 16], [0, 0],
];

/* ── Standard footprint used on all floors ── */
const FOOTPRINT: number[][] = [
  [1, 1], [19, 1], [19, 15], [1, 15], [1, 1],
];

const FLOOR_HEIGHT = 3.6;

/* ── Helper to make a unit ── */
let uid = 0;
function mkUnit(
  floorNum: number,
  floorId: string,
  seq: number,
  type: Unit['unit_type'],
  polygon: number[][],
  validations: Omit<Validation, 'id' | 'unit_id'>[] = [{ rule: 'overlap', status: 'pass', message: 'No overlap detected' }, { rule: 'containment', status: 'pass', message: 'Unit within footprint' }],
): Unit {
  const id = `unit-${++uid}`;
  const prefix = floorNum < 0 ? 'B' : floorNum === 0 ? 'GF' : `F${floorNum}`;
  const ulpin = `DL-9821-${prefix}-U${String(seq).padStart(2, '0')}`;
  const elev = floorNum * FLOOR_HEIGHT;
  // Simple area calculation (shoelace)
  let area = 0;
  for (let i = 0; i < polygon.length - 1; i++) {
    area += polygon[i][0] * polygon[i + 1][1] - polygon[i + 1][0] * polygon[i][1];
  }
  area = Math.abs(area) / 2;

  return {
    id,
    ulpin_3d: ulpin,
    floor_id: floorId,
    floor_number: floorNum,
    polygon_2d: polygon,
    vertices: [], // populated by the 3D viewer at runtime
    faces: [],
    area: Math.round(area * 100) / 100,
    elevation: elev,
    height: FLOOR_HEIGHT,
    unit_type: type,
    validations: validations.map((v, i) => ({ ...v, id: `val-${uid}-${i}`, unit_id: id })),
  };
}

/* ── Floors ── */
const floors: Floor[] = [
  { id: 'floor-b1', floor_number: -1, label: 'Basement 01 — Parking', footprint: FOOTPRINT, unit_count: 1, elevation_base: -3.6, elevation_top: 0 },
  { id: 'floor-gf', floor_number: 0, label: 'Ground Floor — Lobby & Retail', footprint: FOOTPRINT, unit_count: 3, elevation_base: 0, elevation_top: 3.6 },
  { id: 'floor-f1', floor_number: 1, label: 'Floor 01 — Tech Workspace', footprint: FOOTPRINT, unit_count: 4, elevation_base: 3.6, elevation_top: 7.2 },
  { id: 'floor-f2', floor_number: 2, label: 'Floor 02 — Commercial Suites', footprint: FOOTPRINT, unit_count: 4, elevation_base: 7.2, elevation_top: 10.8 },
  { id: 'floor-f3', floor_number: 3, label: 'Floor 03 — Penthouses', footprint: FOOTPRINT, unit_count: 2, elevation_base: 10.8, elevation_top: 14.4 },
];

/* ── Units per floor ── */
const units: Unit[] = [
  // B1 - Parking
  mkUnit(-1, 'floor-b1', 1, 'parking', [[2, 2], [18, 2], [18, 14], [2, 14], [2, 2]]),

  // GF - Lobby + 2 Retail
  mkUnit(0, 'floor-gf', 1, 'retail', [[2, 2], [9, 2], [9, 8], [2, 8], [2, 2]]),
  mkUnit(0, 'floor-gf', 2, 'retail', [[11, 2], [18, 2], [18, 8], [11, 8], [11, 2]]),
  mkUnit(0, 'floor-gf', 3, 'lobby', [[2, 9], [18, 9], [18, 14], [2, 14], [2, 9]]),

  // F1 - 4 Tech Offices
  mkUnit(1, 'floor-f1', 1, 'office', [[2, 2], [9, 2], [9, 7], [2, 7], [2, 2]]),
  mkUnit(1, 'floor-f1', 2, 'office', [[11, 2], [18, 2], [18, 7], [11, 7], [11, 2]]),
  mkUnit(1, 'floor-f1', 3, 'office', [[2, 9], [9, 9], [9, 14], [2, 14], [2, 9]]),
  mkUnit(1, 'floor-f1', 4, 'office', [[11, 9], [18, 9], [18, 14], [11, 14], [11, 9]],
    [{ rule: 'overlap', status: 'pass', message: 'No overlap' }, { rule: 'containment', status: 'pass', message: 'Within footprint' }, { rule: 'unassigned_area', status: 'warning', message: 'Floor 1 has 18% unassigned area — possible missed unit' }]),

  // F2 - 4 Commercial Suites (one with overlap warning)
  mkUnit(2, 'floor-f2', 1, 'commercial', [[2, 2], [9, 2], [9, 7], [2, 7], [2, 2]]),
  mkUnit(2, 'floor-f2', 2, 'commercial', [[11, 2], [18, 2], [18, 7], [11, 7], [11, 2]]),
  mkUnit(2, 'floor-f2', 3, 'commercial', [[2, 9], [10, 9], [10, 14], [2, 14], [2, 9]],
    [{ rule: 'overlap', status: 'fail', message: 'Unit F2-U03 overlaps Unit F2-U04 by 4.2 m²' }, { rule: 'containment', status: 'pass', message: 'Within footprint' }]),
  mkUnit(2, 'floor-f2', 4, 'commercial', [[9, 9], [18, 9], [18, 14], [9, 14], [9, 9]],
    [{ rule: 'overlap', status: 'fail', message: 'Unit F2-U04 overlaps Unit F2-U03 by 4.2 m²' }, { rule: 'containment', status: 'pass', message: 'Within footprint' }]),

  // F3 - 2 Penthouses
  mkUnit(3, 'floor-f3', 1, 'penthouse', [[2, 2], [9, 2], [9, 14], [2, 14], [2, 2]]),
  mkUnit(3, 'floor-f3', 2, 'penthouse', [[11, 2], [18, 2], [18, 14], [11, 14], [11, 2]]),
];

/* ── Validation summary ── */
const validation_summary: ValidationSummary = {
  total_units: 14,
  passed: 11,
  warnings: 1,
  failures: 2,
  rules_checked: ['overlap', 'containment', 'unassigned_area'],
};

/* ── The full project ── */
export const DEMO_PROJECT: Project = {
  id: 'demo',
  name: 'Metropolis Tower',
  parcel_id: 'DL-9821-2024',
  parcel_boundary: PARCEL_BOUNDARY,
  building: {
    id: 'bldg-demo',
    floor_count: 4,
    floor_height: FLOOR_HEIGHT,
    basement_count: 1,
  },
  floors,
  units,
  validation_summary,
};

/* ── Helper: get units for a specific floor ── */
export function getFloorUnits(project: Project, floorNumber: number): Unit[] {
  return project.units.filter((u) => u.floor_number === floorNumber);
}

/* ── Helper: get floor by number ── */
export function getFloor(project: Project, floorNumber: number): Floor | undefined {
  return project.floors.find((f) => f.floor_number === floorNumber);
}

/* ── Helper: get unit by id ── */
export function getUnitById(project: Project, unitId: string): Unit | undefined {
  return project.units.find((u) => u.id === unitId);
}
