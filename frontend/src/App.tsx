import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import AppLayout from './layouts/AppLayout';
import LandingPage from './pages/LandingPage';
import ProjectsPage from './pages/ProjectsPage';
import UploadPage from './pages/UploadPage';
import ProcessingPage from './pages/ProcessingPage';
import DetectedUnitsPage from './pages/DetectedUnitsPage';
import ViewerWorkspace from './pages/ViewerWorkspace';
import ValidationPage from './pages/ValidationPage';
import { SplashScreen } from './components/ui/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <AppLayout>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/project/:id/upload" element={<UploadPage />} />
            <Route path="/project/:id/processing" element={<ProcessingPage />} />
            <Route path="/project/:id/detected" element={<DetectedUnitsPage />} />
            <Route path="/project/:id/viewer" element={<ViewerWorkspace />} />
            <Route path="/project/:id/validation" element={<ValidationPage />} />
          </Routes>
        </AnimatePresence>
      </AppLayout>
    </>
  );
}
