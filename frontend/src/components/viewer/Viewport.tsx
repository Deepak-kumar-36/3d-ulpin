import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, OrthographicCamera, Bounds, BakeShadows } from '@react-three/drei';
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
    return geo;
  }, [project.parcel_boundary]);

  // Center building to origin
  const centerOffset = useMemo(() => {
    // Assuming building is approx 20x16 units, offset by -10, -8
    return new THREE.Vector3(-10, 0, -8);
  }, []);

  return (
    <group position={centerOffset}>
      {/* Lighting for the dark theme blueprint look */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} />
      <directionalLight position={[-10, 10, -10]} intensity={0.5} />

      <Bounds fit clip observe margin={1.2}>
        {/* Ground Parcel */}
        {visibleLayers.boundary && (
          <primitive object={new THREE.Line(parcelGeometry, MATERIALS.parcel)} />
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
  return (
    <div className="w-full h-full relative bg-surface-container rounded-xl overflow-hidden shadow-cadastre">
      {/* HUD overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between pointer-events-none">
        <div className="pointer-events-auto bg-surface/90 backdrop-blur-md px-4 py-2 rounded shadow-cadastre-sm flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <span className="font-label-caps text-primary tracking-wider uppercase">
            {props.activeFloorId === 'all' ? 'FULL CADASTRE VIEW' : `STRATUM: ${props.activeFloorId.replace('floor-', '').toUpperCase()}`}
          </span>
        </div>
      </div>

      <Canvas dpr={[1, 2]} camera={{ position: [25, 25, 25], fov: 45 }}>
        <color attach="background" args={['#050505']} />
        
        {props.projectionMode === 'isometric' ? (
          <OrthographicCamera makeDefault position={[30, 30, 30]} zoom={20} />
        ) : null}

        <Scene {...props} />
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2 + 0.1} />
        <BakeShadows />
      </Canvas>
    </div>
  );
}
