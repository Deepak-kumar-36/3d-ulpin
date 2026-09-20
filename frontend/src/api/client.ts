/**
 * API client for VERTA backend.
 *
 * detectPlan() is the core function: it sends a file to POST /detect
 * and returns the vision JSON. It NEVER falls back to demo data.
 *
 * getProject() and runFallbackPipeline() keep demo fallbacks but only
 * when the caller explicitly opts in.
 */
import type { Project } from '../data/types';
import { DEMO_PROJECT } from '../data/mockProject';
import { adaptVisionFloors } from '../data/adaptVision';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// ── Vision JSON contract ──────────────────────────────────────────────
export interface VisionUnit {
  id: string;
  polygon: [number, number][];
  holes: [number, number][][];
  area_px: number;
  centroid: [number, number];
}

export interface VisionFloor {
  floor_id: string;
  image_size: [number, number];
  scale_from_original?: number;
  px_per_meter: number | null;
  coord_system: {
    origin: string;
    y_axis: string;
    exterior_winding: string;
    closed_ring: boolean;
  };
  auto_config?: { close_frac: number };
  confidence?: number;
  warnings?: string[];
  units: VisionUnit[];
  doors?: { bbox: number[]; centroid: number[]; id: string }[];
  source: string;
}

// ── Core detection call — NEVER returns demo data ─────────────────────
export async function detectPlan(file: File, floorId: string): Promise<VisionFloor> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('floor_id', floorId);

  // Do NOT set Content-Type manually for FormData
  const res = await fetch(`${API_BASE}/detect`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    // Extract the backend's error message
    let detail = `Detection failed (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body.detail) detail = body.detail;
    } catch {
      // response wasn't JSON, use the status text
    }
    throw new Error(detail);
  }

  return res.json();
}

// ── Health check ──────────────────────────────────────────────────────
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// ── Ingestion response type ──────────────────────────────────────────
export interface IngestResponse {
  project_id: string;
  project: Project;
  floor_reports?: any[];
  total_units_ingested?: number;
  validation_summary?: any;
}

// ── Normalise any project shape to match frontend Three.js expectations ─
export function normalizeProject(raw: any): Project {
  if (!raw) return DEMO_PROJECT;

  const parcel_id = raw.parcel_id || raw.parcel?.id || 'DL-9821-2024';
  let parcel_boundary: number[][] = raw.parcel_boundary || raw.parcel?.boundary || [];

  const building = raw.building || {
    id: 'bldg-detected',
    floor_count: Array.isArray(raw.floors) ? raw.floors.length : 1,
    floor_height: 3.6,
    basement_count: 0,
  };
  const floorHeight = building.floor_height || 3.6;

  const floors = (raw.floors || []).map((f: any, idx: number) => {
    const floor_number = typeof f.floor_number === 'number' ? f.floor_number : idx + 1;
    const baseElevation = typeof f.elevation_base === 'number'
      ? f.elevation_base
      : (floor_number < 0 ? floor_number * floorHeight : (floor_number - 1) * floorHeight);
    const topElevation = typeof f.elevation_top === 'number'
      ? f.elevation_top
      : baseElevation + floorHeight;
    const label = f.label || (floor_number > 0 ? `Level ${floor_number}` : (floor_number === 0 ? 'Ground Floor' : `Basement ${Math.abs(floor_number)}`));
    const footprint = Array.isArray(f.footprint) ? f.footprint : [];
    const unitCount = typeof f.unit_count === 'number'
      ? f.unit_count
      : (Array.isArray(raw.units) ? raw.units.filter((u: any) => u.floor_number === floor_number).length : 0);

    return {
      id: f.id || `floor-${floor_number}`,
      floor_number,
      label,
      footprint,
      unit_count: unitCount,
      elevation_base: baseElevation,
      elevation_top: topElevation,
    };
  });

  if (parcel_boundary.length === 0) {
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const f of floors) {
      for (const pt of f.footprint) {
        minX = Math.min(minX, pt[0]);
        minZ = Math.min(minZ, pt[1]);
        maxX = Math.max(maxX, pt[0]);
        maxZ = Math.max(maxZ, pt[1]);
      }
    }
    if (minX !== Infinity) {
      const pm = 2.0;
      parcel_boundary = [
        [minX - pm, minZ - pm],
        [maxX + pm, minZ - pm],
        [maxX + pm, maxZ + pm],
        [minX - pm, maxZ + pm],
        [minX - pm, minZ - pm],
      ];
    } else {
      parcel_boundary = [[0, 0], [30, 0], [30, 26], [0, 26], [0, 0]];
    }
  }

  const units = (raw.units || []).map((u: any, idx: number) => {
    const floor_number = typeof u.floor_number === 'number' ? u.floor_number : 1;
    const elev = typeof u.elevation === 'number'
      ? u.elevation
      : (floor_number < 0 ? floor_number * floorHeight : (floor_number - 1) * floorHeight);
    const height = typeof u.height === 'number' ? u.height : floorHeight;
    const unit_type = u.unit_type || 'residential';

    return {
      id: u.id || `unit-${idx + 1}`,
      ulpin_3d: u.ulpin_3d || `DL-9821-L${floor_number}-U${String(idx + 1).padStart(2, '0')}`,
      floor_id: u.floor_id || `floor-${floor_number}`,
      floor_number,
      polygon_2d: u.polygon_2d || [],
      vertices: u.vertices || [],
      faces: u.faces || [],
      area: typeof u.area === 'number' ? u.area : 0,
      elevation: elev,
      height,
      unit_type,
      validations: Array.isArray(u.validations) ? u.validations : [],
    };
  });

  const validation_summary = raw.validation_summary || {
    total_units: units.length,
    passed: units.filter((u: any) => !(u.validations || []).some((v: any) => v.status === 'fail')).length,
    warnings: units.filter((u: any) => (u.validations || []).some((v: any) => v.status === 'warning')).length,
    failures: units.filter((u: any) => (u.validations || []).some((v: any) => v.status === 'fail')).length,
    rules_checked: ['overlap', 'containment', 'unassigned_area'],
  };

  return {
    id: raw.id || 'project-1',
    name: raw.name || 'Cadastre Project',
    parcel_id,
    parcel_boundary,
    building,
    floors,
    units,
    properties: Array.isArray(raw.properties) ? raw.properties : [],
    validation_summary,
    _isDemoData: raw._isDemoData,
  } as Project;
}

// ── Ingest CV Detected Floors on the backend ─────────────────────────
export async function ingestCvFloors(
  floors: VisionFloor[],
  projectName: string,
  floorHeight = 3.6,
): Promise<IngestResponse> {
  const payload = {
    project_name: projectName,
    floor_height: floorHeight,
    floors: floors.map((f, i) => {
      let fn = i + 1;
      const match = f.floor_id.match(/[-_]?(\d+)/);
      if (match) fn = parseInt(match[1], 10);
      if (f.floor_id.toLowerCase().startsWith('b')) fn = -Math.abs(fn);
      return {
        json: f,
        floor_number: fn,
      };
    }),
  };

  const res = await fetch(`${API_BASE}/cv/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = `Ingestion failed (HTTP ${res.status})`;
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // fallback
    }
    throw new Error(detail);
  }

  const data = await res.json();
  const normalizedProj = normalizeProject(data.project);

  return {
    project_id: data.project_id,
    project: normalizedProj,
    floor_reports: data.floor_reports,
    total_units_ingested: data.total_units_ingested,
    validation_summary: data.validation_summary,
  };
}

