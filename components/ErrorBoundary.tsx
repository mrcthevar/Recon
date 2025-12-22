
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // In a real production app, you would log this to Sentry/Datadog here
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
          <div className="max-w-md w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              Recon encountered an unexpected error. Our team has been notified.
            </p>
            
            <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg mb-6 text-left overflow-hidden">
                <p className="font-mono text-xs text-red-500 break-all">
                    {this.state.error?.message || "Unknown Application Error"}
                </p>
            </div>

            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center px-4 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    // Fix: Cast this to any to access props if TypeScript fails to infer properties from Component class
    return (this as any).props.children;
  }
}