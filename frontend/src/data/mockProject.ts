/**
 * Mock data: "Metropolis Tower" demo building.
 * 14 units across 5 floors (B1, GF, F1, F2, F3).
 * Shapes match the backend API exactly.
 */
import type { Project, Floor, Unit, Validation, ValidationSummary } from './types';

/* ── Parcel boundary (building footprint on the ground plane) ── */
const PARCEL_BOUNDARY: number[][] = [
  [0, 0], [30, 0], [30, 26], [0, 26], [0, 0],
];

/* ── Standard footprint (U-shape with a courtyard) ── */
const FOOTPRINT: number[][] = [
  [2, 2], [28, 2], [28, 24], [20, 24], [20, 10], [10, 10], [10, 24], [2, 24], [2, 2],
];

/* ── Tower footprint (Only the base of the U goes up high) ── */
const TOWER_FOOTPRINT: number[][] = [
  [2, 2], [28, 2], [28, 10], [2, 10], [2, 2],
];

const FLOOR_HEIGHT = 4.2; // Premium height

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
    vertices: [], 
    faces: [],
    area: Math.round(area * 100) / 100,
    elevation: elev,
    height: FLOOR_HEIGHT - 0.2, // Slab thickness offset
    unit_type: type,
    validations: validations.map((v, i) => ({ ...v, id: `val-${uid}-${i}`, unit_id: id })),
  };
}

/* ── Floors ── */
const floors: Floor[] = [
  { id: 'floor-b1', floor_number: -1, label: 'Basement 01 — Parking', footprint: FOOTPRINT, unit_count: 2, elevation_base: -4.2, elevation_top: 0 },
  { id: 'floor-gf', floor_number: 0, label: 'Ground Floor — Lobby & Retail', footprint: FOOTPRINT, unit_count: 5, elevation_base: 0, elevation_top: 4.2 },
  { id: 'floor-f1', floor_number: 1, label: 'Floor 01 — Atrium & Co-working', footprint: FOOTPRINT, unit_count: 6, elevation_base: 4.2, elevation_top: 8.4 },
  { id: 'floor-f2', floor_number: 2, label: 'Floor 02 — Executive Offices', footprint: FOOTPRINT, unit_count: 6, elevation_base: 8.4, elevation_top: 12.6 },
  { id: 'floor-f3', floor_number: 3, label: 'Floor 03 — Tower Suites A', footprint: TOWER_FOOTPRINT, unit_count: 4, elevation_base: 12.6, elevation_top: 16.8 },
  { id: 'floor-f4', floor_number: 4, label: 'Floor 04 — Tower Suites B', footprint: TOWER_FOOTPRINT, unit_count: 4, elevation_base: 16.8, elevation_top: 21.0 },
  { id: 'floor-f5', floor_number: 5, label: 'Floor 05 — Penthouses', footprint: TOWER_FOOTPRINT, unit_count: 2, elevation_base: 21.0, elevation_top: 25.2 },
];

