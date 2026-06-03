'use client';

import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  confirmText?: string;
  cancelText?: string;
  onlyConfirm?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isDestructive = true,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onlyConfirm = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isDestructive ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'
            }`}
          >
            {isDestructive ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                />
              </svg>
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-200">{title}</h3>
        </div>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">{message}</p>

        <div className="flex justify-end gap-3 pt-2">
          {!onlyConfirm && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 transition-all cursor-pointer"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer flex items-center gap-2 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/10'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/10'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
