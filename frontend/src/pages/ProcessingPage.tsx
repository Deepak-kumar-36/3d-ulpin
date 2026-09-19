import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PROCESSING_STAGES } from '../data/types';
import { runFallbackPipeline } from '../api/client';

export default function ProcessingPage() {
  const navigate = useNavigate();
  const [currentStageIdx, setCurrentStageIdx] = useState(0);

  useEffect(() => {
    // Simulate pipeline progression
    let mounted = true;
    
    const run = async () => {
      // Fake delay for each stage to show off the UI
      for (let i = 0; i < PROCESSING_STAGES.length - 1; i++) {
        if (!mounted) return;
        setCurrentStageIdx(i);
        await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
      }
      
      if (!mounted) return;
      setCurrentStageIdx(PROCESSING_STAGES.length - 1);
      
      // Hit the API to get the processed project
      const proj = await runFallbackPipeline();
      
      // Wait a moment on "Ready" before redirecting
      await new Promise(r => setTimeout(r, 1000));
      if (!mounted) return;
      
      // Redirect to the 3D Viewer workspace
      navigate(`/project/${proj.id}/viewer`);
    };
    
    run();
    return () => { mounted = false; };
  }, [navigate]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-surface p-6"
    >
      <div className="w-full max-w-lg bg-surface-container-lowest p-8 rounded-xl shadow-cadastre border border-outline-variant/20 relative overflow-hidden">
        
        {/* Subtle background glow based on progress */}
        <div 
          className="absolute inset-0 bg-primary-fixed-dim/10 transition-opacity duration-1000"
          style={{ opacity: currentStageIdx / (PROCESSING_STAGES.length - 1) }}
        />

        <div className="relative z-10 flex flex-col items-center text-center gap-8">
          
          <div className="flex flex-col items-center gap-3">
            <span className="font-label-caps uppercase text-on-surface-variant tracking-widest">
              Processing Cadastre
            </span>
            <h2 className="font-headline text-headline-md text-primary">
              Metropolis Tower
            </h2>
          </div>

          {/* Active Stage Display */}
          <div className="h-[120px] flex items-center justify-center w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStageIdx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-4"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-sm ${
                  currentStageIdx === PROCESSING_STAGES.length - 1 
                    ? 'bg-primary text-on-primary' 
                    : 'bg-surface-container-high text-primary'
                }`}>
                  <span className={`material-icon text-[32px] ${currentStageIdx !== PROCESSING_STAGES.length - 1 ? 'animate-pulse' : ''}`}>
                    {PROCESSING_STAGES[currentStageIdx].icon}
                  </span>
                </div>
                <span className="font-body text-body-lg text-on-surface font-medium">
                  {PROCESSING_STAGES[currentStageIdx].label}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress Bar */}
          <div className="w-full flex flex-col gap-2 mt-4">
            <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: '0%' }}
                animate={{ width: `${(currentStageIdx / (PROCESSING_STAGES.length - 1)) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between font-mono text-[10px] text-on-surface-variant">
              <span>INITIALIZING</span>
              <span>COMPUTING</span>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
