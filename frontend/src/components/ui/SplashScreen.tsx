import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hold cleanly before triggering the zoom-in exit animation
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
          }}
          transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000000] overflow-hidden select-none pointer-events-none"
        >
          {/* Pure Verta text with massive zoom-in effect on exit */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 5, filter: 'blur(20px)' }}
            transition={{ 
              duration: 1.2, 
              ease: [0.76, 0, 0.24, 1] 
            }}
            className="flex flex-col items-center justify-center px-6 max-w-[720px] w-full z-20"
          >
            <img
              src="/verta-wordmark.jpg"
              alt="Verta"
              className="w-full max-w-[340px] sm:max-w-[480px] md:max-w-[620px] object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.08)]"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
