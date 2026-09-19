import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCursor } from '@react-three/drei';
import { Outlines } from '@react-three/drei';
import type { Unit } from '../../data/types';
import { createExtrudedGeometry, getUnitMaterial, getOutlineColor } from '../../viewer/scene';

interface Props {
  unit: Unit;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

export function UnitMesh({ unit, isSelected, isHovered, onHover, onClick }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Compute geometry only once per unit
  const geometry = useMemo(() => {
    return createExtrudedGeometry(unit.polygon_2d, unit.height);
  }, [unit.polygon_2d, unit.height]);

  const material = getUnitMaterial(unit, isSelected);
  const outlineColor = getOutlineColor(unit, isSelected);

  // Hover state cursor
  useCursor(isHovered, 'pointer', 'auto');

  // Offset geometry by unit's base elevation
  return (
    <group position={[0, unit.elevation, 0]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onClick={(e) => {
          e.stopPropagation();
          onClick(unit.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(unit.id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
        }}
        renderOrder={1}
      >
        <Outlines thickness={isSelected ? 0.04 : 0.02} color={outlineColor} />
      </mesh>
    </group>
  );
}
