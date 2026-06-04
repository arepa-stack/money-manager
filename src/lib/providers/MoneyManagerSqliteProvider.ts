import { ParsedTransaction } from '../domain/types';
import { parseMoneyManagerSqlite } from '../parsers/moneyManagerSqliteParser';
import { ProviderInterface } from './ProviderInterface';

export class MoneyManagerSqliteProvider implements ProviderInterface {
  name = 'MONEY_MANAGER_SQLITE';

  parse(fileBuffer: Buffer): ParsedTransaction[] {
    return parseMoneyManagerSqlite(fileBuffer);
  }
}
