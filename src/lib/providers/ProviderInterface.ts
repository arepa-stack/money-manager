import { ParsedTransaction } from '../domain/types';

export interface ProviderInterface {
  name: string;
  parse(fileBuffer: Buffer): ParsedTransaction[];
}
