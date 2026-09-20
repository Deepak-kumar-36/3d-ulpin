import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Unit, Property } from '../../data/types';
import { createProperty } from '../../api/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedUnits: Unit[];
  projectId: string;
  onPropertyCreated: (property: Property) => void;
}

export default function CreatePropertyModal({ isOpen, onClose, selectedUnits, projectId, onPropertyCreated }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdProperty, setCreatedProperty] = useState<Property | null>(null);

  const totalArea = selectedUnits.reduce((sum, u) => sum + u.area, 0);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter a property name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await createProperty(
        projectId,
        name.trim(),
        selectedUnits.map(u => u.id),
        description.trim(),
      );
      setCreatedProperty(result);
      onPropertyCreated(result);
    } catch (err: any) {
      setError(err.message || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setError('');
    setCreatedProperty(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-surface-container rounded-2xl shadow-cadastre border border-outline-variant/30 w-[480px] max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-outline-variant/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <span className="material-icon text-primary text-[22px]">link</span>
              </div>
              <div>
                <h2 className="font-headline text-headline-sm text-on-surface">
                  {createdProperty ? 'Property Created' : 'Create Property Bundle'}
                </h2>
                <p className="text-body-sm text-on-surface-variant">
                  {createdProperty ? 'Units have been grouped successfully' : 'Group selected units into one logical property'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
            >
              <span className="material-icon text-[18px]">close</span>
            </button>
          </div>

          {/* Content */}
          <div className="p-5 flex flex-col gap-5">
            {createdProperty ? (
              /* Success View */
              <div className="flex flex-col gap-4">
                <div className="bg-primary/10 border border-primary/25 rounded-xl p-4 flex items-center gap-3">
                  <span className="material-icon text-primary text-[28px]">check_circle</span>
                  <div>
                    <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant block">Property ID</span>
                    <span className="font-mono text-data-mono text-primary text-xl font-bold">{createdProperty.property_id}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-container-low rounded-lg p-3">
                    <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant block mb-1">Name</span>
                    <span className="font-body text-body-sm text-on-surface">{createdProperty.name}</span>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3">
                    <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant block mb-1">Total Area</span>
                    <span className="font-mono text-data-mono text-on-surface">{createdProperty.total_area.toFixed(2)} m²</span>
                  </div>
                </div>

                <div className="bg-surface-container-low rounded-lg p-3">
                  <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant block mb-2">Grouped Units</span>
                  <div className="flex flex-col gap-1.5">
                    {selectedUnits.map(u => (
                      <div key={u.id} className="flex items-center justify-between text-body-sm">
                        <span className="font-mono text-[11px] text-on-surface">{u.ulpin_3d}</span>
                        <span className="text-on-surface-variant text-[11px]">{u.area.toFixed(2)} m²</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm uppercase tracking-wider hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Form View */
              <>
                {/* Selected Units Summary */}
                <div className="bg-surface-container-low rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">
                      Selected Units ({selectedUnits.length})
                    </span>
                    <span className="font-mono text-data-mono text-on-surface text-sm">{totalArea.toFixed(2)} m²</span>
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto">
                    {selectedUnits.map(u => (
                      <div key={u.id} className="flex items-center justify-between py-1 border-b border-outline-variant/10 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary/60" />
                          <span className="font-mono text-[11px] text-on-surface">{u.ulpin_3d}</span>
                        </div>
                        <span className="text-on-surface-variant text-[11px]">Floor {u.floor_number} · {u.area.toFixed(1)} m²</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Property Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">
                    Property Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Combined Commercial Space"
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional notes about this property grouping..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all text-sm resize-none"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-error-container/30 border border-error-container text-error p-3 rounded-lg text-body-sm flex items-center gap-2">
                    <span className="material-icon text-[16px]">error</span>
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant font-semibold text-sm uppercase tracking-wider hover:bg-surface-container-high transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !name.trim()}
                    className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm uppercase tracking-wider hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="animate-spin material-icon text-[16px]">progress_activity</span>
                    ) : (
                      <span className="material-icon text-[16px]">link</span>
                    )}
                    {loading ? 'Creating...' : 'Create Property'}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
