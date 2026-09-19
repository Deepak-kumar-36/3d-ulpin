import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ScrollReveal from '../components/ui/ScrollReveal';

export default function DetectedUnitsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeFloor, setActiveFloor] = useState(2); // Mock F2 is active

  // Mock detection data for demo
  const mockPolygons = [
    { id: 1, type: 'Commercial', area: '120.4', status: 'detected', style: { top: '20%', left: '20%', width: '30%', height: '25%' } },
    { id: 2, type: 'Commercial', area: '145.2', status: 'detected', style: { top: '20%', left: '55%', width: '25%', height: '25%' } },
    { id: 3, type: 'Commercial', area: '210.8', status: 'needs_review', style: { top: '55%', left: '20%', width: '35%', height: '25%' } },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="max-w-7xl mx-auto p-6 pt-12 pb-24 h-[calc(100vh-64px)] flex flex-col"
    >
      <div className="flex items-center justify-between mb-6">
        <ScrollReveal direction="up" delay={0}>
          <div className="flex flex-col gap-1">
            <span className="font-label-caps uppercase text-on-surface-variant">Step 2 of 4</span>
            <h1 className="font-headline text-headline-lg text-primary tracking-tight">Review Detected Polygons</h1>
          </div>
        </ScrollReveal>
        <ScrollReveal direction="left" delay={100}>
          <button 
            onClick={() => navigate(`/project/${id}/viewer`)}
            className="cadastre-btn-primary"
          >
            Confirm & Extrude 3D
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
              {[3, 2, 1, 0, -1].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFloor(f)}
                  className={`p-3 rounded text-left transition-colors flex justify-between items-center ${
                    activeFloor === f ? 'bg-primary-container text-on-primary' : 'hover:bg-surface-container text-on-surface'
                  }`}
                >
                  <span className="font-body font-semibold">
                    {f === -1 ? 'B1 - Parking' : f === 0 ? 'Ground - Lobby' : `Floor 0${f} - Workspace`}
                  </span>
                  {f === 2 && <span className="w-2 h-2 rounded-full bg-tertiary-fixed" />}
                </button>
              ))}
            </div>
          </div>

          <div className="cadastre-card p-4 flex-1 flex flex-col overflow-hidden">
            <h3 className="font-label-caps uppercase text-on-surface-variant mb-3">Detected Units (F0{activeFloor})</h3>
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-2">
              {mockPolygons.map((poly) => (
                <div key={poly.id} className="p-3 rounded border border-outline-variant/30 bg-surface flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-primary font-medium">Polygon #{poly.id}</span>
                    <span className={`material-icon text-[16px] ${poly.status === 'needs_review' ? 'text-on-tertiary-fixed-variant' : 'text-primary-fixed-dim'}`}>
                      {poly.status === 'needs_review' ? 'warning' : 'check_circle'}
                    </span>
                  </div>
                  <span className="text-body-sm text-on-surface-variant">{poly.type}</span>
                  <span className="font-mono text-[11px] mt-1">{poly.area} m²</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Plan Canvas */}
        <div className="flex-1 cadastre-card overflow-hidden flex flex-col relative bg-[#e5e5e5] items-center justify-center">
           {/* Mock Blueprint Background */}
           <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik00MCAwaC00MHY0MGg0MHpNMSAxaDM4djM4aC0zOHoiIGZpbGw9IiMzMzMiLz4KPC9zdmc+')]"></div>
           
           <div className="relative w-[80%] h-[80%] border-2 border-primary/20 bg-white/50 backdrop-blur-sm shadow-xl rounded-sm">
             {/* Detected Overlay Polygons */}
             {mockPolygons.map((poly) => (
               <div 
                 key={poly.id}
                 className={`absolute border-2 flex items-center justify-center group cursor-pointer transition-colors ${
                   poly.status === 'needs_review' ? 'border-tertiary-fixed bg-tertiary-fixed/20' : 'border-primary bg-primary/10'
                 }`}
                 style={poly.style}
               >
                 <div className="bg-surface/90 px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 font-mono text-[10px] text-primary whitespace-nowrap">
                   Area: {poly.area}m²
                 </div>
               </div>
             ))}
           </div>

           {/* Toolbar overlay */}
           <div className="absolute top-4 right-4 bg-surface rounded-lg shadow-cadastre flex items-center p-1 border border-outline-variant/30">
              <button className="w-8 h-8 rounded hover:bg-surface-container flex items-center justify-center text-on-surface-variant"><span className="material-icon text-[18px]">zoom_in</span></button>
              <button className="w-8 h-8 rounded hover:bg-surface-container flex items-center justify-center text-on-surface-variant"><span className="material-icon text-[18px]">zoom_out</span></button>
              <div className="w-[1px] h-4 bg-outline-variant/30 mx-1"></div>
              <button className="w-8 h-8 rounded hover:bg-surface-container flex items-center justify-center text-on-surface-variant"><span className="material-icon text-[18px]">edit</span></button>
           </div>
        </div>

      </div>
    </motion.div>
  );
}
