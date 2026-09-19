import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CursorGlow } from '../components/ui/CursorGlow';

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isViewer = location.pathname.includes('/viewer');

  return (
    <>
      <CursorGlow />

      <div className="flex flex-col min-h-screen">
        {/* Technical Architectural Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 border-b border-outline/30 backdrop-blur-md">
          <div className="h-16 w-full px-6 flex items-center justify-between font-mono text-[11px] tracking-widest uppercase">
            
            {/* Brand */}
            <div className="flex items-center gap-4">
              <Link to="/" className="text-on-surface font-bold text-sm tracking-tighter hover:text-primary transition-colors">
                VERTA
              </Link>
              <span className="text-outline">/</span>
              <span className="hidden sm:inline text-on-surface-variant text-[10px]">
                3D VERTICAL CADASTRE ENGINE
              </span>
            </div>

            {/* Technical Navigation */}
            <nav className="hidden md:flex items-center gap-6 text-on-surface-variant text-[10px]">
              <Link 
                to="/project/demo/viewer" 
                className={`transition-colors hover:text-primary ${isViewer ? 'text-primary font-semibold' : ''}`}
              >
                3D CADASTRE
              </Link>
              <Link 
                to="/projects" 
                className="transition-colors hover:text-primary"
              >
                PROJECTS
              </Link>
              <Link 
                to="/project/demo/upload" 
                className="transition-colors hover:text-primary"
              >
                UPLOAD PLAN
              </Link>
              <Link 
                to="/project/demo/validation" 
                className="transition-colors hover:text-primary"
              >
                VALIDATION
              </Link>
            </nav>

            {/* Direct Workspace Action */}
            <div className="flex items-center gap-4">
              <Link 
                to="/project/demo/viewer" 
                className="px-3.5 py-1.5 bg-surface-container border border-outline hover:border-primary hover:text-primary transition-all text-[10px] tracking-wider rounded font-mono flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>WORKSPACE</span>
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
