/* ── Domain types matching backend API response shapes (main.py §22–§23) ── */

export interface Project {
  id: string;
  name: string;
  parcel_id: string;
  parcel_boundary: number[][];
  building: Building;
  floors: Floor[];
  units: Unit[];
  properties?: Property[];
  validation_summary: ValidationSummary;
}

export interface Property {
  property_id: string;
  name: string;
  project_id?: string;
  description: string;
  unit_ids: string[];
  total_area: number;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: string;
  floor_count: number;
  floor_height: number;
  basement_count: number;
}

export interface Floor {
  id: string;
  floor_number: number;
  label: string;
  footprint: number[][];
  unit_count: number;
  elevation_base: number;
  elevation_top: number;
}

export interface Unit {
  id: string;
  ulpin_3d: string;
  floor_id: string;
  floor_number: number;
  polygon_2d: number[][];
  vertices: number[][];
  faces: number[][];
  area: number;
  elevation: number;
  height: number;
  unit_type: 'residential' | 'commercial' | 'office' | 'lobby' | 'retail' | 'parking' | 'penthouse';
  validations: Validation[];
}

export interface Validation {
  id: string;
  unit_id: string;
  rule: 'overlap' | 'containment' | 'unassigned_area' | 'duplicate';
  status: 'pass' | 'warning' | 'fail';
  message: string;
}

export interface ValidationSummary {
  total_units: number;
  passed: number;
  warnings: number;
  failures: number;
  rules_checked: string[];
}

export type FloorId = string;

/* ── Processing pipeline stages ── */
export type ProcessingStage =
  | 'uploading'
  | 'detecting'
  | 'generating_3d'
  | 'assigning_ulpins'
  | 'validating'
  | 'ready';

export const PROCESSING_STAGES: { key: ProcessingStage; label: string; icon: string }[] = [
  { key: 'uploading', label: 'Uploading Floor Plan', icon: 'upload_file' },
  { key: 'detecting', label: 'Detecting Unit Boundaries', icon: 'search' },
  { key: 'generating_3d', label: 'Generating 3D Geometry', icon: 'view_in_ar' },
  { key: 'assigning_ulpins', label: 'Assigning ULPIN Identifiers', icon: 'fingerprint' },
  { key: 'validating', label: 'Running Validation Engine', icon: 'verified' },
  { key: 'ready', label: 'Processing Complete', icon: 'check_circle' },
];
