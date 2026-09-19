# System Architecture

## Automated 3D Vertical Property Mapping from 2D Building Plans

**Project Type:** 24-Hour Independent Hackathon Prototype
**Theme:** Urban Planning
**Architecture Version:** 1.0

---

## 1. Overview

The system converts a conventional 2D building/floor plan into a structured 3D representation of vertically separated property units.

The prototype accepts a 2D floor plan and basic building metadata, extracts or receives unit boundaries, converts those boundaries into structured polygons, assigns them to floors, validates their geometry, generates deterministic ULPIN-style property identifiers, and extrudes the 2D polygons into 3D property volumes.

The system is intentionally designed for a 24-hour hackathon and therefore uses:

* Synthetic/representative data
* Local coordinate systems
* Classical computer vision
* Simple geometric extrusion
* SQLite
* FastAPI
* React + Three.js/R3F

The architecture is modular so that real cadastral, GIS, LiDAR, GNSS, CAD, or trained AI inputs can be integrated in a future production system.

---

# 2. High-Level Architecture

```text
                    ┌─────────────────────────┐
                    │      User / Operator     │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   React + TypeScript    │
                    │     Frontend / UI       │
                    └────────────┬────────────┘
                                 │ REST API
                                 ▼
                    ┌─────────────────────────┐
                    │        FastAPI          │
                    │      API Layer          │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
       ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
       │ Processing  │   │   Geometry  │   │ Validation  │
       │   Service   │   │   Service   │   │   Service   │
       └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
              │                  │                  │
              │                  ▼                  │
              │          ┌─────────────┐            │
              │          │  Extrusion  │            │
              │          │   Engine    │            │
              │          └──────┬──────┘            │
              │                 │                   │
              ▼                 ▼                   ▼
       ┌─────────────────────────────────────────────────┐
       │              Core Property Engine               │
       │                                                 │
       │  Floor Assignment │ ULPIN │ Geometry │ Rules   │
       └───────────────────────┬─────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
             ┌─────────────┐       ┌─────────────┐
             │   SQLite    │       │   GeoJSON   │
             │  Database   │       │ / Geometry  │
             └─────────────┘       └─────────────┘
```

---

# 3. End-to-End Processing Pipeline

The central processing pipeline is:

```text
2D Floor Plan
      │
      ▼
Preprocessing
      │
      ▼
Unit Detection
      │
      ▼
2D Unit Polygons
      │
      ▼
Floor Assignment
      │
      ▼
Geometry Normalization
      │
      ▼
Topology Validation
      │
      ├── Overlap
      ├── Containment
      ├── Unassigned Area
      └── Geometry Validity
      │
      ▼
ULPIN-Style Identifier Generation
      │
      ▼
3D Extrusion
      │
      ▼
Persistence
      │
      ▼
FastAPI Response
      │
      ▼
Interactive 3D Visualization
```

---

# 4. Major Components

## 4.1 Frontend

The frontend is responsible for visualization and user interaction.

### Technology

* React
* TypeScript
* Three.js
* React Three Fiber where appropriate

### Responsibilities

* Project interface
* Floor-plan visualization
* 3D building visualization
* Unit selection
* Floor visibility
* Basement visibility
* Unit information
* Validation status
* ULPIN-style identifier display

The frontend does not perform authoritative geometry processing.

Geometry and validation are handled by the backend.

---

# 5. Backend API Layer

FastAPI provides the communication layer between the frontend and the core processing engine.

### Responsibilities

* Receive project data
* Receive floor-plan information
* Trigger processing
* Trigger extrusion
* Trigger validation
* Retrieve project data
* Retrieve unit information
* Update basic unit information
* Return frontend-ready geometry

FastAPI also provides automatic OpenAPI/Swagger documentation.

---

# 6. Processing Service

The processing service coordinates the complete transformation pipeline.

Its responsibility is orchestration rather than implementing every algorithm itself.

Conceptually:

```text
Input
  │
  ├── Floor Plan
  ├── Building Metadata
  └── Unit Polygons
          │
          ▼
    Normalize Input
          │
          ▼
    Assign Floors
          │
          ▼
   Validate Geometry
          │
          ▼
 Generate Property IDs
          │
          ▼
    Create 3D Units
          │
          ▼
       Persist
```

The processing service should remain independent of the specific computer-vision implementation.

This allows either:

* live CV output
* manually corrected polygons
* synthetic fallback polygons

to enter the same processing pipeline.

---

# 7. Geometry Service

The geometry service provides reusable geometric operations.

### Core operations

