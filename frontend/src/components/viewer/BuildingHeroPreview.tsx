import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, BakeShadows } from '@react-three/drei';
import * as THREE from 'three';
import { DEMO_PROJECT, getFloorUnits } from '../../data/mockProject';
import { FloorGroup } from './FloorGroup';
import { useNavigate } from 'react-router-dom';

function HeroScene() {
  const groupRef = useRef<THREE.Group>(null);
  const navigate = useNavigate();

  // Slow ambient rotation for architectural showcase + Flying Camera Entrance
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
    // Cinematic camera fly-in
    state.camera.position.lerp(new THREE.Vector3(28, 22, 28), delta * 2.5);
    state.camera.lookAt(0, 4, 0);
  });

  const centerOffset = useMemo(() => new THREE.Vector3(-15, 0, -13), []);

  return (
    <group 
      ref={groupRef} 
      position={centerOffset}
      onClick={() => navigate('/project/demo/viewer')}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <Environment preset="city" />

      <ambientLight intensity={0.5} color="#dbe6e0" />
      <directionalLight position={[60, 80, 50]} intensity={1.5} color="#eaf5f0" />
      <directionalLight position={[-40, 30, -40]} intensity={0.6} color="#7fa392" />
      <pointLight position={[15, 12, 13]} intensity={0.5} color="#c8e4d8" />

      {/* Ground plane */}
      <mesh position={[15, 0, 13]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial 
          color={0x0b0e11} 
          transparent 
          opacity={0.65} 
          roughness={0.8}
          depthWrite={false} 
        />
      </mesh>

      {/* Ground Parcel boundary */}
      <mesh position={[15, 0.01, 13]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[18, 18.15, 64]} />
        <meshBasicMaterial color={0x3a4843} transparent opacity={0.4} />
      </mesh>

      {/* All building floors */}
      {DEMO_PROJECT.floors.map((floor) => (
        <FloorGroup
          key={floor.id}
          floor={floor}
          units={getFloorUnits(DEMO_PROJECT, floor.floor_number)}
          isVisible={true}
          isFloorActive={true}
          selectedUnitIds={new Set()}
          hoveredUnitId={null}
          onHoverUnit={() => {}}
          onClickUnit={() => navigate('/project/demo/viewer')}
          onSelectFloor={() => navigate('/project/demo/viewer')}
          showFloorLabel={true}
        />
      ))}

      {/* Grid */}
      <Grid 
        infiniteGrid 
        fadeDistance={50} 
        sectionColor="#26332d" 
        sectionThickness={1.2}
        cellColor="#121815"
        cellThickness={0.6}
        position={[15, -0.05, 13]}
      />
    </group>
  );
}

export function BuildingHeroPreview() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-outline/30 bg-surface-container-lowest shadow-cadastre group">
      {/* Click-to-enter hint badge */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-surface/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-outline/30 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-mono text-[10px] tracking-widest text-primary uppercase">
            LIVE 3D CADASTRE // CLICK TO INTERACT
          </span>
        </div>
      </div>

      <Canvas camera={{ position: [80, 60, 80], fov: 40 }}>
        <color attach="background" args={['#06080a']} />
        <fog attach="fog" args={['#06080a', 38, 95]} />
        <HeroScene />
        <OrbitControls 
          enablePan={false}
          enableZoom={false}
          autoRotate={false}
          maxPolarAngle={Math.PI / 2 + 0.05}
          minPolarAngle={Math.PI / 6}
        />
        <BakeShadows />
      </Canvas>

      <button
        onClick={() => navigate('/project/demo/viewer')}
        className="absolute bottom-4 right-4 z-10 px-4 py-2 bg-surface/90 hover:bg-surface-container-high border border-outline/30 text-on-surface font-mono text-[11px] tracking-wider uppercase rounded flex items-center gap-2 transition-all hover:scale-105 shadow-cadastre-sm cursor-pointer"
      >
        <span>Explore Strata</span>
        <span className="material-icon text-[14px]">arrow_forward</span>
      </button>
    </div>
  );
}
