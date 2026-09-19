# API Specification

## Automated 3D Vertical Property Mapping from 2D Building Plans

**Project Type:** 24-Hour Independent Hackathon Prototype
**Theme:** Urban Planning
**API Version:** 1.0
**Backend:** FastAPI

---

# 1. Purpose

This document defines the REST API contract between the backend/core processing engine and the frontend.

The API provides access to:

* Projects
* Parcels
* Buildings
* Floors
* Units
* Floor plans
* Processing
* Validation
* 3D extrusion
* ULPIN-style identifiers

The API is designed specifically for the hackathon prototype and prioritizes simplicity, predictable responses, and fast local execution.

---

# 2. Base URL

For local development:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

OpenAPI specification:

```text
http://localhost:8000/openapi.json
```

---

# 3. API Conventions

## Request Format

JSON is used for structured requests.

```http
Content-Type: application/json
```

## Response Format

JSON is used for API responses.

## Identifier Format

Resources use string identifiers.

Example:

```text
project_001
building_001
floor_001
unit_001
```

The exact internal UUID/string implementation may vary.

---

# 4. API Overview

```text
POST   /project
GET    /project/{project_id}

POST   /project/{project_id}/floor-plan

POST   /process/{floor_plan_id}

POST   /extrude/{project_id}

POST   /validate/{project_id}

GET    /units/{unit_id}

PATCH  /units/{unit_id}

GET    /health
```

---

# 5. Health Check

## `GET /health`

Checks whether the backend is running.

### Response

```json
{
  "status": "ok"
}
```

### Status Codes

```text
200 OK
```

---

# 6. Create Project

## `POST /project`

Creates a new property-mapping project.

---

## Request

```json
{
  "name": "Demo Vertical Property Project",
  "parcel": {
    "polygon": [
      [0, 0],
      [100, 0],
      [100, 80],
      [0, 80],
      [0, 0]
    ]
  },
  "building": {
    "name": "Building A",
    "floor_height": 3.0,
    "footprint": [
      [10, 10],
      [90, 10],
      [90, 70],
      [10, 70],
      [10, 10]
    ]
  }
}
```

---

## Response

```json
{
  "project_id": "project_001",
  "name": "Demo Vertical Property Project",
  "status": "created",
  "parcel_id": "parcel_001",
  "building_id": "building_001"
}
```

---

## Status Codes

```text
201 Created
400 Bad Request
422 Validation Error
```

---

# 7. Get Project

## `GET /project/{project_id}`

Returns the complete project structure.

---

## Response

```json
{
  "project_id": "project_001",
  "name": "Demo Vertical Property Project",
  "parcel": {
    "id": "parcel_001",
    "polygon": [
      [0, 0],
      [100, 0],
      [100, 80],
      [0, 80],
      [0, 0]
    ],
    "area": 8000
  },
  "building": {
    "id": "building_001",
    "name": "Building A",
    "floor_height": 3.0,
    "footprint": [
      [10, 10],
      [90, 10],
      [90, 70],
      [10, 70],
      [10, 10]
    ],
    "floors": []
  },
  "validation": null
}
```

---

## Status Codes

```text
200 OK
404 Not Found
```

---

# 8. Register Floor Plan

## `POST /project/{project_id}/floor-plan`

Registers a floor plan against a project.

The exact file-upload implementation may use multipart form data.

---

## Request

```text
multipart/form-data
```

Example conceptual fields:

```text
file = floor_plan.png
floor_number = 1
```

Additional metadata may include:

```text
floor_height = 3.0
```

---

## Response

```json
{
  "floor_plan_id": "floorplan_001",
  "project_id": "project_001",
  "floor_number": 1,
  "filename": "floor_plan.png",
  "status": "registered"
}
```

---

## Status Codes

```text
201 Created
400 Bad Request
404 Not Found
```

---

# 9. Process Floor Plan

## `POST /process/{floor_plan_id}`

Runs the floor-plan processing pipeline.

The pipeline may use:

* CV-generated polygons
* Manually supplied polygons
* Synthetic fallback polygons

The API should not expose implementation-specific CV details to the frontend.

---

## Request

The request may optionally provide normalized polygons if the CV pipeline has already processed the image.

```json
{
  "floor_number": 1,
  "units": [
    {
      "polygon": [
        [10, 10],
        [50, 10],
        [50, 40],
        [10, 40],
        [10, 10]
      ],
      "unit_type": "residential"
    },
    {
      "polygon": [
        [50, 10],
        [90, 10],
        [90, 40],
        [50, 40],
        [50, 10]
      ],
      "unit_type": "residential"
    }
  ]
}
```

