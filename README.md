# 3D ULPIN - Automated 3D Vertical Property Mapping from 2D Building Plans

A 24-hour hackathon project focused on converting 2D building floor plans into a validated, uniquely-identified 3D representation of individual property units.

## Project Structure
```
├── backend/
│   └── app/
│       ├── main.py              # FastAPI application + routes
│       ├── schemas.py           # Pydantic request/response models
│       ├── services.py          # Core processing pipeline
│       ├── fallback_data.py     # Synthetic demo dataset
│       ├── geometry/
│       │   ├── extrusion.py     # 2D→3D extrusion engine
│       │   └── ulpin.py         # ULPIN-style identifier generator
│       ├── validation/
│       │   └── engine.py        # Geometry validation rules
│       └── storage/
│           └── database.py      # SQLite + SQLAlchemy models
├── data/
│   ├── precomputed_fallback/    # Pre-generated demo JSON
│   └── sample_floor_plans/      # Floor plan images (Person 1)
├── tests/
│   └── test_backend.py          # 35 comprehensive tests
├── docs/
│   ├── PRD.md                   # Product Requirements Document
│   ├── API.md                   # API reference
│   ├── ARCHITECTURE.md          # System architecture
│   └── GIS_DESIGN.md            # GIS/geometry specification
├── frontend/                    # React + Three.js (Person 3)
└── README.md
```

## Team

| Person | Role | Responsibility |
|--------|------|---------------|
| Person 1 | AI / Data | CV-based unit detection from floor plans |
| Person 2 | Backend / GIS | FastAPI, extrusion, ULPIN, validation, DB |
| Person 3 | Frontend / 3D | React + Three.js interactive viewer |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Health check |
| `POST` | `/project` | Create project with building metadata |
| `GET` | `/project/{id}` | Full project payload (3D geometry + validation) |
| `POST` | `/project/{id}/floor-plan` | Upload floor plan image |
| `POST` | `/process/{id}` | Ingest detected unit polygons |
| `POST` | `/extrude/{id}` | Re-extrude all units |
| `POST` | `/validate/{id}` | Run validation engine |
| `GET` | `/units/{id}` | Single unit detail |
| `PATCH` | `/units/{id}` | Correct unit polygon |
| `POST` | `/cv/ingest` | Process Person 1's CV floor JSONs |
| `POST` | `/cv/ingest-file` | Process single CV JSON via file upload |
| `POST` | `/fallback/run` | Run full pipeline on synthetic data |

## Key Features

- **3D Extrusion**: 2D polygons → 3D prisms with vertices/faces for Three.js
- **ULPIN-style IDs**: Deterministic identifiers like `PARCEL-001-B01-F02-U03`
- **Validation Engine**: Overlap detection, containment checks, unassigned area, duplicates
- **Basement Support**: Negative elevation for underground units
- **Fallback Pipeline**: Complete demo works offline without CV pipeline

## Documentation
Please refer to the `docs/` folder for system architecture, design decisions, and MVP goals.
