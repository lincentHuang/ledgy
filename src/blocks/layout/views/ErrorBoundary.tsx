'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center text-center">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
            <h2 className="text-lg font-bold text-rose-400 mb-2">應用程式發生非預期錯誤</h2>
            <p className="text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-xl mb-4 overflow-x-auto text-left whitespace-pre-wrap">
              {this.state.error?.message || '未知錯誤'}
              {'\n'}
              {this.state.error?.stack}
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition"
            >
              清除快取並重新載入
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
