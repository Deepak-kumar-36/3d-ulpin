import { useMemo } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';
import type { Floor, Unit } from '../../data/types';
import { UnitMesh } from './UnitMesh';
import { MATERIALS } from '../../viewer/scene';

interface Props {
  floor: Floor;
  units: Unit[];
  isVisible: boolean;
  selectedUnitId: string | null;
  hoveredUnitId: string | null;
  onHoverUnit: (id: string | null) => void;
  onClickUnit: (id: string) => void;
  explodeOffset?: number; // For "exploded" view mode
  visibleLayers: Record<string, boolean>;
  projectionMode: 'isometric' | 'exploded' | 'xray';
}

export function FloorGroup({
  floor,
  units,
  isVisible,
  selectedUnitId,
  hoveredUnitId,
  onHoverUnit,
  onClickUnit,
  explodeOffset = 0,
  visibleLayers,
  projectionMode,
}: Props) {
  // Slab geometry
  const slabGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const fp = floor.footprint;
    if (fp && fp.length > 0) {
      shape.moveTo(fp[0][0], fp[0][1]);
      for (let i = 1; i < fp.length; i++) {
        shape.lineTo(fp[i][0], fp[i][1]);
      }
    }
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(Math.PI / 2); // Lay flat
    return geo;
  }, [floor.footprint]);

  if (!isVisible) return null;

  return (
    <group position={[0, explodeOffset, 0]}>
      {/* Floor Slab Plate */}
      {visibleLayers.footprint && (
        <mesh
          geometry={slabGeometry}
          material={MATERIALS.slab}
          position={[0, floor.elevation_base - 0.02, 0]}
          renderOrder={0}
        >
          {projectionMode === 'xray' && (
             <meshBasicMaterial attach="material" wireframe color="#4a4f4b" />
          )}
          <Edges scale={1} threshold={15} color="#c1c8c2" />
        </mesh>
      )}

      {/* Units */}
      {visibleLayers.units && units.map((unit) => (
        <UnitMesh
          key={unit.id}
          unit={unit}
          isSelected={unit.id === selectedUnitId}
          isHovered={unit.id === hoveredUnitId}
          onHover={onHoverUnit}
          onClick={onClickUnit}
          projectionMode={projectionMode}
          showAnchors={visibleLayers.anchors}
        />
      ))}
    </group>
  );
}
