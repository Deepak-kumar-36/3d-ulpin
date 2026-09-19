import type { ValidationSummary } from '../../data/types';
import StatusChip from '../ui/StatusChip';
import { useNavigate } from 'react-router-dom';

interface Props {
  summary: ValidationSummary;
  projectId: string;
}

export default function ValidationBar({ summary, projectId }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-surface-container-lowest p-3 rounded-xl shadow-cadastre flex items-center justify-between border-t border-outline-variant/20">
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="material-icon text-secondary text-[20px]">domain_verification</span>
          <span className="font-headline text-headline-sm tracking-tight text-primary">
            Validation Engine
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-4 border-l border-outline-variant/30 pl-6">
          <div className="flex flex-col">
            <span className="font-label-caps uppercase text-on-surface-variant">Total Units</span>
            <span className="font-mono text-data-mono font-semibold">{summary.total_units}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <StatusChip status="pass" label={`${summary.passed} Passed`} />
            {summary.warnings > 0 && <StatusChip status="warning" label={`${summary.warnings} Warnings`} />}
            {summary.failures > 0 && <StatusChip status="fail" label={`${summary.failures} Failures`} />}
          </div>
        </div>
      </div>

      <button 
        onClick={() => navigate(`/project/${projectId}/validation`)}
        className="cadastre-btn-primary"
      >
        View Full Report
        <span className="material-icon text-[18px]">arrow_forward</span>
      </button>

    </div>
  );
}