If no polygons are supplied, the backend may invoke the configured processing pipeline or fallback dataset.

---

## Response

```json
{
  "floor_plan_id": "floorplan_001",
  "project_id": "project_001",
  "floor_number": 1,
  "units_created": 2,
  "units": [
    {
      "unit_id": "unit_001",
      "floor_number": 1,
      "unit_type": "residential",
      "polygon": [
        [10, 10],
        [50, 10],
        [50, 40],
        [10, 40],
        [10, 10]
      ],
      "area": 1200
    },
    {
      "unit_id": "unit_002",
      "floor_number": 1,
      "unit_type": "residential",
      "polygon": [
        [50, 10],
        [90, 10],
        [90, 40],
        [50, 40],
        [50, 10]
      ],
      "area": 1200
    }
  ]
}
```

---

# 10. Generate 3D Extrusion

## `POST /extrude/{project_id}`

Converts validated 2D unit polygons into 3D property volumes.

---

## Optional Request

```json
{
  "floor_height": 3.0
}
```

If omitted, the project-level floor height is used.

---

## Response

```json
{
  "project_id": "project_001",
  "status": "success",
  "units": [
    {
      "unit_id": "unit_001",
      "ulpin": "PARCEL-001-B01-F01-U01",
      "floor_number": 1,
      "base_z": 0,
      "top_z": 3,
      "height": 3,
      "geometry_3d": {
        "vertices": [
          [10, 10, 0],
          [50, 10, 0],
          [50, 40, 0],
          [10, 40, 0],
          [10, 10, 3],
          [50, 10, 3],
          [50, 40, 3],
          [10, 40, 3]
        ],
        "faces": [
          [0, 1, 2, 3],
          [4, 7, 6, 5],
          [0, 4, 5, 1],
          [1, 5, 6, 2],
          [2, 6, 7, 3],
          [3, 7, 4, 0]
        ]
      }
    }
  ]
}
```

---

# 11. Basement Extrusion

Basement units must support negative Z coordinates.

Example:

```json
{
  "unit_id": "unit_b01",
  "floor_number": -1,
  "base_z": -3,
  "top_z": 0,
  "height": 3
}
```

For a second basement:

```json
{
  "unit_id": "unit_b02",
  "floor_number": -2,
  "base_z": -6,
  "top_z": -3,
  "height": 3
}
```

The frontend should render these below the ground plane.

---

# 12. Validate Project

## `POST /validate/{project_id}`

Runs all configured geometry and topology checks.

Checks include:

* Geometry validity
* Unit overlap
* Parcel containment
* Building containment
* Unassigned area
* Duplicate geometry

---

## Response

```json
{
  "project_id": "project_001",
  "status": "warning",
  "geometry_valid": true,
  "overlaps": [],
  "outside_parcel": [],
  "outside_building": [],
  "unassigned_area": 25.4,
  "duplicates": [],
  "issues": [
    {
      "type": "unassigned_area",
      "severity": "warning",
      "message": "25.4 square units remain unassigned."
    }
  ]
}
```

---

# 13. Validation Status

The overall status can be:

```text
valid
warning
error
```

### `valid`

No significant validation issues.

### `warning`

The project can still be processed, but review is recommended.

### `error`

A critical geometry or data issue prevents safe processing.

---

# 14. Validation Issue Structure

Each issue should use:

```json
{
  "type": "overlap",
  "severity": "error",
  "unit_ids": [
    "unit_001",
    "unit_002"
  ],
  "message": "Units overlap on floor 1."
}
```

Possible issue types:

```text
invalid_geometry
overlap
outside_parcel
outside_building
unassigned_area
duplicate
missing_floor
invalid_elevation
```

---

# 15. Get Unit

## `GET /units/{unit_id}`

Returns detailed information about an individual property unit.

---

## Response

```json
{
  "unit_id": "unit_001",
  "ulpin": "PARCEL-001-B01-F01-U01",
  "project_id": "project_001",
  "parcel_id": "parcel_001",
  "building_id": "building_001",
  "floor_number": 1,
  "unit_type": "residential",
  "area": 1200,
  "polygon_2d": [
    [10, 10],
    [50, 10],
    [50, 40],
    [10, 40],
    [10, 10]
  ],
  "base_z": 0,
  "top_z": 3,
  "height": 3,
  "geometry_3d": {
    "vertices": [],
    "faces": []
  },
  "validation_status": "valid"
}
```

---

# 16. Update Unit

## `PATCH /units/{unit_id}`

Allows basic manual correction of unit information.

