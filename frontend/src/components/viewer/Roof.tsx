import { useMemo } from 'react';
import { Edges } from '@react-three/drei';
import { createExtrudedGeometry, COMMON_MATERIALS } from '../../viewer/scene';
import { ROOF_THICKNESS } from '../../viewer/archGeometry';

interface RoofProps {
  footprint: number[][];
  elevationTop: number;
  isVisible?: boolean;
}

/**
 * Flat roof slab that sits above the highest floor.
 * Uses the same extruded geometry approach as floor slabs.
 * Raycast disabled so it doesn't interfere with unit selection.
 */
export function Roof({ footprint, elevationTop, isVisible = true }: RoofProps) {
  const geometry = useMemo(() => {
    return createExtrudedGeometry(footprint, ROOF_THICKNESS);
  }, [footprint]);

  if (!isVisible) return null;

  return (
    <group raycast={() => null}>
      <mesh
        geometry={geometry}
        material={COMMON_MATERIALS.roof}
        position={[0, elevationTop, 0]}
        renderOrder={0}
      >
        <Edges threshold={15} color="#3a4d42" />
      </mesh>
    </group>
  );
}
