# AI / Computer Vision Design

## Automated 3D Vertical Property Mapping from 2D Building Plans

**Project Type:** 24-Hour Independent Hackathon Prototype
**Theme:** Urban Planning
**AI Architecture Version:** 1.0

---

# 1. Purpose

The AI/CV component converts a 2D architectural floor plan into structured 2D unit polygons that can be processed by the backend.

The output of this component is **not directly a 3D model**.

Instead, the CV pipeline produces normalized 2D geometry that is passed to the Backend/GIS pipeline.

```text
2D Floor Plan
      ↓
Image Preprocessing
      ↓
Structural Feature Extraction
      ↓
Candidate Region Detection
      ↓
Region Filtering
      ↓
Polygon Extraction
      ↓
Polygon Simplification
      ↓
Unit Metadata Assignment
      ↓
Normalized Unit Polygons
      ↓
Backend / GIS Engine
```

---

# 2. AI Strategy

Because this is a 24-hour hackathon with limited labeled training data, the prototype uses **classical computer vision rather than training a custom deep-learning model**.

The primary tools are:

* OpenCV
* NumPy
* Contour analysis
* Thresholding
* Morphological operations
* Connected components / contour detection
* Polygon approximation

The approach is intentionally lightweight and explainable.

---

# 3. Why Classical Computer Vision

A custom deep-learning model would require:

* A labeled floor-plan dataset
* Training time
* Model tuning
* Validation data
* Significant compute
* Additional failure modes

The hackathon does not provide sufficient time or labeled data to justify that complexity.

Instead, architectural floor plans have strong visual structure:

* walls
* enclosed rooms
* boundaries
* repeated lines
* enclosed regions

These structural properties can be exploited using classical image-processing techniques.

---

# 4. Input

The CV pipeline accepts a representative architectural floor-plan image.

Supported prototype inputs may include:

* PNG
* JPG/JPEG
* Other formats supported by the selected image-processing implementation

The prototype assumes the input is reasonably clean and contains a recognizable floor-plan structure.

---

# 5. Input Assumptions

The prototype assumes:

* The floor plan is primarily 2D.
* Walls are represented by visible lines.
* Units/rooms are represented by enclosed regions.
* The image has sufficient contrast.
* The floor plan does not contain excessive visual noise.
* The floor plan is approximately aligned with the image coordinate system.
* One floor plan is processed at a time.

These assumptions are acceptable for the hackathon prototype.

---

# 6. Processing Pipeline

The CV pipeline consists of the following stages:

```text
                  Input Floor Plan
                         │
                         ▼
                 Image Normalization
                         │
                         ▼
                    Grayscale
                         │
                         ▼
                     Denoising
                         │
                         ▼
                    Thresholding
                         │
                         ▼
               Morphological Processing
                         │
                         ▼
               Structural Line Detection
                         │
                         ▼
                 Enclosed Region Detection
                         │
                         ▼
                  Region Filtering
                         │
                         ▼
                   Contour Extraction
                         │
                         ▼
                Polygon Approximation
                         │
                         ▼
                   Polygon Validation
                         │
                         ▼
                 Normalized Output
```

---

# 7. Image Preprocessing

## 7.1 Grayscale Conversion

Convert the input image into a single-channel grayscale representation.

Conceptually:

```text
RGB Image
   ↓
Grayscale Image
```

This simplifies subsequent thresholding and edge/line processing.

---

## 7.2 Noise Reduction

Apply lightweight denoising where necessary.

Possible operations include:

* Gaussian blur
* Median filtering

The implementation should avoid aggressive smoothing because thin architectural lines may be lost.

---

# 8. Thresholding

The grayscale image is converted into a binary representation.

Conceptually:

```text
Grayscale
    ↓
Threshold
    ↓
Binary Image
```

Depending on the floor-plan input, either global or adaptive thresholding may be used.

The implementation should choose the simplest reliable method for the available sample data.

---

# 9. Morphological Processing

Morphological operations can improve the structural representation of the floor plan.

Potential operations:

* Closing
* Opening
* Dilation
* Erosion

The primary purpose is to:

* connect broken wall segments
* reduce small noise
* strengthen structural boundaries

Kernel sizes should remain configurable rather than being scattered as hardcoded constants.

---

# 10. Structural Feature Extraction

Architectural floor plans contain strong linear structures.

The pipeline may use:

* edge detection
* contour detection
* line detection
* connected-component analysis

The goal is not to understand the entire architectural drawing semantically.

The goal is to identify **enclosed regions that can represent candidate property/room areas**.

---

# 11. Enclosed Region Detection

After preprocessing, the system searches for enclosed regions.

Conceptually:

```text
Wall boundaries
       ↓
Enclosed regions
       ↓
Candidate polygons
```

Contours are extracted from the processed image.

Each candidate contour can be evaluated using geometric properties.

---

# 12. Candidate Region Filtering

