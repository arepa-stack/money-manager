// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseMoneyManagerSqlite } from '../../src/lib/parsers/moneyManagerSqliteParser';

describe('moneyManagerSqliteParser', () => {
  it('should parse the user SQLite database backup successfully', () => {
    const dbPath = path.join(__dirname, '../../money_android.sqlite');
    if (!fs.existsSync(dbPath)) {
      console.warn('Skipping test: money_android.sqlite is not present in repository root');
      return;
    }

    const buffer = fs.readFileSync(dbPath);
    const parsed = parseMoneyManagerSqlite(buffer);

    console.log(`Successfully parsed ${parsed.length} transactions from SQLite file.`);

    expect(parsed.length).toBeGreaterThan(0);
    
    // Check fields on first transaction
    const firstTx = parsed[0];
    expect(firstTx.importHash).toBeDefined();
    expect(firstTx.date).toBeInstanceOf(Date);
    expect(firstTx.accountName).toBeDefined();
    expect(firstTx.categoryName).toBeDefined();
    expect(firstTx.amount).toBeTypeOf('number');
    expect(firstTx.currency).toBe('USD');
    expect(firstTx.baseAmountUsd).toBeTypeOf('number');
    expect(firstTx.type).toBeDefined();

    // Check we have some transfers
    const transfers = parsed.filter(t => t.type === 'TRANSFER');
    console.log(`Found ${transfers.length} transfers in parsed output.`);
    if (transfers.length > 0) {
      const transfer = transfers[0];
      expect(transfer.categoryName).not.toBe('Transferencia'); // should be destination account
    }

    // Check we have some opening balances
    const openingBalances = parsed.filter(t => t.isOpeningBalance);
    console.log(`Found ${openingBalances.length} opening balances in parsed output.`);
    if (openingBalances.length > 0) {
      const opening = openingBalances[0];
      expect(opening.categoryName).toBe('Ajuste de Saldo Inicial');
    }
  });
});
