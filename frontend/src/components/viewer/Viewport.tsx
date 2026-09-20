import { useMemo, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, CameraControls, BakeShadows } from '@react-three/drei';
import type { Project, Property } from '../../data/types';
import { FloorGroup } from './FloorGroup';
import { Roof } from './Roof';
import { getFloorUnits } from '../../data/mockProject';
import { COMMON_MATERIALS } from '../../viewer/scene';
import * as THREE from 'three';
import ErrorBoundary from '../ui/ErrorBoundary';

interface Props {
  project: Project;
  selectedUnitIds: Set<string>;
  hoveredUnitId: string | null;
  onHoverUnit: (id: string | null) => void;
  onClickUnit: (id: string, ctrlKey: boolean) => void;
  activeFloorId: string | 'all';
  onSelectFloor?: (id: string | 'all') => void;
  visibleLayers: Record<string, boolean>;
  interactionMode: 'building' | 'exploration';
  onEnterExploration: () => void;
  projectionMode?: 'isometric' | 'exploded' | 'xray';
  unitPropertyMap?: Map<string, Property>;
}

function Scene({
  project,
  selectedUnitIds,
  hoveredUnitId,
  onHoverUnit,
  onClickUnit,
  activeFloorId,
  onSelectFloor,
  visibleLayers,
  interactionMode,
  onEnterExploration,
  projectionMode = 'isometric',
  unitPropertyMap,
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

  // Center building footprint dynamically based on bounding box
  const centerOffset = useMemo(() => {
    if (!project.floors || project.floors.length === 0) return new THREE.Vector3(-15, 0, -13);
    
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const f of project.floors) {
      const fp = f.footprint;
      if (fp && fp.length > 0) {
        for (const pt of fp) {
          if (pt[0] < minX) minX = pt[0];
          if (pt[0] > maxX) maxX = pt[0];
          if (pt[1] < minZ) minZ = pt[1];
          if (pt[1] > maxZ) maxZ = pt[1];
        }
      }
    }
    if (minX === Infinity) return new THREE.Vector3(-15, 0, -13);
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    return new THREE.Vector3(-cx, 0, -cz);
  }, [project.floors]);

  return (
    <group 
      position={centerOffset}
      onClick={() => {
        if (interactionMode === 'building') {
          onEnterExploration();
        }
      }}
    >
      {/* Dynamic Lighting Rig */}
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[35, 60, 40]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <directionalLight position={[-30, 40, -25]} intensity={0.4} color="#8fb0a1" />
      <hemisphereLight intensity={0.3} color="#ffffff" groundColor="#06080a" />

      {/* Cadastre Property Parcel Boundary on Ground */}
      {visibleLayers.cadastre_boundary && parcelGeometry && (
        <primitive object={new THREE.LineLoop(parcelGeometry, COMMON_MATERIALS.parcel)} />
      )}

      {/* Floors with full architectural solids */}
      {project.floors.map((floor) => {
        const isFloorActive = activeFloorId === 'all' || activeFloorId === floor.id;
        
        let explodeOffset = 0;
        if (projectionMode === 'exploded' && isFloorActive) {
          explodeOffset = floor.floor_number * 3.5;
        }

        return (
          <FloorGroup
            key={floor.id}
            floor={floor}
            units={getFloorUnits(project, floor.floor_number)}
            isVisible={true}
            isFloorActive={isFloorActive}
            selectedUnitIds={selectedUnitIds}
            hoveredUnitId={hoveredUnitId}
            onHoverUnit={onHoverUnit}
            onClickUnit={onClickUnit}
            onSelectFloor={(fId) => onSelectFloor?.(fId)}
            explodeOffset={explodeOffset}
            showFloorLabel={true}
            visibleLayers={visibleLayers}
            projectionMode={projectionMode}
            unitPropertyMap={unitPropertyMap}
          />
        );
      })}

      {/* Architectural Roof Slab (above highest floor) */}
      {visibleLayers.footprint && (() => {
        const sortedFloors = [...project.floors].sort((a, b) => b.floor_number - a.floor_number);
        const topFloor = sortedFloors[0];
        if (!topFloor) return null;
        return (
          <Roof
            footprint={topFloor.footprint}
            elevationTop={topFloor.elevation_top}
          />
        );
      })()}
      
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
  const isDemo = !!(props.project as any)._isDemoData;
  const cameraControlsRef = useRef<CameraControls>(null);

  // Smoothly glide camera when active floor or interaction mode changes
  useEffect(() => {
    if (!cameraControlsRef.current) return;
    
    if (props.interactionMode === 'building') {
      cameraControlsRef.current.setLookAt(30, 26, 30, 0, 8, 0, true);
    } else {
      if (props.activeFloorId === 'all') {
        cameraControlsRef.current.setLookAt(28, 22, 28, 0, 8, 0, true);
      } else {
        const floor = props.project.floors.find(f => f.id === props.activeFloorId);
        if (floor) {
          const elev = floor.elevation_base;
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

  // When units are selected, smoothly frame them
  useEffect(() => {
    if (props.selectedUnitIds.size === 0 || !cameraControlsRef.current) return;
    
    // Find all selected units
    const selected = props.project.units.filter(u => props.selectedUnitIds.has(u.id));
    if (selected.length > 0) {
      if (selected.length === 1) {
        // Single unit logic (as before)
        const unit = selected[0];
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
      } else {
        // Multi-unit logic: approximate a bounding center/elevation
        let minElev = Infinity;
        let maxElev = -Infinity;
        selected.forEach(u => {
          minElev = Math.min(minElev, u.elevation);
          maxElev = Math.max(maxElev, u.elevation + u.height);
        });
        const centerElev = (minElev + maxElev) / 2;
        // Back the camera up a bit more for multiple units
        cameraControlsRef.current.setLookAt(
          22,
          centerElev + 15,
          22,
          0,
          centerElev,
          0,
          true
        );
      }
    }
  }, [props.selectedUnitIds, props.project.units]);

  return (
    <div className="w-full h-full relative bg-surface-container rounded-xl overflow-hidden shadow-cadastre group">
      {/* HUD overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none" style={{ pointerEvents: 'none' }}>
        <div className="flex items-center gap-3">
          <div className="pointer-events-auto bg-surface/90 backdrop-blur-md px-4 py-2 rounded shadow-cadastre-sm flex items-center gap-3 border border-outline/20" style={{ pointerEvents: 'auto' }}>
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

          {isDemo && (
            <div className="pointer-events-auto bg-error/20 text-error px-2 py-1 rounded text-xs font-mono border border-error/30 uppercase">
              DEMO DATA
            </div>
          )}

          {props.interactionMode === 'building' && (
            <button 
              onClick={props.onEnterExploration}
              className="pointer-events-auto bg-surface/95 backdrop-blur-md px-3.5 py-2 rounded shadow-cadastre-sm flex items-center gap-2 hover:bg-primary/20 hover:border-primary text-primary transition-all duration-200 border border-primary/40 cursor-pointer group/strata hover:shadow-[0_0_15px_rgba(195,221,69,0.25)]"
              style={{ pointerEvents: 'auto' }}
              title="Show Strata & Floor Navigation"
            >
              <span className="material-icon text-[18px] group-hover/strata:scale-110 transition-transform">layers</span>
              <span className="font-label-caps tracking-wider uppercase text-xs font-semibold">Show Strata</span>
            </button>
          )}
        </div>
        
        {/* Reset Camera Button */}
        <button 
          onClick={() => {
            cameraControlsRef.current?.setLookAt(30, 26, 30, 0, 8, 0, true);
          }}
          className="pointer-events-auto bg-surface/90 backdrop-blur-md px-4 py-2 rounded shadow-cadastre-sm flex items-center gap-2 hover:bg-surface-container-high hover:text-primary transition-all duration-200 text-on-surface border border-outline/20 hover:border-primary/40 cursor-pointer"
          style={{ pointerEvents: 'auto' }}
        >
          <span className="material-icon text-[16px]">center_focus_strong</span>
          <span className="font-label-caps tracking-wider uppercase text-xs">Reset View</span>
        </button>
      </div>

      <ErrorBoundary>
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
      </ErrorBoundary>
    </div>
  );
}
