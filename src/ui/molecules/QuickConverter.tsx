'use client';

import React, { useState, useEffect } from 'react';
import { convertAmount, convertAmountReverse, formatConversionResult } from '@/lib/exchangeUtils';

interface BcvHistoryItem {
  id: string;
  date: string;
  fetchedAt: number;
  usdOficial: number;
  usdParalelo: number;
  eurOficial: number;
  eurParalelo: number;
  source: string;
}

interface BcvData {
  usdOficial: number;
  usdParalelo: number;
  eurOficial: number;
  eurParalelo: number;
  date: string;
  fetchedAt: number;
  source: string;
  usdOficialVar: number;
  usdParaleloVar: number;
  eurOficialVar: number;
  eurParaleloVar: number;
  history: BcvHistoryItem[];
}

interface QuickConverterProps {
  bcvData: BcvData | null;
}

const CURRENCIES = [
  { id: 'VES', label: 'Bolívares (Bs.)', symbol: 'Bs.' },
  { id: 'USD_O', label: 'USD Oficial (BCV)', symbol: '$' },
  { id: 'USD_P', label: 'USD Paralelo', symbol: '$' },
  { id: 'EUR_O', label: 'EUR Oficial (BCV)', symbol: '€' },
  { id: 'EUR_P', label: 'EUR Paralelo', symbol: '€' },
];

