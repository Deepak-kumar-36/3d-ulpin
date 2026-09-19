import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getProject } from '../api/client';
import type { Project } from '../data/types';
import Viewport from '../components/viewer/Viewport';
import LayerPanel from '../components/viewer/LayerPanel';
import InfoPanel from '../components/viewer/InfoPanel';
import ValidationBar from '../components/viewer/ValidationBar';
import { useFloorScroll } from '../viewer/useFloorScroll';

export default function ViewerWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // State
  const [activeFloorId, setActiveFloorId] = useState<string | 'all'>('all');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
  const [projectionMode, setProjectionMode] = useState<'isometric' | 'exploded' | 'xray'>('isometric');
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    cadastre_boundary: true,
    footprint: true,
    units: true,
    anchors: true,
    basement: true,
  });

  const viewportRef = useRef<HTMLDivElement>(null);

  // Interaction Mode: 'building' (Macro overview) vs 'exploration' (Active stratum focus)
  const [interactionMode, setInteractionMode] = useState<'building' | 'exploration'>('building');

  useEffect(() => {
    async function load() {
      // 1. Check sessionStorage for a detected project first
      const stored = sessionStorage.getItem('verta_detected_project');
      if (stored) {
        try {
          const proj = JSON.parse(stored) as Project;
          setProject(proj);
          setIsDemo(!!(proj as any)._isDemoData);
          setLoading(false);
          return;
        } catch {
          // corrupted storage, fall through
        }
      }

      // 2. Fall back to API / demo
      if (!id) return;
      const proj = await getProject(id, true);
      setProject(proj);
      setIsDemo(!!(proj as any)._isDemoData);
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSelectFloor = (fId: string | 'all') => {
    setActiveFloorId(fId);
    if (fId !== 'all') {
      setSelectedUnitId(prev => {
        if (!prev || !project) return null;
        const u = project.units.find(unit => unit.id === prev);
        if (u && u.floor_id !== fId) return null;
        return prev;
      });
    }
  };

  // Hook up continuous mouse-wheel stratum exploration
  useFloorScroll({
    floors: project?.floors || [],
    activeFloorId,
    onSelectFloor: handleSelectFloor,
    onDeselectUnit: () => setSelectedUnitId(null),
    targetRef: viewportRef,
    enabled: interactionMode === 'exploration',
  });

  // Extract actionable validation failures/warnings
  const failedUnits = useMemo(() => {
    if (!project) return [];
    return project.units
      .filter(u => u.validations.some(v => v.status === 'fail' || v.status === 'warning'))
      .map(u => {
        const v = u.validations.find(val => val.status === 'fail') || u.validations.find(val => val.status === 'warning');
        return {
          id: u.id,
          ulpin_3d: u.ulpin_3d,
          floor_id: u.floor_id,
          message: v?.message || 'Validation anomaly detected',
        };
      });
  }, [project]);

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <span className="font-mono text-primary animate-pulse">Loading Cadastre Workspace...</span>
      </div>
    );
  }

  const selectedUnit = selectedUnitId ? project.units.find(u => u.id === selectedUnitId) || null : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-[calc(100vh-64px)] p-6 gap-6 relative"
    >
      {/* DEMO DATA badge */}
      {isDemo && (
        <div className="fixed top-[72px] right-6 z-50 px-3 py-1.5 rounded-lg bg-tertiary/20 border border-tertiary/40 text-tertiary font-mono text-[11px] uppercase tracking-wider shadow-lg">
          DEMO DATA
        </div>
      )}

      {/* Return to building macro view button */}
      <AnimatePresence>
        {interactionMode === 'exploration' && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
          >
            <button 
              onClick={() => {
                setInteractionMode('building');
                setActiveFloorId('all');
                setSelectedUnitId(null);
              }}
              className="bg-surface/90 backdrop-blur-md px-6 py-2 rounded-full shadow-cadastre flex items-center gap-2 hover:bg-surface-container-high transition-colors border border-outline/20 text-on-surface cursor-pointer"
            >
              <span className="material-icon text-[16px]">arrow_upward</span>
              <span className="font-label-caps tracking-wider uppercase text-xs">Return to Macro Building View</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Show Strata Toggle when hidden in macro building view */}
      <AnimatePresence>
        {interactionMode === 'building' && (
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: 'spring', stiffness: 220, damping: 25 }}
            className="absolute top-8 left-8 z-30 pointer-events-auto"
          >
            <button 
              onClick={() => {
                setInteractionMode('exploration');
                if (activeFloorId === 'all') {
                  setActiveFloorId('floor-gf');
                }
              }}
              className="bg-surface/95 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-cadastre flex items-center gap-3 hover:bg-surface-container-high transition-all border border-primary/50 hover:border-primary text-primary cursor-pointer group hover:shadow-[0_0_25px_rgba(195,221,69,0.25)]"
              title="Restore Strata & Layer Controls"
            >
              <span className="material-icon text-[20px] group-hover:scale-110 transition-transform">layers</span>
              <div className="flex flex-col text-left">
                <span className="font-label-caps tracking-wider uppercase text-xs font-bold text-primary">Show Strata</span>
                <span className="font-mono text-[9px] text-on-surface-variant">Restore floor navigation</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left: Strata & Layer Controls */}
        <motion.div 
          animate={{ x: interactionMode === 'building' ? -400 : 0, opacity: interactionMode === 'building' ? 0 : 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          className="w-[320px] flex-shrink-0"
        >
          <LayerPanel 
            floors={project.floors}
            activeFloorId={activeFloorId}
            onSelectFloor={(fId: string | 'all') => {
              handleSelectFloor(fId);
            }}
            visibleLayers={visibleLayers}
            onToggleLayer={(layer: string) => setVisibleLayers(prev => ({ ...prev, [layer]: !prev[layer] }))}
            projectionMode={projectionMode}
            onChangeProjection={setProjectionMode}
            onCollapse={() => {
              setInteractionMode('building');
              setActiveFloorId('all');
              setSelectedUnitId(null);
            }}
          />
        </motion.div>

        {/* Center: Interactive 3D Viewport */}
        <div className="flex-1 relative" ref={viewportRef}>
          <Viewport
            project={project}
            activeFloorId={activeFloorId}
            onSelectFloor={(fId) => handleSelectFloor(fId)}
            selectedUnitId={selectedUnitId}
            hoveredUnitId={hoveredUnitId}
            onHoverUnit={setHoveredUnitId}
            onClickUnit={(uId: string) => setSelectedUnitId(uId === selectedUnitId ? null : uId)}
            visibleLayers={visibleLayers}
            projectionMode={projectionMode}
            interactionMode={interactionMode}
            onEnterExploration={() => {
              setInteractionMode('exploration');
              if (activeFloorId === 'all') {
                setActiveFloorId('floor-gf');
              }
            }}
          />
        </div>

        {/* Right: Technical Property Inspection Panel */}
        <motion.div 
          animate={{ x: interactionMode === 'building' ? 400 : 0, opacity: interactionMode === 'building' ? 0 : 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="w-[360px] flex-shrink-0"
        >
          <InfoPanel 
            selectedUnit={selectedUnit}
            onClose={() => setSelectedUnitId(null)}
            projectId={project.id}
          />
        </motion.div>
      </div>

      {/* Bottom: Cadastre Validation Engine Bar */}
      <motion.div 
        animate={{ y: interactionMode === 'building' ? 100 : 0, opacity: interactionMode === 'building' ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="flex-shrink-0"
      >
        <ValidationBar 
          summary={project.validation_summary} 
          projectId={project.id}
          failedUnits={failedUnits}
          onSelectUnit={(unitId, floorId) => {
            setInteractionMode('exploration');
            setActiveFloorId(floorId);
            setSelectedUnitId(unitId);
          }}
        />
      </motion.div>
    </motion.div>
  );
}
