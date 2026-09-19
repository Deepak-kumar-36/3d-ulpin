/**
 * API client with mock-data fallback.
 * When the backend is unavailable, returns data from mockProject.ts.
 */
import type { Project } from '../data/types';
import { DEMO_PROJECT } from '../data/mockProject';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getProject(id: string): Promise<Project> {
  try {
    return await fetchJSON<Project>(`/project/${id}`);
  } catch {
    // Fallback to mock data
    if (id === 'demo') return DEMO_PROJECT;
    return DEMO_PROJECT;
  }
}

export async function createProject(data: {
  name: string;
  parcel_id: string;
  floor_count: number;
  floor_height: number;
  basement_count: number;
}): Promise<{ project_id: string }> {
  try {
    return await fetchJSON('/project', { method: 'POST', body: JSON.stringify(data) });
  } catch {
    return { project_id: 'demo' };
  }
}

export async function runFallbackPipeline(): Promise<Project> {
  try {
    const result = await fetchJSON<{ project: Project }>('/fallback/run', { method: 'POST' });
    return result.project;
  } catch {
    return DEMO_PROJECT;
  }
}
