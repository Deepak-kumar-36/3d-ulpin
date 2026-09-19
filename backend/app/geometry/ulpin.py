"""
ULPIN-style 3D Property Identifier Generator.

Produces deterministic, unique identifiers of the form:

    <PARCEL_ID>-B<building>-F<floor>-U<unit>

Example:  PARCEL-001-B01-F02-U03

This is a *prototype* identifier for the hackathon — NOT an official
government ULPIN implementation.  The design ensures:
  • Uniqueness within a project
  • Determinism (same inputs → same ID)
  • Parent-parcel traceability
"""
from typing import Dict


# Module-level counter cache keyed by project_id to ensure uniqueness across
# calls within the same process lifetime.
_project_counters: Dict[str, Dict[str, int]] = {}


def generate_ulpin(
    parcel_id: str,
    building_index: int,
    floor_number: int,
    unit_index: int,
) -> str:
    """
    Generate a deterministic ULPIN-style 3D property identifier.

    Args:
        parcel_id:      Mock parent parcel reference (e.g. "PARCEL-001").
        building_index: Building number within the parcel (1-based).
        floor_number:   Floor number (negative for basements).
        unit_index:     1-based unit index within the floor.

    Returns:
        A string like "PARCEL-001-B01-F02-U03".
    """
    # Floor label: use "B" prefix for basements for readability
    if floor_number < 0:
        floor_label = f"BF{abs(floor_number):02d}"
    elif floor_number == 0:
        floor_label = "GF"
    else:
        floor_label = f"F{floor_number:02d}"

    return (
        f"{parcel_id}"
        f"-B{building_index:02d}"
        f"-{floor_label}"
        f"-U{unit_index:02d}"
    )


def reset_counters() -> None:
    """Clear counter state (for testing)."""
    _project_counters.clear()
