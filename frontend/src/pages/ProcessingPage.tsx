import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { detectPlan, getDemoProject, buildProjectFromVision } from '../api/client';
import type { VisionFloor } from '../api/client';

type Status = 'detecting' | 'done' | 'error';

export default function ProcessingPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const projectName: string = location.state?.projectName || 'Untitled Project';
  const files: File[] = location.state?.files || [];
  const floorLabels: string[] = location.state?.floorLabels || files.map((_, i) => `L${i + 1}`);

  const [status, setStatus] = useState<Status>('detecting');
  const [currentFileIdx, setCurrentFileIdx] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const runDetection = useCallback(async () => {
    if (files.length === 0) {
      setErrorMessage('No files were provided. Go back and upload floor plans.');
      setStatus('error');
      return;
    }

    setStatus('detecting');
    setErrorMessage('');
    const collected: VisionFloor[] = [];

    for (let i = 0; i < files.length; i++) {
      setCurrentFileIdx(i);
      try {
        const result = await detectPlan(files[i], floorLabels[i]);
        collected.push(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown detection error';
        setErrorMessage(msg);
        setStatus('error');
        return;
      }
    }

    // All floors detected successfully
    // Store raw vision results + converted project in sessionStorage
    sessionStorage.setItem('verta_vision_results', JSON.stringify(collected));
    const project = buildProjectFromVision(collected, projectName);
    sessionStorage.setItem('verta_detected_project', JSON.stringify(project));

    // Also store the image data URLs for the overlay page
    const imageDataUrls: string[] = [];
    for (const f of files) {
      const dataUrl = await fileToDataUrl(f);
      imageDataUrls.push(dataUrl);
    }
    sessionStorage.setItem('verta_uploaded_images', JSON.stringify(imageDataUrls));

    setStatus('done');

    // Brief pause on "done" then navigate
    setTimeout(() => {
      navigate(`/project/detected/detected`);
    }, 800);
  }, [files, floorLabels, projectName, navigate]);

  useEffect(() => {
    runDetection();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => {
    setStatus('detecting');
    setCurrentFileIdx(0);
    setErrorMessage('');
    runDetection();
  };

  const handleUseDemoData = () => {
    const demo = getDemoProject();
    sessionStorage.setItem('verta_detected_project', JSON.stringify(demo));
    sessionStorage.removeItem('verta_vision_results');
    sessionStorage.removeItem('verta_uploaded_images');
    navigate(`/project/demo/detected`);
  };

  const stageLabel = status === 'detecting'
    ? `Detecting floor ${floorLabels[currentFileIdx] || '?'} (${currentFileIdx + 1} of ${files.length})...`
    : status === 'done'
      ? 'Detection complete!'
      : 'Detection failed';

  const stageIcon = status === 'detecting' ? 'search' : status === 'done' ? 'check_circle' : 'error';
  const progress = status === 'done' ? 1 : files.length > 0 ? currentFileIdx / files.length : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-surface p-6"
    >
      <div className="w-full max-w-lg bg-surface-container-lowest p-8 rounded-xl shadow-cadastre border border-outline-variant/20 relative overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 bg-primary-fixed-dim/10 transition-opacity duration-1000"
          style={{ opacity: progress }}
        />

        <div className="relative z-10 flex flex-col items-center text-center gap-8">
          <div className="flex flex-col items-center gap-3">
            <span className="font-label-caps uppercase text-on-surface-variant tracking-widest">
              Step 2 of 4 &mdash; Processing
            </span>
            <h2 className="font-headline text-headline-md text-primary">
              {projectName}
            </h2>
          </div>

          {/* Stage display */}
          <div className="h-[120px] flex items-center justify-center w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={stageLabel}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-4"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-sm ${
                  status === 'error'
                    ? 'bg-error/20 text-error'
                    : status === 'done'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-primary'
                }`}>
                  <span className={`material-icon text-[32px] ${status === 'detecting' ? 'animate-pulse' : ''}`}>
                    {stageIcon}
                  </span>
                </div>
                <span className="font-body text-body-lg text-on-surface font-medium">
                  {stageLabel}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="w-full flex flex-col gap-2 mt-4">
            <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${status === 'error' ? 'bg-error' : 'bg-primary'}`}
                initial={{ width: '0%' }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Error state */}
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex flex-col gap-4"
            >
              <div className="bg-error/10 border border-error/30 rounded-lg p-4 text-left">
                <p className="text-error text-body-sm font-medium mb-1">Detection Error</p>
                <p className="text-on-surface-variant text-body-sm">{errorMessage}</p>
              </div>

              <div className="flex gap-3 justify-center">
                <button onClick={handleRetry} className="cadastre-btn-primary">
                  <span className="material-icon text-[18px]">refresh</span>
                  Retry
                </button>
                <button onClick={handleUseDemoData} className="cadastre-btn-secondary">
                  <span className="material-icon text-[18px]">science</span>
                  Use demo data
                </button>
              </div>

              <p className="text-on-surface-variant text-body-sm mt-2">
                <strong>Tips for better detection:</strong> Use a top-down scan or photo with clear dark walls on a white background. Avoid tilted photos, blurry images, or colored blueprints.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
