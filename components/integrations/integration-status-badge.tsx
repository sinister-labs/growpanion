"use client";

import { cn } from '@/lib/utils';

export type IntegrationStatus = 'connected' | 'needs_attention' | 'not_configured';

const statusConfig: Record<IntegrationStatus, { label: string; className: string }> = {
  connected: {
    label: 'Connected',
    className: 'border-primary/30 bg-primary/10 text-primary',
  },
  needs_attention: {
    label: 'Needs attention',
    className: 'border-amber-300/35 bg-amber-300/10 text-amber-200',
  },
  not_configured: {
    label: 'Not configured',
    className: 'border-white/10 bg-white/[0.045] text-slate-400',
  },
};

export function IntegrationStatusBadge({ status }: { status: IntegrationStatus }) {
  const config = statusConfig[status];
  return (
    <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', config.className)}>
      {config.label}
    </span>
  );
}
