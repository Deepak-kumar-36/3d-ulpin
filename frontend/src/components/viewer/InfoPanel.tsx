import { useNavigate } from 'react-router-dom';
import type { Unit } from '../../data/types';
import MonoValue from '../ui/MonoValue';
import StatusChip from '../ui/StatusChip';
import ScrollReveal from '../ui/ScrollReveal';

interface Props {
  selectedUnit: Unit | null;
  onClose: () => void;
  projectId: string;
}

export default function InfoPanel({ selectedUnit, onClose, projectId }: Props) {
  const navigate = useNavigate();

  if (!selectedUnit) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-container-lowest p-6 rounded-xl shadow-cadastre text-center opacity-70">
        <span className="material-icon text-[48px] text-outline-variant mb-4">touch_app</span>
        <h3 className="font-headline text-headline-sm text-on-surface mb-2">Inspect Unit</h3>
        <p className="text-body-sm text-on-surface-variant max-w-[200px]">
          Select a 3D unit volume in the viewport to inspect its cadastral properties and validation status.
        </p>
      </div>
    );
  }

  const hasFail = selectedUnit.validations.some(v => v.status === 'fail');
  const hasWarn = selectedUnit.validations.some(v => v.status === 'warning');
  const overallStatus = hasFail ? 'fail' : hasWarn ? 'warning' : 'pass';

  return (
    <div className="flex flex-col h-full bg-surface-container-lowest rounded-xl shadow-cadastre overflow-hidden">
      
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-outline-variant/30 bg-surface">
        <div className="flex flex-col gap-1">
          <span className="font-label-caps uppercase text-on-surface-variant">Unit Registry Details</span>
          <h3 className="font-mono text-data-mono text-primary text-lg font-semibold tracking-tight">
            {selectedUnit.ulpin_3d}
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all duration-200 cursor-pointer"
        >
          <span className="material-icon text-[18px]">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <ScrollReveal delay={0} direction="up" className="flex flex-col gap-4">
          
          {/* Validation Status Summary */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low">
            <span className="font-body text-body-sm font-semibold text-on-surface">Spatial Validation</span>
            <StatusChip status={overallStatus} />
          </div>

          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <MonoValue label="Use Type" value={selectedUnit.unit_type.charAt(0).toUpperCase() + selectedUnit.unit_type.slice(1)} />
            <MonoValue label="Floor" value={`Floor ${selectedUnit.floor_number}`} />
            <MonoValue label="Area" value={selectedUnit.area.toFixed(2)} unit="m²" />
            <MonoValue label="Ceiling Hgt" value={selectedUnit.height.toFixed(2)} unit="m" />
          </div>

          {/* Cadastral Z-Range */}
          <div className="flex flex-col gap-1.5 p-3 rounded bg-surface border border-outline-variant/20">
            <span className="font-label-caps uppercase text-on-surface-variant">Orthometric Elevation (AHD)</span>
            <div className="flex items-center gap-3">
              <MonoValue value={selectedUnit.elevation.toFixed(2)} unit="m" />
              <span className="text-outline-variant font-mono text-[10px]">TO</span>
              <MonoValue value={(selectedUnit.elevation + selectedUnit.height).toFixed(2)} unit="m" />
            </div>
          </div>

        </ScrollReveal>

        <hr className="border-outline-variant/20" />

        {/* Validation Rules Detail */}
        <ScrollReveal delay={100} direction="up" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-label-caps uppercase text-on-surface-variant">Rule Engine Results</span>
            <button 
              onClick={() => navigate(`/project/${projectId}/validation`)}
              className="text-[10px] font-semibold text-primary hover:underline hover:text-primary-fixed flex items-center gap-1 transition-all duration-200 cursor-pointer"
            >
              FULL REPORT <span className="material-icon text-[12px]">open_in_new</span>
            </button>
          </div>
          
          <div className="flex flex-col gap-2">
            {selectedUnit.validations.map((val) => (
              <div 
                key={val.id} 
                className={`p-3 rounded border text-body-sm flex items-start gap-2 ${
                  val.status === 'fail' ? 'bg-error-container/30 border-error-container text-on-surface' :
                  val.status === 'warning' ? 'bg-tertiary-fixed/20 border-tertiary-fixed-dim text-on-surface' :
                  'bg-surface border-surface-variant text-on-surface-variant'
                }`}
              >
                <span className={`material-icon text-[16px] mt-0.5 ${
                  val.status === 'fail' ? 'text-error' :
                  val.status === 'warning' ? 'text-on-tertiary-fixed-variant' :
                  'text-primary'
                }`}>
                  {val.status === 'fail' ? 'error' : val.status === 'warning' ? 'warning' : 'check_circle'}
                </span>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold capitalize text-primary">{val.rule.replace('_', ' ')}</span>
                  <p className="leading-snug">{val.message}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
        
        {/* Footprint Coordinates snippet */}
        <ScrollReveal delay={200} direction="up" className="flex flex-col gap-2 mt-auto">
           <span className="font-label-caps uppercase text-on-surface-variant">Geospatial Vertices</span>
           <div className="bg-surface-container-high p-2 rounded text-[10px] font-mono text-on-surface-variant overflow-x-auto whitespace-pre">
             {JSON.stringify(selectedUnit.polygon_2d, null, 2)}
           </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
