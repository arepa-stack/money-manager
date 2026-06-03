import React from 'react';
import AccountBalances from '@/ui/organisms/AccountBalances';

interface BalancesTabProps {
  onSelectAccount: (accountId: string) => void;
  onQuickAction: (actionType: 'INCOME' | 'EXPENSE' | 'TRANSFER') => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function BalancesTab({ onSelectAccount, onQuickAction, showToast }: BalancesTabProps) {
  return (
    <div className="animate-fade-in">
      <AccountBalances
        onSelectAccount={onSelectAccount}
        onQuickAction={onQuickAction}
        showToast={showToast}
      />
    </div>
  );
}

