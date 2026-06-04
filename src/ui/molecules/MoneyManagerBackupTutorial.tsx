import React, { useState } from 'react';

export default function MoneyManagerBackupTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialPlatform, setTutorialPlatform] = useState<'android' | 'ios'>('android');

  return (
    <div className="max-w-xl mx-auto mb-4 border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-900/30 transition-all duration-300">
      <button
        onClick={() => setShowTutorial(!showTutorial)}
        className="w-full flex items-center justify-between p-4 text-left text-xs font-bold text-slate-300 hover:bg-slate-850/50 transition-colors cursor-pointer select-none"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm">📖</span>
          ¿Cómo obtener tu archivo de respaldo de Money Manager?
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className={`w-4 h-4 text-slate-400 transition-transform duration-350 ${showTutorial ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {showTutorial && (
        <div className="border-t border-slate-900/60 p-4 space-y-4 animate-fade-in text-left">
          {/* Selector de plataforma */}
          <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-900 max-w-[240px]">
            <button
              onClick={() => setTutorialPlatform('android')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                tutorialPlatform === 'android'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Android
            </button>
            <button
              onClick={() => setTutorialPlatform('ios')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                tutorialPlatform === 'ios'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              iOS
            </button>
          </div>

          {/* Pasos */}
          {tutorialPlatform === 'android' ? (
            <div className="space-y-3 text-xs text-slate-400 animate-fade-in">
              <p className="font-semibold text-slate-300">
                Puedes generar un respaldo SQLite (.sqlite) o una hoja Excel (.xlsx) desde tu celular Android:
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Abre la aplicación <strong>Money Manager</strong> en tu dispositivo.
                </li>
                <li>
                  Toca el menú <strong className="text-slate-300">Más</strong> (o tres puntos) abajo a la derecha.
                </li>
                <li>
                  Ingresa a <strong className="text-slate-300">Copia de seg. / Restaurar</strong> (Backup/Restore).
                </li>
                <li>
                  Selecciona <strong className="text-slate-300">Copia de seguridad en el dispositivo</strong> y luego <strong className="text-slate-300">Copia de seguridad de datos</strong> (para exportar el archivo <code>.sqlite</code>).
                </li>
                <li>
                  Alternativamente, puedes usar <strong className="text-slate-300">Exportar por correo electrónico</strong> para enviarte a ti mismo el archivo de base de datos.
                </li>
              </ol>
              <p className="text-[11px] text-slate-500 italic mt-1">
                Nota: El archivo de base de datos suele guardarse en la carpeta "/Download" o "/MoneyManager" de tu dispositivo.
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-xs text-slate-400 animate-fade-in">
              <p className="font-semibold text-slate-300">
                Exporta tu copia de seguridad SQLite (.sqlite) desde un iPhone o iPad:
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Abre <strong>Money Manager</strong> en tu iPhone/iPad.
                </li>
                <li>
                  Dirígete a la pestaña <strong className="text-slate-300">Más</strong> (More) en la barra inferior.
                </li>
                <li>
                  Selecciona la sección <strong className="text-slate-300">Copia de seguridad</strong> (Backup).
                </li>
                <li>
                  Presiona <strong className="text-slate-300">Exportar archivo de copia de seguridad</strong> o <strong className="text-slate-300">Enviar copia por email</strong>.
                </li>
                <li>
                  Guarda el archivo en la aplicación <strong>Archivos (Files)</strong> de tu iPhone o envíatelo por correo para descargarlo en tu computadora.
                </li>
              </ol>
            </div>
          )}

          <div className="pt-2 border-t border-slate-900/50 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">¿Necesitas ayuda adicional?</span>
            <a
              href="https://help.realbyteapps.com/hc/en-us/articles/360042747934-How-to-backup-and-restore-data"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 hover:underline font-semibold flex items-center gap-0.5"
            >
              Guía oficial de Realbyte
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
