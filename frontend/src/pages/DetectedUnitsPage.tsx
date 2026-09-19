import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ScrollReveal from '../components/ui/ScrollReveal';
import type { VisionFloor } from '../api/client';

export default function DetectedUnitsPage() {
  const navigate = useNavigate();
  const [activeFloorIdx, setActiveFloorIdx] = useState(0);
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  // Read detection results from sessionStorage
  const visionResults: VisionFloor[] = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('verta_vision_results');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const uploadedImages: string[] = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('verta_uploaded_images');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const isDemo = visionResults.length === 0;
  const activeFloor = visionResults[activeFloorIdx] || null;
  const activeImage = uploadedImages[activeFloorIdx] || null;
  const imageSize = activeFloor?.image_size || [800, 600];

  const handleConfirm = () => {
    // The project was already stored in sessionStorage by ProcessingPage
    navigate('/project/detected/viewer');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="max-w-7xl mx-auto p-6 pt-12 pb-24 h-[calc(100vh-64px)] flex flex-col"
    >
      <div className="flex items-center justify-between mb-6">
        <ScrollReveal direction="up" delay={0}>
          <div className="flex flex-col gap-1">
            <span className="font-label-caps uppercase text-on-surface-variant">Step 3 of 4</span>
            <h1 className="font-headline text-headline-md text-primary tracking-tight">
              Review Detected Polygons
            </h1>
            {isDemo && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-tertiary/20 text-tertiary text-[11px] font-mono uppercase tracking-wider">
                DEMO DATA
              </span>
            )}
          </div>
        </ScrollReveal>
        <ScrollReveal direction="left" delay={100}>
          <button onClick={handleConfirm} className="cadastre-btn-primary">
            Confirm &amp; Extrude 3D
            <span className="material-icon text-[18px]">view_in_ar</span>
          </button>
        </ScrollReveal>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">

        {/* Left: Floor Selector & Unit List */}
        <div className="w-[320px] flex flex-col gap-4">
          <div className="cadastre-card p-4 overflow-y-auto">
            <h3 className="font-label-caps uppercase text-on-surface-variant mb-3">Strata Levels</h3>
            <div className="flex flex-col gap-1">
              {visionResults.length > 0 ? visionResults.map((vf, idx) => (
                <button
                  key={vf.floor_id}
                  onClick={() => setActiveFloorIdx(idx)}
                  className={`p-3 rounded text-left transition-colors flex justify-between items-center ${
                    activeFloorIdx === idx
                      ? 'bg-primary-container text-on-primary-container'
                      : 'hover:bg-surface-container text-on-surface'
                  }`}
                >
                  <span className="font-body font-semibold">{vf.floor_id}</span>
                  <span className="font-mono text-[11px] text-on-surface-variant">
                    {vf.units.length} units
                  </span>
                </button>
              )) : (
                <p className="text-on-surface-variant text-body-sm p-3">
                  No detection results. Using demo data.
                </p>
              )}
            </div>
          </div>

          <div className="cadastre-card p-4 flex-1 flex flex-col overflow-hidden">
            <h3 className="font-label-caps uppercase text-on-surface-variant mb-3">
              Detected Units {activeFloor ? `(${activeFloor.floor_id})` : ''}
            </h3>
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-2">
              {activeFloor?.units.map((u) => (
                <div
                  key={u.id}
                  className={`p-3 rounded border transition-colors flex flex-col gap-1 cursor-pointer ${
                    hoveredUnit === u.id
                      ? 'border-primary bg-primary/10'
                      : 'border-outline-variant/30 bg-surface hover:bg-surface-container'
                  }`}
                  onMouseEnter={() => setHoveredUnit(u.id)}
                  onMouseLeave={() => setHoveredUnit(null)}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-primary font-medium text-[13px]">{u.id}</span>
                    <span className="material-icon text-[16px] text-primary-fixed-dim">check_circle</span>
                  </div>
                  <span className="font-mono text-[11px] text-on-surface-variant">
                    {u.area_px.toFixed(0)} px² · {u.polygon.length} vertices
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Plan Canvas with SVG overlay */}
        <div className="flex-1 cadastre-card overflow-hidden flex flex-col relative bg-[#1a1a1a] items-center justify-center">
          <div
            className="relative origin-center transition-transform duration-200"
            style={{
              transform: `scale(${scale})`,
              width: '90%',
              aspectRatio: `${imageSize[0]} / ${imageSize[1]}`,
              maxHeight: '90%',
            }}
          >
            {/* Uploaded image background */}
            {activeImage && (
              <img
                src={activeImage}
                alt={`Floor plan ${activeFloor?.floor_id}`}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            )}
            {!activeImage && (
              <div className="absolute inset-0 bg-surface-container flex items-center justify-center">
                <span className="text-on-surface-variant font-mono text-sm">No image available</span>
              </div>
            )}

            {/* SVG polygon overlay */}
            {activeFloor && (
              <svg
                viewBox={`0 0 ${imageSize[0]} ${imageSize[1]}`}
                className="absolute inset-0 w-full h-full z-10"
                style={{ pointerEvents: 'none' }}
              >
                {activeFloor.units.map((u) => {
                  const points = u.polygon.map(p => `${p[0]},${p[1]}`).join(' ');
                  const isHovered = hoveredUnit === u.id;
                  return (
                    <g key={u.id} style={{ pointerEvents: 'all' }}>
                      <polygon
                        points={points}
                        fill={isHovered ? 'rgba(102,187,255,0.35)' : 'rgba(102,187,255,0.15)'}
                        stroke={isHovered ? '#66bbff' : '#4a9eff'}
                        strokeWidth="2"
                        onMouseEnter={() => setHoveredUnit(u.id)}
                        onMouseLeave={() => setHoveredUnit(null)}
                        className="cursor-pointer"
                      />
                      <text
                        x={u.centroid[0]}
                        y={u.centroid[1]}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={isHovered ? '#fff' : '#ccc'}
                        fontSize="14"
                        fontFamily="monospace"
                        fontWeight="bold"
                        style={{ pointerEvents: 'none' }}
                      >
                        {u.id}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Toolbar overlay */}
          <div className="absolute top-4 right-4 bg-surface rounded-lg shadow-cadastre flex items-center p-1 border border-outline-variant/30">
            <button
              onClick={() => setScale(s => Math.min(s + 0.2, 3))}
              className="w-8 h-8 rounded hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
            >
              <span className="material-icon text-[18px]">zoom_in</span>
            </button>
            <button
              onClick={() => setScale(s => Math.max(s - 0.2, 0.5))}
              className="w-8 h-8 rounded hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
            >
              <span className="material-icon text-[18px]">zoom_out</span>
            </button>
          </div>

          {/* Unit count badge */}
          {activeFloor && (
            <div className="absolute bottom-4 left-4 bg-surface/90 rounded-lg px-3 py-1.5 border border-outline-variant/30">
              <span className="font-mono text-[11px] text-primary">
                {activeFloor.units.length} units detected · {activeFloor.source}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
