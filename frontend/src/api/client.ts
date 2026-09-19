/**
 * API client for 3D ULPIN backend.
 * Centralised service layer — all fetch calls go through here.
 */
import type { Project } from '../data/types';
import { DEMO_PROJECT } from '../data/mockProject';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// ── Helpers ──────────────────────────────────────────────────────────────────

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new ApiError(res.status, text);
  }
  return res.json();
}

// ── Health ───────────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ status: string; version: string }> {
  return fetchJSON('/health');
}

// ── Project CRUD ─────────────────────────────────────────────────────────────

export async function createProject(data: {
  name: string;
  parcel_id: string;
  floor_count: number;
  floor_height: number;
  basement_count: number;
}): Promise<{ project_id: string }> {
  return fetchJSON('/project', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getProject(id: string): Promise<Project> {
  try {
    return await fetchJSON<Project>(`/project/${id}`);
  } catch {
    // Fallback to mock data for demo
    if (id === 'demo') return DEMO_PROJECT;
    throw new Error(`Project ${id} not found`);
  }
}

// ── Floor Plan Upload ────────────────────────────────────────────────────────

export interface UploadResult {
  floor_plan_id: string;
  project_id: string;
  floor_number: number;
  file_path: string;
}

export async function uploadFloorPlan(
  projectId: string,
  file: File,
  floorNumber: number,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('floor_number', String(floorNumber));

  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/project/${projectId}/floor-plan`);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new ApiError(xhr.status, xhr.responseText || 'Upload failed'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
    xhr.send(formData);
  });
}

// ── Processing / Pipeline ────────────────────────────────────────────────────

export async function processUnits(
  projectId: string,
  units: { polygon: number[][]; floor_number: number; unit_type: string }[],
): Promise<{ units_created: number; unit_ids: string[] }> {
  return fetchJSON(`/process/${projectId}`, {
    method: 'POST',
    body: JSON.stringify({ units }),
  });
}

export async function extrudeProject(projectId: string): Promise<unknown> {
  return fetchJSON(`/extrude/${projectId}`, { method: 'POST' });
}

export async function validateProject(projectId: string): Promise<unknown> {
  return fetchJSON(`/validate/${projectId}`, { method: 'POST' });
}

// ── CV Integration ───────────────────────────────────────────────────────────

export interface CvIngestResult {
  project_id: string;
  project: Project;
  floor_reports: {
    floor_id: string;
    floor_number: number;
    units_detected: number;
    source: string;
    scale_px_per_m: number;
  }[];
  total_units_ingested: number;
  validation_summary: Record<string, number>;
}

export async function ingestCvFloors(
  floors: { json: unknown; floor_number: number }[],
  projectName?: string,
  floorHeight?: number,
): Promise<CvIngestResult> {
  return fetchJSON('/cv/ingest', {
    method: 'POST',
    body: JSON.stringify({
      floors,
      project_name: projectName ?? 'Uploaded Building',
      floor_height: floorHeight ?? 3.0,
    }),
  });
}

export async function ingestCvFile(
  file: File,
  floorNumber: number = 0,
  floorHeight: number = 3.0,
  onProgress?: (pct: number) => void,
): Promise<CvIngestResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('floor_number', String(floorNumber));
  formData.append('floor_height', String(floorHeight));

  return new Promise<CvIngestResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/cv/ingest-file`);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new ApiError(xhr.status, xhr.responseText || 'CV ingest failed'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new Error('Cancelled')));
    xhr.send(formData);
  });
}

// ── Fallback / Demo ──────────────────────────────────────────────────────────

export async function runFallbackPipeline(): Promise<Project> {
  // The backend returns the project directly (not wrapped in {project: ...})
  return fetchJSON<Project>('/fallback/run', { method: 'POST' });
}
