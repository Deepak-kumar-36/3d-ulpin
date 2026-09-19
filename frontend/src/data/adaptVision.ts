/**
 * Adapt VisionFloor JSON(s) into the app's Project shape.
 *
 * Rules:
 * - Coordinates are pixels. The viewer works in meters.
 * - Use px_per_meter when not null, otherwise compute ONE shared scale
 *   so the widest floor is ~20 m wide.
 * - Translate so the min corner is (0, 0).
 * - DO NOT flip y (polygon y maps to 3D z correctly).
 * - Floor N gets floor_number N-1 with floor_height 3.6.
 * - Footprint = bounding box of that floor's units + 0.5 m margin.
 * - ULPIN in mock format: DL-9821-<floor_id>-U<nn>.
 * - Default unit_type "commercial". Empty validations.
 */
import type { Project, Floor, Unit, Validation } from './types';
import type { VisionFloor } from '../api/client';

// Shoelace formula for polygon area
function shoelaceArea(polygon: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i][0] * polygon[j][1] - polygon[j][0] * polygon[i][1];
  }
  return Math.abs(area / 2);
}

function getFloorNumber(floorId: string, index: number): number {
  const match = floorId.match(/\d+/);
  if (match) return parseInt(match[0], 10);
  return index + 1;
}

export function adaptVisionFloors(visionData: VisionFloor[], projectName = 'Detected Project'): Project {
  const FLOOR_HEIGHT = 3.6;
  const TARGET_WIDTH_M = 20;

  // ── Step 1: find the global pixel bounding box across all floors ──
  let globalMinPx = [Infinity, Infinity];
  let globalMaxPx = [-Infinity, -Infinity];

  for (const vf of visionData) {
    for (const u of vf.units) {
      for (const pt of u.polygon) {
        globalMinPx = [Math.min(globalMinPx[0], pt[0]), Math.min(globalMinPx[1], pt[1])];
        globalMaxPx = [Math.max(globalMaxPx[0], pt[0]), Math.max(globalMaxPx[1], pt[1])];
      }
    }
  }

  const pxWidth = globalMaxPx[0] - globalMinPx[0];
  const pxHeight = globalMaxPx[1] - globalMinPx[1];
  const widestPx = Math.max(pxWidth, pxHeight, 1);

  // ── Step 2: compute the shared scale (px → meters) ──
  // If any floor has px_per_meter, use 1/px_per_meter.
  // Otherwise scale so the widest extent is ~20 m.
  let pxToM: number | null = null;
  for (const vf of visionData) {
    if (vf.px_per_meter != null && vf.px_per_meter > 0) {
      pxToM = 1 / vf.px_per_meter;
      break;
    }
  }
  if (pxToM == null) {
    pxToM = TARGET_WIDTH_M / widestPx;
  }

  const scale = pxToM;

  // ── Step 3: build floors and units ──
  const floors: Floor[] = [];
  const units: Unit[] = [];

  let globalMinM = [Infinity, Infinity];
  let globalMaxM = [-Infinity, -Infinity];

  for (let fi = 0; fi < visionData.length; fi++) {
    const vFloor = visionData[fi];
    const floorNum = getFloorNumber(vFloor.floor_id, fi);
    const elevation = (floorNum - 1) * FLOOR_HEIGHT;

    let floorMinM = [Infinity, Infinity];
    let floorMaxM = [-Infinity, -Infinity];

    for (let ui = 0; ui < vFloor.units.length; ui++) {
      const vUnit = vFloor.units[ui];

      // Convert px → meters, translate so min corner → (0,0)
      const polygon2d: number[][] = vUnit.polygon.map(pt => [
        (pt[0] - globalMinPx[0]) * scale,
        (pt[1] - globalMinPx[1]) * scale,
      ]);

      const area = shoelaceArea(polygon2d as [number, number][]);

      // Track bounds
      for (const pt of polygon2d) {
        floorMinM = [Math.min(floorMinM[0], pt[0]), Math.min(floorMinM[1], pt[1])];
        floorMaxM = [Math.max(floorMaxM[0], pt[0]), Math.max(floorMaxM[1], pt[1])];
        globalMinM = [Math.min(globalMinM[0], pt[0]), Math.min(globalMinM[1], pt[1])];
        globalMaxM = [Math.max(globalMaxM[0], pt[0]), Math.max(globalMaxM[1], pt[1])];
      }

      const unitId = `unit-${vFloor.floor_id}-${ui + 1}`;
      const ulpin = `DL-9821-${vFloor.floor_id}-U${String(ui + 1).padStart(2, '0')}`;

      units.push({
        id: unitId,
        ulpin_3d: ulpin,
        floor_id: `floor-${floorNum}`,
        floor_number: floorNum,
        polygon_2d: polygon2d,
        vertices: [],
        faces: [],
        area,
        elevation,
        height: FLOOR_HEIGHT,
        unit_type: 'commercial',
        validations: [] as Validation[],
      });
    }

    // Footprint = floor bbox + 0.5m margin
    const m = 0.5;
    const footprint: number[][] = [
      [floorMinM[0] - m, floorMinM[1] - m],
      [floorMaxM[0] + m, floorMinM[1] - m],
      [floorMaxM[0] + m, floorMaxM[1] + m],
      [floorMinM[0] - m, floorMaxM[1] + m],
    ];

    floors.push({
      id: `floor-${floorNum}`,
      label: `Level ${floorNum}`,
      floor_number: floorNum,
      elevation_base: elevation,
      elevation_top: elevation + FLOOR_HEIGHT,
      footprint,
      unit_count: vFloor.units.length,
    });
  }

  // Parcel boundary = global bbox + 2m margin
  const pm = 2;
  const parcel_boundary: number[][] = [
    [globalMinM[0] - pm, globalMinM[1] - pm],
    [globalMaxM[0] + pm, globalMinM[1] - pm],
    [globalMaxM[0] + pm, globalMaxM[1] + pm],
    [globalMinM[0] - pm, globalMaxM[1] + pm],
  ];

  return {
    id: 'detected',
    name: projectName,
    parcel_id: 'DL-9821-DET',
    parcel_boundary,
    building: {
      id: 'bldg-detected',
      floor_count: floors.length,
      floor_height: FLOOR_HEIGHT,
      basement_count: 0,
    },
    floors,
    units,
    validation_summary: {
      total_units: units.length,
      passed: units.length,
      warnings: 0,
      failures: 0,
      rules_checked: [],
    },
  };
}
