import React from 'react';
import { AlertItem as AlertItemType } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { AlertTriangle, Clock, CheckCircle, Cpu } from 'lucide-react';

interface AlertItemProps {
  alert: AlertItemType;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  compact?: boolean;
}

export const AlertItemComponent: React.FC<AlertItemProps> = ({
  alert,
  onAcknowledge,
  onResolve,
  compact = false,
}) => {
  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        alert.severity === 'CRITICAL'
          ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/50'
          : alert.severity === 'WARNING'
          ? 'bg-amber-950/20 border-amber-900/40 hover:border-amber-700/50'
          : 'bg-healthcare-surface border-healthcare-border hover:border-teal-700/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg mt-0.5 ${
              alert.severity === 'CRITICAL'
                ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                : alert.severity === 'WARNING'
                ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                : 'bg-teal-950/80 text-teal-400 border border-teal-800/60'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-healthcare-textPrimary">
                {alert.patientName}
              </span>
              <span className="text-xs font-mono text-healthcare-textMuted">
                ({alert.medicalRecordNumber})
              </span>
              <StatusBadge
                type="alert"
                value={alert.severity}
                size="sm"
                pulse={alert.severity === 'CRITICAL' && !alert.isAcknowledged}
              />
              <span className="text-xs px-2 py-0.5 rounded bg-healthcare-surfaceLight border border-healthcare-borderSubtle text-healthcare-textSecondary">
                {alert.vitalType}
              </span>
            </div>

            <p className="text-xs text-healthcare-textSecondary mt-1 leading-relaxed">
              {alert.message}
            </p>

            <div className="flex items-center gap-4 text-[11px] text-healthcare-textMuted mt-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-healthcare-textMuted" />
                {alert.timestamp}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Cpu className="w-3 h-3 text-teal-400" />
                {alert.edgeNodeId}
              </span>
              <span className="font-mono text-healthcare-textSecondary">
                Trigger: <span className="text-rose-300 font-semibold">{alert.currentValue}</span> (Limit: {alert.thresholdValue})
              </span>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="flex flex-col gap-1.5 shrink-0">
            {!alert.isAcknowledged ? (
              <button
                onClick={() => onAcknowledge && onAcknowledge(alert.id)}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors"
              >
                Acknowledge
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-1 rounded">
                <CheckCircle className="w-3 h-3" />
                Acknowledged
              </span>
            )}

            {!alert.isResolved && (
              <button
                onClick={() => onResolve && onResolve(alert.id)}
                className="px-3 py-1.5 rounded-lg bg-healthcare-surfaceLight hover:bg-healthcare-surfaceHover text-healthcare-textSecondary hover:text-white text-xs border border-healthcare-borderSubtle transition-colors"
              >
                Resolve
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
