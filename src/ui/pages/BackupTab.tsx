'use client';

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

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

interface BackupTabProps {
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'info',
    actionLabel?: string,
    onAction?: () => void
  ) => void;
  setConfirmState: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
      isDestructive?: boolean;
      confirmText?: string;
    }>
  >;
  onRefreshData: () => void;
}

export default function BackupTab({ showToast, setConfirmState, onRefreshData }: BackupTabProps) {
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Inicializando...');
  const [lastFileId, setLastFileId] = useState<string>('');
  const [backupList, setBackupList] = useState<BackupFile[]>([]);
  const [selectedFileContent, setSelectedFileContent] = useState<any>(null);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isExportingLocal, setIsExportingLocal] = useState<boolean>(false);

  useEffect(() => {
    const loadSessionAndInit = async () => {
      let savedToken: string | null = null;
      try {
        const tokenRes = await fetch('/api/settings?key=gdrive_token');
        const expiresRes = await fetch('/api/settings?key=gdrive_expires_at');
        const tokenData = await tokenRes.json();
        const expiresData = await expiresRes.json();
        
        if (tokenData.value && expiresData.value) {
          const expiresAt = parseInt(expiresData.value, 10);
          if (expiresAt > Date.now()) {
            savedToken = tokenData.value;
            setAccessToken(savedToken);
            setStatus('Autenticado con Google Drive (Sesión SQLite persistida).');
          } else {
            // Limpiar expirados de la base de datos
            await fetch('/api/settings?key=gdrive_token', { method: 'DELETE' });
            await fetch('/api/settings?key=gdrive_expires_at', { method: 'DELETE' });
          }
        }
      } catch (err) {
        console.error('Error cargando sesión de base de datos:', err);
      }

      // Inicializar el script de Google Identity Services
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        try {
          const client = window.google.accounts.oauth2.initCodeClient({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
            scope: 'https://www.googleapis.com/auth/drive.appdata',
            ux_mode: 'popup',
            select_account: true,
            callback: async (response: any) => {
              if (response.error_description) {
                setStatus(`Error: ${response.error_description}`);
                showToast(`Error de autenticación: ${response.error_description}`, 'error');
                return;
              }

              const authCode = response.code;
              setStatus('Intercambiando código de autorización con SQLite...');

              try {
                const tokenRes = await fetch('/api/auth/google/token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code: authCode }),
                });

                const tokenData = await tokenRes.json();
                if (!tokenRes.ok) throw new Error(tokenData.error || 'Error al intercambiar tokens');

                setAccessToken(tokenData.accessToken);
                setStatus('Autenticado con Google Drive (Sesión SQLite activa).');
                showToast('Conectado exitosamente con Google Drive', 'success');
              } catch (tokenErr: any) {
                setStatus(`Error de tokens: ${tokenErr.message}`);
                showToast(`Error al obtener credenciales de Google: ${tokenErr.message}`, 'error');
              }
            },
          });
          setTokenClient(client);
          if (!savedToken) {
            setStatus('Listo para conectar.');
          }
        } catch (err: any) {
          setStatus(`Error al inicializar: ${err.message}`);
          showToast(`Error al inicializar Google API: ${err.message}`, 'error');
        }
      };
      document.body.appendChild(script);
    };

    loadSessionAndInit();

    return () => {
      const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [showToast]);

  // Carga automática de respaldos al obtener token
  useEffect(() => {
    if (accessToken) {
      handleListBackups();
    }
  }, [accessToken]);

  const handleAuth = () => {
    if (tokenClient) {
      tokenClient.requestCode();
    }
  };

  const handleDisconnect = async () => {
    try {
      setStatus('Cerrando sesión...');
      await fetch('/api/settings?key=gdrive_token', { method: 'DELETE' });
      await fetch('/api/settings?key=gdrive_expires_at', { method: 'DELETE' });
      await fetch('/api/settings?key=gdrive_refresh_token', { method: 'DELETE' });
      setAccessToken(null);
      setBackupList([]);
      setSelectedFileContent(null);
      setStatus('Listo para conectar.');
      showToast('Sesión de Google Drive cerrada y credenciales eliminadas de SQLite.', 'info');
    } catch (err: any) {
      showToast('Error al cerrar sesión de SQLite', 'error');
    }
  };

  // 1. RESPALDAR DATOS REALES DE SQLITE A DRIVE
  const handleUploadRealBackup = async () => {
    if (!accessToken) return;
    setIsUploading(true);
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
      showToast('Copia de seguridad creada con éxito en Google Drive', 'success');
      handleListBackups();
    } catch (err: any) {
      setStatus(`Error en respaldo: ${err.message}`);
      showToast(`Error al crear respaldo: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
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
      showToast(`Error al listar respaldos: ${err.message}`, 'error');
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
      showToast(`Error al descargar respaldo: ${err.message}`, 'error');
    }
  };

  // 4. RESTAURAR EL RESPALDO SELECCIONADO HACIA SQLITE REAL
  const handleRestoreRealBackup = async () => {
    if (!accessToken || !selectedFileContent) {
      showToast('Primero debes seleccionar y cargar el contenido de un respaldo.', 'error');
      return;
    }

    setConfirmState({
      isOpen: true,
      title: '¿Confirmar Restauración?',
      message: 'Esta acción sobrescribirá por completo tu base de datos actual con los datos de esta copia de seguridad. Los datos actuales se perderán permanentemente.',
      confirmText: 'Sobrescribir y Restaurar',
      isDestructive: true,
      onConfirm: async () => {
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
          showToast('Base de datos local restaurada e hidratada con éxito', 'success');
          onRefreshData();
        } catch (err: any) {
          setStatus(`Error en restauración: ${err.message}`);
          showToast(`Error en restauración: ${err.message}`, 'error');
        }
      }
    });
  };

  // 5. ELIMINAR RESPALDO DE GOOGLE DRIVE
  const handleDeleteBackup = async (fileId: string, fileName: string) => {
    if (!accessToken) return;

    setConfirmState({
      isOpen: true,
      title: '¿Eliminar Copia de Seguridad?',
      message: `¿Estás seguro de que deseas eliminar permanentemente el respaldo "${fileName}" de Google Drive? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar permanentemente',
      isDestructive: true,
      onConfirm: async () => {
        setStatus(`Eliminando respaldo ${fileName}...`);
        try {
          const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!res.ok) {
            let errMsg = 'Error al eliminar archivo';
            try {
              const errData = await res.json();
              errMsg = errData.error?.message || errMsg;
            } catch (_) {}
            throw new Error(errMsg);
          }

          showToast('Copia de seguridad eliminada de Google Drive', 'success');
          if (lastFileId === fileId) {
            setSelectedFileContent(null);
            setLastFileId('');
          }
          handleListBackups();
        } catch (err: any) {
          setStatus(`Error al eliminar: ${err.message}`);
          showToast(`Error al eliminar respaldo: ${err.message}`, 'error');
        }
      }
    });
  };

  // 6. EXPORTAR DATOS LOCALES A EXCEL O CSV
  const handleExportLocalFormat = async (format: 'xlsx' | 'csv') => {
    setIsExportingLocal(true);
    setStatus(`Preparando exportación local en formato ${format.toUpperCase()}...`);
    try {
      const dbRes = await fetch('/api/db/export');
      const dbData = await dbRes.json();
      if (!dbRes.ok) throw new Error(dbData.error || 'Error exportando base de datos');

      const transactions = dbData.data?.transactions || [];
      if (transactions.length === 0) {
        showToast('No hay transacciones cargadas en el sistema para exportar', 'info');
        return;
      }

      // Estructurar los datos para que sean legibles en tablas
      const rawData = transactions.map((t: any) => {
        const account = dbData.data.accounts?.find((a: any) => a.id === t.accountId);
        const category = dbData.data.categories?.find((c: any) => c.id === t.categoryId);
        const subcategory = dbData.data.subcategories?.find((s: any) => s.id === t.subcategoryId);
        const destAccount = t.destinationAccountId 
          ? dbData.data.accounts?.find((a: any) => a.id === t.destinationAccountId)
          : null;

        return {
          'Fecha': new Date(t.transactionDate).toLocaleDateString(),
          'Cuenta': account ? account.name : 'N/A',
          'Tipo': t.transactionType === 'INCOME' ? 'Ingreso' : t.transactionType === 'EXPENSE' ? 'Gasto' : 'Transferencia',
          'Monto Original': t.amount / 100,
          'Divisa': t.currency,
          'Monto Equiv. USD': t.baseAmountUsd / 100,
          'Categoría': category ? category.name : 'N/A',
          'Subcategoría': subcategory ? subcategory.name : '',
          'Cuenta Destino': destAccount ? destAccount.name : '',
          'Apertura Saldo': t.isOpeningBalance ? 'Sí' : 'No',
          'Nota': t.note || '',
          'Descripción': t.description || '',
          'ID Transacción': t.id,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rawData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transacciones');

      if (format === 'xlsx') {
        XLSX.writeFile(workbook, `money_manager_export_${Date.now()}.xlsx`);
        showToast('Archivo Excel descargado con éxito', 'success');
      } else {
        // Formato CSV
        const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `money_manager_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Archivo CSV descargado con éxito', 'success');
      }
      setStatus('Exportación local finalizada.');
    } catch (err: any) {
      setStatus(`Error al exportar: ${err.message}`);
      showToast(`Error al exportar localmente: ${err.message}`, 'error');
    } finally {
      setIsExportingLocal(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-200">
      {/* Encabezado con estado y botón de conexión */}
      <div className="relative overflow-hidden bg-slate-900/20 border border-slate-900 p-6 rounded-2xl backdrop-blur-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2.5 select-none">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-extrabold text-xs">
              ☁️
            </div>
            Copia de Seguridad (Google Drive)
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Respalda tus cuentas, categorías y transacciones de SQLite directamente en tu cuenta de Google.
          </p>
        </div>

        {accessToken ? (
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20 text-rose-455 hover:text-rose-200 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
            Desconectar Google Drive
          </button>
        ) : (
          <button
            onClick={handleAuth}
            className="px-4 py-2 border border-indigo-500/25 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-200 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-sm"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
            </svg>
            Conectar Google Drive
          </button>
        )}
      </div>

      {/* Monitor de Estado */}
      <div className="bg-slate-955/40 border border-slate-900 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2.5 text-slate-400">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${accessToken ? 'bg-emerald-400 animate-pulse' : 'bg-amber-455'}`}></span>
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Motor de Estado:</span>
          <span className="text-slate-355 truncate max-w-[280px] sm:max-w-none">{status}</span>
        </div>
      </div>

      {/* Grid de Secciones de Respaldo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Panel 1: Sincronización en Nube */}
        <div className="relative overflow-hidden bg-slate-900/10 border border-slate-900/60 p-5 rounded-2xl space-y-3.5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-2">
            <span className="text-indigo-400">☁️</span> Operaciones de Nube
          </h3>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleUploadRealBackup}
              disabled={!accessToken || isUploading}
              className="px-4 py-2 border border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-455 hover:text-emerald-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            >
              {isUploading ? 'Creando copia...' : 'Crear Respaldo'}
            </button>
            <button
              onClick={handleListBackups}
              disabled={!accessToken || loadingList}
              className="px-4 py-2 border border-sky-500/25 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            >
              Listar Archivos
            </button>
            <button
              onClick={handleRestoreRealBackup}
              disabled={!accessToken || !selectedFileContent}
              className="px-4 py-2 border border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/20 text-amber-450 hover:text-amber-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            >
              Restaurar Base
            </button>
          </div>
        </div>

        {/* Panel 2: Exportaciones Locales */}
        <div className="relative overflow-hidden bg-slate-900/10 border border-slate-900/60 p-5 rounded-2xl space-y-3.5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-2">
            <span className="text-indigo-400">💾</span> Exportaciones Locales (Excel / CSV)
          </h3>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => handleExportLocalFormat('xlsx')}
              disabled={isExportingLocal}
              className="px-4 py-2 border border-indigo-500/25 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.23 13.44-3.2 3.2m0 0-3.2-3.2m3.2 3.2V9" />
              </svg>
              Descargar Excel (.xlsx)
            </button>
            <button
              onClick={() => handleExportLocalFormat('csv')}
              disabled={isExportingLocal}
              className="px-4 py-2 border border-violet-500/25 bg-violet-500/10 hover:bg-violet-500/20 text-violet-450 hover:text-violet-250 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.23 13.44-3.2 3.2m0 0-3.2-3.2m3.2 3.2V9" />
              </svg>
              Descargar CSV (.csv)
            </button>
          </div>
        </div>
      </div>

      {/* Grid del listado e inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda: Respaldos en Nube */}
        <div className="relative overflow-hidden bg-slate-900/20 border border-slate-900 p-5 rounded-2xl backdrop-blur-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">Archivos en Nube (appDataFolder)</h3>
          {loadingList ? (
            <div className="flex flex-col items-center justify-center p-14 space-y-3">
              <div className="w-7 h-7 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
              <span className="text-xs text-slate-500 font-semibold">Cargando directorio de Drive...</span>
            </div>
          ) : backupList.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-900/60 rounded-xl bg-slate-950/10">
              <p className="text-xs text-slate-500 font-bold">No se encontraron respaldos.</p>
              <p className="text-[10px] text-slate-600 font-semibold mt-1">Conéctate y haz clic en "Listar Archivos" para sincronizar.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {backupList.map((file) => (
                <div
                  key={file.id}
                  className={`p-3.5 rounded-xl border transition-all text-left flex justify-between items-center ${
                    lastFileId === file.id
                      ? 'bg-slate-950/80 border-indigo-500/40 shadow-inner'
                      : 'bg-slate-950/20 border-slate-900/60 hover:border-slate-850 hover:bg-slate-950/40'
                  }`}
                >
                  <div className="space-y-1 truncate max-w-[70%]">
                    <p className="text-xs font-bold text-slate-200 truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">ID: {file.id}</p>
                    <p className="text-[10px] text-slate-400">Creado: {new Date(file.createdTime).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleViewContent(file.id)}
                      className="px-3 py-1.5 border border-slate-850 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-750 rounded-lg text-[11px] font-bold text-slate-355 hover:text-slate-100 transition-all active:scale-95 shadow-sm"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => handleDeleteBackup(file.id, file.name)}
                      className="p-1.5 border border-rose-900/40 bg-rose-950/15 hover:bg-rose-500/20 rounded-lg text-rose-455 hover:text-rose-250 transition-all active:scale-95 shadow-sm cursor-pointer"
                      title="Eliminar de Google Drive"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna Derecha: Inspector JSON */}
        <div className="relative overflow-hidden bg-slate-900/20 border border-slate-900 p-5 rounded-2xl backdrop-blur-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">Inspector de Contenido</h3>
          <div className="bg-slate-950/80 rounded-xl border border-slate-900/50 p-4 h-[380px] overflow-auto font-mono text-[11px] text-emerald-400/90 relative shadow-inner scrollbar-thin">
            {selectedFileContent ? (
              <div className="space-y-4">
                <div className="border-b border-slate-900 pb-2.5 text-slate-455 text-[10px] flex flex-wrap gap-y-1 gap-x-4 font-semibold">
                  <p><strong>Versión:</strong> {selectedFileContent.version || '1.0'}</p>
                  <p>• <strong>Exportado:</strong> {selectedFileContent.exportedAt ? new Date(selectedFileContent.exportedAt).toLocaleDateString() : 'N/A'}</p>
                  <p>• <strong>Cuentas:</strong> {selectedFileContent.data?.accounts?.length || 0}</p>
                  <p>• <strong>Transacciones:</strong> {selectedFileContent.data?.transactions?.length || 0}</p>
                </div>
                <pre className="whitespace-pre-wrap leading-relaxed">{JSON.stringify(selectedFileContent, null, 2)}</pre>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-center p-6 text-xs font-sans">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-750 mb-2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.23 13.44-3.2 3.2m0 0-3.2-3.2m3.2 3.2V9" />
                </svg>
                <span className="font-bold text-slate-600">No hay archivos cargados</span>
                <span className="text-[10px] text-slate-600 mt-1 max-w-[220px]">Selecciona un archivo y haz clic en "Ver Contenido" para inspeccionarlo antes de restaurar.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
