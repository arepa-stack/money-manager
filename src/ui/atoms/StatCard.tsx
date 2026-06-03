import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  titleColorClass?: string;
  valueColorClass?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  titleColorClass = 'text-slate-400',
  valueColorClass = 'text-slate-100',
}: StatCardProps) {
  return (
    <div className="bg-slate-900/40 border border-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-sm shadow-md">
      <p className={`text-sm font-medium ${titleColorClass}`}>{title}</p>
      <p className={`text-3xl font-extrabold mt-2 ${valueColorClass}`}>
        {value}
      </p>
      <span className="text-[10px] text-slate-500 mt-2 block">{subtitle}</span>
    </div>
  );
}
