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

export default function App() {
  return (
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
  );
}