Not every detected contour represents a valid property unit.

Candidates should therefore be filtered using criteria such as:

* Minimum area
* Maximum area
* Bounding-box dimensions
* Polygon complexity
* Contour hierarchy
* Location relative to the building footprint

The thresholds should be configurable.

Avoid using arbitrary hardcoded values throughout the codebase.

---

# 13. Polygon Extraction

Candidate contours are converted into polygon representations.

A typical representation is:

```json
{
  "polygon": [
    [x1, y1],
    [x2, y2],
    [x3, y3],
    [x4, y4]
  ]
}
```

The polygon coordinates initially correspond to the floor-plan image coordinate system.

---

# 14. Polygon Simplification

Raw contours may contain excessive points.

Use polygon approximation to simplify them while preserving the overall shape.

Conceptually:

```text
Raw Contour
     ↓
Approximation
     ↓
Simplified Polygon
```

The simplification tolerance should be configurable.

The goal is to reduce unnecessary vertices without significantly changing the detected geometry.

---

# 15. Polygon Validation

Every generated polygon should be checked before being sent to the backend.

Validation includes:

* At least three points
* Non-zero area
* Valid coordinate structure
* No obvious degenerate geometry

Backend validation remains authoritative.

The CV stage performs preliminary validation to avoid sending obviously invalid geometry downstream.

---

# 16. Coordinate Normalization

The CV system operates initially in image coordinates.

Example:

```text
Image Coordinate System

(0,0) ─────────────────► X
  │
  │
  │
  ▼
  Y
```

These coordinates should be normalized into the project's local coordinate representation before being consumed by the GIS/backend layer.

The prototype does not require conversion into real latitude/longitude.

---

# 17. Floor Assignment

The CV component should not attempt to infer complex building-level semantics unnecessarily.

The floor number can be supplied through:

* Project metadata
* User input
* Floor-plan metadata
* Processing configuration

Example:

```json
{
  "floor_number": 2
}
```

The detected polygons are then associated with that floor.

---

# 18. Unit Metadata

The CV pipeline should produce enough metadata for the backend to identify each candidate.

Example:

```json
{
  "polygon": [
    [120, 80],
    [320, 80],
    [320, 240],
    [120, 240]
  ],
  "floor_number": 2,
  "unit_type": "residential"
}
```

Additional metadata may include:

* confidence
* area
* source
* detection method

Confidence is optional for the classical CV prototype and should not be fabricated if the algorithm does not provide a meaningful confidence value.

---

# 19. Standard CV Output Contract

The most important integration requirement is a stable interface between Person 1's CV pipeline and Person 2's backend.

The preferred normalized format is:

```json
{
  "floor_number": 1,
  "units": [
    {
      "polygon": [
        [100, 100],
        [300, 100],
        [300, 250],
        [100, 250]
      ],
      "unit_type": "residential"
    },
    {
      "polygon": [
        [320, 100],
        [520, 100],
        [520, 250],
        [320, 250]
      ],
      "unit_type": "residential"
    }
  ]
}
```

The backend then takes ownership of:

* Geometry validation
* Persistent unit IDs
* ULPIN-style identifiers
* Extrusion
* Validation
* Database storage

---

# 20. Human-in-the-Loop Correction

Automatic CV extraction may produce incorrect boundaries.

Therefore, the architecture supports manual correction.

The intended workflow is:

```text
Floor Plan
    ↓
CV Detection
    ↓
Candidate Polygons
    ↓
Human Review
    ↓
Adjust / Delete / Correct
    ↓
Backend Validation
```

The frontend may allow the operator to:

* Move polygon points
* Adjust boundaries
* Delete incorrect polygons
* Add missing polygons if supported
* Trigger revalidation

The corrected geometry must enter the same backend processing pipeline.

---

# 21. CV Failure Handling

The system must not depend entirely on successful automatic detection.

If CV processing fails:

```text
CV Failure
    ↓
Fallback Dataset
    ↓
Normalized Unit Polygons
    ↓
Backend Pipeline
```

This is essential for the hackathon demonstration.

---

# 22. Synthetic Data Strategy

The project does not require real cadastral or government datasets.

Representative architectural floor plans and synthetic metadata can be used.

Synthetic inputs should contain:

* Building footprint
* Multiple units
* Multiple floors
* Optional basement
* Parent parcel
* Floor height
* Unit metadata

The CV system can operate on representative sample floor plans while the backend can use deterministic polygon fixtures when necessary.

---

# 23. Basement Handling

Basement geometry does not need to be discovered by CV.

For the prototype:

```text
Above-Ground Floor
        ↓
CV-assisted detection

Basement
        ↓
Synthetic / predefined geometry
```

The backend then assigns the appropriate negative Z elevation.

Example:

```text
Basement 1
base_z = -3
top_z = 0
```

This avoids introducing an unnecessary CV failure point while preserving the required underground-property functionality.

