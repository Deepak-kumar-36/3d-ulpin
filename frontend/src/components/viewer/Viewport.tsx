import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, OrthographicCamera, Bounds } from '@react-three/drei';
import type { Project } from '../../data/types';
import { FloorGroup } from './FloorGroup';
import { getFloorUnits } from '../../data/mockProject';
import { MATERIALS } from '../../viewer/scene';
import * as THREE from 'three';
import ErrorBoundary from '../ui/ErrorBoundary';

interface Props {
  project: Project;
  selectedUnitId: string | null;
  hoveredUnitId: string | null;
  onHoverUnit: (id: string | null) => void;
  onClickUnit: (id: string) => void;
  activeFloorId: string | 'all';
  visibleLayers: Record<string, boolean>;
  projectionMode: 'isometric' | 'exploded' | 'xray';
}

function Scene({
  project,
  selectedUnitId,
  hoveredUnitId,
  onHoverUnit,
  onClickUnit,
  activeFloorId,
  visibleLayers,
  projectionMode,
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
    
    // Create actual line object so we can compute distances for dashed lines
    const lineObj = new THREE.Line(geo, MATERIALS.parcel);
    lineObj.computeLineDistances();
    return lineObj;
  }, [project.parcel_boundary]);

  // Center building to origin by bounding box
  const centerOffset = useMemo(() => {
    if (!project.floors || project.floors.length === 0) return new THREE.Vector3(0, 0, 0);
    
    // Find min and max x,y of footprints
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
    
    if (minX === Infinity) return new THREE.Vector3(0, 0, 0); // fallback
    
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    return new THREE.Vector3(-cx, 0, -cz);
  }, [project.floors]);

  return (
    <group position={centerOffset}>
      {/* Lighting for the dark theme blueprint look */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} />
      <directionalLight position={[-10, 10, -10]} intensity={0.5} />

      <Bounds fit clip observe margin={1.2}>
        {/* Ground Parcel */}
        {visibleLayers.boundary && (
          <primitive object={parcelGeometry} />
        )}

        {/* Floors */}
        {project.floors.map((floor, index) => {
          const isVisible = activeFloorId === 'all' || activeFloorId === floor.id;
          
          // Basement visibility check
          if (floor.floor_number < 0 && !visibleLayers.basement) return null;

          // Exploded mode offset calculation
          let explodeOffset = 0;
          if (projectionMode === 'exploded') {
            explodeOffset = index * 4;
          }

          return (
            <FloorGroup
              key={floor.id}
              floor={floor}
              units={getFloorUnits(project, floor.floor_number)}
              isVisible={isVisible}
              selectedUnitId={selectedUnitId}
              hoveredUnitId={hoveredUnitId}
              onHoverUnit={onHoverUnit}
              onClickUnit={onClickUnit}
              explodeOffset={explodeOffset}
              visibleLayers={visibleLayers}
              projectionMode={projectionMode}
            />
          );
        })}
      </Bounds>
      
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
  // Check if we are running in demo mode
  const isDemo = !!(props.project as any)._isDemoData;

  return (
    <div className="w-full h-full relative bg-surface-container rounded-xl overflow-hidden shadow-cadastre">
      {/* HUD overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col pointer-events-none gap-2">
        <div className="flex justify-between items-start">
          <div className="pointer-events-auto bg-surface/90 backdrop-blur-md px-4 py-2 rounded shadow-cadastre-sm flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span className="font-label-caps text-primary tracking-wider uppercase">
              {props.activeFloorId === 'all' ? 'FULL CADASTRE VIEW' : `STRATUM: ${props.activeFloorId.replace('floor-', '').toUpperCase()}`}
            </span>
          </div>
          {isDemo && (
             <div className="bg-error/20 text-error px-2 py-1 rounded text-xs font-mono border border-error/30 uppercase pointer-events-auto">
               DEMO DATA
             </div>
          )}
        </div>
        
        {/* Navigation Hint */}
        <div className="pointer-events-auto mt-auto self-end bg-surface/80 text-on-surface-dim px-3 py-1.5 rounded text-xs font-mono shadow-cadastre-sm opacity-60">
          Hint: Shift + scroll or ↑/↓ to change floor
        </div>
      </div>

      <ErrorBoundary>
        <Canvas 
          dpr={[1, 2]} 
          camera={{ position: [25, 25, 25], fov: 45 }}
          onPointerMissed={() => props.onClickUnit('')}
        >
          <color attach="background" args={['#050505']} />
          
          {props.projectionMode === 'isometric' ? (
            <OrthographicCamera makeDefault position={[30, 30, 30]} zoom={20} />
          ) : null}

          <Scene {...props} />
          <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2 + 0.1} />
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
