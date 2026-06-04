import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { ParsedTransaction, TransactionType } from '../domain/types';

export function parseMoneyManagerSqlite(buffer: Buffer): ParsedTransaction[] {
  // 1. Crear un archivo temporal para que better-sqlite3 pueda abrirlo
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const tempFileName = `import_${Date.now()}_${Math.random().toString(36).substring(2)}.sqlite`;
  const tempFilePath = path.join(tempDir, tempFileName);
  
  fs.writeFileSync(tempFilePath, buffer);
  
  let db: Database.Database | null = null;
  
  try {
    db = new Database(tempFilePath, { readonly: true });
    
    // 2. Cargar activos (cuentas) en memoria y su estado de actividad (ZDATA)
    const assetsRows = db.prepare(`
      SELECT uid, NIC_NAME, ZDATA 
      FROM ASSETS
    `).all() as { uid: string; NIC_NAME: string; ZDATA: string | null }[];
    
    const assetMap = new Map<string, string>();
    const assetStatusMap = new Map<string, boolean>();
    assetsRows.forEach(row => {
      if (row.uid && row.NIC_NAME) {
        assetMap.set(row.uid, row.NIC_NAME.trim());
        // ZDATA: '0' es Activa, '1' es Oculta, '2' es Eliminada, '3' es Accounts (sistema).
        // Consideramos activa una cuenta únicamente si ZDATA es '0' o si es null/vacío.
        const isActive = row.ZDATA === '0' || !row.ZDATA;
        assetStatusMap.set(row.uid, isActive);
      }
    });

    // Cargar monedas y tasas en memoria
    const currenciesRows = db.prepare(`
      SELECT uid, RATE 
      FROM CURRENCY
    `).all() as { uid: string; RATE: number }[];
    
    const rateMap = new Map<string, number>();
    currenciesRows.forEach(row => {
      rateMap.set(row.uid, row.RATE);
    });
    
    // 3. Cargar categorías en memoria (excluyendo eliminadas)
    const categoriesRows = db.prepare(`
      SELECT uid, NAME, TYPE, pUid 
      FROM ZCATEGORY 
      WHERE C_IS_DEL IS NULL OR C_IS_DEL <> 1
    `).all() as { uid: string; NAME: string; TYPE: number; pUid: string | null }[];
    
    const categoryMap = new Map<string, { name: string; type: TransactionType; pUid: string | null }>();
    categoriesRows.forEach(row => {
      if (row.uid) {
        categoryMap.set(row.uid, {
          name: row.NAME.trim(),
          type: row.TYPE === 0 ? 'INCOME' : 'EXPENSE',
          pUid: row.pUid && row.pUid !== '0' ? row.pUid : null
        });
      }
    });
    
    // 4. Cargar transacciones (excluyendo eliminadas)
    // DO_TYPE: '0'=Income, '1'=Expense, '3'=Transfer out, '4'=Transfer in, '7' & '8'=Opening balance
    const txRows = db.prepare(`
      SELECT uid, assetUid, toAssetUid, ctgUid, ZMONEY, IN_ZMONEY, AMOUNT_ACCOUNT, ZDATE, DO_TYPE, ZDATA, ZCONTENT, currencyUid 
      FROM INOUTCOME 
      WHERE IS_DEL IS NULL OR IS_DEL <> 1
      ORDER BY ZDATE ASC
    `).all() as {
      uid: string;
      assetUid: string;
      toAssetUid: string | null;
      ctgUid: string | null;
      ZMONEY: string | null;
      IN_ZMONEY: string | null;
      AMOUNT_ACCOUNT: number | null;
      ZDATE: string;
      DO_TYPE: string;
      ZDATA: string | null;
      ZCONTENT: string | null;
      currencyUid: string | null;
    }[];
    
    const parsedTransactions: ParsedTransaction[] = [];
    const seenHashes = new Set<string>();
    
    for (const row of txRows) {
      // Ignorar transferencias entrantes (DO_TYPE = '4') para evitar duplicados en la base de datos de partida doble
      if (row.DO_TYPE === '4') {
        continue;
      }
      
      const isOriginActive = assetStatusMap.get(row.assetUid) ?? false;
      const isDestActive = row.toAssetUid ? (assetStatusMap.get(row.toAssetUid) ?? false) : false;

      // Determinar si esta transacción debe estar excluida de los totales.
      // Una transacción se excluye si pertenece únicamente a cuentas inactivas (ocultas/eliminadas).
      // Excepción: si es una transferencia mixta activa↔inactiva, se incluye en el lado activo
      // pero con excludeFromTotals = true para que no afecte el saldo.
      let excludeFromTotals = false;
      let accountIsArchived = false;

      if (!isOriginActive && !isDestActive) {
        // Ambas cuentas inactivas: se importa pero se excluye de totales
        excludeFromTotals = true;
        accountIsArchived = true;
      } else if (!isOriginActive && isDestActive && row.DO_TYPE === '3') {
        // Transferencia de inactiva a activa: se registra como ingreso en la activa.
        // NO se excluye de totales, porque es dinero que "entra" al dominio activo.
        excludeFromTotals = false;
      } else if (isOriginActive && !isDestActive && row.DO_TYPE === '3') {
        // Transferencia de activa a inactiva: se registra como gasto en la activa.
        // NO se excluye de totales, porque es dinero que "sale" del dominio activo.
        excludeFromTotals = false;
      } else if (!isOriginActive) {
        // Gasto/Ingreso simple en cuenta inactiva
        excludeFromTotals = true;
        accountIsArchived = true;
      }

      try {
        const rawTimestamp = parseInt(row.ZDATE, 10);
        if (isNaN(rawTimestamp)) {
          console.warn(`Fecha inválida en transacción SQLite con uid: ${row.uid}`);
          continue;
        }
        const date = new Date(rawTimestamp);
        
        let accountName = assetMap.get(row.assetUid) || 'Cuenta Desconocida';
        let description = row.ZCONTENT ? row.ZCONTENT.trim() : null;
        
        let type: TransactionType = 'EXPENSE';
        let isOpeningBalance = false;
        
        if (row.DO_TYPE === '0') {
          type = 'INCOME';
        } else if (row.DO_TYPE === '1') {
          type = 'EXPENSE';
        } else if (row.DO_TYPE === '3') {
          if (isOriginActive && isDestActive) {
            type = 'TRANSFER';
          } else if (isOriginActive && !isDestActive) {
            // Transferencia de Activa a Inactiva se convierte en Gasto en la activa
            type = 'EXPENSE';
            const destName = row.toAssetUid ? (assetMap.get(row.toAssetUid) || 'Cuenta Inactiva') : 'Cuenta Inactiva';
            description = description 
              ? `${description} (Transferencia a ${destName})` 
              : `Transferencia a ${destName}`;
          } else if (!isOriginActive && isDestActive) {
            // Transferencia de Inactiva a Activa se convierte en Ingreso en la activa
            type = 'INCOME';
            accountName = row.toAssetUid ? (assetMap.get(row.toAssetUid) || 'Cuenta Desconocida') : 'Cuenta Desconocida';
            const originName = assetMap.get(row.assetUid) || 'Cuenta Inactiva';
            description = description 
              ? `${description} (Transferencia desde ${originName})` 
              : `Transferencia desde ${originName}`;
          }
        } else if (row.DO_TYPE === '7' || row.DO_TYPE === '8') {
          type = 'INCOME';
          isOpeningBalance = true;
        } else {
          // Default fallback
          type = 'EXPENSE';
        }
        
        let categoryName = 'Otros';
        let subcategoryName: string | null = null;
        
        if (isOpeningBalance) {
          categoryName = 'Ajuste de Saldo Inicial';
        } else if (type === 'TRANSFER') {
          // Para transferencias, el categoryName en el DTO debe ser la cuenta de destino
          categoryName = row.toAssetUid ? (assetMap.get(row.toAssetUid) || 'Cuenta Desconocida') : 'Cuenta Desconocida';
        } else if (row.DO_TYPE !== '3' && row.ctgUid) {
          // Solo cargamos la categoría si no era transferencia originalmente
          const cat = categoryMap.get(row.ctgUid);
          if (cat) {
            if (cat.pUid) {
              // Es una subcategoría: buscamos el padre
              const parentCat = categoryMap.get(cat.pUid);
              categoryName = parentCat ? parentCat.name : cat.name;
              subcategoryName = cat.name;
            } else {
              // Es una categoría raíz
              categoryName = cat.name;
            }
          }
        }
        
        // El monto se obtiene preferiblemente de ZMONEY (USD)
        let amountFloat = 0;
        if (row.ZMONEY) {
          amountFloat = parseFloat(row.ZMONEY);
          
          // Heurística de curación de montos corruptos:
          // Si el USD reportado es muy alto (mayor a $100,000 USD) y difiere en más de 10 veces (10x) del esperado
          // según la tasa de cambio de su moneda original, es considerado una anomalía/corrupción
          // (frecuente en redenominaciones antiguas o desactualizadas en la app móvil).
          // En ese caso, recalculamos el USD de forma segura multiplicando el monto original por la tasa de cambio.
          const originalAmount = Math.abs(parseFloat(row.IN_ZMONEY || '0') || row.AMOUNT_ACCOUNT || 0);
          const rate = rateMap.get(row.currencyUid || '') || 1.0;
          const expectedUsd = originalAmount * rate;

          const absAmountFloat = Math.abs(amountFloat);
          if (absAmountFloat > 100000 && expectedUsd > 0 && (absAmountFloat / expectedUsd > 10 || expectedUsd / absAmountFloat > 10)) {
            amountFloat = expectedUsd;
          }
        } else if (row.AMOUNT_ACCOUNT) {
          amountFloat = row.AMOUNT_ACCOUNT;
        }
        
        // Siempre se almacena como valor absoluto positivo.
        // El signo lo determina el tipo de transacción (DO_TYPE → INCOME/EXPENSE/TRANSFER),
        // no el valor de ZMONEY. Las cuentas eliminadas a veces almacenan ZMONEY con signo negativo.
        const amountCents = Math.round(Math.abs(amountFloat) * 100);
        
        const note = row.ZDATA ? row.ZDATA.trim() : null;
        
        // Usamos el UID único de Money Manager SQLite como el importHash para idempotencia perfecta
        const importHash = row.uid;
        
        if (seenHashes.has(importHash)) {
          continue;
        }
        seenHashes.add(importHash);
        
        parsedTransactions.push({
          date,
          accountName,
          categoryName,
          subcategoryName,
          amount: amountCents,
          currency: 'USD',
          baseAmountUsd: amountCents,
          type,
          note,
          description,
          importHash,
          isOpeningBalance,
          excludeFromTotals,
          accountIsArchived
        });
      } catch (err: any) {
        console.error(`Error procesando transacción SQLite con uid ${row.uid}:`, err);
      }
    }
    
    return parsedTransactions;
    
  } finally {
    if (db) {
      db.close();
    }
    // 5. Eliminar archivo temporal
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (cleanupErr) {
      console.error('Error al eliminar archivo temporal de base de datos:', cleanupErr);
    }
  }
}
