import React from 'react';
import AccountManager from '@/ui/organisms/AccountManager';

interface AccountsTabProps {
  onChange: () => void;
}

export default function AccountsTab({ onChange }: AccountsTabProps) {
  return (
    <div className="animate-fade-in">
      <AccountManager onChange={onChange} />
    </div>
  );
}