This supports the human-in-the-loop workflow.

---

## Request

```json
{
  "polygon_2d": [
    [10, 10],
    [48, 10],
    [48, 40],
    [10, 40],
    [10, 10]
  ],
  "unit_type": "residential"
}
```

The backend must revalidate the modified geometry.

If geometry changes affect 3D extrusion, the extrusion should be regenerated.

---

## Response

```json
{
  "unit_id": "unit_001",
  "status": "updated",
  "validation_required": true
}
```

---

# 17. Project Data Response

The main project response should be sufficient for the frontend to construct the complete visualization.

Example:

```json
{
  "project_id": "project_001",
  "name": "Demo Project",

  "parcel": {
    "id": "parcel_001",
    "polygon": []
  },

  "building": {
    "id": "building_001",
    "footprint": [],
    "floor_height": 3,

    "floors": [
      {
        "floor_number": 1,

        "units": [
          {
            "unit_id": "unit_001",
            "ulpin": "PARCEL-001-B01-F01-U01",
            "base_z": 0,
            "top_z": 3,

            "geometry_3d": {
              "vertices": [],
              "faces": []
            }
          }
        ]
      }
    ]
  },

  "validation": {
    "status": "valid",
    "issues": []
  }
}
```

---

# 18. Unit Response Contract

Every frontend-visible unit should expose at least:

```text
unit_id
ulpin
floor_number
unit_type
polygon_2d
area
base_z
top_z
height
geometry_3d
validation_status
```

This is the minimum frontend contract.

---

# 19. 3D Geometry Contract

The frontend uses:

```json
{
  "vertices": [
    [x, y, z]
  ],
  "faces": [
    [index1, index2, index3]
  ]
}
```

The frontend must not need to calculate the extrusion itself.

The backend is the authoritative source for generated 3D geometry.

---

# 20. API Error Format

All API errors should follow a predictable structure.

Example:

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project project_001 was not found."
  }
}
```

For validation errors:

```json
{
  "error": {
    "code": "INVALID_GEOMETRY",
    "message": "Unit polygon is invalid."
  }
}
```

---

# 21. Recommended Error Codes

```text
PROJECT_NOT_FOUND
FLOOR_PLAN_NOT_FOUND
UNIT_NOT_FOUND
INVALID_GEOMETRY
INVALID_COORDINATES
INVALID_FLOOR
INVALID_FLOOR_HEIGHT
PROCESSING_FAILED
EXTRUSION_FAILED
VALIDATION_FAILED
DUPLICATE_UNIT
INVALID_REQUEST
```

---

# 22. HTTP Status Codes

Recommended usage:

| Status | Meaning                   |
| ------ | ------------------------- |
| 200    | Successful request        |
| 201    | Resource created          |
| 400    | Invalid request           |
| 404    | Resource not found        |
| 409    | Resource conflict         |
| 422    | Schema validation failure |
| 500    | Unexpected server error   |

The backend should avoid returning `500` for predictable user/data errors.

---

# 23. Processing Lifecycle

The expected API lifecycle is:

```text
POST /project
       │
       ▼
Project Created
       │
       ▼
POST /project/{id}/floor-plan
       │
       ▼
Floor Plan Registered
       │
       ▼
POST /process/{floor_plan_id}
       │
       ▼
2D Units Created
       │
       ▼
POST /validate/{project_id}
       │
       ▼
Geometry Validated
       │
       ▼
POST /extrude/{project_id}
       │
       ▼
3D Units Created
       │
       ▼
GET /project/{project_id}
       │
       ▼
Frontend Visualization
```

---

# 24. Fallback Processing

The API must support the synthetic fallback dataset.

Fallback:

```text
Synthetic polygons
       ↓
POST /process/{floor_plan_id}
       ↓
Normal backend pipeline
       ↓
Validation
       ↓
Identifier generation
       ↓
Extrusion
```

The fallback should not require a separate API architecture.

---

# 25. CV Integration Contract

Person 1's CV system should ultimately provide normalized polygons.

Example:

```json
{
  "floor_number": 2,
  "units": [
    {
      "polygon": [
        [100, 100],
        [300, 100],
        [300, 250],
        [100, 250],
        [100, 100]
      ],
      "unit_type": "residential"
    }
  ]
}
```

The backend then owns:

```text
Geometry
Validation
Identifier
Extrusion
Persistence
```

---

# 26. Frontend Integration

Person 3 should consume the API as follows:

### Load Project

```http
GET /project/{project_id}
```

### Render Parcel

Use:

```text
parcel.polygon
```

### Render Building

Use:

```text
building.footprint
```

### Render Units

For each unit:

```text
unit.geometry_3d.vertices
unit.geometry_3d.faces
```

### Display Unit Information

Use:

```text
unit.unit_id
unit.ulpin
unit.floor_number
unit.unit_type
unit.area
unit.validation_status
```

### Display Validation

Use:

```text
validation.status
validation.issues
```

---

# 27. Floor Visibility

The frontend can implement floor visibility without additional backend requests by filtering the units already returned by the project endpoint.

For example:

```text
Show Floor 1
       ↓
