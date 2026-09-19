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

// ── Project fetching (with explicit demo fallback) ────────────────────
export async function getProject(id: string, allowDemoFallback = true): Promise<Project> {
  try {
    const res = await fetch(`${API_BASE}/project/${id}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    if (allowDemoFallback) {
      console.warn('Backend not available, using demo data for project:', id);
      return { ...DEMO_PROJECT, _isDemoData: true } as unknown as Project;
    }
    throw new Error('Backend not available and demo fallback not allowed');
  }
}

// ── Fallback pipeline (only returns demo when explicitly called) ──────
export function getDemoProject(): Project {
  return { ...DEMO_PROJECT, _isDemoData: true } as unknown as Project;
}

// ── Adapt vision results into a Project ───────────────────────────────
export function buildProjectFromVision(floors: VisionFloor[], projectName: string): Project {
  return adaptVisionFloors(floors, projectName);
}
