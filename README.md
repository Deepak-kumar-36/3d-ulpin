# 3D ULPIN

### Automated 3D Vertical Property Mapping from 2D Building Plans

> A hackathon prototype for transforming conventional 2D building plans into structured, validated, and uniquely identifiable 3D property units.

**Theme:** Urban Planning
**Event:** 24-Hour Independent Hackathon
**Project Status:** Hackathon Prototype

---

## Overview

Traditional property records primarily represent land in two dimensions.

However, modern buildings contain multiple vertically stacked property units:

* Apartments
* Offices
* Commercial units
* Basements
* Other independently identifiable spaces

A conventional 2D parcel boundary cannot adequately represent these vertically separated property units.

**3D ULPIN** addresses this problem by converting a 2D building/floor plan into a structured 3D representation of individual property units.

```text
2D Floor Plan
      ↓
Unit Detection
      ↓
2D Unit Polygons
      ↓
Floor Assignment
      ↓
Geometry Validation
      ↓
3D Extrusion
      ↓
ULPIN-Style Property IDs
      ↓
Interactive 3D Visualization
```

---

# Problem

A traditional 2D property representation can describe:

```text
Where the property is
```

but has difficulty representing:

```text
Which property unit exists
on which floor
at which vertical elevation.
```

For example, a single building may contain:

```text
Floor 3 → Apartment A
Floor 2 → Apartment B
Floor 1 → Apartment C
Ground  → Commercial Unit
Basement → Parking / Storage
```

All of these may occupy the same parent parcel while representing different vertical spaces.

The project demonstrates a way to represent these spaces as structured 3D property units.

---

# Solution

3D ULPIN takes a 2D floor plan and converts it into a vertically structured property model.

The prototype performs:

1. Floor-plan processing
2. Unit-boundary extraction
3. Polygon generation
4. Floor assignment
5. Geometry validation
6. Prototype property identifier generation
7. 3D extrusion
8. Interactive visualization

The architecture is designed so that synthetic/representative inputs can be used during the hackathon while allowing real-world GIS and cadastral data sources to be integrated later.

---

# Key Features

## 2D Floor Plan Processing

The system accepts representative architectural floor plans and extracts candidate enclosed regions using computer-vision techniques.

The prototype primarily uses classical computer vision rather than training a custom deep-learning model.

---

## 2D Property Unit Mapping

Detected regions are converted into structured polygons.

Each unit receives spatial metadata such as:

* Unit ID
* Floor number
* Unit type
* Polygon
* Area

---

## 3D Property Representation

Each 2D polygon is converted into a 3D prism.

Example:

```text
Floor 2

Base Z = 3m
Top Z  = 6m
```

This produces a vertically positioned property volume.

---

## Basement Support

Underground properties are represented using negative Z coordinates.

```text
Ground Floor
0m → +3m

Basement 1
-3m → 0m

Basement 2
-6m → -3m
```

This allows above-ground and underground units to coexist within the same spatial model.

---

## ULPIN-Style Property Identifier

Each unit receives a deterministic prototype identifier.

Example:

```text
PARCEL-001-B01-F02-U03
```

The identifier maintains a relationship between:

```text
Parcel
  ↓
Building
  ↓
Floor
  ↓
Unit
```

### Important

This is a **ULPIN-style prototype identifier** created for the hackathon.

It is **not an official government ULPIN implementation** and does not claim compatibility with an official cadastral registry.

---

## Geometry Validation

The system validates generated property geometry for:

* Invalid polygons
* Overlapping units
* Units outside the parcel/building
* Unassigned building area
* Duplicate geometries

Example:

```text
Building Area
      -
Assigned Unit Area
      =
Unassigned Area
```

---

## Interactive 3D Visualization

The frontend provides a 3D representation of the generated property structure.

Users can inspect:

* Floors
* Individual units
* Basement levels
* Property identifiers
* Geometry validation status

---

# Architecture

```text
                    ┌─────────────────────┐
                    │       User          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ React + TypeScript  │
                    │ Three.js / R3F      │
                    └──────────┬──────────┘
                               │
                               │ REST API
                               ▼
                    ┌─────────────────────┐
                    │       FastAPI       │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
       Processing          GIS Engine       Validation
          Service              │              Engine
             │                 │                 │
             └─────────────────┼─────────────────┘
                               │
                         ┌─────▼─────┐
                         │ 3D Engine │
                         └─────┬─────┘
                               │
                   ┌───────────┴───────────┐
                   ▼                       ▼
               SQLite                  GeoJSON
```

