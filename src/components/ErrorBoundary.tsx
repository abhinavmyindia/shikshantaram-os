import React from 'react';
import { supabase } from '@/integrations/supabase/client';

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, info: React.ErrorInfo) {
    const errorId = crypto.randomUUID();
    this.setState({ errorId });

    // Try Edge Function first
    try {
      const { error: fnErr } = await supabase.functions.invoke('log-error', {
        body: {
          errorType: 'react_error_boundary',
          severity: 'critical',
          message: error.message,
          stackTrace: error.stack,
          module: window.location.href.includes('admin') ? 'admin' : 'app',
          pageUrl: window.location.href,
          additionalData: {
            componentStack: info.componentStack?.substring(0, 2000),
            errorId,
          },
        },
      });
      if (!fnErr) return;
    } catch (_) {}

    // Fallback: direct insert
    try {
      await supabase.from('error_logs').insert({
        error_type: 'react_error_boundary',
        severity: 'critical',
        message: error.message,
        stack_trace: (error.stack || '').substring(0, 5000),
        module: window.location.href.includes('admin') ? 'admin' : 'app',
        page_url: window.location.href,
        additional_data: {
          componentStack: info.componentStack?.substring(0, 2000),
          errorId,
        },
        is_resolved: false,
      });
    } catch (_) {}
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
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 8 }}>
              Our team has been notified automatically and will fix this soon.
            </div>
            {this.state.errorId && (
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#94a3b8', marginBottom: 20 }}>
                Error ID: {this.state.errorId}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white',
                border: 'none', padding: '14px 32px', borderRadius: 12,
                cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15,
                boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
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
