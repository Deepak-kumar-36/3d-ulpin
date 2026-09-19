import { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

export function CursorGlow() {
  const [isVisible, setIsVisible] = useState(false);
  
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  // Smooth springs for a fluid, laggy follow effect
  const springX = useSpring(cursorX, { stiffness: 100, damping: 25, mass: 0.5 });
  const springY = useSpring(cursorY, { stiffness: 100, damping: 25, mass: 0.5 });

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 250); // offset by half width (500/2)
      cursorY.set(e.clientY - 250);
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

  return (
    <motion.div
      className="pointer-events-none fixed top-0 left-0 z-0 w-[500px] h-[500px] rounded-full mix-blend-screen"
      style={{
        x: springX,
        y: springY,
        background: 'radial-gradient(circle, rgba(141,163,153,0.06) 0%, rgba(141,163,153,0) 70%)',
        opacity: isVisible ? 1 : 0,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.5 }}
    />
  );
}
