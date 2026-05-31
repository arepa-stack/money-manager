import * as XLSX from 'xlsx';
import { parse } from 'date-fns';
import * as crypto from 'crypto';
import { ParsedTransaction, TransactionType } from '../domain/types';

export function parseExcelDate(rawValue: string | number): Date {
  if (typeof rawValue === 'number') {
    // Excel Serial Date (days since 1899-12-30)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const millisecondsPerDay = 86400000;
    return new Date(excelEpoch.getTime() + rawValue * millisecondsPerDay);
  } else if (typeof rawValue === 'string') {
    const cleanStr = rawValue.trim();
    // Try common format: DD/MM/YYYY HH:mm:ss
    let parsedDate = parse(cleanStr, 'dd/MM/yyyy HH:mm:ss', new Date());
    if (isNaN(parsedDate.getTime())) {
      // Try format: DD/MM/YYYY HH:mm
      parsedDate = parse(cleanStr, 'dd/MM/yyyy HH:mm', new Date());
    }
    if (isNaN(parsedDate.getTime())) {
      // Try format: YYYY-MM-DD HH:mm:ss
      parsedDate = parse(cleanStr, 'yyyy-MM-dd HH:mm:ss', new Date());
    }
    if (isNaN(parsedDate.getTime())) {
      // JS Native Parse Fallback
      parsedDate = new Date(cleanStr);
    }
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Fecha inválida o no reconocible: "${cleanStr}"`);
    }
    return parsedDate;
  }
  throw new Error(`Formato de fecha irreconocible: ${typeof rawValue}`);
}

export function generateImportHash(dto: {
  date: Date;
  accountName: string;
  categoryName: string;
  amount: number;
  currency: string;
  note?: string | null;
}): string {
  const dateIso = dto.date.toISOString();
  // Round to 2 decimal places to prevent float precision mismatches in hash
  const amountStr = Number(dto.amount).toFixed(2);
  const acc = dto.accountName.trim().toLowerCase();
  const cat = dto.categoryName.trim().toLowerCase();
  const noteStr = dto.note ? dto.note.trim().toLowerCase() : '';

  const rawString = `${dateIso}|${acc}|${cat}|${amountStr}|${dto.currency}|${noteStr}`;
  return crypto.createHash('sha256').update(rawString).digest('hex');
}

function parseAmount(val: any): number {
  if (typeof val === 'number') {
    return Math.abs(val); // Always absolute, type determines positive/negative in totals
  }
  if (typeof val === 'string') {
    let cleanVal = val.trim();
    // Handle localized number format (e.g. 1.200,50 vs 1,200.50)
    if (cleanVal.includes(',') && !cleanVal.includes('.')) {
      // "310,50" -> "310.50"
      cleanVal = cleanVal.replace(',', '.');
    } else if (cleanVal.includes(',') && cleanVal.includes('.')) {
      // "1,200.50" or "1.200,50" - standardize to period decimal separator
      const commaIndex = cleanVal.indexOf(',');
      const periodIndex = cleanVal.indexOf('.');
      if (commaIndex < periodIndex) {
        // "1,200.50" -> remove comma
        cleanVal = cleanVal.replace(/,/g, '');
      } else {
        // "1.200,50" -> remove period, replace comma with period
        cleanVal = cleanVal.replace(/\./g, '').replace(',', '.');
      }
    }
    const num = parseFloat(cleanVal);
    return isNaN(num) ? 0 : Math.abs(num);
  }
  return 0;
}

export function parseMoneyManagerExcel(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // sheet_to_json with header:1 returns an array of arrays representing the grid
  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
  if (rawRows.length < 2) {
    throw new Error('El archivo cargado está vacío o no contiene filas de datos.');
  }

  const headers = rawRows[0] as string[];
  const normalizedHeaders = headers.map(h => String(h).trim().toLowerCase());

  // Check required column mappings
  const colMap = {
    date: normalizedHeaders.indexOf('fecha'),
    account: normalizedHeaders.indexOf('cuenta'),
    category: normalizedHeaders.indexOf('categoría'),
    subcategory: normalizedHeaders.indexOf('subcategorías'),
    note: normalizedHeaders.indexOf('nota'),
    usd: normalizedHeaders.indexOf('usd'),
    type: normalizedHeaders.indexOf('ingreso/gasto'),
    description: normalizedHeaders.indexOf('descripción'),
    amount: normalizedHeaders.indexOf('importe'),
    currency: normalizedHeaders.indexOf('moneda'),
  };

  const missingColumns: string[] = [];
  if (colMap.date === -1) missingColumns.push('Fecha');
  if (colMap.account === -1) missingColumns.push('Cuenta');
  if (colMap.category === -1) missingColumns.push('Categoría');
  if (colMap.type === -1) missingColumns.push('Ingreso/Gasto');
  if (colMap.amount === -1) missingColumns.push('Importe');
  if (colMap.currency === -1) missingColumns.push('Moneda');

  if (missingColumns.length > 0) {
    throw new Error(`El archivo Excel no tiene el formato esperado. Faltan las columnas: ${missingColumns.join(', ')}`);
  }

  const parsedTransactions: ParsedTransaction[] = [];
  const seenHashes = new Set<string>();

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    // Skip empty rows
    if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined || cell === '')) {
      continue;
    }

    try {
      const rawDate = row[colMap.date];
      if (rawDate === null || rawDate === undefined || rawDate === '') {
        throw new Error(`Fecha vacía en la fila ${i + 1}`);
      }
      const date = parseExcelDate(rawDate);

      const accountName = String(row[colMap.account] || '').trim();
      if (!accountName) {
        throw new Error(`Nombre de cuenta vacío en la fila ${i + 1}`);
      }

      const categoryName = String(row[colMap.category] || '').trim();
      if (!categoryName) {
        throw new Error(`Categoría vacía en la fila ${i + 1}`);
      }

      const subcategoryName = colMap.subcategory !== -1 && row[colMap.subcategory] 
        ? String(row[colMap.subcategory]).trim() 
        : null;

      const rawType = String(row[colMap.type] || '').trim().toLowerCase();
      let type: TransactionType = 'EXPENSE';
      if (rawType.includes('ingreso')) {
        type = 'INCOME';
      } else if (rawType.includes('transferencia') || rawType.includes('transfer')) {
        type = 'TRANSFER';
      } else if (rawType.includes('gasto') || rawType.includes('dinero gastado')) {
        type = 'EXPENSE';
      } else {
        // Safe default or check for unknown type
        type = 'EXPENSE';
      }

      const amount = parseAmount(row[colMap.amount]);
      const currency = String(row[colMap.currency] || 'USD').trim().toUpperCase();

      // Read USD value if present, fallback to parsed amount if currency is USD, or default 0
      let baseAmountUsd = 0;
      if (colMap.usd !== -1 && row[colMap.usd] !== undefined && row[colMap.usd] !== null && row[colMap.usd] !== '') {
        baseAmountUsd = parseAmount(row[colMap.usd]);
      } else if (currency === 'USD') {
        baseAmountUsd = amount;
      }

      const note = colMap.note !== -1 && row[colMap.note] !== undefined && row[colMap.note] !== null
        ? String(row[colMap.note]).trim()
        : null;

      const description = colMap.description !== -1 && row[colMap.description] !== undefined && row[colMap.description] !== null
        ? String(row[colMap.description]).trim()
        : null;

      const importHash = generateImportHash({
        date,
        accountName,
        categoryName,
        amount,
        currency,
        note
      });

      if (seenHashes.has(importHash)) {
        continue;
      }
      seenHashes.add(importHash);

      parsedTransactions.push({
        date,
        accountName,
        categoryName,
        subcategoryName,
        amount,
        currency,
        baseAmountUsd,
        type,
        note,
        description,
        importHash
      });
    } catch (err: any) {
      throw new Error(`Error procesando fila ${i + 1}: ${err.message}`);
    }
  }

  return parsedTransactions;
}
