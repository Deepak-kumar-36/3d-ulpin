import { type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CursorGlow } from '../components/ui/CursorGlow';

export default function AppLayout({ children }: { children: ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Only show splash on initial load
    const timer = setTimeout(() => setShowSplash(false), 2400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <CursorGlow />
      
      {/* Entry Splash Animation */}
      <AnimatePresence>
        {showSplash && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ 
              opacity: 0,
              scale: 1.1,
              filter: 'blur(10px)',
            }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[100] bg-surface flex items-center justify-center overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative flex flex-col items-center"
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.8, duration: 0.8, ease: "easeInOut" }}
                className="absolute top-1/2 left-0 h-[1px] bg-on-surface/20 -translate-y-1/2 w-[200vw] -ml-[50vw]"
              />
              <motion.h1 
                className="font-display text-[80px] md:text-[140px] font-bold tracking-tighter text-on-surface bg-surface px-8 z-10 mix-blend-difference"
                initial={{ letterSpacing: '0.1em', filter: 'blur(10px)' }}
                animate={{ letterSpacing: '-0.04em', filter: 'blur(0px)' }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              >
                Verta
              </motion.h1>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col min-h-screen">
        {/* New Verta Header matching reference image */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-outline backdrop-blur-md bg-surface/80">
          <div className="h-16 w-full px-6 flex items-center justify-between font-mono text-[10px] tracking-widest uppercase text-on-surface-variant">
            
            <div className="flex items-center gap-4">
              <Link to="/" className="text-on-surface font-bold hover:text-tertiary transition-colors">
                VERTA
              </Link>
              <span className="hidden sm:inline">VERTA CADASTRE ENGINE</span>
            </div>

            <div className="flex items-center gap-6">
              <Link to="/project/demo/viewer" className="px-3 py-1.5 border border-outline hover:bg-surface-container-high transition-colors">
                ENTER WORKSPACE
              </Link>
            </div>
          </div>
        </header>

        <main className="w-full pt-16 flex-1 flex flex-col bg-surface grid-bg relative z-0">
          {children}
        </main>
      </div>
    </>
  );
}
