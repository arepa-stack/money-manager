'use client';

import React from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export default function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[250] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        let bgBorderClass = 'bg-slate-950/95 border-slate-850';
        let textClass = 'text-slate-100';
        let iconMarkup = null;

        if (toast.type === 'success') {
          bgBorderClass = 'bg-emerald-950/20 border-emerald-500/20';
          textClass = 'text-slate-200';
          iconMarkup = (
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-450 shrink-0 select-none">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
          );
        } else if (toast.type === 'error') {
          bgBorderClass = 'bg-rose-950/20 border-rose-500/20';
          textClass = 'text-slate-200';
          iconMarkup = (
            <div className="w-6 h-6 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0 select-none">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </div>
          );
        } else {
          bgBorderClass = 'bg-indigo-950/20 border-indigo-500/20';
          textClass = 'text-slate-200';
          iconMarkup = (
            <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 select-none">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </div>
          );
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 border p-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-semibold ${bgBorderClass} ${textClass} animate-slide-in transition-all`}
            role="alert"
          >
            <div className="flex items-center gap-3 min-w-0">
              {iconMarkup}
              <span className="truncate pr-2 leading-relaxed">{toast.message}</span>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {toast.actionLabel && toast.onAction && (
                <button
                  onClick={() => {
                    toast.onAction?.();
                    onClose(toast.id);
                  }}
                  className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/30 rounded-lg transition-all cursor-pointer select-none"
                >
                  {toast.actionLabel}
                </button>
              )}
              
              <button
                onClick={() => onClose(toast.id)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-250 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
                title="Cerrar notificación"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
