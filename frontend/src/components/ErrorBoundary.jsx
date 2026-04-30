import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg-main p-4">
          <div className="w-full max-w-md bg-bg-card border border-border-subtle rounded-2xl p-8 text-center shadow-xl animate-fade-up">
            <div className="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-3">Something went wrong</h2>
            <p className="text-text-secondary text-sm mb-8 leading-relaxed">
              We encountered an unexpected error. Please try refreshing the page or going back.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-accent text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} /> Refresh Page
              </button>
              <button 
                onClick={() => this.setState({ hasError: false })}
                className="w-full py-3 bg-text-primary/5 text-text-primary rounded-xl font-semibold hover:bg-text-primary/10 transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
