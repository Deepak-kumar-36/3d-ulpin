import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCursor, Edges, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Unit } from '../../data/types';
import { 
  createExtrudedGeometry, 
  getUnitMaterial, 
  getOutlineColor,
  COMMON_MATERIALS 
} from '../../viewer/scene';
import {
  createInteriorWalls,
} from '../../viewer/archGeometry';

interface Props {
  unit: Unit;
  isSelected: boolean;
  isHovered: boolean;
  isFloorActive?: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
  projectionMode?: 'isometric' | 'exploded' | 'xray';
  showAnchors?: boolean;
}

export function UnitMesh({ 
  unit, 
  isSelected, 
  isHovered, 
  isFloorActive = true,
  onHover, 
  onClick,
  projectionMode = 'isometric',
  showAnchors = false,
}: Props) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Compute extruded 3D solid volume from 2D polygon
  const geometry = useMemo(() => {
    return createExtrudedGeometry(unit.polygon_2d, Math.max(0.1, unit.height - 0.04));
  }, [unit.polygon_2d, unit.height]);

  // Clone material once per unit/state so emissive animations don't interfere
  const material = useMemo(() => {
    const baseMat = getUnitMaterial(unit, isSelected, isFloorActive);
    const mat = baseMat.clone();
    if (projectionMode === 'xray') {
      mat.transparent = true;
      mat.opacity = 0.15;
    }
    return mat;
  }, [unit, isSelected, isFloorActive, projectionMode]);

  const outlineColor = getOutlineColor(unit, isSelected, isFloorActive);
  const hasFail = unit.validations.some(v => v.status === 'fail');
  const hasWarning = unit.validations.some(v => v.status === 'warning');

  // ── Interior Partition Walls ──
  const wallGroup = useMemo(() => {
    return createInteriorWalls(
      unit.polygon_2d,
      unit.height,
      isFloorActive ? COMMON_MATERIALS.wall : COMMON_MATERIALS.wallInactive
    );
  }, [unit.polygon_2d, unit.height, isFloorActive]);

  // Smooth hover, selection, and validation animations
  useFrame((state, delta) => {
    if (material instanceof THREE.MeshStandardMaterial) {
      let targetIntensity = isFloorActive ? 0.12 : 0.04;
      
      if (isSelected) {
        targetIntensity = 0.45;
      } else if (isHovered) {
        targetIntensity = 0.28;
      }
      
      // Pulsing validation warning for failed units (e.g. overlap error)
      if (hasFail) {
        const pulse = Math.sin(state.clock.elapsedTime * 3.5) * 0.25 + 0.4;
        targetIntensity = isSelected ? 0.65 : pulse;
      } else if (hasWarning) {
        const pulse = Math.sin(state.clock.elapsedTime * 2.5) * 0.15 + 0.3;
        targetIntensity = isSelected ? 0.55 : pulse;
      }

      material.emissiveIntensity = THREE.MathUtils.lerp(
        material.emissiveIntensity, 
        targetIntensity, 
        8 * delta
      );
    }
    
    if (meshRef.current) {
      // Tactile physical lift and scale when hovered or selected (refined for subtle architectural feel)
      const targetScale = isSelected ? 1.015 : isHovered ? 1.008 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 8 * delta);
      
      const targetY = isSelected ? 0.15 : isHovered ? 0.08 : 0.0;
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 8 * delta);
    }
  });

  // Cursor indicator
  useCursor(isHovered, 'pointer', 'auto');

  return (
    <group position={[0, unit.elevation, 0]}>
      {/* 3D Extruded Unit Volume */}
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
        renderOrder={isSelected ? 10 : isFloorActive ? 2 : 1}
      >
        {/* Crisp architectural edge lines for unit & wall readability */}
        <Edges 
          threshold={15} 
          color={outlineColor} 
        />
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

      {/* ── Architectural Detail Group (raycast disabled) ── */}
      <group raycast={() => null}>
        {/* Interior Partition Walls */}
        {wallGroup && <primitive object={wallGroup} />}
      </group>
    </group>
  );
}
