import React, { useEffect, useState } from 'react';
import QuickConverter from '@/ui/molecules/QuickConverter';
import Sparkline from '@/ui/atoms/Sparkline';

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

export default function BcvRates() {
  const [bcvData, setBcvData] = useState<BcvData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = async (force: boolean = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bcv/rates${force ? '?force=true' : ''}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudieron cargar las tasas de cambio');
      }
      setBcvData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al conectar con la API de tasas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const formatFetchedAt = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + date.toLocaleDateString();
  };

  const renderVariationBadge = (val: number) => {
    const isZero = Math.abs(val) < 0.0001;
    const isPositive = val > 0;
    
    if (isZero) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
          <span>0.00%</span>
        </span>
      );
    }

    if (isPositive) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M12.577 4.878a.75.75 0 01.919-.53l4.75 1.5a.75.75 0 01.53.919l-1.5 4.75a.75.75 0 11-1.429-.452l.968-3.064-10.428 10.43a.75.75 0 11-1.06-1.06l10.43-10.428-3.064.968a.75.75 0 01-.919-.53z" clipRule="evenodd" />
          </svg>
          <span>+{val.toFixed(2)}%</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M12.577 15.122a.75.75 0 00.919.53l4.75-1.5a.75.75 0 00.53-.919l-1.5-4.75a.75.75 0 00-1.429.452l.968 3.064-10.428-10.43a.75.75 0 10-1.06 1.06l10.43 10.428-3.064-.968a.75.75 0 00-.919.53z" clipRule="evenodd" />
        </svg>
        <span>{val.toFixed(2)}%</span>
      </span>
    );
  };

  const renderSourceBadge = (source: string) => {
    if (source === 'dolarapi') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-440 shadow-sm shadow-emerald-500/5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-pulse"></span>
          DolarAPI (Primaria)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-450 shadow-sm shadow-amber-500/5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        BCV (Alternativa B - Respaldo)
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner and Refresh Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/30 border border-slate-900 p-5 rounded-3xl backdrop-blur-md">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-200">Consola Cambiaria de Referencia</h2>
            {bcvData && renderSourceBadge(bcvData.source)}
          </div>
          <p className="text-xs text-slate-500">
            Monitoreo en tiempo real de las tasas de cambio de referencia en Venezuela.
          </p>
        </div>
        
        <button
          onClick={() => fetchRates(true)}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-650 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] border border-indigo-500/30 text-white transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {isLoading ? 'Actualizando...' : 'Actualizar Tasas'}
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/5 border border-rose-500/20 text-rose-400 p-4 rounded-2xl text-sm flex items-start gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <div className="space-y-1">
            <p className="font-semibold">Ocurrió un error al obtener las tasas en vivo</p>
            <p className="text-xs text-rose-500/90">{error}</p>
            <button 
              onClick={() => fetchRates(true)}
              className="text-xs font-bold text-rose-400 underline hover:text-rose-300 mt-2 block"
            >
              Reintentar consulta
            </button>
          </div>
        </div>
      )}

      {/* 4 Exchange Rates Cards Grid */}
      {bcvData && (
        <>
          {(() => {
            // Últimos 7 registros del historial, invertidos para orden cronológico ascendente
            const histSlice = [...bcvData.history].reverse().slice(-7);
            const usdOficialHistory = histSlice.map(h => h.usdOficial);
            const usdParaleloHistory = histSlice.filter(h => h.usdParalelo > 0).map(h => h.usdParalelo);
            const eurOficialHistory = histSlice.map(h => h.eurOficial);
            const eurParaleloHistory = histSlice.filter(h => h.eurParalelo > 0).map(h => h.eurParalelo);

            return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* USD OFICIAL */}
            <div className="relative overflow-hidden bg-slate-900/20 border border-slate-900 p-5 rounded-2xl backdrop-blur-sm group hover:border-slate-850 hover:bg-slate-900/30 transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-300 pointer-events-none text-slate-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-455 font-extrabold text-sm select-none">
                    $
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-300">Dólar Oficial</h3>
                    <p className="text-[9px] text-slate-500 font-semibold">BCV (Referencial)</p>
                  </div>
                </div>
                {renderVariationBadge(bcvData.usdOficialVar)}
              </div>
              <div className="mt-4 space-y-0.5">
                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">Tasa de Venta</span>
                <div className="flex items-end justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-100 tracking-tight">
                      {bcvData.usdOficial.toFixed(4)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">Bs.</span>
                  </div>
                  {usdOficialHistory.length >= 2 && (
                    <div className="opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                      <Sparkline
                        values={usdOficialHistory}
                        width={80}
                        height={32}
                        color="#34d399"
                        fillColor="rgba(52,211,153,0.10)"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* USD PARALELO */}
            <div className="relative overflow-hidden bg-slate-900/20 border border-slate-900 p-5 rounded-2xl backdrop-blur-sm group hover:border-slate-850 hover:bg-slate-900/30 transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-300 pointer-events-none text-slate-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-450 font-extrabold text-sm select-none">
                    $
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-300">Dólar Paralelo</h3>
                    <p className="text-[9px] text-slate-500 font-semibold">Mercado Paralelo</p>
                  </div>
                </div>
                {renderVariationBadge(bcvData.usdParaleloVar)}
              </div>
              <div className="mt-4 space-y-0.5">
                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">Tasa de Venta</span>
                <div className="flex items-end justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-100 tracking-tight">
                      {bcvData.usdParalelo > 0 ? bcvData.usdParalelo.toFixed(4) : 'N/A'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">Bs.</span>
                  </div>
                  {usdParaleloHistory.length >= 2 && (
                    <div className="opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                      <Sparkline
                        values={usdParaleloHistory}
                        width={80}
                        height={32}
                        color="#fbbf24"
                        fillColor="rgba(251,191,36,0.10)"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* EUR OFICIAL */}
            <div className="relative overflow-hidden bg-slate-900/20 border border-slate-900 p-5 rounded-2xl backdrop-blur-sm group hover:border-slate-850 hover:bg-slate-900/30 transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-300 pointer-events-none text-slate-100">
                <span className="text-8xl font-extrabold select-none leading-none">€</span>
              </div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-extrabold text-sm select-none">
                    €
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-300">Euro Oficial</h3>
                    <p className="text-[9px] text-slate-500 font-semibold">BCV (Referencial)</p>
                  </div>
                </div>
                {renderVariationBadge(bcvData.eurOficialVar)}
              </div>
              <div className="mt-4 space-y-0.5">
                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">Tasa de Venta</span>
                <div className="flex items-end justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-100 tracking-tight">
                      {bcvData.eurOficial.toFixed(4)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">Bs.</span>
                  </div>
                  {eurOficialHistory.length >= 2 && (
                    <div className="opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                      <Sparkline
                        values={eurOficialHistory}
                        width={80}
                        height={32}
                        color="#818cf8"
                        fillColor="rgba(129,140,248,0.10)"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* EUR PARALELO */}
            <div className="relative overflow-hidden bg-slate-900/20 border border-slate-900 p-5 rounded-2xl backdrop-blur-sm group hover:border-slate-850 hover:bg-slate-900/30 transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-300 pointer-events-none text-slate-100">
                <span className="text-8xl font-extrabold select-none leading-none">€</span>
              </div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-extrabold text-sm select-none">
                    €
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-300">Euro Paralelo</h3>
                    <p className="text-[9px] text-slate-500 font-semibold">Mercado Paralelo</p>
                  </div>
                </div>
                {renderVariationBadge(bcvData.eurParaleloVar)}
              </div>
              <div className="mt-4 space-y-0.5">
                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">Tasa de Venta</span>
                <div className="flex items-end justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-100 tracking-tight">
                      {bcvData.eurParalelo > 0 ? bcvData.eurParalelo.toFixed(4) : 'N/A'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">Bs.</span>
                  </div>
                  {eurParaleloHistory.length >= 2 && (
                    <div className="opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                      <Sparkline
                        values={eurParaleloHistory}
                        width={80}
                        height={32}
                        color="#a78bfa"
                        fillColor="rgba(167,139,250,0.10)"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
            );
          })()}

          {/* Quick Converter Section */}
          <QuickConverter bcvData={bcvData} />

          {/* Metadata section (Dates & Status) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-955/40 border border-slate-900 p-4.5 rounded-2xl text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-indigo-400 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
              </svg>
              <span><strong>Fecha Valor Oficial:</strong> {bcvData.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-indigo-400 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span><strong>Última Consulta local:</strong> {formatFetchedAt(bcvData.fetchedAt)}</span>
            </div>
          </div>

          {/* Historical rates list */}
          <div className="space-y-3.5">
            <h3 className="text-sm font-bold text-slate-350 tracking-wide uppercase">Historial de Tasas Registradas</h3>
            
            <div className="overflow-x-auto rounded-2xl border border-slate-900 bg-slate-950/20 backdrop-blur-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-900 text-slate-450 font-bold">
                    <th className="p-4">Fecha Valor</th>
                    <th className="p-4 text-right">Dólar Oficial</th>
                    <th className="p-4 text-right">Dólar Paralelo</th>
                    <th className="p-4 text-right">Euro Oficial</th>
                    <th className="p-4 text-right">Euro Paralelo</th>
                    <th className="p-4 text-center">Fuente</th>
                    <th className="p-4 text-right">Fecha Consulta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-300">
                  {bcvData.history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="p-4 font-semibold text-slate-200">{item.date}</td>
                      <td className="p-4 text-right font-bold text-emerald-450">Bs. {item.usdOficial.toFixed(4)}</td>
                      <td className="p-4 text-right font-bold text-amber-500">Bs. {item.usdParalelo > 0 ? item.usdParalelo.toFixed(4) : 'N/A'}</td>
                      <td className="p-4 text-right font-bold text-indigo-400">Bs. {item.eurOficial.toFixed(4)}</td>
                      <td className="p-4 text-right font-bold text-violet-400">Bs. {item.eurParalelo > 0 ? item.eurParalelo.toFixed(4) : 'N/A'}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          item.source === 'dolarapi' 
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                            : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                        }`}>
                          {item.source === 'dolarapi' ? 'DolarAPI' : 'BCV (B)'}
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-550 font-medium">
                        {new Date(item.fetchedAt).toLocaleDateString()} {new Date(item.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Loading state spinner */}
      {isLoading && !bcvData && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-3 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium">Consultando servidores cambiarios y base de datos...</p>
        </div>
      )}
    </div>
  );
}
