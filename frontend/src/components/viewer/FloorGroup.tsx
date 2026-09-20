import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Edges, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Floor, Unit } from '../../data/types';
import { UnitMesh } from './UnitMesh';
import { Staircase } from './Staircase';
import { COMMON_MATERIALS, createExtrudedGeometry } from '../../viewer/scene';
import { createExteriorWalls } from '../../viewer/archGeometry';
import type { Property } from '../../data/types';

interface Props {
  floor: Floor;
  units: Unit[];
  isVisible: boolean;
  isFloorActive: boolean;
  selectedUnitIds: Set<string>;
  hoveredUnitId: string | null;
  onHoverUnit: (id: string | null) => void;
  onClickUnit: (id: string, ctrlKey: boolean) => void;
  onSelectFloor?: (id: string) => void;
  explodeOffset?: number;
  showFloorLabel?: boolean;
  visibleLayers?: Record<string, boolean>;
  projectionMode?: 'isometric' | 'exploded' | 'xray';
  unitPropertyMap?: Map<string, Property>;
}

const SLAB_THICKNESS = 0.28;

// Column grid coordinates matching architectural bay spans
const COLUMN_POSITIONS_BASE = [
  [3.5, 3.5], [10, 3.5], [20, 3.5], [26.5, 3.5],
  [3.5, 9.5], [10, 9.5], [20, 9.5], [26.5, 9.5],
  [3.5, 16],                      [26.5, 16],
  [3.5, 22.5],                    [26.5, 22.5],
];

export function FloorGroup({
  floor,
  units,
  isVisible,
  isFloorActive,
  selectedUnitIds,
  hoveredUnitId,
  onHoverUnit,
  onClickUnit,
  onSelectFloor,
  explodeOffset = 0,
  showFloorLabel = false,
  visibleLayers = { footprint: true, units: true, anchors: true },
  projectionMode = 'isometric',
  unitPropertyMap,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);

  // Smooth vertical offset interpolation for exploded mode
  useFrame((_state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, explodeOffset, 6 * delta);
    }
  });

  // Solid extruded 3D floor slab with real architectural thickness
  const slabGeometry = useMemo(() => {
    return createExtrudedGeometry(floor.footprint, SLAB_THICKNESS);
  }, [floor.footprint]);

  const floorHeight = floor.elevation_top - floor.elevation_base;

  // Filter columns to fit floor footprint
  const floorColumns = useMemo(() => {
    const isTower = floor.floor_number >= 3;
    return COLUMN_POSITIONS_BASE.filter(([_, z]) => !isTower || z <= 10);
  }, [floor.floor_number]);

  // ── Exterior Wall Shell ──
  const exteriorWallGroup = useMemo(() => {
    return createExteriorWalls(
      floor.footprint,
      floorHeight,
      floor.elevation_base,
      isFloorActive ? COMMON_MATERIALS.wallExterior : COMMON_MATERIALS.wallExteriorInactive
    );
  }, [floor.footprint, floorHeight, floor.elevation_base, isFloorActive]);

  const floorCode = floor.floor_number < 0 
    ? `B0${Math.abs(floor.floor_number)}` 
    : floor.floor_number === 0 
      ? 'GF' 
      : `F0${floor.floor_number}`;
  
  const floorCategory = floor.label.includes('—') 
    ? floor.label.split('—')[1].trim().split('&')[0].trim() 
    : floor.label;

  if (!isVisible) return null;

  return (
    <group ref={groupRef} position={[0, explodeOffset, 0]}>
      {/* Real Extruded 3D Architectural Concrete Floor Slab */}
      {visibleLayers.footprint && (
        <mesh
          geometry={slabGeometry}
          material={isFloorActive ? COMMON_MATERIALS.slab : COMMON_MATERIALS.slabInactive}
          position={[0, floor.elevation_base - SLAB_THICKNESS, 0]}
          renderOrder={0}
        >
          {projectionMode === 'xray' && (
            <meshBasicMaterial attach="material" wireframe color="#4a4f4b" />
          )}
          <Edges 
            threshold={15} 
            color={isFloorActive ? '#788f83' : '#2b363c'} 
          />
        </mesh>
      )}

      {/* Vertical Structural Columns */}
      {visibleLayers.footprint && floorColumns.map(([colX, colZ], idx) => (
        <mesh
          key={`col-${floor.id}-${idx}`}
          position={[colX, floor.elevation_base + floorHeight / 2, colZ]}
          material={COMMON_MATERIALS.column}
        >
          <boxGeometry args={[0.32, floorHeight, 0.32]} />
          <Edges threshold={15} color="#45544d" />
        </mesh>
      ))}

      {/* Exterior Wall Shell (raycast disabled) */}
      {visibleLayers.footprint && (
        <group raycast={() => null}>
          <primitive object={exteriorWallGroup} />
        </group>
      )}

      {/* Minimal Architectural Floor Callout Leader Badge */}
      {showFloorLabel && (
        <Html
          position={[28.4, floor.elevation_base + 0.1, 6]}
          distanceFactor={32}
          center={false}
          zIndexRange={[10, 0]}
        >
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onSelectFloor?.(floor.id);
            }}
            className={`cursor-pointer group select-none flex items-center gap-2 font-mono transition-all duration-300 ${
              isFloorActive ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-90'
            }`}
          >
            {/* Leader dot on floor slab edge */}
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
              isFloorActive ? 'bg-primary shadow-[0_0_8px_#c3dd45]' : 'bg-on-surface-variant group-hover:bg-primary'
            }`} />
            
            {/* Leader horizontal line */}
            <div className={`h-[1px] w-6 transition-colors ${
              isFloorActive ? 'bg-primary/80' : 'bg-outline/50 group-hover:bg-primary/60'
            }`} />
            
            <div className="flex flex-col whitespace-nowrap">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold tracking-wider ${
                  isFloorActive ? 'text-primary' : 'text-on-surface group-hover:text-primary'
                }`}>
                  {floorCode}
                </span>
                <span className="text-[9px] text-on-surface-variant uppercase tracking-widest">
                  {floorCategory}
                </span>
              </div>
            </div>
          </div>
        </Html>
      )}

      {/* Architectural Circulation Core Staircase */}
      {visibleLayers.footprint && (
        <Staircase
          elevationBase={floor.elevation_base}
          elevationTop={floor.elevation_top}
          isFloorActive={isFloorActive}
        />
      )}

      {/* Units on this floor (now with doors, windows, interior walls) */}
      {visibleLayers.units && units.map((unit) => (
        <UnitMesh
          key={unit.id}
          unit={unit}
          isFloorActive={isFloorActive}
          isSelected={selectedUnitIds.has(unit.id)}
          isHovered={unit.id === hoveredUnitId}
          onHover={onHoverUnit}
          onClick={onClickUnit}
          projectionMode={projectionMode}
          showAnchors={visibleLayers.anchors}
          property={unitPropertyMap?.get(unit.id)}
        />
      ))}
    </group>
  );
}
