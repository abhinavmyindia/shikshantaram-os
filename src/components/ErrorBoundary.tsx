import React from 'react';
import { logError } from '@/utils/errorTracker';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logError('react_error_boundary', error.message, error.stack, {
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(150deg, #f5f3ff 0%, #fdf4ff 20%, #fff7ed 45%, #f0fdf4 70%, #f0f9ff 100%)',
          padding: 20,
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
            borderRadius: 24, padding: '48px 40px', border: '1px solid rgba(255,255,255,0.95)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.1)', maxWidth: 400, textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 20, color: '#0f172a', marginBottom: 8 }}>
              Something went wrong
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>
              Our team has been notified automatically. Please refresh the page.
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white',
                border: 'none', padding: '12px 28px', borderRadius: 12,
                cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14,
                boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
