import { ProviderInterface } from './ProviderInterface';
import { MoneyManagerProvider } from './MoneyManagerProvider';
import { MoneyManagerSqliteProvider } from './MoneyManagerSqliteProvider';

const providers: Record<string, ProviderInterface> = {
  MONEY_MANAGER: new MoneyManagerProvider(),
  MONEY_MANAGER_SQLITE: new MoneyManagerSqliteProvider(),
};

export function getProvider(name: string): ProviderInterface {
  const provider = providers[name.toUpperCase()];
  if (!provider) {
    throw new Error(`Proveedor de importación no soportado: "${name}"`);
  }
  return provider;
}
