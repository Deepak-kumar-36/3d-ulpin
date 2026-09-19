import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCursor, Outlines } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Unit } from '../../data/types';
import { createUnitGeometry, getUnitMaterial, getOutlineColor } from '../../viewer/scene';

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
    return createUnitGeometry(unit);
  }, [unit]);

  const material = useMemo(() => getUnitMaterial(unit, isSelected).clone(), [unit, isSelected]);
  const outlineColor = getOutlineColor(unit, isSelected);

  // Smooth hover/select highlight animation
  useFrame((_state, delta) => {
    if (material instanceof THREE.MeshLambertMaterial) {
      // Base emissive intensity based on state
      let targetIntensity = 0;
      if (isSelected) targetIntensity = 0.4;
      else if (isHovered) targetIntensity = 0.15;
      
      // If validation failed, pulse it slightly
      if (unit.validations.some(v => v.status === 'fail')) {
        targetIntensity += Math.sin(_state.clock.elapsedTime * 4) * 0.1;
      }

      // Smoothly interpolate current intensity to target
      material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, targetIntensity, 10 * delta);
    }
    
    if (meshRef.current) {
      const targetScale = isHovered || isSelected ? 1.02 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, 1, targetScale), 10 * delta);
      
      const targetY = isHovered || isSelected ? 0.2 : 0;
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 10 * delta);
    }
  });

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
        {/* <Outlines thickness={isSelected ? 0.04 : 0.02} color={outlineColor} /> */}
      </mesh>
    </group>
  );
}