/* ── Units per floor ── */
const units: Unit[] = [
  // B1 - Parking (Left and Right wings)
  mkUnit(-1, 'floor-b1', 1, 'parking', [[3, 3], [14, 3], [14, 23], [3, 23], [3, 3]]),
  mkUnit(-1, 'floor-b1', 2, 'parking', [[16, 3], [27, 3], [27, 23], [16, 23], [16, 3]]),

  // GF - Lobby (Center) + Retail (Wings)
  mkUnit(0, 'floor-gf', 1, 'lobby', [[10, 3], [20, 3], [20, 9], [10, 9], [10, 3]]),
  mkUnit(0, 'floor-gf', 2, 'retail', [[3, 3], [9, 3], [9, 9], [3, 9], [3, 3]]),
  mkUnit(0, 'floor-gf', 3, 'retail', [[21, 3], [27, 3], [27, 9], [21, 9], [21, 3]]),
  mkUnit(0, 'floor-gf', 4, 'retail', [[3, 11], [9, 11], [9, 23], [3, 23], [3, 11]]),
  mkUnit(0, 'floor-gf', 5, 'retail', [[21, 11], [27, 11], [27, 23], [21, 23], [21, 11]]),

  // F1 - Atrium (Void in center) + Co-working
  mkUnit(1, 'floor-f1', 1, 'commercial', [[3, 3], [9, 3], [9, 9], [3, 9], [3, 3]]),
  mkUnit(1, 'floor-f1', 2, 'commercial', [[21, 3], [27, 3], [27, 9], [21, 9], [21, 3]]),
  mkUnit(1, 'floor-f1', 3, 'commercial', [[10, 3], [14, 3], [14, 9], [10, 9], [10, 3]]),
  mkUnit(1, 'floor-f1', 4, 'commercial', [[16, 3], [20, 3], [20, 9], [16, 9], [16, 3]]),
  mkUnit(1, 'floor-f1', 5, 'office', [[3, 11], [9, 11], [9, 23], [3, 23], [3, 11]]),
  mkUnit(1, 'floor-f1', 6, 'office', [[21, 11], [27, 11], [27, 23], [21, 23], [21, 11]]),

  // F2 - Executive Offices
  mkUnit(2, 'floor-f2', 1, 'office', [[3, 3], [9, 3], [9, 9], [3, 9], [3, 3]]),
  mkUnit(2, 'floor-f2', 2, 'office', [[21, 3], [27, 3], [27, 9], [21, 9], [21, 3]]),
  mkUnit(2, 'floor-f2', 3, 'office', [[10, 3], [14, 3], [14, 9], [10, 9], [10, 3]]),
  mkUnit(2, 'floor-f2', 4, 'office', [[16, 3], [20, 3], [20, 9], [16, 9], [16, 3]]),
  // F2 Wing overlap fail test
  mkUnit(2, 'floor-f2', 5, 'office', [[3, 11], [10, 11], [10, 23], [3, 23], [3, 11]], [{ rule: 'overlap', status: 'fail', message: 'F2-U05 overlaps bounding wall' }]),
  mkUnit(2, 'floor-f2', 6, 'office', [[21, 11], [27, 11], [27, 23], [21, 23], [21, 11]]),

  // F3 - Tower Suites A (Only base of U)
  mkUnit(3, 'floor-f3', 1, 'residential', [[3, 3], [9, 3], [9, 9], [3, 9], [3, 3]]),
  mkUnit(3, 'floor-f3', 2, 'residential', [[10, 3], [14, 3], [14, 9], [10, 9], [10, 3]]),
  mkUnit(3, 'floor-f3', 3, 'residential', [[16, 3], [20, 3], [20, 9], [16, 9], [16, 3]]),
  mkUnit(3, 'floor-f3', 4, 'residential', [[21, 3], [27, 3], [27, 9], [21, 9], [21, 3]]),

  // F4 - Tower Suites B
  mkUnit(4, 'floor-f4', 1, 'residential', [[3, 3], [9, 3], [9, 9], [3, 9], [3, 3]]),
  mkUnit(4, 'floor-f4', 2, 'residential', [[10, 3], [14, 3], [14, 9], [10, 9], [10, 3]]),
  mkUnit(4, 'floor-f4', 3, 'residential', [[16, 3], [20, 3], [20, 9], [16, 9], [16, 3]]),
  mkUnit(4, 'floor-f4', 4, 'residential', [[21, 3], [27, 3], [27, 9], [21, 9], [21, 3]]),

  // F5 - Penthouses
  mkUnit(5, 'floor-f5', 1, 'penthouse', [[3, 3], [14, 3], [14, 9], [3, 9], [3, 3]]),
  mkUnit(5, 'floor-f5', 2, 'penthouse', [[16, 3], [27, 3], [27, 9], [16, 9], [16, 3]]),
];

/* ── Validation summary ── */
const validation_summary: ValidationSummary = {
  total_units: 29,
  passed: 28,
  warnings: 0,
  failures: 1,
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
    floor_count: 6,
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
