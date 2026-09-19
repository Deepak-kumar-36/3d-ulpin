import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PROCESSING_STAGES } from '../data/types';
import { runFallbackPipeline, getProject } from '../api/client';

type PipelineStatus = 'running' | 'complete' | 'error';

export default function ProcessingPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [status, setStatus] = useState<PipelineStatus>('running');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        if (id === 'demo' || !id || id === 'new') {
          // Run the fallback / demo pipeline
          // Advance stages as pipeline progresses
          for (let i = 0; i < PROCESSING_STAGES.length - 1; i++) {
            if (!mounted.current) return;
            setCurrentStageIdx(i);
            // The first stage is "Uploading" — skip it for demo (no file)
            if (i === 0) {
              await new Promise((r) => setTimeout(r, 400));
              continue;
            }
            // For the actual pipeline call, do it on stage 1 (detecting)
            if (i === 1) {
              const proj = await runFallbackPipeline();
              if (!mounted.current) return;
              // Fast-forward through remaining stages
              for (let j = 2; j < PROCESSING_STAGES.length - 1; j++) {
                setCurrentStageIdx(j);
                await new Promise((r) => setTimeout(r, 600));
                if (!mounted.current) return;
              }
              // Done
              setCurrentStageIdx(PROCESSING_STAGES.length - 1);
              setStatus('complete');
              await new Promise((r) => setTimeout(r, 800));
              if (mounted.current) {
                navigate(`/project/${proj.id}/viewer`);
              }
              return;
            }
            await new Promise((r) => setTimeout(r, 800));
          }
        } else {
          // Real project — try to fetch processing result
          // The upload already happened, so skip the first stage
          setCurrentStageIdx(1); // Detecting
          await new Promise((r) => setTimeout(r, 600));

          if (!mounted.current) return;
          setCurrentStageIdx(2); // Generating 3D

          // Try to get the project (which was already processed during upload)
          const proj = await getProject(id);
          if (!mounted.current) return;

          setCurrentStageIdx(3); // Assigning ULPINs
          await new Promise((r) => setTimeout(r, 500));
          if (!mounted.current) return;

          setCurrentStageIdx(4); // Validating
          await new Promise((r) => setTimeout(r, 500));
          if (!mounted.current) return;

          setCurrentStageIdx(PROCESSING_STAGES.length - 1);
          setStatus('complete');
          await new Promise((r) => setTimeout(r, 800));
          if (mounted.current) {
            navigate(`/project/${proj.id}/viewer`);
          }
        }
      } catch (err: unknown) {
        if (!mounted.current) return;
        const msg = err instanceof Error ? err.message : 'Processing failed';
        setErrorMsg(msg);
        setStatus('error');
      }
    };

    run();
  }, [id, navigate]);

  const handleRetry = () => {
    setStatus('running');
    setErrorMsg(null);
    setCurrentStageIdx(0);
    // Re-trigger by navigating to itself
    navigate(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-surface p-6"
    >
      <div className="w-full max-w-lg bg-surface-container-lowest p-8 border border-outline-variant/20 relative overflow-hidden">

        <div className="relative z-10 flex flex-col items-center text-center gap-8">

          <div className="flex flex-col items-center gap-3">
            <span className="font-label-caps uppercase text-on-surface-variant tracking-widest">
              {status === 'error' ? 'Processing Failed' : status === 'complete' ? 'Complete' : 'Processing'}
            </span>
            <h2 className="font-headline text-headline-md text-primary">
              {id === 'demo' || !id || id === 'new' ? 'Demo Building' : `Project ${id.slice(0, 8)}…`}
            </h2>
          </div>

          {/* Active Stage Display */}
          <div className="h-[120px] flex items-center justify-center w-full">
            {status === 'error' ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 flex items-center justify-center bg-error/10">
                  <span className="material-icon text-[32px] text-error">error</span>
                </div>
                <span className="font-body text-body-md text-error max-w-sm">
                  {errorMsg || 'An unexpected error occurred.'}
                </span>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStageIdx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div
                    className={`w-16 h-16 flex items-center justify-center ${
                      status === 'complete'
                        ? 'bg-tertiary text-on-tertiary'
                        : 'bg-surface-container-high text-primary'
                    }`}
                  >
                    <span
                      className={`material-icon text-[32px] ${
                        status !== 'complete' ? 'animate-pulse' : ''
                      }`}
                    >
                      {PROCESSING_STAGES[currentStageIdx].icon}
                    </span>
                  </div>
                  <span className="font-body text-body-lg text-on-surface font-medium">
                    {PROCESSING_STAGES[currentStageIdx].label}
                  </span>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Progress Bar */}
          {status !== 'error' && (
            <div className="w-full flex flex-col gap-2 mt-4">
              <div className="h-1.5 w-full bg-surface-container-high overflow-hidden">
                <motion.div
                  className={`h-full ${status === 'complete' ? 'bg-tertiary' : 'bg-primary'}`}
                  initial={{ width: '0%' }}
                  animate={{
                    width: `${(currentStageIdx / (PROCESSING_STAGES.length - 1)) * 100}%`,
                  }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between font-mono text-[10px] text-on-surface-variant">
                <span>STAGE {currentStageIdx + 1} / {PROCESSING_STAGES.length}</span>
                <span>{Math.round((currentStageIdx / (PROCESSING_STAGES.length - 1)) * 100)}%</span>
              </div>
            </div>
          )}

          {/* Error actions */}
          {status === 'error' && (
            <div className="flex gap-3 mt-2">
              <button onClick={handleRetry} className="cadastre-btn-primary">
                <span className="material-icon text-[16px]">refresh</span>
                Retry
              </button>
              <button onClick={() => navigate('/project/new/upload')} className="cadastre-btn-secondary">
                <span className="material-icon text-[16px]">arrow_back</span>
                Back to Upload
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
