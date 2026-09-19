import { useEffect, useRef } from 'react';
import type { Floor } from '../data/types';

interface Props {
  floors: Floor[];
  activeFloorId: string | 'all';
  onSelectFloor: (id: string | 'all') => void;
  targetRef: React.RefObject<HTMLDivElement | null>;
  enabled?: boolean;
}

export function useFloorScroll({ floors, activeFloorId, onSelectFloor, targetRef, enabled = true }: Props) {
  const accumulatedDelta = useRef(0);
  const isCooldown = useRef(false);
  const cooldownTimer = useRef<number | null>(null);
  const decayTimer = useRef<number | null>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target || !enabled) return;

    // Ordered bottom to top: B1, GF, F1, F2, F3, F4, F5
    const orderedFloors = [...floors].sort((a, b) => a.floor_number - b.floor_number);
    if (orderedFloors.length === 0) return;

    const SCROLL_THRESHOLD = 60; // Threshold prevents hypersensitive trackpad jitter

    const handleWheel = (e: WheelEvent) => {
      // Prevent default browser viewport scrolling
      e.preventDefault();

      if (isCooldown.current) return;

      accumulatedDelta.current += e.deltaY;

      // Clear decay timer on active input
      if (decayTimer.current) window.clearTimeout(decayTimer.current);
      decayTimer.current = window.setTimeout(() => {
        accumulatedDelta.current = 0;
      }, 200);

      if (Math.abs(accumulatedDelta.current) >= SCROLL_THRESHOLD) {
        const direction = Math.sign(accumulatedDelta.current); // > 0 is scroll downward, < 0 is scroll upward
        accumulatedDelta.current = 0;

        let nextFloorId: string | 'all' = activeFloorId;

        if (activeFloorId === 'all') {
          // If starting from full building overview:
          // Scroll up -> enter from Ground Floor (0)
          // Scroll down -> enter from top floor
          if (direction < 0) {
            const gf = orderedFloors.find(f => f.floor_number === 0) || orderedFloors[0];
            nextFloorId = gf.id;
          } else {
            nextFloorId = orderedFloors[orderedFloors.length - 1].id;
          }
        } else {
          const currentIndex = orderedFloors.findIndex(f => f.id === activeFloorId);
          
          if (direction > 0) {
            // Scroll down -> descend stratum (F3 -> F2 -> F1 -> GF -> B1)
            if (currentIndex > 0) {
              nextFloorId = orderedFloors[currentIndex - 1].id;
            }
          } else {
            // Scroll up -> ascend stratum (B1 -> GF -> F1 -> F2 -> F3)
            if (currentIndex < orderedFloors.length - 1) {
              nextFloorId = orderedFloors[currentIndex + 1].id;
            }
          }
        }

        if (nextFloorId !== activeFloorId) {
          onSelectFloor(nextFloorId);
          
          // Cooldown to prevent multi-floor skip from trackpad momentum
          isCooldown.current = true;
          if (cooldownTimer.current) window.clearTimeout(cooldownTimer.current);
          cooldownTimer.current = window.setTimeout(() => {
            isCooldown.current = false;
          }, 320);
        }
      }
    };

    target.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      target.removeEventListener('wheel', handleWheel);
      if (cooldownTimer.current) window.clearTimeout(cooldownTimer.current);
      if (decayTimer.current) window.clearTimeout(decayTimer.current);
    };
  }, [floors, activeFloorId, onSelectFloor, targetRef, enabled]);
}
