import { useMemo, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, CameraControls, BakeShadows, Environment } from '@react-three/drei';
import type { Project } from '../../data/types';
import { FloorGroup } from './FloorGroup';
import { getFloorUnits } from '../../data/mockProject';
import { COMMON_MATERIALS } from '../../viewer/scene';
import * as THREE from 'three';

interface Props {
  project: Project;
  selectedUnitId: string | null;
  hoveredUnitId: string | null;
  onHoverUnit: (id: string | null) => void;
  onClickUnit: (id: string) => void;
  activeFloorId: string | 'all';
  onSelectFloor?: (id: string | 'all') => void;
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
  onSelectFloor,
  visibleLayers,
  interactionMode,
  onEnterExploration,
  projectionMode = 'isometric',
}: Props) {
  // Ground Parcel Boundary Line (at elevation 0.0)
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
    geo.rotateX(Math.PI / 2); // Lay flat on XZ plane
    return geo;
  }, [project.parcel_boundary]);

  // Center building footprint precisely at origin
  const centerOffset = useMemo(() => {
    return new THREE.Vector3(-15, 0, -13);
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
      {/* Environmental reflection lighting */}
      <Environment preset="city" />

      {/* Atmospheric directional & ambient architectural illumination */}
      <ambientLight intensity={0.5} color="#dce8e2" />
      <directionalLight 
        position={[80, 100, 60]} 
        intensity={1.7} 
        color="#e6f2ed" 
        castShadow 
        shadow-mapSize={[2048, 2048]} 
      />
      <directionalLight position={[-60, 40, -50]} intensity={0.7} color="#88a898" />
      <pointLight position={[15, 12, 13]} intensity={0.6} color="#c8e4d8" />

      {/* Ground Parcel Boundary at Elevation 0.0 */}
      {visibleLayers.boundary && (
        <primitive 
          object={new THREE.Line(parcelGeometry, COMMON_MATERIALS.parcel)} 
          position={[0, 0.02, 0]} 
        />
      )}

      {/* Architectural Ground Datum Plane (Translucent plate revealing subterranean basement) */}
      <mesh position={[15, 0, 13]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial 
          color={0x0b0e11} 
          transparent 
          opacity={0.65} 
          roughness={0.8}
          metalness={0.1}
          depthWrite={false} 
        />
      </mesh>

      {/* Ground datum ring marker */}
      <mesh position={[15, 0.01, 13]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[22, 22.15, 64]} />
        <meshBasicMaterial color={0x3a4843} transparent opacity={0.4} />
      </mesh>

      {/* Physically Stacked Floors & Solid 3D Units */}
      {project.floors.map((floor, index) => {
        if (floor.floor_number < 0 && !visibleLayers.basement) return null;

        const isFloorActive = activeFloorId === 'all' || activeFloorId === floor.id;
        const explodeOffset = projectionMode === 'exploded' ? index * 3.2 : 0;

        return (
          <FloorGroup
            key={floor.id}
            floor={floor}
            units={getFloorUnits(project, floor.floor_number)}
            isVisible={true}
            isFloorActive={isFloorActive}
            selectedUnitId={selectedUnitId}
            hoveredUnitId={hoveredUnitId}
            onHoverUnit={onHoverUnit}
            onClickUnit={onClickUnit}
            onSelectFloor={(fId) => onSelectFloor?.(fId)}
            explodeOffset={explodeOffset}
            showFloorLabel={true}
          />
        );
      })}
      
      {/* Architectural Ground Drafting Grid */}
      <Grid 
        infiniteGrid 
        fadeDistance={65} 
        sectionColor="#26332d" 
        sectionThickness={1.2}
        cellColor="#121815"
        cellThickness={0.6}
        position={[15, -0.05, 13]}
      />
    </group>
  );
}

export default function Viewport(props: Props) {
  const cameraControlsRef = useRef<CameraControls>(null);

  // Smoothly glide camera when active floor or interaction mode changes
  useEffect(() => {
    if (!cameraControlsRef.current) return;
    
    if (props.interactionMode === 'building') {
      // Macro Isometric View of Whole Building
      cameraControlsRef.current.setLookAt(30, 26, 30, 0, 8, 0, true);
    } else {
      if (props.activeFloorId === 'all') {
        cameraControlsRef.current.setLookAt(28, 22, 28, 0, 8, 0, true);
      } else {
        const floor = props.project.floors.find(f => f.id === props.activeFloorId);
        if (floor) {
          const elev = floor.elevation_base;
          // Smooth architectural focus at the active stratum level
          cameraControlsRef.current.setLookAt(
            22, 
            elev + 15, 
            22, 
            0, 
            elev + 1.5, 
            0, 
            true
          );
        }
      }
    }
  }, [props.activeFloorId, props.interactionMode, props.project]);

  // When a unit is selected, smoothly frame it
  useEffect(() => {
    if (!props.selectedUnitId || !cameraControlsRef.current) return;
    const unit = props.project.units.find(u => u.id === props.selectedUnitId);
    if (unit) {
      const elev = unit.elevation;
      cameraControlsRef.current.setLookAt(
        18,
        elev + 12,
        18,
        0,
        elev + 2,
        0,
        true
      );
    }
  }, [props.selectedUnitId, props.project.units]);

  return (
    <div className="w-full h-full relative bg-surface-container rounded-xl overflow-hidden shadow-cadastre group">
      {/* HUD overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="pointer-events-auto bg-surface/90 backdrop-blur-md px-4 py-2 rounded shadow-cadastre-sm flex items-center gap-3 border border-outline/20">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <div className="flex flex-col">
              <span className="font-label-caps text-primary tracking-wider uppercase text-[10px]">
                {props.interactionMode === 'building' 
                  ? 'MACRO BUILDING OVERVIEW' 
                  : props.activeFloorId === 'all' 
                    ? 'FULL VERTICAL CADASTRE' 
                    : `ACTIVE STRATUM: ${props.activeFloorId.replace('floor-', '').toUpperCase()}`}
              </span>
              <span className="font-mono text-[9px] text-on-surface-variant">
                {props.interactionMode === 'building'
                  ? 'Click building to begin floor inspection'
                  : 'Scroll mouse wheel to traverse strata'}
              </span>
            </div>
          </div>

          {props.interactionMode === 'building' && (
            <button 
              onClick={props.onEnterExploration}
              className="pointer-events-auto bg-surface/95 backdrop-blur-md px-3.5 py-2 rounded shadow-cadastre-sm flex items-center gap-2 hover:bg-primary/20 hover:border-primary text-primary transition-all duration-200 border border-primary/40 cursor-pointer group hover:shadow-[0_0_15px_rgba(195,221,69,0.25)]"
              title="Show Strata & Floor Navigation"
            >
              <span className="material-icon text-[18px] group-hover:scale-110 transition-transform">layers</span>
              <span className="font-label-caps tracking-wider uppercase text-xs font-semibold">Show Strata</span>
            </button>
          )}
        </div>
        
        {/* Reset Camera Button */}
        <button 
          onClick={() => {
            cameraControlsRef.current?.setLookAt(30, 26, 30, 0, 8, 0, true);
          }}
          className="pointer-events-auto bg-surface/90 backdrop-blur-md px-4 py-2 rounded shadow-cadastre-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors text-on-surface border border-outline/20 cursor-pointer"
        >
          <span className="material-icon text-[16px]">center_focus_strong</span>
          <span className="font-label-caps tracking-wider uppercase text-xs">Reset View</span>
        </button>
      </div>

      <Canvas dpr={[1, 2]} camera={{ position: [30, 26, 30], fov: 42 }}>
        <color attach="background" args={['#06080a']} />
        <fog attach="fog" args={['#06080a', 45, 120]} />
        
        <Scene {...props} />
        
        <CameraControls 
          ref={cameraControlsRef} 
          makeDefault 
          smoothTime={0.4}
          minDistance={8}
          maxDistance={90}
          minPolarAngle={0.1} 
          maxPolarAngle={Math.PI / 2 + 0.12} 
          dollyToCursor={true}
        />
        <BakeShadows />
      </Canvas>
    </div>
  );
}
