import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Unit } from '../../data/types';

interface Props {
  selectedUnits: Unit[];
  onClearSelection: () => void;
  onCreateProperty: () => void;
}

export default function PropertySelectionBar({ selectedUnits, onClearSelection, onCreateProperty }: Props) {
  const totalArea = useMemo(() => {
    return selectedUnits.reduce((sum, u) => sum + u.area, 0);
  }, [selectedUnits]);

  if (selectedUnits.length < 2) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface-container-highest/95 backdrop-blur-xl border border-primary/30 rounded-2xl shadow-cadastre px-6 py-4 flex items-center gap-6 min-w-[480px]"
      >
        {/* Selection Count */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
            <span className="material-icon text-primary text-[20px]">select_all</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">Selected Units</span>
            <span className="font-mono text-data-mono text-primary text-lg leading-tight font-semibold">{selectedUnits.length}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-outline-variant/30" />

        {/* Unit IDs list */}
        <div className="flex flex-col gap-0.5 max-w-[200px]">
          <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">Unit IDs</span>
          <div className="flex flex-wrap gap-1">
            {selectedUnits.slice(0, 4).map(u => (
              <span key={u.id} className="font-mono text-[10px] text-on-surface bg-surface-container px-1.5 py-0.5 rounded">
                {u.ulpin_3d.split('-').slice(-2).join('-')}
              </span>
            ))}
            {selectedUnits.length > 4 && (
              <span className="font-mono text-[10px] text-on-surface-variant">+{selectedUnits.length - 4}</span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-outline-variant/30" />

        {/* Total Area */}
        <div className="flex flex-col">
          <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">Total Area</span>
          <span className="font-mono text-data-mono text-on-surface text-sm">{totalArea.toFixed(2)} m²</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={onClearSelection}
            className="px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer"
          >
            Clear
          </button>
          <button
            onClick={onCreateProperty}
            className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-xs uppercase tracking-wider hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <span className="material-icon text-[16px]">link</span>
            Create Property
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
