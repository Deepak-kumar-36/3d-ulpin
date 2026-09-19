# GIS Design

## Automated 3D Vertical Property Mapping from 2D Building Plans

**Project Type:** 24-Hour Independent Hackathon Prototype
**Theme:** Urban Planning
**GIS Design Version:** 1.0

---

# 1. Purpose

The GIS layer converts detected 2D property-unit polygons into validated spatial objects and then generates simple 3D property volumes.

The GIS pipeline is responsible for:

* Polygon representation
* Geometry validation
* Spatial relationships
* Parcel containment
* Unit overlap detection
* Unassigned-area calculation
* Duplicate detection
* Coordinate normalization
* 3D extrusion
* GeoJSON-compatible serialization

The system uses a **local/arbitrary coordinate system** for the hackathon prototype.

It does not attempt to represent official geographic coordinates.

---

# 2. GIS Processing Pipeline

```text id="c8r4mm"
2D Unit Polygons
       │
       ▼
Coordinate Normalization
       │
       ▼
Shapely Geometry
       │
       ▼
Geometry Validation
       │
       ├── Validity
       ├── Containment
       ├── Overlap
       ├── Duplicates
       └── Unassigned Area
       │
       ▼
Validated 2D Geometry
       │
       ▼
Floor Elevation
       │
       ▼
3D Extrusion
       │
       ▼
Vertices + Faces
       │
       ▼
Frontend-ready Geometry
```

---

# 3. Coordinate System

## 3.1 Prototype Coordinate System

The prototype uses a local Cartesian coordinate system.

Coordinates are represented as:

```text
(x, y)
```

where:

* `x` represents horizontal position
* `y` represents vertical/image-plan position
* `z` represents building elevation

Example:

```text id="5r1m3d"
          Y
          ↑
          │
          │
          │
          └──────────────→ X
        (0,0)
```

No real latitude/longitude is required.

---

# 4. Why Local Coordinates Are Used

Real cadastral systems may require:

* Geographic CRS
* Projected CRS
* GNSS coordinates
* Survey control points
* CORS corrections
* Coordinate transformations

These are intentionally outside the 24-hour prototype.

Local coordinates provide:

* Simpler geometry
* Deterministic processing
* Easier synthetic data generation
* Easier 3D extrusion
* Fewer dependencies
* Faster implementation

---

# 5. Geometry Representation

The basic spatial unit is a 2D polygon.

Example:

```json id="6rqk0r"
{
  "type": "Polygon",
  "coordinates": [
    [
      [100, 100],
      [300, 100],
      [300, 250],
      [100, 250],
      [100, 100]
    ]
  ]
}
```

The polygon is represented using the standard GeoJSON polygon convention.

The first and last coordinate should match to close the ring.

---

# 6. Polygon Model

Each property unit contains:

```text id="r0uvbt"
Unit
├── unit_id
├── floor_number
├── unit_type
├── polygon_2d
├── area
├── base_z
├── top_z
├── height
├── geometry_3d
└── ulpin_style_id
```

The backend is responsible for calculating derived spatial values such as area and extrusion coordinates.

---

# 7. Shapely Geometry

Shapely is the primary geometry-processing library.

Typical processing:

```python
from shapely.geometry import Polygon

polygon = Polygon([
    (100, 100),
    (300, 100),
    (300, 250),
    (100, 250)
])
```

The backend should use Shapely objects internally and serialize them only when communicating with the API or storing them.

---

# 8. Geometry Validity

Every polygon must be checked before being accepted.

Primary check:

```python
polygon.is_valid
```

Additional checks:

* At least 3 distinct points
* Non-zero area
* No malformed coordinates
* No invalid ring structure

Example:

```text id="3u6p6u"
Valid Polygon
      ↓
Continue

Invalid Polygon
      ↓
Repair if safe
      ↓
Otherwise report error
```

---

# 9. Geometry Repair

Simple invalid geometries may be repaired where safe.

The repair process must not silently alter geometry in a way that changes the intended property boundary significantly.

If safe repair is not possible:

```text id="0xgjpx"
Invalid Geometry
      ↓
Validation Error
      ↓
Human Review
```

The system should report the affected unit.

---

# 10. Area Calculation

Unit area is calculated from the 2D polygon.

Example:

```python
area = polygon.area
```

Because the prototype uses a local coordinate system, the interpretation of the area depends on the synthetic coordinate scale.

For hackathon data, coordinates should be generated consistently so that relative area comparisons remain meaningful.