* Polygon creation
* Polygon validation
* Polygon simplification
* Area calculation
* Intersection
* Containment
* Bounding boxes
* Geometry repair where safe
* Coordinate normalization

The primary geometry library is Shapely.

GeoPandas may be used where tabular geospatial operations provide value.

---

# 8. 3D Extrusion Engine

The extrusion engine converts a 2D unit polygon into a 3D prism.

For each unit:

```text
2D Polygon
     │
     ├── base_z
     │
     └── top_z
           │
           ▼
       3D Prism
```

For a standard floor height:

```text
floor_height = 3m
```

Floor 1:

```text
base_z = 0m
top_z  = 3m
```

Floor 2:

```text
base_z = 3m
top_z  = 6m
```

Floor 3:

```text
base_z = 6m
top_z  = 9m
```

---

# 9. Basement Representation

Basements use negative Z coordinates.

Example:

```text
Ground Floor
0m → +3m

Basement 1
-3m → 0m

Basement 2
-6m → -3m
```

This allows above-ground and underground property units to exist in the same 3D coordinate system.

For the prototype, basement geometry can be provided through synthetic/predefined metadata rather than relying on CV detection.

---

# 10. ULPIN-Style Identifier Service

The system generates a deterministic identifier for each vertical property unit.

Conceptually:

```text
Parent Parcel
     │
     └── Building
          │
          └── Floor
               │
               └── Unit
```

Example:

```text
PARCEL-001-B01-F02-U03
```

The identifier establishes a relationship between:

* Parent parcel
* Building
* Floor
* Individual unit

### Important limitation

The generated identifier is a **prototype ULPIN-style identifier**.

It is not an official government ULPIN implementation and does not claim compatibility with an official cadastral registry.

---

# 11. Validation Engine

The validation engine checks whether the generated property structure is geometrically consistent.

## 11.1 Overlap

Two units on the same floor should not unintentionally overlap.

```text
Unit A ∩ Unit B ≠ ∅
        ↓
Potential overlap
```

The system reports conflicting units.

---

## 11.2 Containment

Units should remain within their parent parcel/building geometry.

```text
Unit Polygon
     ↓
Inside Building?
     ↓
Inside Parcel?
```

Units outside the permitted geometry are flagged.

---

## 11.3 Unassigned Area

The system compares the building footprint with the combined unit coverage.

Example:

```text
Building area = 1000 m²
Unit coverage = 920 m²

Unassigned area = 80 m²
```

This is reported as a validation issue or warning depending on configured thresholds.

---

## 11.4 Geometry Validity

Each polygon is checked for geometric validity.

Invalid polygons may be repaired using safe geometry operations where possible.

---

## 11.5 Duplicate Detection

Duplicate or near-identical units may be detected by comparing their geometry and relevant metadata.

This is considered an additional validation capability.

---

# 12. Persistence Layer

SQLite is used as the prototype database.

The database stores structured project information such as:

* Projects
* Parcels
* Buildings
* Floors
* Units
* Validation results

Geometry can be serialized as JSON/GeoJSON-compatible data.

The prototype does not require PostGIS.

---

# 13. Data Model

The logical hierarchy is:

```text
Project
│
└── Parcel
    │
    └── Building
        │
        ├── Floor
        │   │
        │   └── Unit
        │
        └── ...
```

### Project

Contains the overall hackathon project instance.

### Parcel

Represents the parent 2D property boundary.

### Building

Represents the structure located within the parcel.

### Floor

Represents a vertical level.

### Unit

Represents an independently identifiable property space.

### Validation

Contains the results of geometry/topology checks.

---

# 14. Input Architecture

The backend must support two equivalent input paths.

## Primary Path

```text
Floor Plan
    ↓
Person 1 CV Pipeline
    ↓
Detected Unit Polygons
    ↓
Backend
```

## Fallback Path

```text
Synthetic Dataset
    ↓
Predefined Unit Polygons
    ↓
Backend
```

Both paths converge here:

```text
             ┌───────────────┐
CV Output ──► │               │
             │ Core Backend  │
Synthetic ─► │   Pipeline    │
             │               │
             └───────┬───────┘
                     │
                     ▼
             Validation
                     │
                     ▼
               ULPIN-style ID
                     │
                     ▼
                 Extrusion
```

This architecture ensures that the final demonstration does not depend entirely on successful live CV detection.

---

# 15. Frontend Contract

The backend exposes frontend-ready structured data.

The frontend should receive:

```text
Project
 ├── Parcel
 ├── Building
 │    ├── Floors
 │    │    └── Units
 │    │         ├── 2D Polygon
 │    │         ├── 3D Vertices
 │    │         ├── 3D Faces
 │    │         ├── Base Z
 │    │         ├── Top Z
 │    │         └── ULPIN-style ID
 │    │
 │    └── Metadata
 │
 └── Validation
```

The frontend should not need to reconstruct backend geometry algorithms.

---

# 16. API Architecture

The API is organized around the project lifecycle.

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
Units Generated
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
3D Geometry Generated
        │
        ▼
GET /project/{id}
        │
        ▼
Frontend Visualization
```

---

# 17. Error Handling

The backend should explicitly handle:

* Missing project
* Missing floor plan
* Invalid polygon
* Empty geometry
* Malformed coordinates
* Missing floor information
* Invalid floor height
* Duplicate unit identifiers
* Failed geometry operations
* Invalid request payloads

API responses should provide meaningful error messages without exposing internal stack traces.

---

# 18. Security Model

The hackathon prototype does not process personal or sensitive user data.

Authentication is intentionally outside the scope of the prototype.

The system is intended for:

* Local execution
* Controlled demonstration
* Synthetic/representative data

A production deployment would require authentication, authorization, audit logging, secure storage, and appropriate data governance.

---

# 19. Performance Strategy

The prototype is optimized for hackathon-sized datasets rather than city-scale processing.

Performance priorities are:

1. Reliable processing
2. Low implementation complexity
3. Fast local execution
4. Predictable geometry operations
5. Simple API responses

The system avoids premature optimization and distributed infrastructure.

---

# 20. Failure and Fallback Architecture

The application must always have a demonstrable path.

```text
                 Floor Plan
                    │
                    ▼
              CV Processing
                    │
             ┌──────┴──────┐
             │             │
          Success        Failure
             │             │
             ▼             ▼
        CV Polygons    Fallback Data
             │             │
             └──────┬──────┘
                    ▼
              Core Pipeline
                    │
                    ▼
               Validation
                    │
                    ▼
             Identifier
                    │
                    ▼
                Extrusion
                    │
                    ▼
               3D Output
```

The fallback dataset must be deterministic and locally available.

---

# 21. Deployment Model

For the hackathon:

```text
Local Machine
│
├── React Frontend
│
└── FastAPI Backend
     │
     └── SQLite
```

No cloud infrastructure is required.

The application should be runnable using simple local commands.

---

# 22. Future Production Architecture

The prototype architecture intentionally leaves room for future extensions.

Potential production evolution:

```text
Real Floor Plans / CAD
        +
Drone / LiDAR
        +
GNSS / CORS
        +
Cadastral GIS
        │
        ▼
Data Adapters
        │
        ▼
AI / CV Processing
        │
        ▼
Geospatial Processing
        │
        ▼
PostGIS
        │
        ▼
Property Registry
        │
        ▼
3D Urban Planning Platform
```

These capabilities are intentionally outside the 24-hour prototype.

---

# 23. Architectural Principles

The implementation should follow these principles:

### Simplicity

Prefer the simplest implementation that satisfies the requirement.

### Modularity

Separate API, geometry, validation, extrusion, identification, and persistence.

### Determinism

Synthetic processing and identifier generation should produce repeatable results.

### Interoperability

Use standard polygon/GeoJSON-like representations wherever practical.

### Human-in-the-loop

Allow manually corrected polygons to enter the same backend pipeline as CV-generated polygons.

### Demo Reliability

Always maintain a working synthetic fallback.

### Extensibility

The prototype should provide clean boundaries where future real-world data sources can be integrated.

---

# 24. Definition of Done

The architecture is successfully implemented when:

* A project can be created.
* A parcel and building can be represented.
* Floors and units can be stored.
* Unit polygons can be validated.
* Overlaps can be detected.
* Containment can be checked.
* Unassigned area can be calculated.
* ULPIN-style identifiers can be generated.
* 2D units can be extruded into 3D.
* Basement units support negative Z.
* Results can be persisted in SQLite.
* FastAPI exposes the required endpoints.
* Frontend-ready geometry can be retrieved.
* Synthetic fallback data can execute the complete pipeline.
* Tests verify the core geometry and API behavior.

---

## 25. Scope Boundary

The following are deliberately excluded from the prototype:

* Official ULPIN generation
* Real cadastral integration
* Real government registry integration
* Real LiDAR processing
* Drone data processing
* CAD/DXF processing
* Deep-learning model training
* Multi-building city-scale processing
* PostGIS
* Authentication
* Advanced architectural rendering
* Production cloud infrastructure

These can be addressed in future versions without changing the fundamental architecture.