// ── Project fetching (with explicit demo fallback) ────────────────────
export async function getProject(id: string, allowDemoFallback = true): Promise<Project> {
  try {
    const res = await fetch(`${API_BASE}/project/${id}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    return normalizeProject(raw);
  } catch {
    if (allowDemoFallback) {
      console.warn('Backend not available, using demo data for project:', id);
      return normalizeProject({ ...DEMO_PROJECT, _isDemoData: true });
    }
    throw new Error('Backend not available and demo fallback not allowed');
  }
}

// ── Fallback pipeline (only returns demo when explicitly called) ──────
export function getDemoProject(): Project {
  return normalizeProject({ ...DEMO_PROJECT, _isDemoData: true });
}

// ── Adapt vision results into a Project ───────────────────────────────
export function buildProjectFromVision(floors: VisionFloor[], projectName: string): Project {
  return normalizeProject(adaptVisionFloors(floors, projectName));
}


// ── Property Bundling API ─────────────────────────────────────────────

import type { Property } from '../data/types';

export async function createProperty(
  projectId: string,
  name: string,
  unitIds: string[],
  description = '',
): Promise<Property> {
  const res = await fetch(`${API_BASE}/properties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      name,
      unit_ids: unitIds,
      description,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create property (HTTP ${res.status})`);
  }
  return res.json();
}

export async function getProjectProperties(projectId: string): Promise<Property[]> {
  const res = await fetch(`${API_BASE}/project/${projectId}/properties`);
  if (!res.ok) return [];
  return res.json();
}

export async function addUnitToProperty(propertyId: string, unitId: string): Promise<Property> {
  const res = await fetch(`${API_BASE}/properties/${propertyId}/units/${unitId}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to add unit`);
  }
  return res.json();
}

export async function removeUnitFromProperty(propertyId: string, unitId: string): Promise<Property> {
  const res = await fetch(`${API_BASE}/properties/${propertyId}/units/${unitId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to remove unit`);
  }
  return res.json();
}

export async function deleteProperty(propertyId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/properties/${propertyId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete property`);
  }
}