---

# Processing Pipeline

```text
┌──────────────────────┐
│   2D Floor Plan      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  CV Preprocessing    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Unit Detection      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   2D Polygons        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Geometry Validation  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ ULPIN-Style IDs      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   3D Extrusion       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Interactive 3D View  │
└──────────────────────┘
```

---

# Technology Stack

## Frontend

* React
* TypeScript
* Three.js
* React Three Fiber

## Backend

* Python
* FastAPI
* Pydantic

## GIS / Geometry

* Shapely
* GeoPandas
* NumPy

## Computer Vision

* OpenCV

## Database

* SQLite

## Data Representation

* JSON
* GeoJSON-compatible geometry

---

# Project Structure

```text
3d-ulpin/
│
├── frontend/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── gis/
│   │   ├── db/
│   │   └── utils/
│   │
│   ├── data/
│   └── tests/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── AI_DESIGN.md
│   ├── GIS_DESIGN.md
│   ├── API.md
│   ├── DEMO.md
│   ├── DATASET.md
│   ├── TEST_PLAN.md
│   ├── JUDGE_QA.md
│   └── FUTURE_ROADMAP.md
│
├── README.md
└── .gitignore
```

The exact implementation structure may evolve during development while preserving the architectural boundaries defined in the documentation.

---

# Getting Started

## Prerequisites

Recommended environment:

* Python 3.10+
* Node.js 18+
* npm

---

# Backend Setup

Navigate to the backend:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it.

### Linux/macOS

```bash
source .venv/bin/activate
```

### Windows

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start FastAPI:

```bash
uvicorn app.main:app --reload
```

Backend:

```text
http://localhost:8000
```

Swagger documentation:

```text
http://localhost:8000/docs
```

---

# Frontend Setup

Navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will display the local development URL provided by Vite.

---

# API

Core endpoints include:

```text
GET    /health

POST   /project
GET    /project/{project_id}

POST   /project/{project_id}/floor-plan

POST   /process/{floor_plan_id}

POST   /validate/{project_id}

POST   /extrude/{project_id}

GET    /units/{unit_id}

PATCH  /units/{unit_id}
```

Complete API documentation is available in:

```text
docs/API.md
```

FastAPI also provides interactive documentation at:

```text
/docs
```

---

# Synthetic Data

The prototype intentionally uses representative/synthetic data.

The hackathon does not depend on:

* Real cadastral datasets
* Government property databases
* Real GNSS/CORS data
* Real LiDAR datasets
* Drone surveys

The synthetic dataset provides a reliable demonstration path.

This also ensures that the project can run locally without external data dependencies.

---

# Fallback Architecture

A major design requirement is demo reliability.

The system supports:

```text
             Floor Plan
                 │
                 ▼
            CV Pipeline
                 │
           ┌─────┴─────┐
           │           │
        Success      Failure
           │           │
           ▼           ▼
       CV Output   Synthetic Data
           │           │
           └─────┬─────┘
                 ▼
          Common Backend
                 │
                 ▼
            Validation
                 │
                 ▼
          ULPIN-style ID
                 │
                 ▼
             Extrusion
                 │
                 ▼
              3D View
```

Therefore, a CV failure does not prevent the complete application from being demonstrated.

---

# Data Flow

```text
Floor Plan
    │
    ▼
OpenCV
    │
    ▼
2D Unit Polygon
    │
    ▼
Shapely
    │
    ├── Geometry Validation
    ├── Containment
    ├── Overlap
    └── Area
    │
    ▼
Identifier Service
    │
    ▼
3D Extrusion
    │
    ▼
SQLite
    │
    ▼
FastAPI
    │
    ▼
React / Three.js
```

---

# Validation

The system checks:

### Geometry

```text
Is the polygon valid?
```

### Containment

```text
Is the unit inside the building/parcel?
```

### Overlap

```text
Does the unit overlap another unit on the same floor?
```

### Coverage

```text
Is significant building area unassigned?
```

### Duplicates

```text
Are two units geometrically identical or nearly identical?
```

---

# Example Unit

A generated unit may look like:

