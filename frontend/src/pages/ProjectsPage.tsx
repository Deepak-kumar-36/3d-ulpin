import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProject } from '../api/client';
import type { Project } from '../data/types';
import ScrollReveal from '../components/ui/ScrollReveal';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  
  useEffect(() => {
    // In a real app we'd fetch a list. For demo, we just fetch the mock demo project.
    getProject('demo').then(p => setProjects([p]));
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="max-w-6xl mx-auto p-6 pt-12 pb-24"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
        <ScrollReveal direction="up" delay={0}>
          <div className="flex flex-col gap-2">
            <h1 className="font-headline text-headline-md text-primary tracking-tight">Registry Projects</h1>
            <p className="text-body-md text-on-surface-variant">
              Manage 3D cadastral conversions and validation reports.
            </p>
          </div>
        </ScrollReveal>
        <ScrollReveal direction="left" delay={100}>
          <Link to="/project/new/upload" className="cadastre-btn-primary">
            <span className="material-icon text-[20px]">add</span>
            New Registration
          </Link>
        </ScrollReveal>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* New Project Card */}
        <ScrollReveal direction="up" delay={100} className="h-full">
          <Link to="/project/new/upload" className="flex flex-col items-center justify-center h-[280px] bg-surface-container-lowest border-2 border-dashed border-outline-variant/40 rounded-xl hover:border-primary/50 hover:bg-surface-container-low transition-colors group">
            <div className="w-12 h-12 rounded-full bg-surface-container group-hover:bg-primary-container flex items-center justify-center text-on-surface-variant group-hover:text-on-primary-container transition-colors mb-4">
              <span className="material-icon text-[24px]">add</span>
            </div>
            <span className="font-headline text-headline-sm text-on-surface">Upload 2D Plan</span>
            <span className="text-body-sm text-on-surface-variant mt-1">Start a new 3D conversion</span>
          </Link>
        </ScrollReveal>

        {/* Existing Projects */}
        {projects.map((proj, idx) => (
          <ScrollReveal key={proj.id} direction="up" delay={150 + idx * 50} className="h-full">
            <div className="flex flex-col h-[280px] cadastre-card p-6 group hover:shadow-cadastre-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-label-caps uppercase text-primary">Cadastral Map</span>
                    {(proj as any)._isDemoData && (
                      <span className="bg-error/20 text-error px-1.5 py-0.5 rounded text-[9px] font-mono border border-error/30 uppercase">
                        DEMO
                      </span>
                    )}
                  </div>
                  <h3 className="font-headline text-headline-sm text-on-surface line-clamp-1">{proj.name}</h3>
                </div>
                <div className="bg-primary-fixed-dim/20 text-primary px-2 py-1 rounded font-mono text-[10px] font-semibold border border-primary/10">
                  v2.48
                </div>
              </div>

              <div className="flex flex-col gap-2 font-mono text-data-mono-sm text-on-surface-variant mb-auto">
                <div className="flex justify-between border-b border-surface-variant pb-1">
                  <span>Parcel ID:</span>
                  <span className="text-primary font-medium">{proj.parcel_id}</span>
                </div>
                <div className="flex justify-between border-b border-surface-variant pb-1">
                  <span>3D Units:</span>
                  <span className="text-primary font-medium">{proj.validation_summary.total_units}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>Validation:</span>
                  <span className={proj.validation_summary.failures > 0 ? 'text-error font-medium' : 'text-primary font-medium'}>
                    {proj.validation_summary.failures > 0 ? `${proj.validation_summary.failures} Fails` : 'Passed'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-outline-variant/30">
                <Link to={`/project/${proj.id}/viewer`} className="flex-1 cadastre-btn-secondary justify-center text-[13px] py-1.5">
                  <span className="material-icon text-[16px]">view_in_ar</span>
                  3D View
                </Link>
                <Link to={`/project/${proj.id}/validation`} className="cadastre-btn-ghost text-[13px] py-1.5">
                  Report
                </Link>
              </div>
            </div>
          </ScrollReveal>
        ))}

      </div>
    </motion.div>
  );
}
