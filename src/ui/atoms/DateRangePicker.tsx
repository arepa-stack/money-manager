'use client';

import React, { useState, useEffect, useRef } from 'react';

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
}

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track displayed year/month in the picker
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-indexed

  // Temporary selection state
  const [tempStart, setTempStart] = useState<string | null>(startDate || null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Sync tempStart with props when props change or calendar opens
  useEffect(() => {
    setTempStart(startDate || null);
    if (startDate) {
      const parts = startDate.split('-').map(Number);
      if (parts.length === 3) {
        setCurrentYear(parts[0]);
        setCurrentMonth(parts[1] - 1);
      }
    }
  }, [startDate, isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format date to YYYY-MM-DD
  const formatDateStr = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  // Helper to format displaying range: e.g. "01 May, 2026 - 31 May, 2026"
  const formatRangeText = () => {
    if (!startDate) return 'Selecciona fechas';

    const formatDate = (dateStr: string) => {
      const parts = dateStr.split('-').map(Number);
      if (parts.length !== 3) return dateStr;
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (!endDate) {
      return `${formatDate(startDate)} - ...`;
    }

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  // Calendar Math
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Trailing days of previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const d = daysInPrevMonth - i;
    cells.push({
      dateStr: formatDateStr(prevYear, prevMonth, d),
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      dateStr: formatDateStr(currentYear, currentMonth, d),
      dayNum: d,
      isCurrentMonth: true,
    });
  }

  // Leading days of next month (fill grid to 42 cells)
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    cells.push({
      dateStr: formatDateStr(nextYear, nextMonth, d),
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  // Handle Day Click
  const handleDayClick = (dateStr: string) => {
    if (!tempStart || (tempStart && endDate)) {
      // First click: select start date, clear end date
      setTempStart(dateStr);
      onChange(dateStr, '');
    } else {
      // Second click: select end date
      if (dateStr < tempStart) {
        // If clicked date is before start date, set as new start date
        setTempStart(dateStr);
        onChange(dateStr, '');
      } else {
        // Set end date, close calendar, fire change
        onChange(tempStart, dateStr);
        setIsOpen(false);
      }
    }
  };

  const handlePrevYear = () => {
    setCurrentYear((prev) => prev - 1);
  };

  const handleNextYear = () => {
    setCurrentYear((prev) => prev + 1);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const isSelected = (dateStr: string) => {
    return dateStr === startDate || dateStr === endDate;
  };

  const isInRange = (dateStr: string) => {
    if (startDate && endDate) {
      return dateStr > startDate && dateStr < endDate;
    }
    // Hover preview
    if (tempStart && !endDate && hoveredDate) {
      if (hoveredDate >= tempStart) {
        return dateStr > tempStart && dateStr < hoveredDate;
      }
    }
    return false;
  };

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  return (
    <div className="relative z-30" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-950 border border-slate-850 hover:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none transition-all cursor-pointer w-full text-left"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4 text-slate-400"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z"
          />
        </svg>
        <span className="truncate flex-1">{formatRangeText()}</span>
      </button>

      {/* Dropdown Calendar */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-slate-950 border border-slate-850 p-4 rounded-2xl shadow-2xl z-50 w-72 animate-fade-in backdrop-blur-md">
          {/* Header Month Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevYear}
                title="Año anterior"
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-700 cursor-pointer transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Mes anterior"
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-700 cursor-pointer transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            </div>
            <span className="text-sm font-bold text-slate-200">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleNextMonth}
                title="Mes siguiente"
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-700 cursor-pointer transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNextYear}
                title="Año siguiente"
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-700 cursor-pointer transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] uppercase font-bold text-slate-500">
            <div>Do</div>
            <div>Lu</div>
            <div>Ma</div>
            <div>Mi</div>
            <div>Ju</div>
            <div>Vi</div>
            <div>Sá</div>
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              const selected = isSelected(cell.dateStr);
              const inRange = isInRange(cell.dateStr);
              const isStart = cell.dateStr === startDate;
              const isEnd = cell.dateStr === endDate;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => handleDayClick(cell.dateStr)}
                  onMouseEnter={() => setHoveredDate(cell.dateStr)}
                  onMouseLeave={() => setHoveredDate(null)}
                  className={`h-8 w-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
                    !cell.isCurrentMonth ? 'text-slate-500 opacity-40 hover:opacity-100' : 'text-slate-300'
                  } ${
                    selected
                      ? 'bg-indigo-600 text-white rounded-lg scale-[1.05] shadow-lg shadow-indigo-600/30'
                      : ''
                  } ${
                    inRange && !selected
                      ? 'bg-indigo-500/15 text-indigo-300 rounded-none'
                      : ''
                  } ${isStart && endDate ? 'rounded-r-none' : ''} ${isEnd && startDate ? 'rounded-l-none' : ''} hover:bg-indigo-600/25`}
                >
                  {cell.dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
