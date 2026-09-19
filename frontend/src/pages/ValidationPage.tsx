import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProject } from '../api/client';
import type { Project, Validation } from '../data/types';
import StatusChip from '../components/ui/StatusChip';
import ScrollReveal from '../components/ui/ScrollReveal';

export default function ValidationPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (id) getProject(id).then(setProject);
  }, [id]);

  if (!project) return null;

  // Flatten all validations across all units
  const allValidations: (Validation & { ulpin: string, floor_number: number, unit_id: string })[] = [];
  project.units.forEach(unit => {
    unit.validations.forEach(val => {
      allValidations.push({ ...val, ulpin: unit.ulpin_3d, floor_number: unit.floor_number, unit_id: unit.id });
    });
  });

  // Sort: Fails first, then Warnings, then Passes
  const sortedValidations = [...allValidations].sort((a, b) => {
    const rank = { fail: 0, warning: 1, pass: 2 };
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return b.floor_number - a.floor_number; // higher floors first
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="max-w-6xl mx-auto p-6 pt-12 pb-24"
    >
      <ScrollReveal direction="up" delay={0}>
        <div className="flex flex-col gap-2 mb-8">
          <div className="flex items-center gap-2 text-on-surface-variant font-label-caps uppercase">
            <Link to="/projects" className="hover:text-primary">Projects</Link>
            <span className="material-icon text-[14px]">chevron_right</span>
            <Link to={`/project/${id}/viewer`} className="hover:text-primary">{project.name}</Link>
            <span className="material-icon text-[14px]">chevron_right</span>
            <span className="text-primary">Validation Report</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="font-headline text-headline-md text-primary tracking-tight">Validation Report</h1>
            <Link to={`/project/${id}/viewer`} className="cadastre-btn-secondary">
              <span className="material-icon text-[20px]">view_in_ar</span>
              Return to 3D View
            </Link>
          </div>
        </div>
      </ScrollReveal>

      {/* Summary Cards */}
      <ScrollReveal direction="up" delay={100}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className="cadastre-card p-5 flex flex-col gap-1 border-primary/20">
            <span className="font-label-caps uppercase text-on-surface-variant">Total Units Checked</span>
            <span className="font-mono text-[32px] text-primary leading-none">{project.validation_summary.total_units}</span>
          </div>
          <div className="cadastre-card p-5 flex flex-col gap-1 border-primary-fixed/50">
            <span className="font-label-caps uppercase text-on-surface-variant">Passed</span>
            <span className="font-mono text-[32px] text-primary leading-none">{project.validation_summary.passed}</span>
          </div>
          <div className="cadastre-card p-5 flex flex-col gap-1 border-tertiary-fixed/50">
            <span className="font-label-caps uppercase text-on-surface-variant">Warnings</span>
            <span className="font-mono text-[32px] text-tertiary leading-none">{project.validation_summary.warnings}</span>
          </div>
          <div className="cadastre-card p-5 flex flex-col gap-1 border-error-container">
            <span className="font-label-caps uppercase text-on-surface-variant">Failures</span>
            <span className="font-mono text-[32px] text-error leading-none">{project.validation_summary.failures}</span>
          </div>
        </div>
      </ScrollReveal>

      {/* Detailed Table */}
      <ScrollReveal direction="up" delay={200}>
        <div className="cadastre-card overflow-hidden">
          <div className="p-5 border-b border-outline-variant/30 bg-surface flex items-center justify-between">
            <span className="font-headline text-headline-sm text-primary">Rule Engine Results</span>
            <span className="cadastre-chip bg-surface-container text-on-surface-variant">
              Engine v2.48
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low font-label-caps text-on-surface-variant uppercase border-b border-outline-variant/30">
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Rule Type</th>
                  <th className="p-4 font-semibold">ULPIN Reference</th>
                  <th className="p-4 font-semibold">Message</th>
                  <th className="p-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="font-body text-body-sm text-on-surface">
                {sortedValidations.map((val, idx) => (
                  <tr key={`${val.id}-${idx}`} className="border-b border-outline-variant/10 hover:bg-surface/50 transition-colors">
                    <td className="p-4 w-[120px]">
                      <StatusChip status={val.status} />
                    </td>
                    <td className="p-4 font-medium capitalize w-[160px]">{val.rule.replace('_', ' ')}</td>
                    <td className="p-4 w-[200px]">
                      <span className="font-mono text-primary font-medium">{val.ulpin}</span>
                    </td>
                    <td className="p-4 max-w-[400px]">
                      {val.message}
                    </td>
                    <td className="p-4 text-right">
                      <Link to={`/project/${id}/viewer?unit=${val.unit_id}`} className="cadastre-btn-ghost text-primary px-2">
                        Inspect in 3D
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollReveal>
    </motion.div>
  );
}
