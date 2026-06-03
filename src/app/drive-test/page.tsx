'use client';

import React, { useEffect, useState } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

interface BackupFile {
  id: string;
  name: string;
  createdTime: string;
}

export default function DriveTestPage() {
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Inicializando...');
  const [lastFileId, setLastFileId] = useState<string>('');
  const [backupList, setBackupList] = useState<BackupFile[]>([]);
  const [selectedFileContent, setSelectedFileContent] = useState<any>(null);
  const [loadingList, setLoadingList] = useState<boolean>(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: '38114371493-78mn9h3teb6tfrrcmv2vho1ko65gme1c.apps.googleusercontent.com', // Reemplaza con tu Client ID real
          scope: 'https://www.googleapis.com/auth/drive.appdata',
          callback: (response: any) => {
            if (response.error_description) {
              setStatus(`Error: ${response.error_description}`);
              return;
            }
            setAccessToken(response.access_token);
            setStatus('Autenticado con Google Drive.');
          },
        });
        setTokenClient(client);
        setStatus('Listo para conectar.');
      } catch (err: any) {
        setStatus(`Error al inicializar: ${err.message}`);
      }
    };
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const handleAuth = () => {
    if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  // 1. RESPALDAR DATOS REALES DE SQLITE A DRIVE
  const handleUploadRealBackup = async () => {
    if (!accessToken) return;
    setStatus('Obteniendo datos reales de SQLite local...');

    try {
      const dbRes = await fetch('/api/db/export');
      const dbData = await dbRes.json();
      if (!dbRes.ok) throw new Error(dbData.error || 'Error exportando SQLite');

      setStatus('Subiendo archivo a la carpeta oculta de Google Drive...');
      
      const metadata = {
        name: `money_manager_prod_${Date.now()}.json`,
        mimeType: 'application/json',
        parents: ['appDataFolder'],
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', new Blob([JSON.stringify(dbData)], { type: 'application/json' }));

      const driveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      const driveResult = await driveRes.json();
      if (!driveRes.ok) throw new Error(driveResult.error?.message || 'Error en Google Drive');

      setLastFileId(driveResult.id);
      setStatus(`¡Respaldo Exitoso! ID: ${driveResult.id}`);
      // Auto-refrescar la lista de respaldos
      handleListBackups();
    } catch (err: any) {
      setStatus(`Error en respaldo: ${err.message}`);
    }
  };

  // 2. LISTAR RESPALDOS DE LA CARPETA OCULTA (appDataFolder)
  const handleListBackups = async () => {
    if (!accessToken) return;
    setLoadingList(true);
    setStatus('Consultando archivos en appDataFolder...');

    try {
      const res = await fetch(
        'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,createdTime)&orderBy=createdTime+desc',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || 'Error al listar');

      setBackupList(result.files || []);
      setStatus(result.files?.length ? 'Lista de respaldos actualizada.' : 'No se encontraron respaldos.');
    } catch (err: any) {
      setStatus(`Error al listar: ${err.message}`);
    } finally {
      setLoadingList(false);
    }
  };

  // 3. VER CONTENIDO DE UN RESPALDO ESPECÍFICO
  const handleViewContent = async (fileId: string) => {
    if (!accessToken) return;
    setStatus(`Descargando contenido del archivo ${fileId}...`);
    setSelectedFileContent(null);

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Error descargando contenido');
      }

      const jsonContent = await res.json();
      setSelectedFileContent(jsonContent);
      setLastFileId(fileId);
      setStatus(`Contenido cargado para el archivo: ${fileId}`);
    } catch (err: any) {
      setStatus(`Error al leer contenido: ${err.message}`);
    }
  };

  // 4. RESTAURAR EL RESPALDO SELECCIONADO HACIA SQLITE REAL
  const handleRestoreRealBackup = async () => {
    if (!accessToken || !selectedFileContent) {
      setStatus('Primero debes seleccionar y cargar el contenido de un respaldo.');
      return;
    }
    
    if (!window.confirm('¿Estás seguro? Esta acción sobrescribirá por completo tu base de datos SQLite actual.')) {
      return;
    }

    setStatus('Inyectando datos en SQLite transaccional...');

    try {
      const restoreRes = await fetch('/api/db/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: selectedFileContent.data }),
      });

      const restoreResult = await restoreRes.json();
      if (!restoreRes.ok) throw new Error(restoreResult.error || 'Error en sobrescritura');

      setStatus('¡Base de datos local restaurada e hidratada con éxito!');
    } catch (err: any) {
      setStatus(`Error en restauración: ${err.message}`);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl mt-12 text-slate-200">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-indigo-400">Explorador del Entorno de Respaldo Oculto</h1>
          <p className="text-xs text-slate-400 mt-1">Inspección de archivos y restauración soberana del lado del cliente.</p>
        </div>
        <button onClick={handleAuth} className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 rounded-xl text-xs font-semibold text-white transition-all">
          Conectar Google Drive
        </button>
      </div>

      {/* Monitor de Estado */}
      <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono">
        <strong>Estado del Motor:</strong> {status}
      </p>

      {/* Acciones Principales */}
      <div className="flex gap-4">
        <button onClick={handleUploadRealBackup} disabled={!accessToken} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl text-xs font-semibold text-white transition-all">
          Crear y Subir Nuevo Respaldo Real
        </button>
        <button onClick={handleListBackups} disabled={!accessToken} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl text-xs font-semibold text-white transition-all">
          Listar Archivos Guardados
        </button>
        <button onClick={handleRestoreRealBackup} disabled={!accessToken || !selectedFileContent} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 rounded-xl text-xs font-semibold text-white transition-all">
          Restaurar Respaldo Visualizado en SQLite
        </button>
      </div>

      {/* Panel de Doble Columna para Listado e Inspección */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* Columna Izquierda: Listado de archivos ocultos en Drive */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Archivos en Nube (appDataFolder)</h2>
          {loadingList ? (
            <p className="text-xs text-slate-500">Cargando directorio de Google...</p>
          ) : backupList.length === 0 ? (
            <p className="text-xs text-slate-500 border border-dashed border-slate-800 p-8 text-center rounded-2xl">
              No hay archivos listados. Haz clic en "Listar Archivos Guardados".
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {backupList.map((file) => (
                <div 
                  key={file.id} 
                  className={`p-3.5 rounded-xl border transition-all text-left flex justify-between items-center ${
                    lastFileId === file.id 
                      ? 'bg-slate-950 border-indigo-500/50' 
                      : 'bg-slate-950/40 border-slate-850 hover:border-slate-750'
                  }`}
                >
                  <div className="space-y-1 truncate max-w-[70%]">
                    <p className="text-xs font-bold text-slate-200 truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">ID: {file.id}</p>
                    <p className="text-[10px] text-slate-400">Creado: {new Date(file.createdTime).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handleViewContent(file.id)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] font-medium text-slate-300 transition-colors shrink-0"
                  >
                    Ver Contenido
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna Derecha: Visor de contenido JSON del archivo seleccionado */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Inspector de Contenido JSON</h2>
          <div className="bg-slate-950 rounded-2xl border border-slate-850 p-4 h-[400px] overflow-auto font-mono text-[11px] text-emerald-400/90 relative">
            {selectedFileContent ? (
              <div className="space-y-4">
                <div className="border-b border-slate-850 pb-2 text-slate-400 text-[10px]">
                  <p><strong>Metadata de Respaldo:</strong></p>
                  <p>• Versión: {selectedFileContent.version}</p>
                  <p>• Exportado el: {new Date(selectedFileContent.exportedAt).toLocaleString()}</p>
                  <p>• Cuentas: {selectedFileContent.data?.accounts?.length || 0}</p>
                  <p>• Transacciones: {selectedFileContent.data?.transactions?.length || 0}</p>
                </div>
                <pre>{JSON.stringify(selectedFileContent, null, 2)}</pre>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-center px-4 text-xs font-sans">
                Selecciona un archivo de la lista de la izquierda y haz clic en "Ver Contenido" para inspeccionar sus datos transaccionales antes de restaurar.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}