import { ParsedTransaction } from '../domain/types';
import { parseMoneyManagerExcel } from '../parsers/moneyManagerParser';
import { ProviderInterface } from './ProviderInterface';

export class MoneyManagerProvider implements ProviderInterface {
  name = 'MONEY_MANAGER';

  parse(fileBuffer: Buffer): ParsedTransaction[] {
    return parseMoneyManagerExcel(fileBuffer);
  }
}
