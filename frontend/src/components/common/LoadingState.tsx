import React from 'react';
import { Activity } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading biotelemetry data...',
  rows = 4,
}) => {
  return (
    <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-8 flex flex-col items-center justify-center min-h-[220px]">
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-teal-500/20 border-t-teal-400 animate-spin" />
        <Activity className="w-5 h-5 text-teal-400 absolute animate-pulse" />
      </div>
      <p className="text-sm font-medium text-healthcare-textSecondary">{message}</p>
      
      <div className="w-full max-w-md mt-6 space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-healthcare-surfaceLight rounded animate-pulse"
            style={{ width: `${85 - i * 12}%`, margin: '0 auto' }}
          />
        ))}
      </div>
    </div>
  );
};