---

# 11. Parcel Geometry

Each project contains a parent parcel polygon.

Conceptually:

```text id="yr2p2f"
┌─────────────────────────────┐
│          PARCEL             │
│                             │
│     ┌───────────────┐       │
│     │   BUILDING    │       │
│     │               │       │
│     │  UNIT  UNIT   │       │
│     │  UNIT  UNIT   │       │
│     └───────────────┘       │
│                             │
└─────────────────────────────┘
```

The parcel acts as the top-level 2D spatial boundary.

---

# 12. Building Footprint

The building footprint is a polygon contained within the parcel.

Relationship:

```text id="v3un85"
Parcel
  │
  └── contains Building
          │
          └── contains Units
```

The prototype may use a synthetic building footprint.

---

# 13. Containment Validation

Every unit should be checked against the parent building footprint and/or parcel.

Conceptually:

```text id="xq8cch"
Unit
 │
 ├── inside Building? ──► YES / NO
 │
 └── inside Parcel? ────► YES / NO
```

If a unit extends outside the permitted geometry, it should be reported.

---

# 14. Containment Rule

For each unit:

```python
building.contains(unit)
```

or an equivalent spatial relationship should be used according to the desired boundary semantics.

Boundary-touching cases should be handled deliberately rather than treated as accidental overlaps.

Where necessary, use:

```python
within()
covers()
intersects()
```

based on the intended validation rule.

---

# 15. Overlap Detection

Units belonging to the same floor should normally not overlap unless the overlap is explicitly permitted by the project data model.

For two units:

```text id="1un5mt"
Unit A
   ∩
Unit B
```

If the intersection has meaningful area:

```text
Potential overlap
```

The implementation should distinguish between:

* boundary contact
* actual area overlap

Two adjacent units sharing a wall should not automatically be reported as overlapping.

---

# 16. Overlap Algorithm

For each pair of units on the same floor:

```text id="26w3la"
for each Unit A:
    for each Unit B:
        if A and B are different:
            intersection = A ∩ B

            if intersection area > threshold:
                report overlap
```

The threshold should prevent floating-point noise from generating false positives.

---

# 17. Unassigned Area

The building footprint represents the total spatial area that should be accounted for.

The system calculates the union of the unit polygons.

Conceptually:

```text id="4grx7w"
Building Area
     -
Union(Unit Areas)
     =
Unassigned Area
```

Example:

```text id="0n74g7"
Building = 1000 m²

Units:
300 m²
250 m²
250 m²

Assigned = 800 m²

Unassigned = 200 m²
```

The result should be included in validation output.

---

# 18. Unit Union

For a given floor:

```python
from shapely.ops import unary_union

combined = unary_union(unit_polygons)
```

The difference between the building footprint and combined unit geometry can then be calculated.

Conceptually:

```python
unassigned = building.difference(combined)
```

---

# 19. Unassigned Area Threshold

Small gaps may occur because of:

* rasterization
* polygon simplification
* floating-point precision
* wall thickness
* image-to-vector conversion

Therefore, the system should use a configurable threshold.

Example:

```text id="6k9j5f"
Unassigned area <= threshold
       ↓
Acceptable

Unassigned area > threshold
       ↓
Warning
```

The threshold should be documented and easy to modify.

---

# 20. Duplicate Detection

Two units may accidentally receive identical or near-identical geometry.

Duplicate detection can compare:

* normalized geometry
* area
* centroid
* bounding box
* floor number

A simple prototype approach is:

```text id="3n0s73"
Same floor
+
Nearly identical geometry
=
Potential duplicate
```

Duplicate detection should generate a validation warning rather than silently deleting data.

---

# 21. Geometry Normalization

Before spatial comparison, geometry should be normalized where necessary.

Potential normalization steps:

* Coordinate precision normalization
* Polygon orientation consistency
* Removing redundant points
* Closing polygon rings
* Simplifying excessive vertices

Normalization should preserve the intended geometry.

---

# 22. Floor Representation

Each floor has:

```text id="h8i3sg"
floor_number
floor_height
base_z
top_z
```

For a constant floor height:

```text id="6c1ylp"
base_z = floor_number × floor_height
top_z = base_z + floor_height
```

The exact implementation should account for the project's ground-floor convention.

---

# 23. Ground Floor Convention

The prototype treats the ground floor as:

```text id="a6t6c9"
base_z = 0
```

With a 3-meter floor height:

```text id="z2pvfg"
Ground:
0 → 3

Floor 1:
3 → 6

Floor 2:
6 → 9
```

The system should store the actual floor number separately from the calculated elevation.

This avoids confusing semantic floor labels with physical elevation.

---

# 24. Basement Elevation

Basements use negative Z.

Example:

```text id="w7f1aq"
Basement 2:
-6 → -3

Basement 1:
-3 → 0

Ground:
0 → 3
```

The elevation calculation should be deterministic.

---

# 25. 3D Extrusion

The extrusion engine converts a polygon into a prism.

Given:

```text
Polygon P
base_z
top_z
```

create:

```text id="av2wbf"
Bottom Polygon
     +
Top Polygon
     +
Side Faces
     =
3D Prism
```

---

# 26. Vertex Generation

For every 2D coordinate:

```text
(x, y)
```

create two 3D vertices:

```text
(x, y, base_z)
(x, y, top_z)
```

For a polygon with `N` points:

```text
N bottom vertices
+
N top vertices
=
2N vertices
```

---

# 27. Face Generation

The 3D prism consists of:

* Bottom face
* Top face
* Side faces

For a polygon with vertices:

```text
P0, P1, P2, ... Pn
```

each edge:

```text
Pi → P(i+1)
```

creates a vertical side face.

---

# 28. Frontend Geometry Contract

The backend should expose geometry in a format that Three.js/R3F can consume easily.

Example:

```json id="qk5m0h"
{
  "vertices": [
    [0, 0, 0],
    [10, 0, 0],
    [10, 10, 0],
    [0, 10, 0],
    [0, 0, 3],
    [10, 0, 3],
    [10, 10, 3],
    [0, 10, 3]
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
```

The exact face winding should remain consistent.

---

# 29. GeoJSON and 3D Geometry

GeoJSON is appropriate for representing 2D spatial features and metadata.

For the prototype:

* 2D polygons → GeoJSON-compatible representation
* 3D prism → vertices/faces representation

Do not force the 3D mesh into an unnecessarily complicated GeoJSON structure.

The frontend should receive a representation optimized for rendering.

---

# 30. Spatial Relationships

The GIS engine should support the following relationships:

```text id="y1w7j6"
Parcel
 │
 ├── contains Building
 │
 └── contains Units

Building
 │
 └── contains Units

Units on same floor
 │
 ├── adjacent
 ├── separate
 └── overlapping
```

These relationships form the basis of topology validation.

---

# 31. Multi-Floor Geometry

The same 2D coordinate region may exist on multiple floors.

This is valid because the actual 3D volume differs in Z.

Example:

```text id="j9w4o6"
Floor 1
Unit A
Z = 0 → 3

Floor 2
Unit A
Z = 3 → 6
```

The system must not treat vertically stacked units on different floors as 2D duplicates.

Duplicate and overlap checks should therefore consider floor/elevation.

---

# 32. Vertical Separation

Two units with identical 2D footprints can still represent different properties if they occupy different vertical ranges.

Example:

```text id="2b4h2w"
Unit A:
XY = Polygon A
Z = 0 → 3

Unit B:
XY = Polygon A
Z = 3 → 6

Result:
No 3D overlap.
```

This is one of the key reasons for moving from 2D parcel representation to a 3D property model.

---

# 33. 3D Overlap Consideration

For the prototype, primary overlap validation occurs between units on the same floor.

Vertical separation is represented using:

```text
base_z
top_z
```

Future versions may perform full 3D intersection tests between arbitrary volumes.

This is not required for the 24-hour prototype.

---

# 34. Geometry Precision

The prototype should use consistent numerical precision.

Avoid unnecessary repeated conversions between:

* integers
* strings
* floats

Coordinate precision may be normalized before persistence.

The exact precision should be configured centrally where practical.

---

# 35. Synthetic GIS Dataset

The synthetic dataset should include:

* One parent parcel
* One building footprint
* Multiple floors
* Multiple units per floor
* One or more basement levels
* Deliberate valid geometry
* Optional invalid examples for testing

Example:

```text id="8b0t6n"
Parcel
└── Building
    ├── Basement
    │   ├── B1-U1
    │   └── B1-U2
    │
    ├── Ground
    │   ├── G-U1
    │   ├── G-U2
    │   └── G-U3
    │
    ├── Floor 1
    │   ├── F1-U1
    │   ├── F1-U2
    │   └── F1-U3
    │
    └── Floor 2
        ├── F2-U1
        └── F2-U2
```

