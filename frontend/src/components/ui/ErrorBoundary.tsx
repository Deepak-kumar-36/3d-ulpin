import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-surface text-on-surface p-6 text-center">
          <span className="material-icon text-[48px] text-error mb-4">warning</span>
          <h2 className="font-headline text-headline-sm mb-2 text-primary">WebGL Context Error</h2>
          <p className="text-body-sm text-on-surface-variant mb-6">
            The 3D renderer encountered an unexpected error. This might be due to a lost WebGL context or hardware acceleration issue.
          </p>
          <button 
            className="cadastre-btn-primary"
            onClick={() => window.location.reload()}
          >
            Reload Workspace
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
