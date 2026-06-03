import React from 'react';

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export default function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`pb-4 text-sm font-semibold transition-all relative cursor-pointer ${
        isActive ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>
      )}
    </button>
  );
}
