import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getProject } from '../api/client';
import type { Project } from '../data/types';
import { getUnitById } from '../data/mockProject';
import Viewport from '../components/viewer/Viewport';
import LayerPanel from '../components/viewer/LayerPanel';
import InfoPanel from '../components/viewer/InfoPanel';
import ValidationBar from '../components/viewer/ValidationBar';
import { useFloorScroll } from '../viewer/useFloorScroll';

export default function ViewerWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  
  // State
  const [activeFloorId, setActiveFloorId] = useState<string | 'all'>('all');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
  const [projectionMode, setProjectionMode] = useState<'isometric' | 'exploded' | 'xray'>('isometric');
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    boundary: true,
    footprint: true,
    units: true,
    anchors: true,
    basement: true,
  });

  const viewportRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const [interactionMode, setInteractionMode] = useState<'building' | 'exploration'>('building');

  useEffect(() => {
    async function load() {
      if (!id) return;
      const proj = await getProject(id);
      setProject(proj);
      setLoading(false);
    }
    load();
  }, [id]);

  // Hook up floor scrolling (only active when in exploration mode)
  useFloorScroll({
    floors: project?.floors || [],
    activeFloorId,
    onSelectFloor: (fId: string | 'all') => setActiveFloorId(fId),
    targetRef: viewportRef,
    enabled: interactionMode === 'exploration',
  });

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <span className="font-mono text-primary animate-pulse">Loading Cadastre Workspace...</span>
      </div>
    );
  }

  const selectedUnit = selectedUnitId ? getUnitById(project, selectedUnitId) || null : null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex flex-col h-[calc(100vh-64px)] p-6 gap-6 relative"
    >
      {/* Back to building mode button */}
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
              className="bg-surface/90 backdrop-blur-md px-6 py-2 rounded-full shadow-cadastre flex items-center gap-2 hover:bg-surface-container-high transition-colors border border-outline/20 text-on-surface"
            >
              <span className="material-icon text-[16px]">arrow_upward</span>
              <span className="font-label-caps tracking-wider uppercase text-xs">Return to Building View</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left: Layers & Strata */}
        <motion.div 
          animate={{ x: interactionMode === 'building' ? -400 : 0, opacity: interactionMode === 'building' ? 0 : 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="w-[320px] flex-shrink-0"
        >
          <LayerPanel 
            floors={project.floors}
            activeFloorId={activeFloorId}
            onSelectFloor={(fId: string | 'all') => {
              setActiveFloorId(fId);
              if (fId !== 'all') {
                if (selectedUnit && selectedUnit.floor_id !== fId) {
                  setSelectedUnitId(null);
                }
              }
            }}
            visibleLayers={visibleLayers}
            onToggleLayer={(layer: string) => setVisibleLayers(prev => ({ ...prev, [layer]: !prev[layer] }))}
            projectionMode={projectionMode}
            onChangeProjection={setProjectionMode}
          />
        </motion.div>

        {/* Center: 3D Viewport */}
        <div className="flex-1 relative" ref={viewportRef}>
          <Viewport 
            project={project}
            activeFloorId={activeFloorId}
            selectedUnitId={selectedUnitId}
            hoveredUnitId={hoveredUnitId}
            onHoverUnit={setHoveredUnitId}
            onClickUnit={(uId: string) => setSelectedUnitId(uId === selectedUnitId ? null : uId)}
            visibleLayers={visibleLayers}
            projectionMode={projectionMode}
            interactionMode={interactionMode}
            onEnterExploration={() => setInteractionMode('exploration')}
          />
        </div>

        {/* Right: Inspection Panel */}
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

      {/* Bottom: Validation Summary */}
      <motion.div 
        animate={{ y: interactionMode === 'building' ? 100 : 0, opacity: interactionMode === 'building' ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="flex-shrink-0"
      >
        <ValidationBar summary={project.validation_summary} projectId={project.id} />
      </motion.div>
    </motion.div>
  );
}
