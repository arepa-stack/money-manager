import React from 'react';
import AccountBalances from '@/ui/organisms/AccountBalances';

interface BalancesTabProps {
  onSelectAccount: (accountId: string) => void;
  onQuickAction: (actionType: 'INCOME' | 'EXPENSE' | 'TRANSFER') => void;
}

export default function BalancesTab({ onSelectAccount, onQuickAction }: BalancesTabProps) {
  return (
    <div className="animate-fade-in">
      <AccountBalances
        onSelectAccount={onSelectAccount}
        onQuickAction={onQuickAction}
      />
    </div>
  );
}