Filter units where floor_number = 1
```

The backend does not need a dedicated floor-visibility endpoint for the prototype.

---

# 28. Basement Visibility

The frontend can identify basement units through negative floor numbers or negative elevation.

Example:

```json
{
  "floor_number": -1,
  "base_z": -3,
  "top_z": 0
}
```

The frontend can provide a basement visibility toggle.

---

# 29. API Idempotency

Where practical, processing the same deterministic input should produce consistent geometry and identifiers.

ULPIN-style identifier generation must be deterministic.

Repeated processing should not unnecessarily create duplicate logical units.

The exact deduplication strategy can remain simple for the prototype.

---

# 30. API Performance

The API is designed for small hackathon datasets.

Expected usage:

* One project
* One building
* A few floors
* A manageable number of units

No distributed processing is required.

---

# 31. API Security

Authentication and authorization are outside the prototype scope.

However:

* Validate all input schemas.
* Validate geometry.
* Reject malformed payloads.
* Avoid exposing internal stack traces.
* Do not store secrets in the repository.
* Do not accept arbitrary executable content.

---

# 32. API Testing

The API should be tested for:

### Health

```text
GET /health
```

### Project

```text
POST /project
GET /project/{id}
```

### Floor Plan

```text
POST /project/{id}/floor-plan
```

### Processing

```text
POST /process/{floor_plan_id}
```

### Validation

```text
POST /validate/{project_id}
```

### Extrusion

```text
POST /extrude/{project_id}
```

### Unit

```text
GET /units/{unit_id}
PATCH /units/{unit_id}
```

---

# 33. Example End-to-End API Flow

## Step 1 — Create Project

```http
POST /project
```

Returns:

```text
project_001
```

---

## Step 2 — Register Floor Plan

```http
POST /project/project_001/floor-plan
```

Returns:

```text
floorplan_001
```

---

## Step 3 — Process

```http
POST /process/floorplan_001
```

Creates:

```text
unit_001
unit_002
unit_003
...
```

---

## Step 4 — Validate

```http
POST /validate/project_001
```

Returns geometry status.

---

## Step 5 — Extrude

```http
POST /extrude/project_001
```

Creates 3D geometry.

---

## Step 6 — Retrieve Project

```http
GET /project/project_001
```

Returns the complete frontend-ready dataset.

---

# 34. Prototype ULPIN Contract

The API exposes the property identifier through:

```text
unit.ulpin
```

Example:

```text
PARCEL-001-B01-F02-U03
```

This identifier is:

* deterministic
* unique within the prototype project
* hierarchical
* traceable to the parent parcel

It is explicitly not an official government ULPIN.

---

# 35. API Versioning

For the hackathon, versioning can remain implicit through the current API.

If explicit versioning becomes necessary, use:

```text
/api/v1/
```

However, do not introduce unnecessary versioning complexity unless the existing implementation requires it.

---

# 36. API Documentation

FastAPI should automatically expose:

```text
/docs
```

and:

```text
/openapi.json
```

The manually maintained `API.md` should describe the intended contract and examples.

The generated OpenAPI specification should remain synchronized with the implementation.

---

# 37. Definition of Done

The API is complete when:

* FastAPI starts successfully.
* `/health` works.
* A project can be created.
* A floor plan can be registered.
* Unit polygons can be processed.
* Validation can be triggered.
* 3D extrusion can be triggered.
* Units can be retrieved.
* Units can be updated.
* A complete project can be retrieved.
* Frontend-ready geometry is returned.
* Basement geometry supports negative Z.
* ULPIN-style identifiers are returned.
* Errors use predictable formats.
* Synthetic fallback processing works.
* API tests pass.
* Swagger/OpenAPI documentation is available.

---

# 38. Scope Boundary

The following are intentionally excluded:

* Authentication
* Authorization
* Rate limiting
* API gateway
* Distributed processing
* Cloud deployment
* Production cadastral integration
* Official ULPIN registry integration
* PostGIS-specific APIs
* Large-scale batch processing

These can be introduced in a future production architecture.
