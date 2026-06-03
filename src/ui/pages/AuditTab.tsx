import React from 'react';
import AuditTimeline from '@/ui/organisms/AuditTimeline';

export default function AuditTab() {
  return (
    <div className="animate-fade-in bg-slate-900/30 border border-slate-900 rounded-3xl p-6 backdrop-blur-md shadow-2xl">
      <AuditTimeline />
    </div>
  );
}
