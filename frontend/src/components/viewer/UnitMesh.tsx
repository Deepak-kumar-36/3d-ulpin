import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCursor, Html } from '@react-three/drei';
import { Outlines } from '@react-three/drei';
import type { Unit } from '../../data/types';
import { createExtrudedGeometry, getUnitMaterial, getOutlineColor } from '../../viewer/scene';

interface Props {
  unit: Unit;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
  projectionMode: 'isometric' | 'exploded' | 'xray';
  showAnchors: boolean;
}

export function UnitMesh({ unit, isSelected, isHovered, onHover, onClick, projectionMode, showAnchors }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Compute geometry only once per unit. Shrink height by 0.04 to fix z-fighting
  const geometry = useMemo(() => {
    return createExtrudedGeometry(unit.polygon_2d, Math.max(0.1, unit.height - 0.04));
  }, [unit.polygon_2d, unit.height]);

  const baseMaterial = getUnitMaterial(unit, isSelected);
  
  // Clone material to apply hover/xray effects dynamically
  const material = useMemo(() => {
    const mat = baseMaterial.clone();
    if (projectionMode === 'xray') {
      mat.transparent = true;
      mat.opacity = 0.15;
    } else {
      mat.transparent = true; 
      mat.opacity = isSelected ? 0.9 : isHovered ? 0.8 : 0.6;
      if (isHovered && !isSelected) {
        (mat as THREE.MeshStandardMaterial).color.lerp(new THREE.Color('#ffffff'), 0.2);
      }
    }
    return mat;
  }, [baseMaterial, isHovered, isSelected, projectionMode]);

  const outlineColor = getOutlineColor(unit, isSelected);

  // Hover state cursor
  useCursor(isHovered, 'pointer', 'auto');

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
      
      {showAnchors && (
        <Html 
          position={[0, unit.height + 0.5, 0]}
          center
          distanceFactor={20}
          zIndexRange={[100, 0]}
        >
          <div className="bg-surface-container-highest text-on-surface px-2 py-1 rounded shadow-sm border border-outline-variant/50 font-mono text-[10px] whitespace-nowrap pointer-events-none">
            {unit.ulpin_3d}
          </div>
        </Html>
      )}
    </group>
  );
}
