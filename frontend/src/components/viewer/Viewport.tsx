import { useMemo, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, CameraControls, BakeShadows, Environment } from '@react-three/drei';
import type { Project } from '../../data/types';
import { FloorGroup } from './FloorGroup';
import { getFloorUnits } from '../../data/mockProject';
import { MATERIALS } from '../../viewer/scene';
import * as THREE from 'three';

interface Props {
  project: Project;
  selectedUnitId: string | null;
  hoveredUnitId: string | null;
  onHoverUnit: (id: string | null) => void;
  onClickUnit: (id: string) => void;
  activeFloorId: string | 'all';
  visibleLayers: Record<string, boolean>;
  interactionMode: 'building' | 'exploration';
  onEnterExploration: () => void;
  projectionMode?: 'isometric' | 'exploded' | 'xray';
}

function Scene({
  project,
  selectedUnitId,
  hoveredUnitId,
  onHoverUnit,
  onClickUnit,
  activeFloorId,
  visibleLayers,
  interactionMode,
  onEnterExploration,
}: Props) {
  // Ground Parcel Line
  const parcelGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const pb = project.parcel_boundary;
    if (pb && pb.length > 0) {
      shape.moveTo(pb[0][0], pb[0][1]);
      for (let i = 1; i < pb.length; i++) {
        shape.lineTo(pb[i][0], pb[i][1]);
      }
    }
    const points = shape.getPoints();
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    geo.rotateX(Math.PI / 2); // Lay flat
    return geo;
  }, [project.parcel_boundary]);

  // Center building to origin
  const centerOffset = useMemo(() => {
    // Assuming building is approx 20x16 units, offset by -10, -8
    return new THREE.Vector3(-10, 0, -8);
  }, []);

  return (
    <group 
      position={centerOffset}
      onClick={(e) => {
        if (interactionMode === 'building') {
          e.stopPropagation();
          onEnterExploration();
        }
      }}
      onPointerOver={(e) => {
        if (interactionMode === 'building') {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        if (interactionMode === 'building') {
          document.body.style.cursor = 'auto';
        }
      }}
    >
      {/* Environmental lighting for realistic glass reflections */}
      {/* <Environment preset="city" /> */}

      {/* Subtle atmospheric lighting */}
      <ambientLight intensity={0.4} color="#ffffff" />
      <directionalLight position={[100, 100, 50]} intensity={1.5} color="#e0f2fe" castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-50, 50, -50]} intensity={0.8} color="#abcfb8" />

      {/* Ground Parcel */}
      {visibleLayers.boundary && (
        <primitive object={new THREE.Line(parcelGeometry, MATERIALS.parcel)} />
      )}

      {/* Subtle Ground Reference Plane */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshLambertMaterial color={0x111111} transparent opacity={0.5} depthWrite={false} />
      </mesh>

      {/* Floors */}
      {project.floors.map((floor, index) => {
        const activeIndex = activeFloorId === 'all' ? Infinity : project.floors.findIndex(f => f.id === activeFloorId);
        
        // Hide floors above the active one for a cutaway view
        const isVisible = activeFloorId === 'all' || index <= activeIndex;
        if (!isVisible) return null;

        if (floor.floor_number < 0 && !visibleLayers.basement) return null;

        return (
          <FloorGroup
            key={floor.id}
            floor={floor}
            units={getFloorUnits(project, floor.floor_number)}
            isVisible={true}
            selectedUnitId={selectedUnitId}
            hoveredUnitId={hoveredUnitId}
            onHoverUnit={onHoverUnit}
            onClickUnit={onClickUnit}
            explodeOffset={0}
          />
        );
      })}
      
      {/* Drafting grid */}
      <Grid 
        infiniteGrid 
        fadeDistance={50} 
        sectionColor="#333333" 
        sectionThickness={1}
        cellColor="#111111"
        cellThickness={0.5}
        position={[0, -0.1, 0]}
      />
    </group>
  );
}

export default function Viewport(props: Props) {
  const cameraControlsRef = useRef<CameraControls>(null);

  // Smoothly move camera when active floor changes
  useEffect(() => {
    if (!cameraControlsRef.current) return;
    
    if (props.interactionMode === 'building') {
      // Look at the whole building
      cameraControlsRef.current.setLookAt(25, 25, 25, 0, 5, 0, true);
    } else {
      if (props.activeFloorId === 'all') {
        cameraControlsRef.current.setLookAt(25, 25, 25, 0, 5, 0, true);
      } else {
        const floor = props.project.floors.find(f => f.id === props.activeFloorId);
        if (floor) {
          const elev = floor.elevation_base;
          // Position camera slightly above and looking down at the active floor
          cameraControlsRef.current.setLookAt(20, elev + 20, 20, 0, elev, 0, true);
        }
      }
    }
  }, [props.activeFloorId, props.interactionMode, props.project]);

  return (
    <div className="w-full h-full relative bg-surface-container rounded-xl overflow-hidden shadow-cadastre group">
      {/* HUD overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between pointer-events-none">
        <div className="pointer-events-auto bg-surface/90 backdrop-blur-md px-4 py-2 rounded shadow-cadastre-sm flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <span className="font-label-caps text-primary tracking-wider uppercase">
            {props.interactionMode === 'building' ? 'BUILDING SELECTION' : 
             props.activeFloorId === 'all' ? 'FULL CADASTRE VIEW' : 
             `STRATUM: ${props.activeFloorId.replace('floor-', '').toUpperCase()}`}
          </span>
        </div>
        
        {/* Reset Camera Button */}
        <button 
          onClick={() => {
            cameraControlsRef.current?.setLookAt(25, 25, 25, 0, 5, 0, true);
          }}
          className="pointer-events-auto bg-surface/90 backdrop-blur-md px-4 py-2 rounded shadow-cadastre-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors text-on-surface"
        >
          <span className="material-icon text-[16px]">center_focus_strong</span>
          <span className="font-label-caps tracking-wider uppercase text-xs">Reset View</span>
        </button>
      </div>

      <Canvas dpr={[1, 2]} camera={{ position: [25, 25, 25], fov: 45 }}>
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#050505', 30, 100]} />
        
        <Scene {...props} />
        
        <CameraControls 
          ref={cameraControlsRef} 
          makeDefault 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2 + 0.1} 
          dollyToCursor={true}
        />
        <BakeShadows />
      </Canvas>
    </div>
  );
}
