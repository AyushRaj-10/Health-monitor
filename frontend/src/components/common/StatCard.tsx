import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral' | 'critical' | 'warning';
  badge?: string;
  accentColor?: 'teal' | 'emerald' | 'rose' | 'amber' | 'cyan';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendType = 'neutral',
  badge,
  accentColor = 'teal',
}) => {
  const accentBorders = {
    teal: 'hover:border-teal-500/40',
    emerald: 'hover:border-emerald-500/40',
    rose: 'hover:border-rose-500/40',
    amber: 'hover:border-amber-500/40',
    cyan: 'hover:border-cyan-500/40',
  };

  const iconBgColors = {
    teal: 'bg-teal-950/70 text-teal-400 border-teal-800/50',
    emerald: 'bg-emerald-950/70 text-emerald-400 border-emerald-800/50',
    rose: 'bg-rose-950/70 text-rose-400 border-rose-800/50',
    amber: 'bg-amber-950/70 text-amber-400 border-amber-800/50',
    cyan: 'bg-cyan-950/70 text-cyan-400 border-cyan-800/50',
  };

  const trendTextColors = {
    positive: 'text-emerald-400',
    negative: 'text-rose-400',
    critical: 'text-rose-400 font-semibold',
    warning: 'text-amber-400',
    neutral: 'text-healthcare-textSecondary',
  };

  return (
    <div
      className={`bg-healthcare-surface border border-healthcare-border rounded-xl p-5 transition-all duration-200 ${accentBorders[accentColor]}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-wider uppercase text-healthcare-textSecondary">
          {title}
        </span>
        <div className={`p-2.5 rounded-lg border ${iconBgColors[accentColor]}`}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold tracking-tight text-healthcare-textPrimary font-mono">
          {value}
        </span>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-teal-950/80 text-teal-300 border border-teal-800/40">
            {badge}
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="flex items-center gap-1.5 text-xs text-healthcare-textSecondary mt-2 pt-2 border-t border-healthcare-borderSubtle">
          {trend && (
            <span className={`${trendTextColors[trendType]}`}>
              {trend}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