---

# 24. AI/CV Module Structure

A practical implementation can use:

```text
cv/
├── preprocessing.py
├── thresholding.py
├── morphology.py
├── detection.py
├── contours.py
├── polygon.py
├── normalization.py
└── pipeline.py
```

The exact structure may be adapted to the existing project structure.

---

# 25. Main Processing Interface

The CV pipeline should expose a simple high-level function.

Conceptually:

```python
process_floor_plan(image_path, floor_number)
```

Output:

```python
[
    {
        "polygon": [...],
        "floor_number": 1,
        "unit_type": "residential"
    }
]
```

The backend should not need to know how the polygon was detected.

---

# 26. Determinism

Given the same input and processing configuration, the CV pipeline should produce consistent results wherever possible.

Avoid:

* unnecessary randomness
* nondeterministic sampling
* random unit assignment

Determinism is important for debugging and reliable demonstrations.

---

# 27. Performance Requirements

The CV system is intended for individual floor-plan processing.

It does not need to support:

* city-scale batch processing
* real-time video
* continuous drone streams
* large-scale distributed inference

The target is rapid processing of a representative floor plan during the hackathon demonstration.

---

# 28. Explainability

One advantage of the classical CV approach is that intermediate stages can be visualized.

Useful debug outputs include:

```text
Original Image
       ↓
Grayscale
       ↓
Binary
       ↓
Morphology
       ↓
Contours
       ↓
Candidate Regions
       ↓
Final Polygons
```

This makes the system easier to debug and explain during judging.

---

# 29. Failure Modes

Potential CV failure cases include:

### Broken walls

A wall boundary may not form a closed region.

**Mitigation:** morphological closing and preprocessing.

### Excessive text

Labels and dimensions may be detected as contours.

**Mitigation:** area, shape, and hierarchy filtering.

### Very small regions

Furniture or symbols may appear as candidate regions.

**Mitigation:** minimum-area filtering.

### Complex floor plans

The classical approach may fail on highly complex plans.

**Mitigation:** manual correction and synthetic fallback.

### Poor image quality

Low-resolution or noisy images may reduce detection quality.

**Mitigation:** preprocessing and fallback dataset.

---

# 30. What This Prototype Does NOT Claim

The CV system does not claim:

* Full architectural understanding
* Perfect room classification
* General-purpose floor-plan understanding
* Official cadastral boundary extraction
* Official government property mapping
* Production-grade AI accuracy
* Autonomous legal property registration

It is a hackathon prototype demonstrating the technical feasibility of converting structured 2D floor-plan information into vertically organized property geometry.

---

# 31. Future AI Architecture

A production-scale system could replace or augment the classical CV pipeline with trained models.

Potential future pipeline:

```text
Floor Plan
    ↓
Deep Learning Detection
    ↓
Wall / Room / Unit Segmentation
    ↓
Semantic Classification
    ↓
Vectorization
    ↓
Topology Correction
    ↓
GIS Processing
```

Potential model capabilities could include:

* Wall detection
* Room segmentation
* Unit classification
* Door/window recognition
* Architectural symbol recognition
* Floor-plan semantic understanding

These are intentionally outside the 24-hour prototype.

---

# 32. AI/CV Definition of Done

The AI/CV component is complete when:

* A representative floor plan can be loaded.
* The image can be preprocessed.
* Candidate enclosed regions can be detected.
* Candidate regions can be filtered.
* Contours can be converted into polygons.
* Polygons can be simplified.
* Polygon output follows the agreed schema.
* Floor metadata can be attached.
* Output can be consumed by the backend.
* A synthetic fallback exists.
* Intermediate processing can be debugged.
* The complete CV → backend pipeline can execute successfully.

---

# 33. Final Architecture

The complete AI integration is:

```text
                  2D Floor Plan
                        │
                        ▼
                Image Preprocessing
                        │
                        ▼
                   Binary Image
                        │
                        ▼
                Morphological Cleanup
                        │
                        ▼
               Structural Detection
                        │
                        ▼
                 Contour Detection
                        │
                        ▼
                Candidate Filtering
                        │
                        ▼
                Polygon Simplification
                        │
                        ▼
                Polygon Validation
                        │
                        ▼
                Coordinate Normalization
                        │
                        ▼
                 Standard CV Output
                        │
                        ▼
              ┌──────────────────────┐
              │     Backend / GIS    │
              └──────────┬───────────┘
                         │
              ┌──────────┴───────────┐
              ▼                      ▼
        Live CV Output        Synthetic Fallback
              │                      │
              └──────────┬───────────┘
                         ▼
                  Common Processing
                         │
                         ▼
                    Validation
                         │
                         ▼
                  ULPIN-style ID
                         │
                         ▼
                     3D Extrusion
```

The AI/CV layer is therefore a modular input-processing component rather than the owner of the complete property-mapping pipeline.
