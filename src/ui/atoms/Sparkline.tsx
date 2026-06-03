'use client';

import React from 'react';

interface SparklineProps {
  /** Array de valores numéricos a graficar (en orden cronológico, más antiguo primero) */
  values: number[];
  /** Ancho del SVG en píxeles */
  width?: number;
  /** Alto del SVG en píxeles */
  height?: number;
  /** Color de la línea (clase Tailwind o valor CSS) */
  color?: string;
  /** Color del área de relleno bajo la línea (rgba o similar) */
  fillColor?: string;
  /** Si se muestra un punto resaltado en el último valor */
  showEndDot?: boolean;
  /** Si se muestra la línea de relleno de área */
  showArea?: boolean;
}

/**
 * Sparkline SVG puro — Átomo de visualización de tendencia.
 * No tiene dependencias externas de gráficos.
 */
export default function Sparkline({
  values,
  width = 120,
  height = 36,
  color = '#6366f1',
  fillColor = 'rgba(99,102,241,0.10)',
  showEndDot = true,
  showArea = true,
}: SparklineProps) {
  if (!values || values.length < 2) return null;

  const paddingX = 2;
  const paddingY = 4;
  const innerW = width - paddingX * 2;
  const innerH = height - paddingY * 2;

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const toX = (i: number) => paddingX + (i / (values.length - 1)) * innerW;
  const toY = (v: number) => paddingY + innerH - ((v - minVal) / range) * innerH;

  const points = values.map((v, i) => [toX(i), toY(v)] as [number, number]);

  // Línea suavizada con bezier cúbico
  const pathD = points.reduce((acc, [x, y], i) => {
    if (i === 0) return `M ${x},${y}`;
    const [px, py] = points[i - 1];
    const cx1 = px + (x - px) * 0.5;
    const cx2 = x - (x - px) * 0.5;
    return `${acc} C ${cx1},${py} ${cx2},${y} ${x},${y}`;
  }, '');

  // Área de relleno: cierre del path por debajo
  const areaD = `${pathD} L ${points[points.length - 1][0]},${height} L ${points[0][0]},${height} Z`;

  const [lastX, lastY] = points[points.length - 1];
  const trend = values[values.length - 1] - values[0];
  const isPositive = trend >= 0;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {showArea && (
        <path
          d={areaD}
          fill={fillColor}
        />
      )}
      <path
        d={pathD}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {showEndDot && (
        <>
          <circle
            cx={lastX}
            cy={lastY}
            r={3.5}
            fill={color}
            opacity={0.25}
          />
          <circle
            cx={lastX}
            cy={lastY}
            r={2}
            fill={color}
          />
        </>
      )}
    </svg>
  );
}
