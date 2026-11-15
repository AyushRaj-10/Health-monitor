import React from 'react';
import { RiskLevel, DeviceStatus, AlertSeverity } from '../../types';

interface StatusBadgeProps {
  type?: 'risk' | 'device' | 'alert' | 'privacy' | 'status';
  value: RiskLevel | DeviceStatus | AlertSeverity | string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  value,
  size = 'md',
  pulse = false,
}) => {
  const normalized = String(value).toUpperCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotColor = 'bg-slate-400';

  if (normalized === 'CRITICAL' || normalized === 'HIGH' || normalized === 'BLOCKED') {
    colorClasses = 'bg-rose-950/60 text-rose-300 border-rose-800/60';
    dotColor = 'bg-rose-400';
  } else if (normalized === 'WARNING' || normalized === 'MODERATE' || normalized === 'DEGRADED' || normalized === 'FLAGGED') {
    colorClasses = 'bg-amber-950/60 text-amber-300 border-amber-800/60';
    dotColor = 'bg-amber-400';
  } else if (normalized === 'LOW' || normalized === 'ONLINE' || normalized === 'ACTIVE' || normalized === 'SUCCESS') {
    colorClasses = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60';
    dotColor = 'bg-emerald-400';
  } else if (normalized === 'INFO' || normalized === 'OBSERVATION') {
    colorClasses = 'bg-teal-950/60 text-teal-300 border-teal-800/60';
    dotColor = 'bg-teal-400';
  } else if (normalized === 'OFFLINE' || normalized === 'DISCHARGED') {
    colorClasses = 'bg-zinc-900 text-zinc-400 border-zinc-700';
    dotColor = 'bg-zinc-500';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses} ${colorClasses}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor}`} />
      </span>
      <span>{value}</span>
    </span>
  );
};
