"""Pydantic schemas for API request/response models."""
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


# ── Enums ──────────────────────────────────────────────────────────────────────

class ValidationStatus(str, Enum):
    PASS = "pass"
    WARNING = "warning"
    FAIL = "fail"


# ── Request Schemas ────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    """Create a new project with building metadata."""
    name: str = Field(..., min_length=1, description="Project / building name")
    floor_count: int = Field(..., ge=1, description="Number of above-ground floors")
    floor_height: float = Field(..., gt=0, description="Height per floor in metres")
    basement_count: int = Field(0, ge=0, description="Number of basement levels")
    parcel_id: str = Field(..., min_length=1, description="Mock parent 2D parcel reference")
    parcel_boundary: List[List[float]] = Field(
        default=None,
        description="Parcel boundary polygon as [[x,y], ...]. Auto-generated if omitted.",
    )


class UnitPolygonInput(BaseModel):
    """Single unit polygon coming from CV pipeline or manual entry."""
    polygon: List[List[float]] = Field(..., description="Ring of [x,y] coords")
    floor_number: int = Field(..., description="Floor index (negative = basement)")
    unit_type: str = Field("residential", description="Unit type label")


class FloorUnitsInput(BaseModel):
    """Batch of detected unit polygons for a project, typically from Person 1."""
    units: List[UnitPolygonInput]


class UnitPatchInput(BaseModel):
    """Lightweight geometry correction (P1)."""
    polygon: List[List[float]] = Field(..., description="Updated polygon ring")


# ── Response Schemas ───────────────────────────────────────────────────────────

class ProjectResponse(BaseModel):
    project_id: str


class ParcelResponse(BaseModel):
    id: str
    boundary: List[List[float]]


class FloorResponse(BaseModel):
    id: str
    floor_number: int
    footprint: List[List[float]]
    label: Optional[str] = None
    elevation_base: Optional[float] = None
    elevation_top: Optional[float] = None
    unit_count: Optional[int] = None


class ValidationResult(BaseModel):
    id: str
    unit_id: str
    rule: str
    status: ValidationStatus
    message: Optional[str] = None


class UnitResponse(BaseModel):
    id: str
    ulpin_3d: str
    floor_id: str
    floor_number: int
    polygon_2d: List[List[float]]
    vertices: List[List[float]]  # 3D vertices for frontend
    faces: List[List[int]]       # triangle indices for frontend
    area: float
    elevation: float
    height: float
    unit_type: str
    validations: List[ValidationResult] = []


class BuildingResponse(BaseModel):
    id: str
    floor_count: int
    floor_height: float
    basement_count: int


class FullProjectResponse(BaseModel):
    """Complete project payload for the frontend 3D viewer."""
    id: str
    name: str
    parcel: ParcelResponse
    parcel_id: Optional[str] = None
    parcel_boundary: Optional[List[List[float]]] = None
    building: BuildingResponse
    floors: List[FloorResponse]
    units: List[UnitResponse]
    validation_summary: dict


class ExtrudeResponse(BaseModel):
    units_3d: List[UnitResponse]


class ValidateResponse(BaseModel):
    results: List[ValidationResult]
    summary: dict


class ProcessResponse(BaseModel):
    units: List[dict]


class HealthResponse(BaseModel):
    status: str
    version: str


# ── Property Bundling Schemas ──────────────────────────────────────────────────

class PropertyCreate(BaseModel):
    """Create a new property bundle grouping multiple units."""
    name: str = Field(..., min_length=1, description="Property name / title")
    project_id: str = Field(..., description="Project this property belongs to")
    unit_ids: List[str] = Field(..., min_length=1, description="List of unit IDs to include")
    description: str = Field("", description="Optional description")


class PropertyUnitSummary(BaseModel):
    """Lightweight unit info within a property response."""
    id: str
    ulpin_3d: str
    floor_number: int
    area: float
    unit_type: str


class PropertyResponse(BaseModel):
    """Full property detail with associated units."""
    property_id: str
    name: str
    project_id: str
    description: str
    unit_ids: List[str]
    units: List[PropertyUnitSummary]
    total_area: float
    floors: List[str]  # Floor labels containing property units
    created_at: str
    updated_at: str


class PropertyListItem(BaseModel):
    """Summary item for listing properties."""
    property_id: str
    name: str
    unit_count: int
    total_area: float
    created_at: str
