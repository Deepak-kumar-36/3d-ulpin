import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isExpanding, setIsExpanding] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Start expanding after a brief delay
    const timer = setTimeout(() => {
      setIsExpanding(true);
    }, 1500); // 1.5s to show the logo/loader

    return () => clearTimeout(timer);
  }, []);

  const handleAnimationComplete = () => {
    setIsDone(true);
    onComplete();
  };

  if (isDone) return null;

  return (
    <AnimatePresence>
      {!isExpanding && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d0e0c]" // Verta dark background
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col items-center gap-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-primary-fixed font-headline text-5xl tracking-tight"
            >
              VERTA
            </motion.div>
            
            <div className="relative w-12 h-12">
              <motion.div
                className="absolute inset-0 border-2 border-primary-fixed rounded-full border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {isExpanding && (
        <motion.div
          key="expand"
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        >
          <motion.div
            className="absolute inset-0 bg-[#0d0e0c]"
            exit={{ opacity: 0 }}
          />
          {/* The expanding circle that 'eats' the screen */}
          <motion.div
            className="bg-surface rounded-full z-[101]"
            initial={{ width: 0, height: 0 }}
            animate={{ 
              width: '150vw', 
              height: '150vw',
            }}
            transition={{ 
              duration: 1.2, 
              ease: [0.76, 0, 0.24, 1] // Apple/Google style smooth easeInOut
            }}
            onAnimationComplete={handleAnimationComplete}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
