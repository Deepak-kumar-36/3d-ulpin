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
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<number | null>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target || !enabled) return;

    // Ordered from bottom to top for logical scrolling
    // (B1 -> GF -> F1 -> F2...)
    const orderedFloors = [...floors].sort((a, b) => a.floor_number - b.floor_number);
    
    const handleWheel = (e: WheelEvent) => {
      // Prevent default page scroll while over the viewport
      e.preventDefault();

      if (isScrolling.current) return;

      const direction = Math.sign(e.deltaY); // 1 = down (scroll towards bottom/negative floors), -1 = up (scroll towards top/positive floors)
      
      let nextFloorId: string | 'all' = activeFloorId;

      if (activeFloorId === 'all') {
        // If showing all, start from the top or bottom depending on scroll direction
        if (direction > 0) {
          nextFloorId = orderedFloors[orderedFloors.length - 1].id; // Go to top floor
        } else {
          nextFloorId = orderedFloors[0].id; // Go to bottom floor
        }
      } else {
        const currentIndex = orderedFloors.findIndex(f => f.id === activeFloorId);
        
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

      if (nextFloorId !== activeFloorId) {
        onSelectFloor(nextFloorId);
        
        // Debounce / Cooldown
        isScrolling.current = true;
        if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current);
        scrollTimeout.current = window.setTimeout(() => {
          isScrolling.current = false;
        }, 400); // 400ms cooldown matches transition duration
      }
    };

    target.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      target.removeEventListener('wheel', handleWheel);
      if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current);
    };
  }, [floors, activeFloorId, onSelectFloor, targetRef, enabled]);
}
