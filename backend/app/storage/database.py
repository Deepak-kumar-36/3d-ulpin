"""
SQLite database layer using SQLAlchemy ORM.

All geometry columns store GeoJSON-compatible JSON strings.
Spatial operations are handled in-application via Shapely, not in the DB.
"""
from sqlalchemy import create_engine, Column, String, Float, Integer, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
import os

DATABASE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
os.makedirs(DATABASE_DIR, exist_ok=True)
DATABASE_URL = f"sqlite:///{os.path.join(DATABASE_DIR, 'ulpin.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── ORM Models ─────────────────────────────────────────────────────────────────

class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    parcel_id = Column(String, ForeignKey("parcels.id"), nullable=False)

    parcel = relationship("ParcelModel", back_populates="projects")
    building = relationship("BuildingModel", uselist=False, back_populates="project",
                            cascade="all, delete-orphan")


class ParcelModel(Base):
    __tablename__ = "parcels"

    id = Column(String, primary_key=True)
    boundary = Column(Text, nullable=False)  # JSON list of [x,y]

    projects = relationship("ProjectModel", back_populates="parcel")


class BuildingModel(Base):
    __tablename__ = "buildings"

    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    floor_count = Column(Integer, nullable=False)
    floor_height = Column(Float, nullable=False)
    basement_count = Column(Integer, default=0)

    project = relationship("ProjectModel", back_populates="building")
    floors = relationship("FloorModel", back_populates="building",
                          cascade="all, delete-orphan")


class FloorModel(Base):
    __tablename__ = "floors"

    id = Column(String, primary_key=True)
    building_id = Column(String, ForeignKey("buildings.id"), nullable=False)
    floor_number = Column(Integer, nullable=False)
    footprint = Column(Text, nullable=False)  # JSON list of [x,y]

    building = relationship("BuildingModel", back_populates="floors")
    units = relationship("UnitModel", back_populates="floor",
                         cascade="all, delete-orphan")


class UnitModel(Base):
    __tablename__ = "units"

    id = Column(String, primary_key=True)
    floor_id = Column(String, ForeignKey("floors.id"), nullable=False)
    ulpin_3d = Column(String, nullable=False, unique=True)
    polygon_2d = Column(Text, nullable=False)  # JSON list of [x,y]
    vertices = Column(Text, nullable=False)     # JSON list of [x,y,z]
    faces = Column(Text, nullable=False)        # JSON list of [i,j,k]
    area = Column(Float, nullable=False)
    elevation = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    unit_type = Column(String, default="residential")

    floor = relationship("FloorModel", back_populates="units")
    validations = relationship("ValidationModel", back_populates="unit",
                               cascade="all, delete-orphan")


class ValidationModel(Base):
    __tablename__ = "validations"

    id = Column(String, primary_key=True)
    unit_id = Column(String, ForeignKey("units.id"), nullable=False)
    rule = Column(String, nullable=False)
    status = Column(String, nullable=False)  # pass / warning / fail
    message = Column(String)

    unit = relationship("UnitModel", back_populates="validations")


# ── Helpers ────────────────────────────────────────────────────────────────────

def init_db():
    """Create all tables. Safe to call multiple times."""
    Base.metadata.create_all(bind=engine)


def drop_db():
    """Drop all tables (test helper)."""
    Base.metadata.drop_all(bind=engine)


def get_db():
    """FastAPI dependency that yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
