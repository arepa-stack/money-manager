import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="bg-slate-900/20 border border-slate-900 rounded-3xl py-16 px-6 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto backdrop-blur-sm">
      {icon && (
        <div className="p-4 bg-slate-900 border border-slate-850 text-indigo-400/80 rounded-full shadow-inner animate-pulse">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="font-bold text-slate-200 text-md">{title}</h3>
        <p className="text-slate-500 text-sm mt-1">{description}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-xs font-semibold text-indigo-400 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl transition-all cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
