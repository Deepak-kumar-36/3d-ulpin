import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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

  useEffect(() => {
    async function load() {
      if (!id) return;
      const proj = await getProject(id);
      setProject(proj);
      setLoading(false);
    }
    load();
  }, [id]);

  // Hook up floor scrolling
  useFloorScroll({
    floors: project?.floors || [],
    activeFloorId,
    onSelectFloor: (fId: string | 'all') => setActiveFloorId(fId),
    targetRef: viewportRef,
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
      className="flex flex-col h-[calc(100vh-64px)] p-6 gap-6"
    >
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left: Layers & Strata */}
        <div className="w-[320px] flex-shrink-0">
          <LayerPanel 
            floors={project.floors}
            activeFloorId={activeFloorId}
            onSelectFloor={(fId: string | 'all') => {
              setActiveFloorId(fId);
              if (fId !== 'all') {
                // If a specific floor is selected, unselect unit if it doesn't belong to that floor
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
        </div>

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
          />
        </div>

        {/* Right: Inspection Panel */}
        <div className="w-[360px] flex-shrink-0">
          <InfoPanel 
            selectedUnit={selectedUnit}
            onClose={() => setSelectedUnitId(null)}
            projectId={project.id}
          />
        </div>
      </div>

      {/* Bottom: Validation Summary */}
      <div className="flex-shrink-0">
        <ValidationBar summary={project.validation_summary} projectId={project.id} />
      </div>
    </motion.div>
  );
}
