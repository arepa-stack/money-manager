'use client';

import React, { useState, useEffect } from 'react';

interface EvolutionPoint {
  month: string;
  balance: number;
}

export default function MonthlyEvolutionChart() {
  const [data, setData] = useState<EvolutionPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvolution = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/reports/evolution');
        if (!res.ok) {
          throw new Error('Error al cargar datos del gráfico');
        }
        const reports = await res.json();
        setData(reports);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'No se pudo cargar la evolución mensual');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvolution();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full bg-slate-900/30 border border-slate-900 p-6 rounded-3xl backdrop-blur-sm animate-pulse space-y-4">
        <div className="h-4 bg-slate-800 rounded w-1/4"></div>
        <div className="h-48 bg-slate-800/40 rounded-2xl w-full"></div>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="w-full bg-slate-900/30 border border-slate-900 p-8 rounded-3xl backdrop-blur-sm text-center flex flex-col items-center justify-center space-y-3 min-h-[200px]">
        <div className="p-3 bg-slate-950 border border-slate-900 text-slate-600 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28-2.28 5.941" />
          </svg>
        </div>
        <p className="text-sm text-slate-500 font-medium">
          {error ? 'No se pudo cargar el gráfico' : 'Sube tu primer extracto para visualizar la evolución del saldo neto'}
        </p>
      </div>
    );
  }

  // --- SVG Dimensions & Scaling Logic ---
  const width = 800;
  const height = 240;
  const paddingLeft = 75;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const balances = data.map(d => d.balance);
  const minVal = Math.min(...balances, 0); // Include 0 as baseline anchor if appropriate
  const maxVal = Math.max(...balances, 100) * 1.15; // 15% head padding, at least 100 max
  const valRange = maxVal - minVal === 0 ? 100 : maxVal - minVal;

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + index * (chartWidth / (data.length - 1));
  };

  const getY = (val: number) => {
    return paddingTop + chartHeight - ((val - minVal) / valRange) * chartHeight;
  };

  // Generate path lines
  let linePath = `M ${getX(0)} ${getY(data[0].balance)}`;
  for (let i = 1; i < data.length; i++) {
    linePath += ` L ${getX(i)} ${getY(data[i].balance)}`;
  }

  // Close the area path for fill gradient
  const areaPath = `${linePath} L ${getX(data.length - 1)} ${paddingTop + chartHeight} L ${getX(0)} ${paddingTop + chartHeight} Z`;

  // Format Month Strings (e.g. "2026-05" -> "May 26")
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).replace('.', '');
  };

  // Calculate 4 clean Y-axis ticks
  const yTicks = [0, 0.33, 0.66, 1].map(ratio => minVal + ratio * valRange);

  return (
    <div className="w-full bg-slate-900/35 border border-slate-900 p-6 rounded-3xl backdrop-blur-md shadow-xl relative overflow-hidden space-y-4">
      <div>
        <h3 className="text-md font-bold text-slate-200">Evolución de Riqueza Consolidada</h3>
        <p className="text-xs text-slate-500">Historial acumulado neto mes a mes en dólares (USD)</p>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none overflow-visible">
          <defs>
            {/* Glow gradient */}
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y Axis Ticks */}
          {yTicks.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx} className="opacity-40">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  className="text-[10px] font-medium"
                >
                  ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </text>
              </g>
            );
          })}

          {/* Fill Area */}
          <path d={areaPath} fill="url(#chartGradient)" />

          {/* Stroke Line */}
          <path
            d={linePath}
            fill="none"
            stroke="rgb(129, 140, 248)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_2px_8px_rgba(99,102,241,0.4)]"
          />

          {/* X Axis Labels */}
          {data.map((pt, idx) => {
            // Show all labels if <= 8, else show every 2nd to prevent overlap
            if (data.length > 8 && idx % 2 !== 0) return null;
            const x = getX(idx);
            return (
              <text
                key={idx}
                x={x}
                y={height - 12}
                textAnchor="middle"
                fill="#94a3b8"
                className="text-[10px] font-medium opacity-75"
              >
                {formatMonth(pt.month)}
              </text>
            );
          })}

          {/* Interactive Hover Indicators & Dots */}
          {data.map((pt, idx) => {
            const x = getX(idx);
            const y = getY(pt.balance);
            const isHovered = hoveredIndex === idx;

            return (
              <g key={idx}>
                {/* Vertical helper line on hover */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={height - paddingBottom}
                    stroke="rgba(129, 140, 248, 0.3)"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* The main point dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? "rgb(129, 140, 248)" : "rgb(30, 41, 59)"}
                  stroke="rgb(129, 140, 248)"
                  strokeWidth="2.5"
                  className="transition-all duration-150 cursor-pointer"
                />

                {/* Large transparent interactive touch target */}
                <rect
                  x={x - (chartWidth / (data.length - 1)) / 2}
                  y={paddingTop}
                  width={chartWidth / (data.length - 1)}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Dynamic HTML Tooltip */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="absolute bg-slate-950/95 border border-indigo-500/30 text-white px-3 py-2 rounded-xl text-xs shadow-2xl backdrop-blur-md pointer-events-none transition-all duration-150 ease-out"
            style={{
              left: `${((getX(hoveredIndex) - paddingLeft) / chartWidth) * 90 + 5}%`,
              top: `${Math.max(getY(data[hoveredIndex].balance) - 60, 10)}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <p className="text-slate-400 font-medium">{formatMonth(data[hoveredIndex].month)}</p>
            <p className="font-extrabold text-indigo-300 mt-0.5">
              ${data[hoveredIndex].balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
