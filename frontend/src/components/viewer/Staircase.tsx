import { useMemo } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';

interface StaircaseProps {
  elevationBase: number;
  elevationTop: number;
  isFloorActive: boolean;
}

const NUM_STEPS = 8;
const STEP_RUN = 0.28; // Depth of tread along Z (m)
const FLIGHT_WIDTH = 0.78; // Width along X (m)
const TREAD_THICKNESS = 0.05; // Thickness of tread slab (m)
const MID_LANDING_DEPTH = 0.95; // Depth of mid-landing along Z (m)
const RAIL_HEIGHT = 0.85; // Height of handrail above treads (m)

// Stair Core Center Origin
const BASE_X1 = 14.20; // Flight 1 (ascending along +Z)
const BASE_X2 = 15.08; // Flight 2 (ascending along -Z)
const START_Z = 4.20;  // Entrance Z coordinate

export function Staircase({ elevationBase, elevationTop, isFloorActive }: StaircaseProps) {
  const floorHeight = elevationTop - elevationBase;
  const halfHeight = floorHeight / 2;
  const stepRise = halfHeight / NUM_STEPS; // approx 0.2625m for 4.2m floor

  // Pre-calculate step placements for Flight 1 (ascending from elevationBase to halfHeight along +Z)
  const flight1Steps = useMemo(() => {
    return Array.from({ length: NUM_STEPS }).map((_, i) => {
      const stepY = elevationBase + (i + 1) * stepRise;
      const stepZ = START_Z + i * STEP_RUN + STEP_RUN / 2;
      return {
        key: `f1-${i}`,
        position: [BASE_X1 + FLIGHT_WIDTH / 2, stepY - TREAD_THICKNESS / 2, stepZ] as [number, number, number],
        riserPosition: [BASE_X1 + FLIGHT_WIDTH / 2, stepY - stepRise / 2, START_Z + i * STEP_RUN] as [number, number, number],
        riserHeight: stepRise,
      };
    });
  }, [elevationBase, stepRise]);

  // Pre-calculate step placements for Flight 2 (ascending from halfHeight to floorHeight along -Z)
  const flight2Steps = useMemo(() => {
    const flight2EndZ = START_Z + (NUM_STEPS - 1) * STEP_RUN + STEP_RUN / 2;
    return Array.from({ length: NUM_STEPS }).map((_, i) => {
      const stepY = elevationBase + halfHeight + (i + 1) * stepRise;
      const stepZ = flight2EndZ - i * STEP_RUN;
      return {
        key: `f2-${i}`,
        position: [BASE_X2 + FLIGHT_WIDTH / 2, stepY - TREAD_THICKNESS / 2, stepZ] as [number, number, number],
        riserPosition: [BASE_X2 + FLIGHT_WIDTH / 2, stepY - stepRise / 2, flight2EndZ - i * STEP_RUN + STEP_RUN / 2] as [number, number, number],
        riserHeight: stepRise,
      };
    });
  }, [elevationBase, halfHeight, stepRise]);

  // Mid landing parameters
  const midLandingY = elevationBase + halfHeight;
  const midLandingZ = START_Z + NUM_STEPS * STEP_RUN + MID_LANDING_DEPTH / 2;
  const totalCoreWidth = (BASE_X2 + FLIGHT_WIDTH) - BASE_X1;
  const midLandingX = BASE_X1 + totalCoreWidth / 2;

  // Handrail coordinate points
  const railFlight1Start: [number, number, number] = [BASE_X1 + 0.05, elevationBase + RAIL_HEIGHT, START_Z];
  const railFlight1End: [number, number, number] = [BASE_X1 + 0.05, elevationBase + halfHeight + RAIL_HEIGHT, START_Z + NUM_STEPS * STEP_RUN];
  
  const railFlight2Start: [number, number, number] = [BASE_X2 + FLIGHT_WIDTH - 0.05, elevationBase + halfHeight + RAIL_HEIGHT, START_Z + NUM_STEPS * STEP_RUN];
  const railFlight2End: [number, number, number] = [BASE_X2 + FLIGHT_WIDTH - 0.05, elevationBase + floorHeight + RAIL_HEIGHT, START_Z];

  // Materials tailored for architectural clarity without obstructing unit raycasting
  const treadMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isFloorActive ? 0x7e9da8 : 0x485a63,
      emissive: isFloorActive ? 0x12242c : 0x050c10,
      emissiveIntensity: isFloorActive ? 0.35 : 0.1,
      roughness: 0.3,
      metalness: 0.45,
      transparent: true,
      opacity: isFloorActive ? 0.78 : 0.30,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
  }, [isFloorActive]);

  const railMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isFloorActive ? 0xcbe2dc : 0x6e8880,
      emissive: isFloorActive ? 0x223d37 : 0x0a1412,
      emissiveIntensity: isFloorActive ? 0.45 : 0.15,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: isFloorActive ? 0.90 : 0.35,
      depthWrite: true,
    });
  }, [isFloorActive]);

  return (
    <group 
      name="architectural-circulation-staircase"
      // Disable raycasting on staircase so clicks & hovers directly hit floor units
      raycast={() => null}
    >
      {/* ── Flight 1: Steps & Risers ── */}
      {flight1Steps.map((step) => (
        <group key={step.key}>
          {/* Tread */}
          <mesh position={step.position} material={treadMaterial}>
            <boxGeometry args={[FLIGHT_WIDTH, TREAD_THICKNESS, STEP_RUN]} />
            <Edges threshold={20} color={isFloorActive ? '#a4c0cb' : '#33424a'} />
          </mesh>
          {/* Riser */}
          <mesh position={step.riserPosition} material={treadMaterial}>
            <boxGeometry args={[FLIGHT_WIDTH, step.riserHeight, 0.03]} />
          </mesh>
        </group>
      ))}

      {/* ── Mid-Landing Slab ── */}
      <mesh 
        position={[midLandingX, midLandingY - TREAD_THICKNESS / 2, midLandingZ]} 
        material={treadMaterial}
      >
        <boxGeometry args={[totalCoreWidth, TREAD_THICKNESS * 1.5, MID_LANDING_DEPTH]} />
        <Edges threshold={20} color={isFloorActive ? '#a4c0cb' : '#33424a'} />
      </mesh>

      {/* ── Flight 2: Steps & Risers ── */}
      {flight2Steps.map((step) => (
        <group key={step.key}>
          {/* Tread */}
          <mesh position={step.position} material={treadMaterial}>
            <boxGeometry args={[FLIGHT_WIDTH, TREAD_THICKNESS, STEP_RUN]} />
            <Edges threshold={20} color={isFloorActive ? '#a4c0cb' : '#33424a'} />
          </mesh>
          {/* Riser */}
          <mesh position={step.riserPosition} material={treadMaterial}>
            <boxGeometry args={[FLIGHT_WIDTH, step.riserHeight, 0.03]} />
          </mesh>
        </group>
      ))}

      {/* ── Upper Floor Access Landing ── */}
      <mesh 
        position={[BASE_X2 + FLIGHT_WIDTH / 2, elevationBase + floorHeight - TREAD_THICKNESS / 2, START_Z - 0.4]} 
        material={treadMaterial}
      >
        <boxGeometry args={[FLIGHT_WIDTH, TREAD_THICKNESS, 0.8]} />
        <Edges threshold={20} color={isFloorActive ? '#a4c0cb' : '#33424a'} />
      </mesh>

      {/* ── Architectural Handrails & Guardrails ── */}
      {/* Flight 1 Outer Rail */}
      <HandrailLine 
        start={railFlight1Start} 
        end={railFlight1End} 
        material={railMaterial} 
        isFloorActive={isFloorActive}
      />
      {/* Flight 1 Vertical Posts */}
      <mesh position={[BASE_X1 + 0.05, elevationBase + RAIL_HEIGHT / 2, START_Z]} material={railMaterial}>
        <cylinderGeometry args={[0.02, 0.02, RAIL_HEIGHT, 8]} />
      </mesh>
      <mesh position={[BASE_X1 + 0.05, elevationBase + halfHeight + RAIL_HEIGHT / 2, START_Z + NUM_STEPS * STEP_RUN]} material={railMaterial}>
        <cylinderGeometry args={[0.02, 0.02, RAIL_HEIGHT, 8]} />
      </mesh>

      {/* Mid Landing Outer Guardrail */}
      <mesh position={[midLandingX, midLandingY + RAIL_HEIGHT, START_Z + NUM_STEPS * STEP_RUN + MID_LANDING_DEPTH - 0.05]} material={railMaterial}>
        <boxGeometry args={[totalCoreWidth, 0.04, 0.04]} />
      </mesh>
      <mesh position={[BASE_X1 + 0.05, midLandingY + RAIL_HEIGHT / 2, START_Z + NUM_STEPS * STEP_RUN + MID_LANDING_DEPTH - 0.05]} material={railMaterial}>
        <cylinderGeometry args={[0.02, 0.02, RAIL_HEIGHT, 8]} />
      </mesh>
      <mesh position={[BASE_X2 + FLIGHT_WIDTH - 0.05, midLandingY + RAIL_HEIGHT / 2, START_Z + NUM_STEPS * STEP_RUN + MID_LANDING_DEPTH - 0.05]} material={railMaterial}>
        <cylinderGeometry args={[0.02, 0.02, RAIL_HEIGHT, 8]} />
      </mesh>

      {/* Flight 2 Outer Rail */}
      <HandrailLine 
        start={railFlight2Start} 
        end={railFlight2End} 
        material={railMaterial} 
        isFloorActive={isFloorActive}
      />
      {/* Flight 2 Vertical Post at Top Landing */}
      <mesh position={[BASE_X2 + FLIGHT_WIDTH - 0.05, elevationBase + floorHeight + RAIL_HEIGHT / 2, START_Z]} material={railMaterial}>
        <cylinderGeometry args={[0.02, 0.02, RAIL_HEIGHT, 8]} />
      </mesh>

      {/* Central Well Separation Handrail */}
      <mesh position={[midLandingX, midLandingY + RAIL_HEIGHT * 0.75, midLandingZ - 0.3]} material={railMaterial}>
        <boxGeometry args={[0.03, RAIL_HEIGHT * 0.5, MID_LANDING_DEPTH * 0.8]} />
      </mesh>
    </group>
  );
}

// Sloped handrail cylinder segment between 2 3D points
function HandrailLine({ 
  start, 
  end, 
  material,
}: { 
  start: [number, number, number]; 
  end: [number, number, number]; 
  material: THREE.Material;
  isFloorActive: boolean;
}) {
  const { position, rotation, length } = useMemo(() => {
    const vStart = new THREE.Vector3(...start);
    const vEnd = new THREE.Vector3(...end);
    const vMid = new THREE.Vector3().addVectors(vStart, vEnd).multiplyScalar(0.5);
    const len = vStart.distanceTo(vEnd);
    
    // Compute rotation towards end point
    const direction = new THREE.Vector3().subVectors(vEnd, vStart).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    return {
      position: [vMid.x, vMid.y, vMid.z] as [number, number, number],
      rotation: [euler.x, euler.y, euler.z] as [number, number, number],
      length: len,
    };
  }, [start, end]);

  return (
    <mesh position={position} rotation={rotation} material={material}>
      <cylinderGeometry args={[0.022, 0.022, length, 12]} />
    </mesh>
  );
}