export default function QuickConverter({ bcvData }: QuickConverterProps) {
  const [currencyFrom, setCurrencyFrom] = useState('USD_O');
  const [currencyTo, setCurrencyTo] = useState('VES');
  const [amountFrom, setAmountFrom] = useState('1.00');
  const [amountTo, setAmountTo] = useState('');

  const getRate = (cur: string): number => {
    if (!bcvData) return 1.0;
    switch (cur) {
      case 'VES':
        return 1.0;
      case 'USD_O':
        return bcvData.usdOficial;
      case 'USD_P':
        return bcvData.usdParalelo > 0 ? bcvData.usdParalelo : bcvData.usdOficial;
      case 'EUR_O':
        return bcvData.eurOficial;
      case 'EUR_P':
        return bcvData.eurParalelo > 0 ? bcvData.eurParalelo : bcvData.eurOficial;
      default:
        return 1.0;
    }
  };

  const getCurrencySymbol = (curId: string): string => {
    return CURRENCIES.find((c) => c.id === curId)?.symbol || '$';
  };

  // Convert From -> To
  const performConversion = (val: string, from: string, to: string) => {
    if (val === '' || isNaN(Number(val))) {
      setAmountTo('');
      return;
    }
    const num = Number(val);
    const rateFrom = getRate(from);
    const rateTo = getRate(to);

    const result = convertAmount(num, rateFrom, rateTo);
    setAmountTo(formatConversionResult(result, to));
  };

  // Convert To -> From
  const performReverseConversion = (val: string, from: string, to: string) => {
    if (val === '' || isNaN(Number(val))) {
      setAmountFrom('');
      return;
    }
    const num = Number(val);
    const rateFrom = getRate(from);
    const rateTo = getRate(to);

    const result = convertAmountReverse(num, rateFrom, rateTo);
    setAmountFrom(formatConversionResult(result, from));
  };

  // Recalculate when rates or selected currencies change
  useEffect(() => {
    performConversion(amountFrom, currencyFrom, currencyTo);
  }, [bcvData, currencyFrom, currencyTo]);

  const handleAmountFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmountFrom(val);
    performConversion(val, currencyFrom, currencyTo);
  };

  const handleAmountToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmountTo(val);
    performReverseConversion(val, currencyFrom, currencyTo);
  };

  const handleSwap = () => {
    const tempCur = currencyFrom;
    const tempAmount = amountFrom;

    setCurrencyFrom(currencyTo);
    setCurrencyTo(tempCur);
    setAmountFrom(amountTo);
    setAmountTo(tempAmount);
  };

  const handleIncrement = (target: 'from' | 'to') => {
    if (target === 'from') {
      const cur = currencyFrom;
      const step = cur === 'VES' ? 10 : 1;
      const currentVal = Number(amountFrom) || 0;
      const nextVal = (currentVal + step).toFixed(2);
      setAmountFrom(nextVal);
      performConversion(nextVal, currencyFrom, currencyTo);
    } else {
      const cur = currencyTo;
      const step = cur === 'VES' ? 10 : 1;
      const currentVal = Number(amountTo) || 0;
      const nextVal = (currentVal + step).toFixed(2);
      setAmountTo(nextVal);
      performReverseConversion(nextVal, currencyFrom, currencyTo);
    }
  };

  const handleDecrement = (target: 'from' | 'to') => {
    if (target === 'from') {
      const cur = currencyFrom;
      const step = cur === 'VES' ? 10 : 1;
      const currentVal = Number(amountFrom) || 0;
      const nextVal = Math.max(0, currentVal - step).toFixed(2);
      setAmountFrom(nextVal);
      performConversion(nextVal, currencyFrom, currencyTo);
    } else {
      const cur = currencyTo;
      const step = cur === 'VES' ? 10 : 1;
      const currentVal = Number(amountTo) || 0;
      const nextVal = Math.max(0, currentVal - step).toFixed(2);
      setAmountTo(nextVal);
      performReverseConversion(nextVal, currencyFrom, currencyTo);
    }
  };

  if (!bcvData) {
    return (
      <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col items-center justify-center py-10 space-y-3">
        <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-medium">Cargando calculadora cambiaria...</p>
      </div>
    );
  }

  // Calculate implicit exchange rate text
  const rateFrom = getRate(currencyFrom);
  const rateTo = getRate(currencyTo);
  const conversionRate = rateFrom / rateTo;

  const fromLabel = CURRENCIES.find((c) => c.id === currencyFrom)?.label.split(' ')[0] || '';
  const toLabel = CURRENCIES.find((c) => c.id === currencyTo)?.label.split(' ')[0] || '';
  const rateText = `1 ${fromLabel} = ${conversionRate.toFixed(4)} ${toLabel}`;

  return (
    <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden space-y-5">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none"></div>

      <div>
        <h3 className="text-md font-bold text-slate-200 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-3-9v9m-3-5.25V18M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Calculadora Cambiaria
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Calcula conversiones bidireccionales en tiempo real entre divisas.
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 relative">
        {/* Currency From Input Card */}
        <div className="w-full bg-slate-950/60 border border-slate-900/80 rounded-2xl p-4.5 space-y-2 focus-within:border-indigo-500/40 transition-all duration-300">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">De (Moneda Origen)</span>
          <div className="flex items-center gap-2.5">
            <select
              value={currencyFrom}
              onChange={(e) => setCurrencyFrom(e.target.value)}
              className="bg-slate-900 border border-slate-850 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer hover:border-slate-800 transition-colors shrink-0"
            >
              {CURRENCIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="relative w-full flex items-center">
              <span className="absolute left-3 text-sm text-slate-500 font-bold pointer-events-none">
                {getCurrencySymbol(currencyFrom)}
              </span>
              <input
                type="number"
                step="any"
                value={amountFrom}
                onChange={handleAmountFromChange}
                placeholder="0.00"
                className="w-full bg-transparent border-0 pl-7 pr-8 py-1.5 text-right text-lg font-extrabold text-slate-100 placeholder-slate-700 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="absolute right-1 flex flex-col gap-0.5 select-none">
                <button
                  type="button"
                  onClick={() => handleIncrement('from')}
                  className="p-0.5 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded text-slate-500 hover:text-indigo-400 active:scale-95 transition-all cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-2.5 h-2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDecrement('from')}
                  className="p-0.5 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded text-slate-500 hover:text-indigo-400 active:scale-95 transition-all cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-2.5 h-2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Swap Button (Mobile: Vertical flow, Desktop: Horizontal flow) */}
        <button
          onClick={handleSwap}
          className="p-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-700 text-indigo-400 hover:text-indigo-300 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer shrink-0 z-10"
          title="Intercambiar divisas"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 md:rotate-90">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
          </svg>
        </button>

        {/* Currency To Input Card */}
        <div className="w-full bg-slate-950/60 border border-slate-900/80 rounded-2xl p-4.5 space-y-2 focus-within:border-indigo-500/40 transition-all duration-300">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">A (Moneda Destino)</span>
          <div className="flex items-center gap-2.5">
            <select
              value={currencyTo}
              onChange={(e) => setCurrencyTo(e.target.value)}
              className="bg-slate-900 border border-slate-850 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer hover:border-slate-800 transition-colors shrink-0"
            >
              {CURRENCIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="relative w-full flex items-center">
              <span className="absolute left-3 text-sm text-slate-500 font-bold pointer-events-none">
                {getCurrencySymbol(currencyTo)}
              </span>
              <input
                type="number"
                step="any"
                value={amountTo}
                onChange={handleAmountToChange}
                placeholder="0.00"
                className="w-full bg-transparent border-0 pl-7 pr-8 py-1.5 text-right text-lg font-extrabold text-slate-100 placeholder-slate-700 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="absolute right-1 flex flex-col gap-0.5 select-none">
                <button
                  type="button"
                  onClick={() => handleIncrement('to')}
                  className="p-0.5 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded text-slate-500 hover:text-indigo-400 active:scale-95 transition-all cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-2.5 h-2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDecrement('to')}
                  className="p-0.5 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded text-slate-500 hover:text-indigo-400 active:scale-95 transition-all cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-2.5 h-2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Implicit Rate Info Footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-900/80 pt-3">
        <span>Tasa de cambio usada:</span>
        <span className="font-bold text-indigo-400 bg-indigo-500/5 px-2.5 py-1 rounded-lg border border-indigo-500/10">
          {rateText}
        </span>
      </div>
    </div>
  );
}
