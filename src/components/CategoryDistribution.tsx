'use client';

import React from 'react';
import { formatCents } from '@/lib/moneyUtils';

interface Transaction {
  id: string;
  transactionDate: string;
  amount: number;
  currency: string;
  baseAmountUsd: number;
  transactionType: string;
  note: string | null;
  description: string | null;
  accountId: string;
  categoryId: string;
  subcategoryId: string | null;
  destinationAccountId: string | null;
  account: { name: string };
  category: { name: string };
  subcategory: { name: string } | null;
  destinationAccount: { name: string } | null;
}

interface CategoryDistributionProps {
  transactions: Transaction[];
}

// Beautiful Tailwind color palette for categories
const COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#ef4444', // Red
  '#84cc16', // Lime
];

export default function CategoryDistribution({ transactions }: CategoryDistributionProps) {
  // 1. Filter for expenses only (excluding transfers and income)
  const expenses = transactions.filter((t) => t.transactionType === 'EXPENSE');

  if (expenses.length === 0) {
    return (
      <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 backdrop-blur-sm text-center flex flex-col items-center justify-center space-y-3 min-h-[160px]">
        <div className="p-3 bg-slate-950 border border-slate-900 text-slate-650 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
          </svg>
        </div>
        <p className="text-xs text-slate-500 font-semibold">
          No hay gastos registrados en este período para graficar la distribución.
        </p>
      </div>
    );
  }

  // 2. Aggregate expenses by category
  const categoryTotals: Record<string, { name: string; amountUsd: number }> = {};
  let totalExpenseUsd = 0;

  expenses.forEach((tx) => {
    const catName = tx.category.name;
    const amount = tx.baseAmountUsd; // in cents
    
    totalExpenseUsd += amount;

    if (!categoryTotals[catName]) {
      categoryTotals[catName] = {
        name: catName,
        amountUsd: 0,
      };
    }
    categoryTotals[catName].amountUsd += amount;
  });

  // Convert to array and calculate percentages
  const distribution = Object.values(categoryTotals)
    .map((item, index) => {
      const percentage = totalExpenseUsd > 0 ? (item.amountUsd / totalExpenseUsd) * 100 : 0;
      return {
        ...item,
        percentage,
        color: COLORS[index % COLORS.length],
      };
    })
    .sort((a, b) => b.amountUsd - a.amountUsd);

  // 3. SVG Donut calculation
  const radius = 70;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // approx 439.82

  let accumulatedPercentage = 0;

  return (
    <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 backdrop-blur-md shadow-xl relative overflow-hidden space-y-5">
      {/* Visual Header */}
      <div>
        <h3 className="text-md font-bold text-slate-200 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
          </svg>
          Distribución de Gastos por Categoría
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Análisis de participación de cada categoría sobre tus egresos totales del período.
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Left column: SVG Donut Chart */}
        <div className="relative flex items-center justify-center shrink-0 w-[200px] h-[200px]">
          <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90 select-none">
            {/* Background base circle (empty/track) */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke="#1e293b"
              strokeWidth={strokeWidth}
            />

            {/* SVG slices */}
            {distribution.map((cat, idx) => {
              const sliceLength = (cat.percentage / 100) * circumference;
              const strokeOffset = circumference - ((accumulatedPercentage / 100) * circumference);
              
              // Accumulate percentage for the next slice
              accumulatedPercentage += cat.percentage;

              return (
                <circle
                  key={cat.name}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="transparent"
                  stroke={cat.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${sliceLength} ${circumference}`}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap={cat.percentage > 1.5 ? 'round' : 'butt'}
                  className="transition-all duration-300 hover:stroke-[16px] cursor-pointer"
                  style={{ transformOrigin: 'center' }}
                />
              );
            })}
          </svg>

          {/* Donut Centered Legend */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Egresos</span>
            <span className="text-md font-black text-slate-100 mt-0.5">${formatCents(totalExpenseUsd)}</span>
            <span className="text-[9px] font-semibold text-slate-500">USD</span>
          </div>
        </div>

        {/* Right column: Categories details list with progressive bars */}
        <div className="w-full space-y-3.5 max-h-[220px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          {distribution.map((cat) => (
            <div key={cat.name} className="space-y-1.5 group">
              <div className="flex justify-between items-center text-xs">
                {/* Name with color dot */}
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  ></span>
                  <span className="font-semibold text-slate-200 group-hover:text-white transition-colors">
                    {cat.name}
                  </span>
                </div>
                
                {/* Total and Percentage */}
                <div className="flex items-center gap-2 font-bold">
                  <span className="text-slate-300">${formatCents(cat.amountUsd)}</span>
                  <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-full">
                    {cat.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress bar container */}
              <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.color,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
