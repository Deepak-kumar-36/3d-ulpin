/**
 * Procedural architectural geometry generators.
 * All functions take project data and return THREE.js objects.
 * No React — pure Three.js geometry math.
 */
import * as THREE from 'three';

// ─── Constants ───────────────────────────────────────────────────────
const DOOR_WIDTH = 0.9;
const DOOR_HEIGHT = 2.1;
const DOOR_DEPTH = 0.12;
const DOOR_FRAME_THICKNESS = 0.06;

const WINDOW_WIDTH = 1.2;
const WINDOW_HEIGHT = 1.4;
const WINDOW_SILL_HEIGHT = 0.9;    // Height above floor
const WINDOW_FRAME_THICKNESS = 0.04;
const WINDOW_SPACING = 2.5;        // Minimum edge length per window

const WALL_THICKNESS = 0.12;
const EXTERIOR_WALL_THICKNESS = 0.18;

const ROOF_THICKNESS = 0.35;

// ─── Edge Utilities ──────────────────────────────────────────────────

interface Edge {
  ax: number; az: number;
  bx: number; bz: number;
  length: number;
  midX: number; midZ: number;
  /** Unit normal pointing outward (to the left of travel direction) */
  nx: number; nz: number;
  /** Direction along the edge */
  dx: number; dz: number;
  /** Angle in radians around Y axis */
  angle: number;
}

function computeEdge(ax: number, az: number, bx: number, bz: number): Edge {
  const dx = bx - ax;
  const dz = bz - az;
  const length = Math.hypot(dx, dz);
  const ndx = length > 0 ? dx / length : 0;
  const ndz = length > 0 ? dz / length : 0;
  // Normal: perpendicular, pointing "left" of travel (outward for CCW polygon)
  const nx = -ndz;
  const nz = ndx;
  const angle = Math.atan2(ndx, ndz); // rotation around Y

  return {
    ax, az, bx, bz,
    length,
    midX: (ax + bx) / 2,
    midZ: (az + bz) / 2,
    nx, nz,
    dx: ndx, dz: ndz,
    angle,
  };
}

function getEdges(polygon: number[][]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < polygon.length - 1; i++) {
    const a = polygon[i];
    const b = polygon[i + 1];
    edges.push(computeEdge(a[0], a[1], b[0], b[1]));
  }
  return edges;
}

/**
 * Check if an edge lies on (or very close to) the footprint boundary.
 * Used to determine exterior-facing edges for window placement.
 */
function isEdgeOnFootprint(edge: Edge, footprint: number[][], tolerance = 0.5): boolean {
  const fpEdges = getEdges(footprint);
  for (const fp of fpEdges) {
    // Check if both endpoints of the unit edge lie on/near the footprint edge
    const distA = pointToSegmentDist(edge.ax, edge.az, fp.ax, fp.az, fp.bx, fp.bz);
    const distB = pointToSegmentDist(edge.bx, edge.bz, fp.ax, fp.az, fp.bx, fp.bz);
    if (distA < tolerance && distB < tolerance) return true;
  }
  return false;
}

function pointToSegmentDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - ax, pz - az);
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cz = az + t * dz;
  return Math.hypot(px - cx, pz - cz);
}

// ─── Door Geometry ──────────────────────────────────────────────────

/**
 * Creates a 3D door group (frame + panel) at the primary entrance edge of a unit.
 * The door is placed at the midpoint of the first edge of the polygon.
 */
export function createDoorGroup(
  polygon: number[][],
  _floorHeight: number,
  materials: {
    doorFrame: THREE.Material;
    doorPanel: THREE.Material;
  }
): THREE.Group | null {
  if (polygon.length < 2) return null;

  const edge = computeEdge(polygon[0][0], polygon[0][1], polygon[1][0], polygon[1][1]);
  if (edge.length < DOOR_WIDTH + 0.2) return null; // Edge too short for a door

  const group = new THREE.Group();
  group.position.set(edge.midX, 0, edge.midZ);
  group.rotation.y = -edge.angle;

  // Door frame (U-shape: two side posts + lintel)
  const postHeight = DOOR_HEIGHT;
  const postGeo = new THREE.BoxGeometry(DOOR_FRAME_THICKNESS, postHeight, DOOR_DEPTH);
  
  // Left post
  const leftPost = new THREE.Mesh(postGeo, materials.doorFrame);
  leftPost.position.set(-DOOR_WIDTH / 2, postHeight / 2, 0);
  group.add(leftPost);

  // Right post  
  const rightPost = new THREE.Mesh(postGeo, materials.doorFrame);
  rightPost.position.set(DOOR_WIDTH / 2, postHeight / 2, 0);
  group.add(rightPost);

  // Lintel (top bar)
  const lintelGeo = new THREE.BoxGeometry(DOOR_WIDTH + DOOR_FRAME_THICKNESS * 2, DOOR_FRAME_THICKNESS, DOOR_DEPTH);
  const lintel = new THREE.Mesh(lintelGeo, materials.doorFrame);
  lintel.position.set(0, DOOR_HEIGHT + DOOR_FRAME_THICKNESS / 2, 0);
  group.add(lintel);

  // Door panel (slightly recessed)
  const panelGeo = new THREE.BoxGeometry(DOOR_WIDTH - 0.04, DOOR_HEIGHT - 0.04, 0.03);
  const panel = new THREE.Mesh(panelGeo, materials.doorPanel);
  panel.position.set(0, DOOR_HEIGHT / 2, DOOR_DEPTH * 0.3);
  group.add(panel);

  return group;
}

// ─── Window Geometry ────────────────────────────────────────────────

