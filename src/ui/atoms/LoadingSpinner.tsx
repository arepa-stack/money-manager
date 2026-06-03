import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

export default function LoadingSpinner({
  message = 'Cargando...',
  size = 'md',
  fullPage = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-10 h-10 border-3',
  };

  const containerContent = (
    <>
      <div className="relative flex items-center justify-center">
        <div
          className={`${sizeClasses[size]} border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin`}
        ></div>
      </div>
      {message && (
        <p className="text-slate-500 text-xs font-semibold animate-pulse">{message}</p>
      )}
    </>
  );

  if (fullPage) {
    return (
      <main className="min-h-screen bg-slate-955 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-slate-950 to-slate-900 text-slate-100 font-sans flex flex-col items-center justify-center space-y-4">
        {containerContent}
      </main>
    );
  }

  return (
    <div className="bg-slate-900/20 border border-slate-900 rounded-3xl py-20 flex flex-col items-center justify-center space-y-3 backdrop-blur-sm">
      {containerContent}
    </div>
  );
}