---

# 36. Example Synthetic Geometry

Parent parcel:

```text
[(0,0), (100,0), (100,80), (0,80)]
```

Building:

```text
[(10,10), (90,10), (90,70), (10,70)]
```

Example units:

```text
Unit 1:
[(10,10), (50,10), (50,40), (10,40)]

Unit 2:
[(50,10), (90,10), (90,40), (50,40)]

Unit 3:
[(10,40), (50,40), (50,70), (10,70)]

Unit 4:
[(50,40), (90,40), (90,70), (50,70)]
```

These simple geometries provide a reliable demonstration dataset.

---

# 37. GIS Validation Output

A validation response should contain structured information.

Example:

```json id="0q8o4y"
{
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
      "message": "25.4 square units remain unassigned."
    }
  ]
}
```

Possible overall statuses:

```text
valid
warning
error
```

The exact status semantics should be consistent across the backend.

---

# 38. Geometry Error Severity

Recommended severity:

### Error

Used when the geometry cannot be safely processed.

Examples:

* Invalid polygon
* Missing coordinates
* Unit outside required spatial boundary

### Warning

Used when processing can continue but the dataset may require review.

Examples:

* Small unassigned area
* Potential duplicate
* Minor geometry discrepancy

### Valid

No significant geometry issues detected.

---

# 39. Human Correction

The GIS architecture supports corrected geometry.

Corrected geometry follows:

```text id="l8pj36"
Original Polygon
      ↓
Human Correction
      ↓
Updated Polygon
      ↓
Validation
      ↓
Extrusion
```

The backend must re-run relevant validation after a geometry update.

---

# 40. GIS Service Structure

A practical implementation may use:

```text id="q9c9hx"
gis/
├── geometry.py
├── topology.py
├── extrusion.py
├── geojson.py
└── coordinates.py
```

Services may then consume these utilities:

```text
services/
├── geometry_service.py
├── validation_service.py
└── extrusion_service.py
```

The exact organization can follow the existing repository architecture.

---

# 41. Performance

The prototype operates on small floor plans and a limited number of units.

Therefore:

* straightforward Shapely operations are sufficient
* pairwise overlap checking is acceptable
* unary union is acceptable
* SQLite is sufficient

Spatial indexing and advanced optimization are unnecessary for the hackathon scope.

---

# 42. GIS Security / Integrity

Geometry received through an API should not be trusted blindly.

Validate:

* coordinate structure
* numeric values
* polygon structure
* project ownership within the local application context
* allowed geometry size

Do not execute arbitrary geometry expressions supplied by clients.

---

# 43. Production Extensions

Future GIS architecture could introduce:

* PostGIS
* Real CRS transformations
* GNSS/CORS coordinates
* Parcel cadastral layers
* Multi-building support
* City-scale spatial indexing
* LiDAR-derived terrain
* DSM/DEM
* 3D spatial databases
* Full 3D topology validation
* Real cadastral registry integration

These are outside the hackathon implementation.

---

# 44. GIS Definition of Done

The GIS component is complete when:

* 2D polygons can be represented.
* Polygon validity can be checked.
* Parcel/building containment works.
* Unit overlaps can be detected.
* Unassigned area can be calculated.
* Duplicate geometry can be identified.
* Multiple floors are supported.
* Basement geometry uses negative Z.
* 2D polygons can be extruded into 3D.
* Vertices and faces are generated consistently.
* Geometry can be serialized for the API.
* Synthetic geometry can execute end-to-end.
* Corrected geometry can be revalidated.

---

# 45. Final GIS Architecture

```text id="h5k9s8"
                  2D Unit Polygon
                         │
                         ▼
                Coordinate Normalization
                         │
                         ▼
                  Shapely Polygon
                         │
                         ▼
                Geometry Validation
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
        Containment    Overlap    Duplicate
             │           │           │
             └───────────┼───────────┘
                         ▼
                  Unassigned Area
                         │
                         ▼
                  Validated Geometry
                         │
                         ▼
                  Floor Elevation
                         │
                         ▼
                    3D Extrusion
                         │
                  ┌──────┴──────┐
                  ▼             ▼
             Vertices         Faces
                  │             │
                  └──────┬──────┘
                         ▼
                Frontend Geometry
```

The GIS layer therefore acts as the spatial intelligence core between CV-generated 2D information and the final interactive 3D property representation.