/**
 * Creates 3D window groups along exterior-facing edges of a unit.
 * Windows are placed only on edges that coincide with the floor footprint boundary.
 */
export function createWindowGroups(
  polygon: number[][],
  _floorHeight: number,
  footprint: number[][],
  materials: {
    doorFrame: THREE.Material; // reuse for window frames
    glass: THREE.Material;
  }
): THREE.Group {
  const container = new THREE.Group();
  const edges = getEdges(polygon);

  for (const edge of edges) {
    if (edge.length < WINDOW_SPACING) continue;
    if (!isEdgeOnFootprint(edge, footprint)) continue;

    const numWindows = Math.max(1, Math.floor(edge.length / WINDOW_SPACING));

    for (let w = 0; w < numWindows; w++) {
      const t = (w + 0.5) / numWindows;
      const wx = edge.ax + (edge.bx - edge.ax) * t;
      const wz = edge.az + (edge.bz - edge.az) * t;

      const winGroup = new THREE.Group();
      winGroup.position.set(wx, WINDOW_SILL_HEIGHT, wz);
      winGroup.rotation.y = -edge.angle;

      // Window frame (4 bars)
      const frameH = new THREE.BoxGeometry(WINDOW_WIDTH, WINDOW_FRAME_THICKNESS, WINDOW_FRAME_THICKNESS);
      const frameV = new THREE.BoxGeometry(WINDOW_FRAME_THICKNESS, WINDOW_HEIGHT, WINDOW_FRAME_THICKNESS);

      // Top bar
      const topBar = new THREE.Mesh(frameH, materials.doorFrame);
      topBar.position.set(0, WINDOW_HEIGHT, 0);
      winGroup.add(topBar);

      // Bottom bar (sill)
      const bottomBar = new THREE.Mesh(frameH, materials.doorFrame);
      bottomBar.position.set(0, 0, 0);
      winGroup.add(bottomBar);

      // Left bar
      const leftBar = new THREE.Mesh(frameV, materials.doorFrame);
      leftBar.position.set(-WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2, 0);
      winGroup.add(leftBar);

      // Right bar
      const rightBar = new THREE.Mesh(frameV, materials.doorFrame);
      rightBar.position.set(WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2, 0);
      winGroup.add(rightBar);

      // Glass pane
      const glassGeo = new THREE.PlaneGeometry(WINDOW_WIDTH - WINDOW_FRAME_THICKNESS * 2, WINDOW_HEIGHT - WINDOW_FRAME_THICKNESS * 2);
      const glassMesh = new THREE.Mesh(glassGeo, materials.glass);
      glassMesh.position.set(0, WINDOW_HEIGHT / 2, 0);
      winGroup.add(glassMesh);

      container.add(winGroup);
    }
  }

  return container;
}

// ─── Interior Wall Segments ─────────────────────────────────────────

/**
 * Creates thin semi-transparent wall planes along each edge of the unit polygon.
 * These represent the internal partition walls of the room/unit.
 */
export function createInteriorWalls(
  polygon: number[][],
  floorHeight: number,
  material: THREE.Material
): THREE.Group {
  const container = new THREE.Group();
  const wallHeight = floorHeight - 0.04; // Slightly shorter than unit volume
  const edges = getEdges(polygon);

  for (const edge of edges) {
    if (edge.length < 0.3) continue; // Skip degenerate edges

    // Create a plane aligned with the edge
    const wallGeo = new THREE.PlaneGeometry(edge.length, wallHeight);
    const wall = new THREE.Mesh(wallGeo, material);

    // Position at edge midpoint, half wall height
    wall.position.set(edge.midX, wallHeight / 2, edge.midZ);
    // Rotate to align with edge direction
    wall.rotation.y = -edge.angle;

    container.add(wall);
  }

  return container;
}

// ─── Exterior Wall Shell ────────────────────────────────────────────

/**
 * Creates thin exterior walls around the floor footprint perimeter.
 * These form the building's outer shell.
 */
export function createExteriorWalls(
  footprint: number[][],
  floorHeight: number,
  elevationBase: number,
  material: THREE.Material
): THREE.Group {
  const container = new THREE.Group();
  const wallHeight = floorHeight;
  const edges = getEdges(footprint);

  for (const edge of edges) {
    if (edge.length < 0.3) continue;

    // Create a thin box (gives the wall visible thickness)
    const wallGeo = new THREE.BoxGeometry(edge.length, wallHeight, EXTERIOR_WALL_THICKNESS);
    const wall = new THREE.Mesh(wallGeo, material);

    // Position at edge midpoint, offset outward by half thickness
    wall.position.set(
      edge.midX + edge.nx * EXTERIOR_WALL_THICKNESS / 2,
      elevationBase + wallHeight / 2,
      edge.midZ + edge.nz * EXTERIOR_WALL_THICKNESS / 2
    );
    wall.rotation.y = -edge.angle;

    container.add(wall);
  }

  return container;
}

// ─── Roof Geometry ──────────────────────────────────────────────────

/**
 * Creates a flat roof slab geometry from the floor footprint.
 * Uses the same createExtrudedGeometry approach as floor slabs.
 */
export function createRoofSlab(
  footprint: number[][],
  elevationTop: number,
  createExtrudeFn: (polygon: number[][], height: number) => THREE.ExtrudeGeometry
): THREE.Mesh {
  const geometry = createExtrudeFn(footprint, ROOF_THICKNESS);
  // The extrude function already handles XZ mapping + Y translation
  const mesh = new THREE.Mesh(geometry);
  mesh.position.set(0, elevationTop, 0);
  return mesh;
}

export { ROOF_THICKNESS, WALL_THICKNESS, EXTERIOR_WALL_THICKNESS };
