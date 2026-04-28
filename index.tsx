import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly declare state and props to ensure TypeScript recognizes them
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    // Explicitly assign props and state
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full border border-red-100">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <AlertCircle className="text-red-500" size={24} />
            </div>
            <h1 className="text-lg font-bold text-slate-800 mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-500 mb-4 break-words">{this.state.error?.message || "Unknown error occurred"}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium w-full hover:bg-slate-800"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
