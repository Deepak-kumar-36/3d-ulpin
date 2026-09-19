import type { ValidationSummary } from '../../data/types';
import StatusChip from '../ui/StatusChip';
import { useNavigate } from 'react-router-dom';

interface FailedUnitInfo {
  id: string;
  ulpin_3d: string;
  floor_id: string;
  message: string;
}

interface Props {
  summary: ValidationSummary;
  projectId: string;
  failedUnits?: FailedUnitInfo[];
  onSelectUnit?: (unitId: string, floorId: string) => void;
}

export default function ValidationBar({ summary, projectId, failedUnits = [], onSelectUnit }: Props) {
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

          {/* Quick-Inspect Actionable Validation Anomalies */}
          {failedUnits.length > 0 && (
            <div className="flex items-center gap-2 pl-4 border-l border-outline-variant/30">
              <span className="text-[10px] font-mono text-error uppercase tracking-wider">Inspect Anomaly:</span>
              {failedUnits.map(fu => (
                <button
                  key={fu.id}
                  onClick={() => onSelectUnit?.(fu.id, fu.floor_id)}
                  className="px-2.5 py-1 rounded bg-error-container/20 border border-error/40 hover:bg-error-container/40 text-error flex items-center gap-1.5 transition-all text-[11px] font-mono hover:scale-105 cursor-pointer"
                  title={fu.message}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
                  <span>{fu.ulpin_3d.split('-').slice(-2).join('-')}</span>
                  <span className="material-icon text-[13px]">center_focus_strong</span>
                </button>
              ))}
            </div>
          )}
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
