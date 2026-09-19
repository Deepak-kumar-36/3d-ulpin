import type { Floor } from '../../data/types';

interface Props {
  floors: Floor[];
  activeFloorId: string | 'all';
  onSelectFloor: (id: string | 'all') => void;
  visibleLayers: Record<string, boolean>;
  onToggleLayer: (layer: string) => void;
  projectionMode: 'isometric' | 'exploded' | 'xray';
  onChangeProjection: (mode: 'isometric' | 'exploded' | 'xray') => void;
}

const LAYERS = [
  { key: 'boundary', label: '2D Ground Parcel', color: 'bg-tertiary-fixed' },
  { key: 'footprint', label: 'Architectural Footprint', color: 'bg-primary-container' },
  { key: 'units', label: 'Unit Polyhedrals', color: 'bg-secondary-container' },
  { key: 'anchors', label: '3D ULPIN Anchors', icon: 'pin_drop' },
  { key: 'basement', label: 'Subterranean Basement', color: 'bg-surface-dim' },
];

export default function LayerPanel({
  floors,
  activeFloorId,
  onSelectFloor,
  visibleLayers,
  onToggleLayer,
  projectionMode,
  onChangeProjection,
}: Props) {
  // Reverse floors so F3 is at top, B1 at bottom (like a real building)
  const displayFloors = [...floors].reverse();

  return (
    <div className="flex flex-col gap-6 bg-surface-container-lowest p-4 rounded-xl shadow-cadastre h-full overflow-y-auto">
      
      {/* Floor Stack Navigation */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
          <span className="font-label-caps uppercase text-on-surface-variant">Vertical Cadastre Strata</span>
          <button 
            onClick={() => onSelectFloor('all')}
            className={`cadastre-chip cursor-pointer ${activeFloorId === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-container-high text-primary'}`}
          >
            Show All
          </button>
        </div>
        
        <div className="flex flex-col gap-2 mt-2">
          {displayFloors.map(floor => {
            const isActive = activeFloorId === floor.id;
            return (
              <button
                key={floor.id}
                onClick={() => onSelectFloor(floor.id)}
                className={`text-left p-3 rounded-lg transition-all duration-300 flex flex-col gap-1 border ${
                  isActive 
                    ? 'bg-secondary-container/20 border-primary shadow-[0_0_15px_rgba(195,221,69,0.2)]' 
                    : 'bg-surface-container-low border-transparent hover:bg-surface-container hover:border-outline hover:shadow-cadastre-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-body font-semibold ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                    {floor.label}
                  </span>
                  <span className="cadastre-chip bg-surface text-on-surface-variant">
                    {floor.unit_count} Units
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className={`font-mono text-[10px] ${floor.floor_number < 0 ? 'text-secondary' : 'text-on-surface-variant'}`}>
                    Z: {floor.elevation_base > 0 ? '+' : ''}{floor.elevation_base.toFixed(2)}m to {floor.elevation_top > 0 ? '+' : ''}{floor.elevation_top.toFixed(2)}m
                  </span>
                  {isActive && <span className="text-primary font-mono text-[10px] font-semibold">Active</span>}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Projection Modes */}
      <section className="flex flex-col gap-2 pt-2 border-t border-outline-variant/30">
        <span className="font-label-caps uppercase text-on-surface-variant">Projection Mode</span>
        <div className="grid grid-cols-3 gap-1 bg-surface-container p-1 rounded-lg">
          {['isometric', 'exploded', 'xray'].map((mode) => (
            <button
              key={mode}
              onClick={() => onChangeProjection(mode as any)}
              className={`py-1.5 rounded text-body-sm transition-colors ${
                projectionMode === mode
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'text-on-surface hover:bg-surface'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* Visual Layers */}
      <section className="flex flex-col gap-1 pt-2 border-t border-outline-variant/30">
        <div className="flex items-center justify-between pb-1">
          <span className="font-label-caps uppercase text-on-surface-variant">Visual Layers</span>
        </div>
        
        {LAYERS.map(layer => (
          <label key={layer.key} className="flex items-center justify-between p-2 rounded hover:bg-surface-container cursor-pointer transition-colors group">
            <div className="flex items-center gap-3">
              {layer.icon ? (
                <span className="material-icon text-[14px] text-primary">{layer.icon}</span>
              ) : (
                <span className={`w-3 h-3 rounded-full ${layer.color}`} />
              )}
              <span className="text-body-sm text-on-surface group-hover:text-primary transition-colors">
                {layer.label}
              </span>
            </div>
            <input 
              type="checkbox" 
              checked={visibleLayers[layer.key] ?? true}
              onChange={() => onToggleLayer(layer.key)}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </label>
        ))}
      </section>

    </div>
  );
}
