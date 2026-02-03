'use client';

import { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    // Log error to console with component stack
    console.error('[ERROR_BOUNDARY] Caught error:', error.message);
    console.error('[ERROR_BOUNDARY] Component stack:', errorInfo.componentStack);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with Sentry, LogRocket, or similar
      // sentry.captureException(error, { extra: errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
          <div className="max-w-md w-full p-8 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              Что-то пошло не так
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Произошла ошибка при загрузке компонента. Пожалуйста, обновите страницу.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white hover:bg-blue-700 transition-colors"
            >
              Обновить страницу
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-left text-xs overflow-auto max-h-40">
                <code className="text-red-700 dark:text-red-400">
                  {this.state.error.message}
                </code>
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
