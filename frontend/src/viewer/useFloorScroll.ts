import { useEffect, useRef } from 'react';
import type { Floor } from '../data/types';

interface Props {
  floors: Floor[];
  activeFloorId: string | 'all';
  onSelectFloor: (id: string | 'all') => void;
  onDeselectUnit: () => void;
  targetRef: React.RefObject<HTMLDivElement | null>;
}

export function useFloorScroll({ floors, activeFloorId, onSelectFloor, onDeselectUnit, targetRef }: Props) {
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<number | null>(null);

  // Stabilize the callbacks via ref so the effect doesn't constantly re-run
  const onSelectFloorRef = useRef(onSelectFloor);
  const onDeselectUnitRef = useRef(onDeselectUnit);
  const activeFloorIdRef = useRef(activeFloorId);
  const floorsRef = useRef(floors);

  useEffect(() => {
    onSelectFloorRef.current = onSelectFloor;
    onDeselectUnitRef.current = onDeselectUnit;
    activeFloorIdRef.current = activeFloorId;
    floorsRef.current = floors;
  }, [onSelectFloor, onDeselectUnit, activeFloorId, floors]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const getNextFloorId = (direction: number): string | 'all' => {
      const currentFloors = floorsRef.current;
      if (!currentFloors.length) return 'all';

      // Ordered from bottom to top for logical scrolling
      const orderedFloors = [...currentFloors].sort((a, b) => a.floor_number - b.floor_number);
      const currentFloorId = activeFloorIdRef.current;

      let nextFloorId: string | 'all' = currentFloorId;

      if (currentFloorId === 'all') {
        if (direction > 0) {
          nextFloorId = orderedFloors[orderedFloors.length - 1].id; // Go to top floor
        } else {
          nextFloorId = orderedFloors[0].id; // Go to bottom floor
        }
      } else {
        const currentIndex = orderedFloors.findIndex(f => f.id === currentFloorId);
        if (direction > 0) {
          // Scroll down -> go to lower floor
          if (currentIndex > 0) {
            nextFloorId = orderedFloors[currentIndex - 1].id;
          } else {
            nextFloorId = 'all'; // Go back to all when hitting bottom
          }
        } else {
          // Scroll up -> go to higher floor
          if (currentIndex < orderedFloors.length - 1) {
            nextFloorId = orderedFloors[currentIndex + 1].id;
          } else {
            nextFloorId = 'all'; // Go back to all when hitting top
          }
        }
      }
      return nextFloorId;
    };

    const handleSelectNextFloor = (direction: number) => {
      const nextFloorId = getNextFloorId(direction);
      if (nextFloorId !== activeFloorIdRef.current) {
        onSelectFloorRef.current(nextFloorId);
        
        // Debounce / Cooldown
        isScrolling.current = true;
        if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current);
        scrollTimeout.current = window.setTimeout(() => {
          isScrolling.current = false;
        }, 400); // 400ms cooldown matches transition duration
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // Only switch floors when Shift is held
      if (!e.shiftKey) return;
      
      e.preventDefault();
      if (isScrolling.current) return;

      const direction = Math.sign(e.deltaY);
      handleSelectNextFloor(direction);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Escape') {
        if (onDeselectUnitRef.current) {
          onDeselectUnitRef.current();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isScrolling.current) handleSelectNextFloor(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isScrolling.current) handleSelectNextFloor(1);
      }
    };

    target.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      target.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current);
    };
  }, [targetRef]);
}
