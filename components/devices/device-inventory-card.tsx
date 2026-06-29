"use client";

import type { KeyboardEvent } from 'react';
import { ChevronRight, Cpu, SlidersHorizontal, Wifi } from 'lucide-react';
import type { Device, DeviceIntegration, Grow, SensorBinding, TelemetryReading } from '@/lib/db';
import { formatMetricLabel, formatTelemetryValue, integrationTypeLabels } from '@/lib/device-layer-helpers';
import { cn } from '@/lib/utils';

const sourceIcons = {
  ac_infinity: Cpu,
  tuya_legacy: Wifi,
  manual: SlidersHorizontal,
} as const;

interface DeviceInventoryCardProps {
  device: Device;
  integration?: DeviceIntegration;
  grow?: Grow;
  bindings: SensorBinding[];
  latestReadingByBinding: Record<string, TelemetryReading>;
  onSelect: () => void;
}

export function DeviceInventoryCard({
  device,
  integration,
  grow,
  bindings,
  latestReadingByBinding,
  onSelect,
}: DeviceInventoryCardProps) {
  const sourceType = integration?.type ?? 'other';
  const SourceIcon = sourceIcons[sourceType as keyof typeof sourceIcons] ?? SlidersHorizontal;
  const mappedCount = bindings.filter(binding => binding.growId).length;
  const latestReading = bindings
    .map(binding => latestReadingByBinding[binding.id])
    .filter(Boolean)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        'group os-card cursor-pointer p-4 transition-[transform,box-shadow,border-color] duration-200',
        'hover:-translate-y-0.5 hover:border-emerald-300/[0.28] hover:shadow-[0_0_28px_rgba(52,255,154,0.12),0_14px_34px_rgba(0,0,0,0.24)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="rounded-xl border border-emerald-300/[0.20] bg-emerald-300/[0.12] p-3 text-emerald-200 shadow-[0_0_24px_rgba(52,255,154,0.12)]">
            <SourceIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {integrationTypeLabels[sourceType] ?? sourceType}
            </div>
            <h3 className="mt-1 truncate text-lg font-semibold text-foreground sm:text-xl">{device.name}</h3>
            <p className="mt-1 text-sm capitalize text-muted-foreground">{device.type}</p>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
            device.status === 'active' ? 'border border-emerald-300/[0.18] bg-emerald-300/10 text-emerald-100' : 'border border-white/[0.12] bg-white/[0.045] text-slate-400',
          )}
        >
          {device.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MetricTile label="Values" value={String(bindings.length)} />
        <MetricTile label="Mapped" value={String(mappedCount)} />
        <MetricTile
          label="Latest"
          value={latestReading ? formatTelemetryValue(latestReading.value) : '—'}
          unit={latestReading?.unit}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
        <div className="min-w-0 text-sm text-muted-foreground">
          {grow ? (
            <>
              <span className="text-foreground">{grow.name}</span>
              {latestReading && (
                <span className="ml-2 text-xs">
                  • {formatMetricLabel(latestReading.metric)} {new Date(latestReading.recordedAt).toLocaleTimeString()}
                </span>
              )}
            </>
          ) : (
            <span className="text-amber-200">Not assigned to a grow</span>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-primary opacity-80 transition-opacity group-hover:opacity-100">
          Configure
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </article>
  );
}

function MetricTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-[0.9rem] border border-white/10 bg-black/[0.22] px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold tabular-nums text-foreground">
        {value}
        {unit && <span className="ml-1 text-xs font-medium text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
