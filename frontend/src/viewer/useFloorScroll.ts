import { useEffect, useRef } from 'react';
import type { Floor } from '../data/types';

interface Props {
  floors: Floor[];
  activeFloorId: string | 'all';
  onSelectFloor: (id: string | 'all') => void;
  onDeselectUnit?: () => void;
  targetRef: React.RefObject<HTMLDivElement | null>;
  enabled?: boolean;
}

export function useFloorScroll({
  floors,
  activeFloorId,
  onSelectFloor,
  onDeselectUnit,
  targetRef,
  enabled = true,
}: Props) {
  const accumulatedDelta = useRef(0);
  const isCooldown = useRef(false);
  const cooldownTimer = useRef<number | null>(null);
  const decayTimer = useRef<number | null>(null);

  // Stabilize callbacks via refs
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
    if (!target || !enabled) return;

    // Ordered bottom to top: B1, GF, F1, F2, F3, etc.
    const orderedFloors = [...floorsRef.current].sort((a, b) => a.floor_number - b.floor_number);
    if (orderedFloors.length === 0) return;

    const SCROLL_THRESHOLD = 60;

    const changeFloor = (direction: number) => {
      const currentFloors = [...floorsRef.current].sort((a, b) => a.floor_number - b.floor_number);
      if (currentFloors.length === 0) return;

      const currentId = activeFloorIdRef.current;
      let nextFloorId: string | 'all' = currentId;

      if (currentId === 'all') {
        if (direction < 0) {
          const gf = currentFloors.find(f => f.floor_number === 0) || currentFloors[0];
          nextFloorId = gf.id;
        } else {
          nextFloorId = currentFloors[currentFloors.length - 1].id;
        }
      } else {
        const currentIndex = currentFloors.findIndex(f => f.id === currentId);
        if (direction > 0) {
          // Downward -> descend
          if (currentIndex > 0) {
            nextFloorId = currentFloors[currentIndex - 1].id;
          }
        } else {
          // Upward -> ascend
          if (currentIndex < currentFloors.length - 1) {
            nextFloorId = currentFloors[currentIndex + 1].id;
          }
        }
      }

      if (nextFloorId !== currentId) {
        onSelectFloorRef.current(nextFloorId);
        isCooldown.current = true;
        if (cooldownTimer.current) window.clearTimeout(cooldownTimer.current);
        cooldownTimer.current = window.setTimeout(() => {
          isCooldown.current = false;
        }, 320);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isCooldown.current) return;

      accumulatedDelta.current += e.deltaY;

      if (decayTimer.current) window.clearTimeout(decayTimer.current);
      decayTimer.current = window.setTimeout(() => {
        accumulatedDelta.current = 0;
      }, 200);

      if (Math.abs(accumulatedDelta.current) >= SCROLL_THRESHOLD) {
        const direction = Math.sign(accumulatedDelta.current);
        accumulatedDelta.current = 0;
        changeFloor(direction);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Escape') {
        onDeselectUnitRef.current?.();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isCooldown.current) changeFloor(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isCooldown.current) changeFloor(1);
      }
    };

    target.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      target.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      if (cooldownTimer.current) window.clearTimeout(cooldownTimer.current);
      if (decayTimer.current) window.clearTimeout(decayTimer.current);
    };
  }, [targetRef, enabled]);
}
