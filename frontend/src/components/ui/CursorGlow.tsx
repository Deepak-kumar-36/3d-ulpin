import { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

export function CursorGlow() {
  const [isVisible, setIsVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  
  const cursorX = useMotionValue(-300);
  const cursorY = useMotionValue(-300);

  // Softer, more fluid spring damping for ambient trailing light
  const springX = useSpring(cursorX, { stiffness: 45, damping: 20, mass: 0.8 });
  const springY = useSpring(cursorY, { stiffness: 45, damping: 20, mass: 0.8 });

  useEffect(() => {
    // Disable atmospheric cursor glow on touch screens
    if (window.matchMedia('(pointer: coarse)').matches) {
      setIsTouch(true);
      return;
    }

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 300); // Center of 600px light sphere
      cursorY.set(e.clientY - 300);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', moveCursor);
    document.body.addEventListener('mouseleave', handleMouseLeave);
    document.body.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
      document.body.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [cursorX, cursorY, isVisible]);

  if (isTouch) return null;

  return (
    <motion.div
      className="pointer-events-none fixed top-0 left-0 z-0 w-[600px] h-[600px] rounded-full blur-[80px]"
      style={{
        x: springX,
        y: springY,
        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 40%, rgba(255, 255, 255, 0) 70%)',
        opacity: isVisible ? 1 : 0,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.4 }}
    />
  );
}
