import { ProviderInterface } from './ProviderInterface';
import { MoneyManagerProvider } from './MoneyManagerProvider';

const providers: Record<string, ProviderInterface> = {
  MONEY_MANAGER: new MoneyManagerProvider(),
};

export function getProvider(name: string): ProviderInterface {
  const provider = providers[name.toUpperCase()];
  if (!provider) {
    throw new Error(`Proveedor de importación no soportado: "${name}"`);
  }
  return provider;
}