```json
{
  "unit_id": "unit_001",
  "ulpin": "PARCEL-001-B01-F02-U03",
  "floor_number": 2,
  "unit_type": "residential",
  "area": 1200,
  "base_z": 3,
  "top_z": 6,
  "geometry_3d": {
    "vertices": [],
    "faces": []
  }
}
```

---

# Design Philosophy

The project intentionally follows a practical hackathon architecture.

### Simple

Avoid unnecessary infrastructure.

### Explainable

Use understandable CV and geometry operations.

### Modular

Separate CV, GIS, backend, and visualization.

### Deterministic

Synthetic data and identifier generation should be reproducible.

### Reliable

Maintain a fallback demonstration path.

### Extensible

Allow future integration with real-world geospatial sources.

---

# Current Scope

The prototype supports:

* 2D floor plans
* Multiple floors
* Multiple property units
* Basement representation
* 2D polygon extraction
* Geometry validation
* 3D extrusion
* ULPIN-style identifiers
* Interactive 3D visualization
* Synthetic/fallback data
* Local execution

---

# Out of Scope

The 24-hour prototype does not implement:

* Official ULPIN generation
* Government registry integration
* Real cadastral integration
* Real LiDAR processing
* Drone processing
* CAD/DXF processing
* Deep-learning model training
* PostGIS
* Multi-building city-scale processing
* Authentication
* Cloud infrastructure
* Advanced architectural 3D modeling

These are potential future extensions.

---

# Future Vision

The prototype can eventually evolve into a larger urban-property mapping platform.

```text
                 Real-World Data
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
    Floor Plans      LiDAR          GIS
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                 AI / CV Engine
                       │
                       ▼
                Spatial Engine
                       │
                       ▼
                 3D Property
                  Registry
                       │
                       ▼
              Urban Planning
                 Platform
```

Potential future capabilities include:

* Real cadastral integration
* PostGIS
* Real CRS support
* LiDAR/point-cloud processing
* Drone imagery
* GNSS/CORS integration
* Multi-building mapping
* City-scale property visualization
* Advanced AI-based floor-plan understanding

---

# Project Documentation

Detailed technical documentation:

| Document            | Purpose                           |
| ------------------- | --------------------------------- |
| `ARCHITECTURE.md`   | Complete system architecture      |
| `AI_DESIGN.md`      | Computer vision pipeline          |
| `GIS_DESIGN.md`     | Geometry and spatial processing   |
| `API.md`            | Backend API contract              |
| `DEMO.md`           | Hackathon demonstration flow      |
| `DATASET.md`        | Synthetic and representative data |
| `TEST_PLAN.md`      | Testing strategy                  |
| `JUDGE_QA.md`       | Expected judge questions          |
| `FUTURE_ROADMAP.md` | Future development                |

---

# Hackathon Demo

The recommended demonstration flow is:

```text
1. Show 2D parcel
        ↓
2. Upload/select floor plan
        ↓
3. Show detected unit boundaries
        ↓
4. Validate geometry
        ↓
5. Generate property identifiers
        ↓
6. Extrude into 3D
        ↓
7. Show multiple floors
        ↓
8. Reveal basement using negative Z
        ↓
9. Select a unit
        ↓
10. Display its identifier and metadata
```

The complete demonstration should be achievable in approximately 3–5 minutes.

---

# Important Disclaimer

This project is a hackathon prototype demonstrating an approach to automated 3D vertical property representation.

The generated identifiers are **ULPIN-style prototype identifiers** and are not official government ULPIN values.

The geometry and datasets used in the prototype are representative/synthetic and should not be interpreted as official cadastral records.

---

# Team

This project is designed around three primary workstreams:

### Person 1 — AI / Data / CV

Responsible for:

* Floor-plan preprocessing
* Computer vision
* Unit detection
* Polygon extraction
* Sample data

### Person 2 — Backend / GIS / Core

Responsible for:

* FastAPI
* Data models
* SQLite
* Geometry processing
* 3D extrusion
* Validation
* ULPIN-style identifiers
* API integration

### Person 3 — Frontend / 3D / UX

Responsible for:

* React
* Three.js/R3F
* 3D visualization
* Unit interaction
* Floor controls
* User interface

---

# License

Add the appropriate project license before public release.

---

# Status

**Hackathon Prototype — Implementation in Progress**

The architecture prioritizes a working end-to-end demonstration within a 24-hour development window while keeping clear extension points for future real-world geospatial integration.
